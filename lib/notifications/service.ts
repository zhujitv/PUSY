import { getStoreDb } from "../../db/store";
import { sha256 } from "../payments/crypto";
import { emailConfigured, sendEmail } from "./email";
import { sendSms, smsConfigured } from "./sms";
import type { NotificationJob, NotificationSetting, NotificationTemplate } from "./types";
import { supportReplyAddress } from "../support/service";

type NotificationInput = {
  eventKey: string;
  entityType: string;
  entityId: string;
  templateKey: string;
  email?: string;
  phone?: string;
  payload: Record<string, string>;
  scheduledAt?: string;
};

const retrySeconds = [30, 120, 600, 1800, 7200, 21600];
const escapeHtml = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
const render = (source: string, payload: Record<string, string>, escape = false) => source.replace(/\{\{([A-Za-z0-9_]+)\}\}/g, (_, key: string) => escape ? escapeHtml(payload[key] ?? "") : payload[key] ?? "");

function emailHtml(text: string, replyEnabled: boolean) {
  const footer = replyEnabled ? "如需帮助，直接回复此邮件即可联系 PUSY.CN 客服。" : "此邮件由 PUSY.CN 订单系统自动发送。";
  return `<div style="margin:0;background:#f3f1ed;padding:36px 16px;font-family:Arial,sans-serif;color:#202020"><div style="max-width:620px;margin:auto;background:#fff;padding:36px"><div style="font-size:30px;font-weight:700;color:#ef398b;margin-bottom:28px">PUSY.CN</div><div style="font-size:15px;line-height:1.8">${text.split("\n").map((line) => line ? `<p style="margin:0 0 14px">${line}</p>` : "").join("")}</div><div style="margin-top:30px;padding-top:18px;border-top:1px solid #ddd;color:#888;font-size:11px">${footer}</div></div></div>`;
}

export async function notificationChannelState() {
  const db = await getStoreDb();
  const rows = await db.prepare("SELECT * FROM notification_settings ORDER BY channel").all<NotificationSetting>();
  return rows.results.map((setting) => ({ ...setting, configured: setting.channel === "email" ? emailConfigured(setting) : smsConfigured(setting), secretInstalled: setting.channel === "email" ? Boolean(process.env.RESEND_API_KEY) : Boolean(process.env.SMS_API_URL && process.env.SMS_API_KEY) }));
}

export async function enqueueNotification(input: NotificationInput) {
  const db = await getStoreDb();
  const template = await db.prepare("SELECT * FROM notification_templates WHERE key = ? AND enabled = 1").bind(input.templateKey).first<NotificationTemplate>();
  if (!template) return [];
  const settings = await db.prepare("SELECT * FROM notification_settings WHERE enabled = 1").all<NotificationSetting>();
  const created: string[] = [];
  for (const setting of settings.results) {
    const recipient = setting.channel === "email" ? input.email?.trim().toLowerCase() : input.phone?.trim();
    if (!recipient) continue;
    const digest = await sha256(`${input.eventKey}:${setting.channel}:${recipient}`);
    const id = `NTF-${digest.slice(0, 24).toUpperCase()}`;
    const inserted = await db.prepare("INSERT INTO notification_jobs (id, event_key, entity_type, entity_id, template_key, channel, recipient, payload_json, scheduled_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING").bind(id, input.eventKey, input.entityType, input.entityId, input.templateKey, setting.channel, recipient, JSON.stringify(input.payload), input.scheduledAt ?? new Date().toISOString()).run();
    if (inserted.meta.changes) created.push(id);
  }
  for (const id of created) await processNotificationJob(id).catch(() => undefined);
  return created;
}

export async function processNotificationJob(id: string) {
  const db = await getStoreDb();
  const job = await db.prepare(`UPDATE notification_jobs
    SET status = 'processing', updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
      AND scheduled_at::timestamp <= CURRENT_TIMESTAMP
      AND (next_retry_at IS NULL OR next_retry_at::timestamp <= CURRENT_TIMESTAMP)
      AND (
        status IN ('queued', 'failed')
        OR (status = 'processing' AND updated_at::timestamp <= CURRENT_TIMESTAMP - INTERVAL '15 minutes')
      )
    RETURNING *`).bind(id).first<NotificationJob>();
  if (!job) {
    const existing = await db.prepare("SELECT * FROM notification_jobs WHERE id = ?").bind(id).first<NotificationJob>();
    if (!existing) throw new Error("通知任务不存在");
    return existing;
  }
  try {
    const setting = await db.prepare("SELECT * FROM notification_settings WHERE channel = ?").bind(job.channel).first<NotificationSetting>();
    const template = await db.prepare("SELECT * FROM notification_templates WHERE key = ?").bind(job.template_key).first<NotificationTemplate>();
    if (!setting || !template || !setting.enabled || !template.enabled) throw new Error("通知渠道或模板已停用");
    const payload = JSON.parse(job.payload_json) as Record<string, string>;
    const replyTo = job.entity_type === "return" && payload.returnId
      ? supportReplyAddress({ returnId: payload.returnId })
      : job.entity_type === "order" || payload.orderId
        ? supportReplyAddress({ orderId: payload.orderId || job.entity_id })
        : supportReplyAddress({ mailbox: "service" });
    const providerId = job.channel === "email"
      ? await sendEmail(setting, { to: job.recipient, subject: render(template.email_subject, payload), html: emailHtml(render(template.email_body, payload, true), Boolean(replyTo)), idempotencyKey: job.id, replyTo: replyTo || undefined })
      : await sendSms(setting, { to: job.recipient, message: render(template.sms_body, payload), idempotencyKey: job.id });
    await db.prepare("UPDATE notification_jobs SET status = 'sent', attempts = attempts + 1, provider_message_id = ?, last_error = NULL, next_retry_at = NULL, sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(providerId, job.id).run();
  } catch (error) {
    const message = error instanceof Error ? error.message : "通知发送失败";
    const retryAt = new Date(Date.now() + retrySeconds[Math.min(job.attempts, retrySeconds.length - 1)] * 1000).toISOString();
    await db.prepare("UPDATE notification_jobs SET status = 'failed', attempts = attempts + 1, last_error = ?, next_retry_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(message, retryAt, job.id).run();
    throw new Error(message);
  }
  return db.prepare("SELECT * FROM notification_jobs WHERE id = ?").bind(job.id).first<NotificationJob>();
}

export async function processDueNotifications(limit = 50) {
  const db = await getStoreDb();
  const jobs = await db.prepare(`SELECT id FROM notification_jobs
    WHERE scheduled_at::timestamp <= CURRENT_TIMESTAMP
      AND (next_retry_at IS NULL OR next_retry_at::timestamp <= CURRENT_TIMESTAMP)
      AND (
        status IN ('queued', 'failed')
        OR (status = 'processing' AND updated_at::timestamp <= CURRENT_TIMESTAMP - INTERVAL '15 minutes')
      )
    ORDER BY COALESCE(next_retry_at, scheduled_at)::timestamp, created_at::timestamp, id
    LIMIT ?`).bind(Math.min(limit, 100)).all<{ id: string }>();
  const results = [];
  for (const job of jobs.results) results.push(await processNotificationJob(job.id).then(() => ({ id: job.id, ok: true })).catch((error) => ({ id: job.id, ok: false, error: error instanceof Error ? error.message : "发送失败" })));
  return results;
}
