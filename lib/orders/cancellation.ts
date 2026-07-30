import { getStoreDb } from "../../db/store";
import { createRefund } from "../payments/service";
import { notifyOrderCancelled } from "../notifications/business";
import { releaseOrderReservation } from "./reservations";

export async function cancelOrder(input: { orderId: string; reason: string; origin: string; memberId?: number }) {
  const db = await getStoreDb();
  const reason = input.reason.trim().slice(0, 200) || "客户申请取消";
  const order = await db.prepare("SELECT id, member_id, status, resources_committed, resources_released FROM orders WHERE id = ?").bind(input.orderId).first<{ id: string; member_id: number | null; status: string; resources_committed: number; resources_released: number }>();
  if (!order || (input.memberId && order.member_id !== input.memberId)) throw new Error("订单不存在");
  if (["已取消", "已退款"].includes(order.status)) throw new Error("订单已经关闭");
  if (["已发货", "已完成"].includes(order.status)) throw new Error("订单已经发货，请通过售后申请处理");

  const payment = await db.prepare(`SELECT p.*,
    COALESCE((SELECT SUM(r.amount_fen) FROM refunds r WHERE r.payment_id = p.id AND r.status IN ('pending','processing','succeeded')), 0) AS refunded_fen
    FROM payments p WHERE p.order_id = ? AND p.status IN ('paid','partially_refunded') ORDER BY p.created_at DESC LIMIT 1`).bind(order.id).first<{ id: string; amount_fen: number; refunded_fen: number }>();

  await db.prepare("UPDATE orders SET cancel_reason = ?, cancel_requested_at = COALESCE(cancel_requested_at, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(reason, order.id).run();
  if (!payment) {
    if (!await releaseOrderReservation(order.id)) throw new Error("订单当前不能取消");
    await db.prepare("UPDATE orders SET cancelled_at = CURRENT_TIMESTAMP, cancel_reason = ? WHERE id = ?").bind(reason, order.id).run();
    await notifyOrderCancelled(order.id, reason).catch(() => undefined);
    return { outcome: "cancelled", refundId: null };
  }

  const refundable = Number(payment.amount_fen) - Number(payment.refunded_fen);
  if (refundable <= 0) throw new Error("订单没有可退金额");
  const refund = await createRefund(payment.id, refundable, `取消订单：${reason}`.slice(0, 80), input.origin) as { id?: string } | null;
  await notifyOrderCancelled(order.id, reason).catch(() => undefined);
  return { outcome: "refund_started", refundId: refund?.id ?? null };
}
