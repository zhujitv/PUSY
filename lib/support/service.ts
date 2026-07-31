import { getStoreDb } from "../../db/store";
import { sendEmail } from "../notifications/email";
import type { NotificationSetting } from "../notifications/types";
import { supportSlaDeadlines, validSupportPriority, type SupportPriority } from "./sla";

type Attachment = {
  id: string;
  filename: string;
  content_type?: string;
  content_disposition?: string | null;
  content_id?: string | null;
  size?: number;
};

type ReceivedEmail = {
  id: string;
  to: string[];
  from: string;
  created_at: string;
  subject: string;
  html?: string | null;
  text?: string | null;
  headers?: Record<string, string>;
  message_id?: string;
  attachments?: Attachment[];
};

export type ResendReceivedEvent = {
  type: "email.received";
  data: {
    email_id: string;
    from?: string;
    to?: string[];
    subject?: string;
    message_id?: string;
  };
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const orderPattern = /\bPUSY-\d{8}-[A-Z0-9]{6,20}\b/i;
const returnPattern = /\bRET-[A-Z0-9]{6,16}\b/i;

function bounded(value: unknown, maximum: number) {
  return String(value ?? "").trim().slice(0, maximum);
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function htmlToText(value: string) {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function sender(value: string) {
  const address = value.match(/<([^>]+)>/)?.[1]?.trim().toLowerCase() ?? value.trim().toLowerCase();
  const name = value.includes("<") ? value.slice(0, value.lastIndexOf("<")).trim().replace(/^['"]|['"]$/g, "") : "";
  return { address: emailPattern.test(address) ? address : "", name: bounded(name, 100) };
}

function normalizedSubject(value: string) {
  return bounded(value.replace(/^\s*((re|fw|fwd)\s*:\s*)+/i, ""), 300) || "无主题邮件";
}

function localPart(address: string) {
  return address.split("@")[0]?.toLowerCase() ?? "";
}

function id(prefix: string) {
  return `${prefix}-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
}

export function supportReceivingDomain() {
  return (process.env.RESEND_INBOUND_DOMAIN ?? "").trim().toLowerCase().replace(/^@/, "");
}

export function supportReplyAddress(input: { threadId?: string; orderId?: string; returnId?: string; mailbox?: "service" | "returns" }) {
  const domain = supportReceivingDomain();
  if (!domain) return "";
  const local = input.threadId ? `thread-${input.threadId}` : input.returnId ? `return-${input.returnId}` : input.orderId ? `order-${input.orderId}` : input.mailbox === "returns" ? "returns" : "service";
  return `${local.toLowerCase().replace(/[^a-z0-9-]/g, "")}@${domain}`;
}

type SupportActor = { id: string; email: string; displayName: string };

function reopenResolutionSql() {
  return "resolution_due_at = CASE WHEN status = 'resolved' THEN ? ELSE resolution_due_at END, reopened_count = reopened_count + CASE WHEN status = 'resolved' THEN 1 ELSE 0 END, resolved_at = CASE WHEN status = 'resolved' THEN NULL ELSE resolved_at END";
}

export async function ensureLinkedSupportThread(input: { orderId?: string; returnId?: string; actor: SupportActor }) {
  const db = await getStoreDb();
  const returnId = bounded(input.returnId, 40).toUpperCase();
  const orderId = bounded(input.orderId, 60).toUpperCase();
  if (!returnId && !orderId) throw new Error("缺少订单号或售后单号");

  if (returnId) {
    const linkedReturn = await db.prepare("SELECT r.id, r.order_id, r.email, r.reason, r.details, r.support_thread_id, o.member_id, o.customer FROM returns r JOIN orders o ON o.id = r.order_id WHERE upper(r.id) = ? LIMIT 1").bind(returnId).first<{ id: string; order_id: string; email: string; reason: string; details: string; support_thread_id: string | null; member_id: number | null; customer: string }>();
    if (!linkedReturn) throw new Error("售后申请不存在");
    const existing = linkedReturn.support_thread_id
      ? await db.prepare("SELECT id, priority FROM support_threads WHERE id = ? AND deleted_at IS NULL LIMIT 1").bind(linkedReturn.support_thread_id).first<{ id: string; priority: string }>()
      : await db.prepare("SELECT id, priority FROM support_threads WHERE return_id = ? AND deleted_at IS NULL ORDER BY last_message_at DESC LIMIT 1").bind(linkedReturn.id).first<{ id: string; priority: string }>();
    if (existing) {
      const { resolutionDueAt } = supportSlaDeadlines(validSupportPriority(existing.priority) ? existing.priority : "normal");
      await db.batch([
        db.prepare(`UPDATE support_threads SET archived_at = NULL, ${reopenResolutionSql()}, status = CASE WHEN status = 'resolved' THEN 'open' ELSE status END, assigned_admin_id = COALESCE(assigned_admin_id, ?), assigned_to = COALESCE(assigned_to, ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(resolutionDueAt, input.actor.id, input.actor.displayName || input.actor.email, existing.id),
        db.prepare("UPDATE returns SET support_thread_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(existing.id, linkedReturn.id),
      ]);
      return existing.id;
    }
    const threadId = id("TKT");
    const subject = `售后 ${linkedReturn.id} · ${linkedReturn.reason}`;
    const deadlines = supportSlaDeadlines("normal");
    await db.batch([
      db.prepare("INSERT INTO support_threads (id, mailbox, subject, customer_email, customer_name, member_id, order_id, return_id, status, assigned_to, assigned_admin_id, first_response_due_at, resolution_due_at) VALUES (?, 'returns', ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?, ?)").bind(threadId, subject, linkedReturn.email, linkedReturn.customer, linkedReturn.member_id, linkedReturn.order_id, linkedReturn.id, input.actor.displayName || input.actor.email, input.actor.id, deadlines.firstResponseDueAt, deadlines.resolutionDueAt),
      db.prepare("INSERT INTO support_messages (id, thread_id, direction, source, from_email, to_email, subject, text_body) VALUES (?, ?, 'system', 'admin_link', ?, ?, ?, ?)").bind(id("MSG"), threadId, input.actor.email, linkedReturn.email, subject, `已从售后管理建立邮件沟通。\n售后原因：${linkedReturn.reason}${linkedReturn.details ? `\n客户说明：${bounded(linkedReturn.details, 4000)}` : ""}`),
      db.prepare("UPDATE returns SET support_thread_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(threadId, linkedReturn.id),
    ]);
    return threadId;
  }

  const order = await db.prepare("SELECT id, member_id, customer, email FROM orders WHERE upper(id) = ? LIMIT 1").bind(orderId).first<{ id: string; member_id: number | null; customer: string; email: string }>();
  if (!order) throw new Error("订单不存在");
  const existing = await db.prepare("SELECT id, priority FROM support_threads WHERE order_id = ? AND deleted_at IS NULL ORDER BY CASE WHEN return_id IS NULL THEN 0 ELSE 1 END, last_message_at DESC LIMIT 1").bind(order.id).first<{ id: string; priority: string }>();
  if (existing) {
    const { resolutionDueAt } = supportSlaDeadlines(validSupportPriority(existing.priority) ? existing.priority : "normal");
    await db.prepare(`UPDATE support_threads SET archived_at = NULL, ${reopenResolutionSql()}, status = CASE WHEN status = 'resolved' THEN 'open' ELSE status END, assigned_admin_id = COALESCE(assigned_admin_id, ?), assigned_to = COALESCE(assigned_to, ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(resolutionDueAt, input.actor.id, input.actor.displayName || input.actor.email, existing.id).run();
    return existing.id;
  }
  const threadId = id("TKT");
  const subject = `订单 ${order.id} 客户沟通`;
  const deadlines = supportSlaDeadlines("normal");
  await db.batch([
    db.prepare("INSERT INTO support_threads (id, mailbox, subject, customer_email, customer_name, member_id, order_id, status, assigned_to, assigned_admin_id, first_response_due_at, resolution_due_at) VALUES (?, 'service', ?, ?, ?, ?, ?, 'open', ?, ?, ?, ?)").bind(threadId, subject, order.email, order.customer, order.member_id, order.id, input.actor.displayName || input.actor.email, input.actor.id, deadlines.firstResponseDueAt, deadlines.resolutionDueAt),
    db.prepare("INSERT INTO support_messages (id, thread_id, direction, source, from_email, to_email, subject, text_body) VALUES (?, ?, 'system', 'admin_link', ?, ?, ?, ?)").bind(id("MSG"), threadId, input.actor.email, order.email, subject, `已从订单 ${order.id} 建立客户邮件沟通，发送第一封回复后客户即可继续回复同一工单。`),
  ]);
  return threadId;
}

async function retrieveReceivedEmail(emailId: string) {
  const key = process.env.RESEND_RECEIVING_API_KEY || process.env.RESEND_API_KEY || "";
  if (!key) throw new Error("Resend API 密钥未配置");
  const response = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}?html_format=cid`, {
    headers: { authorization: `Bearer ${key}`, accept: "application/json" },
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({})) as ReceivedEmail & { message?: string };
  if (!response.ok || !body.id) throw new Error(body.message || "读取收件邮件失败");
  return body;
}

function routeTarget(recipients: string[]) {
  const recipient = recipients[0]?.toLowerCase() ?? "";
  const local = localPart(recipient);
  const threadId = local.startsWith("thread-") ? local.slice(7).toUpperCase() : "";
  const orderId = local.startsWith("order-") ? local.slice(6).toUpperCase() : "";
  const returnId = local.startsWith("return-") ? local.slice(7).toUpperCase() : "";
  const mailbox = local === "returns" || Boolean(returnId) ? "returns" : "service";
  return { recipient, local, threadId, orderId, returnId, mailbox };
}

async function verifiedOrder(orderId: string, email: string) {
  if (!orderId) return null;
  const db = await getStoreDb();
  return db.prepare("SELECT id, member_id, customer, email FROM orders WHERE upper(id) = ? AND lower(email) = ? LIMIT 1").bind(orderId.toUpperCase(), email).first<{ id: string; member_id: number | null; customer: string; email: string }>();
}

export async function ingestReceivedEmail(event: ResendReceivedEvent) {
  const providerEmailId = bounded(event.data.email_id, 100);
  if (!providerEmailId) throw new Error("收件邮件 ID 缺失");
  const db = await getStoreDb();
  const duplicate = await db.prepare("SELECT thread_id FROM support_messages WHERE provider_email_id = ? LIMIT 1").bind(providerEmailId).first<{ thread_id: string }>();
  if (duplicate) return { threadId: duplicate.thread_id, duplicate: true };

  const email = await retrieveReceivedEmail(providerEmailId);
  const from = sender(email.from || event.data.from || "");
  if (!from.address) throw new Error("无法识别发件人邮箱");
  const route = routeTarget(email.to?.length ? email.to : event.data.to ?? []);
  const subject = normalizedSubject(email.subject || event.data.subject || "");
  const html = bounded(email.html, 200_000);
  const text = bounded(email.text || htmlToText(html), 50_000);
  const searchable = `${subject}\n${text}`;
  const requestedOrderId = route.orderId || searchable.match(orderPattern)?.[0]?.toUpperCase() || "";
  const requestedReturnId = route.returnId || searchable.match(returnPattern)?.[0]?.toUpperCase() || "";
  let order = await verifiedOrder(requestedOrderId, from.address);
  const member = await db.prepare("SELECT id, name FROM members WHERE lower(email) = ? LIMIT 1").bind(from.address).first<{ id: number; name: string }>();

  let linkedReturn = requestedReturnId
    ? await db.prepare("SELECT id, order_id, support_thread_id FROM returns WHERE upper(id) = ? AND lower(email) = ? LIMIT 1").bind(requestedReturnId, from.address).first<{ id: string; order_id: string; support_thread_id: string | null }>()
    : null;
  if (linkedReturn && !order) {
    const returnOrder = await verifiedOrder(linkedReturn.order_id, from.address);
    if (!returnOrder) linkedReturn = null;
    else order = returnOrder;
  }

  type ThreadMatch = { id: string; customer_email: string; order_id: string | null; return_id: string | null; priority: SupportPriority };
  let thread = route.threadId
    ? await db.prepare("SELECT id, customer_email, order_id, return_id, priority FROM support_threads WHERE upper(id) = ? AND lower(customer_email) = ? LIMIT 1").bind(route.threadId, from.address).first<ThreadMatch>()
    : null;
  if (!thread && linkedReturn?.support_thread_id) {
    thread = await db.prepare("SELECT id, customer_email, order_id, return_id, priority FROM support_threads WHERE id = ? AND lower(customer_email) = ? LIMIT 1").bind(linkedReturn.support_thread_id, from.address).first<ThreadMatch>();
  }
  if (!thread && order) {
    thread = await db.prepare("SELECT id, customer_email, order_id, return_id, priority FROM support_threads WHERE order_id = ? AND lower(customer_email) = ? AND status != 'resolved' ORDER BY last_message_at DESC LIMIT 1").bind(order.id, from.address).first<ThreadMatch>();
  }
  if (!thread) {
    thread = await db.prepare("SELECT id, customer_email, order_id, return_id, priority FROM support_threads WHERE lower(customer_email) = ? AND lower(subject) = lower(?) AND status != 'resolved' AND last_message_at::timestamp > CURRENT_TIMESTAMP - INTERVAL '30 days' ORDER BY last_message_at DESC LIMIT 1").bind(from.address, subject).first<ThreadMatch>();
  }

  let returnId = linkedReturn?.id ?? null;
  if (!returnId && route.mailbox === "returns" && order) {
    const existing = await db.prepare("SELECT id FROM returns WHERE order_id = ? AND status NOT IN ('已拒绝','已关闭') ORDER BY created_at DESC LIMIT 1").bind(order.id).first<{ id: string }>();
    returnId = existing?.id ?? id("RET");
    if (!existing) {
      await db.prepare("INSERT INTO returns (id, order_id, email, reason, details, status, attachments_json) VALUES (?, ?, ?, ?, ?, '待审核', ?)").bind(returnId, order.id, from.address, subject, bounded(text, 4000), JSON.stringify(email.attachments ?? [])).run();
    }
  }

  const threadId = thread?.id ?? id("TKT");
  const threadPriority = thread && validSupportPriority(thread.priority) ? thread.priority : "normal";
  const deadlines = supportSlaDeadlines(threadPriority, email.created_at || new Date());
  if (!thread) {
    await db.prepare("INSERT INTO support_threads (id, mailbox, subject, customer_email, customer_name, member_id, order_id, return_id, status, first_response_due_at, resolution_due_at, last_message_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'unread', ?, ?, ?)").bind(threadId, route.mailbox, subject, from.address, from.name || member?.name || order?.customer || "", member?.id ?? order?.member_id ?? null, order?.id ?? null, returnId, deadlines.firstResponseDueAt, deadlines.resolutionDueAt, email.created_at || new Date().toISOString()).run();
  }
  if (returnId) await db.prepare("UPDATE returns SET support_thread_id = ?, attachments_json = CASE WHEN attachments_json = '[]' THEN ? ELSE attachments_json END, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(threadId, JSON.stringify(email.attachments ?? []), returnId).run();

  await db.batch([
    db.prepare("INSERT INTO support_messages (id, thread_id, direction, source, provider_email_id, provider_message_id, from_email, to_email, subject, text_body, html_body, headers_json, attachments_json, created_at) VALUES (?, ?, 'inbound', 'email', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(id("MSG"), threadId, providerEmailId, bounded(email.message_id || event.data.message_id, 500) || null, from.address, route.recipient, bounded(email.subject, 300), text, html, JSON.stringify(email.headers ?? {}), JSON.stringify(email.attachments ?? []), email.created_at || new Date().toISOString()),
    db.prepare(`UPDATE support_threads SET ${reopenResolutionSql()}, status = 'unread', archived_at = NULL, deleted_at = NULL, mailbox = CASE WHEN ? = 'returns' THEN 'returns' ELSE mailbox END, member_id = COALESCE(member_id, ?), order_id = COALESCE(order_id, ?), return_id = COALESCE(return_id, ?), last_message_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(deadlines.resolutionDueAt, route.mailbox, member?.id ?? order?.member_id ?? null, order?.id ?? null, returnId, email.created_at || new Date().toISOString(), threadId),
  ]);
  return { threadId, duplicate: false };
}

export async function createWebsiteReturnCase(input: {
  orderId: string;
  memberId: number | null;
  customer: string;
  email: string;
  phone: string;
  wechat: string;
  contactPreference: string;
  requestType: string;
  requestTypeLabel: string;
  reason: string;
  details: string;
  itemsJson: string;
  eligibilityNote: string;
}) {
  const db = await getStoreDb();
  const returnId = id("RET");
  const threadId = id("TKT");
  const subject = `售后申请 ${returnId} · ${bounded(input.reason, 120)}`;
  const itemNames = (() => {
    try {
      const items = JSON.parse(input.itemsJson) as { productName?: string; requestedQuantity?: number }[];
      return items.map((item) => `${bounded(item.productName, 160)} × ${Math.max(1, Number(item.requestedQuantity) || 1)}`).join("、");
    } catch { return "已选订单商品"; }
  })();
  const body = `售后类型：${bounded(input.requestTypeLabel, 40)}\n申请原因：${bounded(input.reason, 120)}\n首选联系方式：${bounded(input.contactPreference, 20)}\n手机：${bounded(input.phone, 20)}${input.wechat ? `\n微信：${bounded(input.wechat, 60)}` : ""}\n邮箱：${bounded(input.email, 160)}\n关联订单：${bounded(input.orderId, 64)}\n申请商品：${bounded(itemNames, 1800)}\n七日无理由识别：${bounded(input.eligibilityNote, 300)}${input.details ? `\n\n补充说明：\n${bounded(input.details, 4000)}` : ""}`;
  const deadlines = supportSlaDeadlines("normal");
  await db.batch([
    db.prepare("SELECT pg_advisory_xact_lock(hashtext(?))").bind(`return:${input.orderId}`),
    db.prepare("INSERT INTO returns (id, order_id, email, reason, details, request_type, items_json, status) SELECT ?, ?, ?, ?, ?, ?, ?, '待审核' WHERE NOT EXISTS (SELECT 1 FROM returns WHERE order_id = ? AND status NOT IN ('已拒绝','已关闭'))").bind(returnId, input.orderId, input.email, input.reason, input.details, input.requestType, input.itemsJson, input.orderId).requireChanges("该订单已有进行中的售后申请"),
    db.prepare("INSERT INTO support_threads (id, mailbox, subject, customer_email, customer_name, customer_phone, customer_wechat, member_id, order_id, return_id, status, first_response_due_at, resolution_due_at) VALUES (?, 'returns', ?, ?, ?, ?, ?, ?, ?, ?, 'unread', ?, ?)").bind(threadId, subject, input.email, input.customer, input.phone, input.wechat, input.memberId, input.orderId, returnId, deadlines.firstResponseDueAt, deadlines.resolutionDueAt),
    db.prepare("INSERT INTO support_messages (id, thread_id, direction, source, from_email, to_email, subject, text_body) VALUES (?, ?, 'inbound', 'website', ?, ?, ?, ?)").bind(id("MSG"), threadId, input.email, supportReplyAddress({ returnId }), subject, body),
    db.prepare("UPDATE returns SET support_thread_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(threadId, returnId),
    db.prepare("INSERT INTO return_events (id, return_id, event_type, to_status, note, actor) VALUES (?, ?, 'created', '待审核', ?, 'customer')").bind(id("REV"), returnId, `${input.reason}；${input.eligibilityNote}`),
  ]);
  return { returnId, threadId };
}

export async function createWebsiteSupportThread(input: { name: string; phone: string; wechat: string; email: string; category: string; contactPreference: string; orderId: string | null; memberId: number | null; message: string; submittedOrderId: string }) {
  const db = await getStoreDb();
  const threadId = id("TKT");
  const subject = `${bounded(input.category, 40)} · ${bounded(input.name, 60)}`;
  const orderNote = input.submittedOrderId ? input.orderId ? `\n关联订单：${input.orderId}` : `\n客户填写订单号：${bounded(input.submittedOrderId, 64)}（联系方式未匹配，未自动关联）` : "";
  const body = `首选联系方式：${bounded(input.contactPreference, 20)}\n手机：${bounded(input.phone, 20)}${input.wechat ? `\n微信：${bounded(input.wechat, 60)}` : ""}${input.email ? `\n邮箱：${bounded(input.email, 160)}` : ""}${orderNote}\n\n${bounded(input.message, 4000)}`;
  const deadlines = supportSlaDeadlines("normal");
  await db.batch([
    db.prepare("INSERT INTO support_threads (id, mailbox, subject, customer_email, customer_name, customer_phone, customer_wechat, member_id, order_id, status, first_response_due_at, resolution_due_at) VALUES (?, 'service', ?, ?, ?, ?, ?, ?, ?, 'unread', ?, ?)").bind(threadId, subject, input.email, input.name, input.phone, input.wechat, input.memberId, input.orderId, deadlines.firstResponseDueAt, deadlines.resolutionDueAt),
    db.prepare("INSERT INTO support_messages (id, thread_id, direction, source, from_email, to_email, subject, text_body) VALUES (?, ?, 'inbound', 'website', ?, ?, ?, ?)").bind(id("MSG"), threadId, input.email, supportReplyAddress({ mailbox: "service" }), subject, body),
  ]);
  return threadId;
}

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

export async function recordReturnStatusChange(input: { returnId: string; status: string; actor: string; note?: string }) {
  const db = await getStoreDb();
  const current = await db.prepare("SELECT id, status, support_thread_id FROM returns WHERE id = ? LIMIT 1").bind(input.returnId).first<{ id: string; status: string; support_thread_id: string | null }>();
  if (!current) throw new Error("售后申请不存在");
  if (current.status === input.status) return;
  const statements = [
    db.prepare("UPDATE returns SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(input.status, input.returnId),
    db.prepare("INSERT INTO return_events (id, return_id, event_type, from_status, to_status, note, actor) VALUES (?, ?, 'status_changed', ?, ?, ?, ?)").bind(id("REV"), input.returnId, current.status, input.status, bounded(input.note, 1000), input.actor),
  ];
  if (current.support_thread_id) {
    statements.push(
      db.prepare("INSERT INTO support_messages (id, thread_id, direction, source, from_email, to_email, subject, text_body) SELECT ?, id, 'system', 'return_status', ?, customer_email, ?, ? FROM support_threads WHERE id = ?").bind(id("MSG"), input.actor, `售后状态更新：${input.returnId}`, `售后状态已从“${current.status}”更新为“${input.status}”。${input.note ? `\n${bounded(input.note, 1000)}` : ""}`, current.support_thread_id),
      db.prepare("UPDATE support_threads SET updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(current.support_thread_id),
    );
  }
  await db.batch(statements);
  const { notifyReturnUpdated } = await import("../notifications/business");
  await notifyReturnUpdated(input.returnId, input.status, input.note ?? "").catch(() => undefined);
}
