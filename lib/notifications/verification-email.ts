import { getStoreDb } from "../../db/store";
import { emailConfigured, sendEmail } from "./email";
import type { NotificationSetting } from "./types";

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

export async function sendVerificationEmail(input: { to: string; code: string; subject: string; intro: string; idempotencyKey: string }) {
  const db = await getStoreDb();
  const setting = await db.prepare("SELECT * FROM notification_settings WHERE channel = 'email' LIMIT 1").first<NotificationSetting>();
  if (!setting || !emailConfigured(setting)) throw new Error("邮件验证码渠道尚未启用");
  await sendEmail(setting, {
    to: input.to,
    subject: input.subject,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.8;color:#222"><p>${escapeHtml(input.intro)}</p><p style="font-size:30px;font-weight:700;letter-spacing:6px">${escapeHtml(input.code)}</p><p>验证码 10 分钟内有效，请勿转发给他人。</p></div>`,
    idempotencyKey: input.idempotencyKey,
  });
}
