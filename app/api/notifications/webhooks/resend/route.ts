import { Webhook } from "svix";
import { getStoreDb } from "../../../../../db/store";
import { ingestReceivedEmail, type ResendReceivedEvent } from "../../../../../lib/support/service";

type ResendEvent = { type: string; data: { email_id?: string; from?: string; to?: string[]; subject?: string; message_id?: string } };

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET ?? "";
  if (!secret) return Response.json({ error: "邮件回调密钥未配置" }, { status: 503 });
  const body = await request.text();
  const eventId = request.headers.get("svix-id") ?? "";
  let event: ResendEvent;
  try {
    event = new Webhook(secret).verify(body, {
      "svix-id": eventId,
      "svix-timestamp": request.headers.get("svix-timestamp") ?? "",
      "svix-signature": request.headers.get("svix-signature") ?? "",
    }) as ResendEvent;
  } catch {
    return Response.json({ error: "邮件回调验签失败" }, { status: 400 });
  }

  try {
    const providerMessageId = String(event.data?.email_id ?? "");
    if (!eventId || !providerMessageId) throw new Error("邮件回调内容无效");
    if (event.type === "email.received") {
      const result = await ingestReceivedEmail(event as ResendReceivedEvent);
      return Response.json({ received: true, ...result });
    }
    const db = await getStoreDb();
    const duplicate = await db.prepare("SELECT id FROM notification_delivery_events WHERE id = ?").bind(eventId).first();
    if (duplicate) return Response.json({ received: true, duplicate: true });
    const status = event.type === "email.delivered" ? "delivered" : event.type === "email.bounced" ? "bounced" : event.type === "email.complained" ? "complained" : event.type === "email.suppressed" ? "bounced" : "sent";
    await db.batch([
      db.prepare("INSERT INTO notification_delivery_events (id, provider_message_id, event_type) VALUES (?, ?, ?)").bind(eventId, providerMessageId, event.type),
      db.prepare("UPDATE notification_jobs SET status = CASE WHEN status IN ('bounced','complained') THEN status WHEN status = 'delivered' AND ? = 'sent' THEN status ELSE ? END, updated_at = CURRENT_TIMESTAMP WHERE provider_message_id = ? AND channel = 'email'").bind(status, status, providerMessageId),
    ]);
    return Response.json({ received: true });
  } catch {
    return Response.json({ error: "邮件回调处理失败" }, { status: 500 });
  }
}
