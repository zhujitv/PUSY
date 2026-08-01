import { getStoreDb } from "../../db/store";
import { sendEmail } from "../notifications/email";
import type { NotificationSetting } from "../notifications/types";
import { bounded, escapeHtml, supportReplyAddress, type SupportActor } from "./shared";

export async function sendSupportReply(threadId: string, message: string, actor: SupportActor, requestId: string) {
  const text = bounded(message, 10_000);
  if (!text) throw new Error("请填写回复内容");
  const suppliedRequestId = bounded(requestId, 36).toLowerCase();
  const normalizedRequestId = suppliedRequestId || crypto.randomUUID();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(normalizedRequestId)) throw new Error("邮件回复请求编号无效，请刷新页面后重试");
  const db = await getStoreDb();
  const thread = await db.prepare("SELECT * FROM support_threads WHERE id = ? AND deleted_at IS NULL LIMIT 1").bind(threadId).first<{ id: string; subject: string; customer_email: string; order_id: string | null; return_id: string | null }>();
  if (!thread) throw new Error("客服工单不存在");
  const setting = await db.prepare("SELECT * FROM notification_settings WHERE channel = 'email' LIMIT 1").first<NotificationSetting>();
  if (!setting) throw new Error("邮件渠道尚未配置");
  const messageRecordId = `MSG-${normalizedRequestId.replaceAll("-", "").toUpperCase()}`;
  const completed = await db.prepare("SELECT provider_email_id, thread_id, text_body FROM support_messages WHERE id = ? LIMIT 1").bind(messageRecordId).first<{ provider_email_id: string | null; thread_id: string; text_body: string }>();
  if (completed) {
    if (completed.thread_id !== thread.id || completed.text_body !== text) throw new Error("邮件回复请求编号冲突，请刷新页面后重试");
    if (completed.provider_email_id) return completed.provider_email_id;
  }
  const latest = await db.prepare("SELECT provider_message_id, headers_json FROM support_messages WHERE thread_id = ? AND direction = 'inbound' ORDER BY created_at DESC LIMIT 1").bind(threadId).first<{ provider_message_id: string | null; headers_json: string }>();
  let references = "";
  try { references = String(JSON.parse(latest?.headers_json || "{}").references ?? ""); } catch { references = ""; }
  const headers: Record<string, string> = {};
  if (latest?.provider_message_id) {
    headers["In-Reply-To"] = latest.provider_message_id;
    headers.References = [references, latest.provider_message_id].filter(Boolean).join(" ").slice(0, 1800);
  }
  const replyTo = supportReplyAddress({ threadId });
  const providerId = await sendEmail(setting, {
    to: thread.customer_email,
    subject: /^re:/i.test(thread.subject) ? thread.subject : `Re: ${thread.subject}`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.8;color:#222">${escapeHtml(text).replaceAll("\n", "<br>")}<hr style="margin:28px 0;border:0;border-top:1px solid #ddd"><small style="color:#777">PUSY.CN 客户服务 · 工单 ${thread.id}</small></div>`,
    idempotencyKey: `support-reply-${normalizedRequestId}`,
    replyTo: replyTo || undefined,
    headers,
  });
  await db.batch([
    db.prepare("INSERT INTO support_messages (id, thread_id, direction, source, provider_email_id, from_email, to_email, subject, text_body, headers_json) VALUES (?, ?, 'outbound', 'admin', ?, ?, ?, ?, ?, ?)").bind(messageRecordId, thread.id, providerId, setting.sender_address, thread.customer_email, `Re: ${thread.subject}`, text, JSON.stringify({ ...headers, actor: actor.email })),
    db.prepare("UPDATE support_threads SET status = 'pending', assigned_admin_id = COALESCE(assigned_admin_id, ?), assigned_to = COALESCE(assigned_to, ?), first_responded_at = COALESCE(first_responded_at, CURRENT_TIMESTAMP::TEXT), last_message_at = CURRENT_TIMESTAMP::TEXT, updated_at = CURRENT_TIMESTAMP::TEXT WHERE id = ?").bind(actor.id, actor.displayName || actor.email, thread.id),
  ]);
  return providerId;
}
