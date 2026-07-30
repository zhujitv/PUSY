import { getStoreDb } from "../../db/store";
import { enqueueNotification } from "./service";

const storedToCny = (value: number) => `${(value * 0.12).toFixed(2)} 元`;
const fenToCny = (value: number) => `${(value / 100).toFixed(2)} 元`;

type OrderContact = { id: string; customer: string; email: string; phone: string; delivery: string; total: number };

async function orderContact(orderId: string) {
  const db = await getStoreDb();
  return db.prepare("SELECT id, customer, email, phone, delivery, total FROM orders WHERE id = ?").bind(orderId).first<OrderContact>();
}

export async function notifyOrderConfirmed(orderId: string) {
  const order = await orderContact(orderId);
  if (!order) return;
  await enqueueNotification({ eventKey: `order-confirmed:${order.id}`, entityType: "order", entityId: order.id, templateKey: "order_confirmed", email: order.email, phone: order.phone, payload: { customer: order.customer, orderId: order.id, amount: storedToCny(order.total) } });
}

export async function notifyOrderShipped(orderId: string) {
  const db = await getStoreDb();
  const order = await db.prepare(`SELECT o.id, o.customer, o.email, o.phone, o.delivery, o.total,
    COALESCE(s.carrier_name, o.delivery) AS carrier, COALESCE(s.tracking_number, '') AS tracking_number,
    COALESCE(s.tracking_url, '') AS tracking_url
    FROM orders o LEFT JOIN shipments s ON s.order_id = o.id WHERE o.id = ?`).bind(orderId).first<OrderContact & { carrier: string; tracking_number: string; tracking_url: string }>();
  if (!order) return;
  await enqueueNotification({ eventKey: `order-shipped:${order.id}:${order.tracking_number || "manual"}`, entityType: "order", entityId: order.id, templateKey: "order_shipped", email: order.email, phone: order.phone, payload: { customer: order.customer, orderId: order.id, delivery: order.delivery, carrier: order.carrier, trackingNumber: order.tracking_number || "待承运商更新", trackingUrl: order.tracking_url || "https://pusy.cn/account" } });
}

export async function notifyOrderCancelled(orderId: string, reason: string) {
  const order = await orderContact(orderId);
  if (!order) return;
  await enqueueNotification({ eventKey: `order-cancelled:${order.id}`, entityType: "order", entityId: order.id, templateKey: "order_cancelled", email: order.email, phone: order.phone, payload: { customer: order.customer, orderId: order.id, reason: reason || "客户申请取消" } });
}

export async function notifyReturnUpdated(returnId: string, status: string, note = "") {
  const db = await getStoreDb();
  const item = await db.prepare("SELECT r.id, r.order_id, o.customer, o.email, o.phone FROM returns r JOIN orders o ON o.id = r.order_id WHERE r.id = ?").bind(returnId).first<{ id: string; order_id: string; customer: string; email: string; phone: string }>();
  if (!item) return;
  await enqueueNotification({ eventKey: `return-updated:${item.id}:${status}`, entityType: "return", entityId: item.id, templateKey: "return_updated", email: item.email, phone: item.phone, payload: { customer: item.customer, orderId: item.order_id, returnId: item.id, status, note } });
}

export async function notifyLowStock(orderId: string) {
  const db = await getStoreDb();
  const items = await db.prepare(`SELECT DISTINCT p.slug, p.name, p.stock, p.low_stock_threshold
    FROM products p JOIN order_items oi ON oi.product_slug = p.slug
    WHERE oi.order_id = ? AND p.inventory_verified = 1 AND p.stock <= p.low_stock_threshold`).bind(orderId).all<{ slug: string; name: string; stock: number; low_stock_threshold: number }>();
  const recipient = (process.env.INVENTORY_ALERT_EMAIL || process.env.CHINA_SUPPORT_EMAIL || process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  if (!recipient) return;
  for (const item of items.results) await enqueueNotification({ eventKey: `low-stock:${orderId}:${item.slug}`, entityType: "product", entityId: item.slug, templateKey: "low_stock_alert", email: recipient, payload: { productName: item.name, productSlug: item.slug, stock: String(item.stock), threshold: String(item.low_stock_threshold) } });
}

export async function notifyRefundCompleted(refundId: string) {
  const db = await getStoreDb();
  const refund = await db.prepare("SELECT r.id, r.order_id, r.amount_fen, r.status, o.customer, o.email, o.phone, p.amount_fen AS payment_amount, COALESCE((SELECT SUM(rr.amount_fen) FROM refunds rr WHERE rr.payment_id = r.payment_id AND rr.status = 'succeeded'), 0) AS succeeded_refund_total FROM refunds r JOIN orders o ON o.id = r.order_id JOIN payments p ON p.id = r.payment_id WHERE r.id = ?").bind(refundId).first<{ id: string; order_id: string; amount_fen: number; status: string; customer: string; email: string; phone: string; payment_amount: number; succeeded_refund_total: number }>();
  if (!refund || refund.status !== "succeeded") return;
  await enqueueNotification({ eventKey: `refund-completed:${refund.id}`, entityType: "refund", entityId: refund.id, templateKey: "refund_completed", email: refund.email, phone: refund.phone, payload: { customer: refund.customer, orderId: refund.order_id, refundAmount: fenToCny(refund.amount_fen), refundStatus: refund.succeeded_refund_total >= refund.payment_amount ? "全额退款" : "部分退款" } });
  const linkedReturn = await db.prepare("SELECT id, status FROM returns WHERE refund_id = ? LIMIT 1").bind(refund.id).first<{ id: string; status: string }>();
  if (linkedReturn && linkedReturn.status !== "已退款") {
    const { recordReturnStatusChange } = await import("../support/service");
    await recordReturnStatusChange({ returnId: linkedReturn.id, status: "已退款", actor: "payment-system", note: `退款 ${refund.id} 已由支付渠道确认成功` });
    await db.prepare("UPDATE returns SET completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(linkedReturn.id).run();
  }
}

export async function notifyGiftCards(orderId: string) {
  const db = await getStoreDb();
  const order = await orderContact(orderId);
  if (!order) return;
  const cards = await db.prepare("SELECT code, balance, recipient_name, recipient_email, message, delivery_date FROM gift_cards WHERE order_id = ? AND status = 'active'").bind(orderId).all<{ code: string; balance: number; recipient_name: string; recipient_email: string; message: string; delivery_date: string | null }>();
  for (const card of cards.results) {
    if (!card.recipient_email) continue;
    const requested = card.delivery_date ? new Date(`${card.delivery_date}T01:00:00.000Z`) : new Date();
    const scheduledAt = requested.getTime() > Date.now() ? requested.toISOString() : new Date().toISOString();
    await enqueueNotification({ eventKey: `gift-card-sent:${card.code}`, entityType: "gift_card", entityId: card.code, templateKey: "gift_card_sent", email: card.recipient_email, payload: { recipientName: card.recipient_name || "朋友", senderName: order.customer, giftCode: card.code, amount: storedToCny(card.balance), message: card.message || "送你一份选择的自由" }, scheduledAt });
  }
}
