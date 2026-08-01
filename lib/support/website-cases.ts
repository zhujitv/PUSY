import { getStoreDb } from "../../db/store";
import { supportSlaDeadlines } from "./sla";
import { bounded, id, supportReplyAddress } from "./shared";

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
