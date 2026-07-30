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
  memberId?: number;
};

const retrySeconds = [30, 120, 600, 1800, 7200, 21600];
const escapeHtml = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
const render = (source: string, payload: Record<string, string>, escape = false) => source.replace(/\{\{([A-Za-z0-9_]+)\}\}/g, (_, key: string) => escape ? escapeHtml(payload[key] ?? "") : payload[key] ?? "");
const memberInboxTemplates = new Set(["order_confirmed", "order_shipped", "order_cancelled", "return_updated", "refund_completed", "payment_reminder", "repurchase_reminder", "new_product", "product_restock", "price_drop", "targeted_coupon"]);

function inboxType(templateKey: string) {
  if (["order_confirmed", "order_cancelled", "payment_reminder"].includes(templateKey)) return "order";
  if (templateKey === "order_shipped") return "logistics";
  if (["return_updated", "refund_completed"].includes(templateKey)) return "service";
  if (templateKey === "targeted_coupon") return "benefit";
  if (["product_restock", "price_drop", "new_product", "repurchase_reminder"].includes(templateKey)) return "product";
  return "system";
}

function inboxLink(input: NotificationInput) {
  if (input.entityType === "order") return `/pages/order-detail/index?id=${encodeURIComponent(input.entityId)}`;
  if (input.entityType === "return" && input.payload.orderId) return `/pages/order-detail/index?id=${encodeURIComponent(input.payload.orderId)}`;
  if (input.entityType === "refund" && input.payload.orderId) return `/pages/order-detail/index?id=${encodeURIComponent(input.payload.orderId)}`;
  if (input.entityType === "product") return `/pages/product/index?id=${encodeURIComponent(input.entityId)}`;
  if (input.templateKey === "targeted_coupon") return "/pages/benefits/index";
  return "";
}

async function resolveNotificationMember(input: NotificationInput) {
  if (!memberInboxTemplates.has(input.templateKey)) return null;
  const db = await getStoreDb();
  if (input.memberId) return db.prepare("SELECT id FROM members WHERE id = ? AND status != 'blocked' LIMIT 1").bind(input.memberId).first<{ id: number }>();
  if (input.entityType === "member" && /^\d+$/.test(input.entityId)) return db.prepare("SELECT id FROM members WHERE id = ? AND status != 'blocked' LIMIT 1").bind(Number(input.entityId)).first<{ id: number }>();
  const email = String(input.email || "").trim().toLowerCase();
  const phone = String(input.phone || "").replace(/[\s-]/g, "");
  if (!email && !phone) return null;
  return db.prepare("SELECT id FROM members WHERE status != 'blocked' AND ((? != '' AND lower(email) = ?) OR (? != '' AND phone = ?)) ORDER BY CASE WHEN ? != '' AND lower(email) = ? THEN 0 ELSE 1 END LIMIT 1").bind(email, email, phone, phone, email, email).first<{ id: number }>();
}

async function enqueueMemberInbox(input: NotificationInput, template: NotificationTemplate) {
  const member = await resolveNotificationMember(input);
  if (!member) return;
  const db = await getStoreDb();
  const digest = await sha256(`${input.eventKey}:in-app:${member.id}`);
  const id = `INBOX-${digest.slice(0, 24).toUpperCase()}`;
  const title = render(template.email_subject || template.name, input.payload).trim().slice(0, 160) || template.name;
  const body = render(template.email_body || template.sms_body, input.payload).trim().slice(0, 1200);
  await db.prepare("INSERT INTO member_notifications (id, member_id, event_key, notification_type, title, body, link, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(member_id, event_key) DO NOTHING").bind(id, member.id, input.eventKey, inboxType(input.templateKey), title, body, inboxLink(input), input.scheduledAt ?? new Date().toISOString()).run();
}

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
  await enqueueMemberInbox(input, template);
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
  const job = await db.prepare("SELECT * FROM notification_jobs WHERE id = ?").bind(id).first<NotificationJob>();
  if (!job) throw new Error("通知任务不存在");
  if (job.status === "sent") return job;
  if (new Date(job.scheduled_at).getTime() > Date.now()) return job;
  const setting = await db.prepare("SELECT * FROM notification_settings WHERE channel = ?").bind(job.channel).first<NotificationSetting>();
  const template = await db.prepare("SELECT * FROM notification_templates WHERE key = ?").bind(job.template_key).first<NotificationTemplate>();
  if (!setting || !template || !setting.enabled || !template.enabled) throw new Error("通知渠道或模板已停用");
  const payload = JSON.parse(job.payload_json) as Record<string, string>;
  try {
    const replyTo = job.entity_type === "order" || payload.orderId ? supportReplyAddress({ orderId: payload.orderId || job.entity_id }) : supportReplyAddress({ mailbox: "service" });
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
  const jobs = await db.prepare("SELECT id FROM notification_jobs WHERE scheduled_at::timestamp <= CURRENT_TIMESTAMP AND (next_retry_at IS NULL OR next_retry_at::timestamp <= CURRENT_TIMESTAMP) ORDER BY created_at LIMIT ?").bind(Math.min(limit, 100)).all<{ id: string }>();
  const results = [];
  for (const job of jobs.results) results.push(await processNotificationJob(job.id).then(() => ({ id: job.id, ok: true })).catch((error) => ({ id: job.id, ok: false, error: error instanceof Error ? error.message : "发送失败" })));
  return results;
}
