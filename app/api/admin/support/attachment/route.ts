import { getAdminIdentity } from "../../../../../lib/admin-auth";
import { getStoreDb } from "../../../../../db/store";
import { roleCan } from "../../../../../lib/admin-permissions";

type Attachment = { id: string; filename: string; download_url?: string; expires_at?: string };

export async function GET(request: Request) {
  const actor = await getAdminIdentity();
  if (!actor) return Response.json({ error: "请先登录管理后台" }, { status: 401 });
  if (!roleCan(actor.role, "support.read")) return Response.json({ error: "当前账号没有读取客服附件的权限" }, { status: 403 });
  const url = new URL(request.url);
  const emailId = (url.searchParams.get("emailId") ?? "").trim();
  const attachmentId = (url.searchParams.get("attachmentId") ?? "").trim();
  if (!/^[A-Za-z0-9-]{8,100}$/.test(emailId) || !/^[A-Za-z0-9-]{8,100}$/.test(attachmentId)) return Response.json({ error: "附件参数无效" }, { status: 400 });
  const db = await getStoreDb();
  const message = await db.prepare("SELECT attachments_json FROM support_messages WHERE provider_email_id = ? LIMIT 1").bind(emailId).first<{ attachments_json: string }>();
  if (!message) return Response.json({ error: "附件不存在" }, { status: 404 });
  let allowed = false;
  try { allowed = (JSON.parse(message.attachments_json) as Attachment[]).some((item) => item.id === attachmentId); } catch { allowed = false; }
  if (!allowed) return Response.json({ error: "附件不存在" }, { status: 404 });
  const key = process.env.RESEND_RECEIVING_API_KEY || process.env.RESEND_API_KEY || "";
  if (!key) return Response.json({ error: "Resend API 密钥未配置" }, { status: 503 });
  const response = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}/attachments`, { headers: { authorization: `Bearer ${key}`, accept: "application/json" }, cache: "no-store" });
  const body = await response.json().catch(() => ({})) as { data?: Attachment[]; message?: string };
  if (!response.ok) return Response.json({ error: body.message || "读取附件失败" }, { status: 502 });
  const attachment = body.data?.find((item) => item.id === attachmentId);
  if (!attachment?.download_url) return Response.json({ error: "附件下载链接不可用" }, { status: 404 });
  return Response.redirect(attachment.download_url, 302);
}
