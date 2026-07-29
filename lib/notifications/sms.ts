import type { NotificationSetting } from "./types";

export function smsConfigured(setting: NotificationSetting) {
  return Boolean(setting.enabled && process.env.SMS_API_URL && process.env.SMS_API_KEY);
}

export async function sendSms(setting: NotificationSetting, input: { to: string; message: string; idempotencyKey: string }) {
  if (!smsConfigured(setting)) throw new Error("短信渠道尚未配置完整");
  const response = await fetch(String(process.env.SMS_API_URL), {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.SMS_API_KEY}`, "content-type": "application/json", "idempotency-key": input.idempotencyKey },
    body: JSON.stringify({ to: input.to, message: input.message, sender: setting.sender_address || process.env.SMS_SENDER_ID || "PUSY.CN" }),
  });
  const result = await response.json().catch(() => ({})) as { id?: string; messageId?: string; message?: string };
  const id = result.id || result.messageId;
  if (!response.ok || !id) throw new Error(result.message || "短信发送失败");
  return id;
}

