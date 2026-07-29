import type { NotificationSetting } from "./types";

export function emailConfigured(setting: NotificationSetting) {
  return Boolean(setting.enabled && setting.sender_address && process.env.RESEND_API_KEY);
}

export async function sendEmail(setting: NotificationSetting, input: { to: string; subject: string; html: string; idempotencyKey: string; replyTo?: string; headers?: Record<string, string> }) {
  if (!emailConfigured(setting)) throw new Error("邮件渠道尚未配置完整");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "content-type": "application/json",
      "idempotency-key": input.idempotencyKey,
    },
    body: JSON.stringify({
      from: `${setting.sender_name} <${setting.sender_address}>`,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      ...(input.headers && Object.keys(input.headers).length ? { headers: input.headers } : {}),
    }),
  });
  const result = await response.json().catch(() => ({})) as { id?: string; message?: string; name?: string };
  if (!response.ok || !result.id) throw new Error(result.message || result.name || "邮件发送失败");
  return result.id;
}
