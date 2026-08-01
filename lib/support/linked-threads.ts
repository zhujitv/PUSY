import { getStoreDb } from "../../db/store";
import { supportSlaDeadlines, validSupportPriority } from "./sla";
import { bounded, id, reopenResolutionSql, type SupportActor } from "./shared";

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
