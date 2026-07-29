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
  const order = await orderContact(orderId);
  if (!order) return;
  await enqueueNotification({ eventKey: `order-shipped:${order.id}`, entityType: "order", entityId: order.id, templateKey: "order_shipped", email: order.email, phone: order.phone, payload: { customer: order.customer, orderId: order.id, delivery: order.delivery } });
}

export async function notifyRefundCompleted(refundId: string) {
  const db = await getStoreDb();
  const refund = await db.prepare("SELECT r.id, r.order_id, r.amount_fen, r.status, o.customer, o.email, o.phone, p.amount_fen AS payment_amount FROM refunds r JOIN orders o ON o.id = r.order_id JOIN payments p ON p.id = r.payment_id WHERE r.id = ?").bind(refundId).first<{ id: string; order_id: string; amount_fen: number; status: string; customer: string; email: string; phone: string; payment_amount: number }>();
  if (!refund || refund.status !== "succeeded") return;
  await enqueueNotification({ eventKey: `refund-completed:${refund.id}`, entityType: "refund", entityId: refund.id, templateKey: "refund_completed", email: refund.email, phone: refund.phone, payload: { customer: refund.customer, orderId: refund.order_id, refundAmount: fenToCny(refund.amount_fen), refundStatus: refund.amount_fen >= refund.payment_amount ? "全额退款" : "部分退款" } });
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

