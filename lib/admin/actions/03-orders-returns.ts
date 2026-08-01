import { roleCan } from "../../admin-permissions";
import { addShipmentEvent, shipOrder } from "../../logistics/service";
import { cancelOrder } from "../../orders/cancellation";
import { createRefund } from "../../payments/service";
import { recordReturnStatusChange } from "../../support/service";

const orderStatuses = ["待付款", "支付失败", "待处理", "已确认", "配货中", "已发货", "已完成", "退款中", "部分退款", "已退款", "已取消"];
const memberStatuses = ["active", "vip", "blocked"];
const returnStatuses = ["待审核", "已批准", "补发处理中", "退款中", "已退款", "已拒绝", "已关闭"];
import type { AdminActionContext, AdminActionResult } from "./action-context";

export async function handleOrderReturnAction(context: AdminActionContext): Promise<AdminActionResult> {
  const { action, payload, db, actor, request } = context;
  if (action === "bulk-update-order-status") {
      const ids = [...new Set((Array.isArray(payload.ids) ? payload.ids : []).map((id) => String(id)).filter((id) => /^PUSY-[A-Z0-9-]{8,64}$/.test(id)))].slice(0, 100);
      const status = String(payload.status ?? "");
      if (!ids.length || !["配货中", "已完成"].includes(status)) return Response.json({ error: "请选择有效订单和批量处理状态；发货必须逐单填写物流单号" }, { status: 400 });
      for (const id of ids) {
        const order = await db.prepare("SELECT resources_committed FROM orders WHERE id = ? LIMIT 1").bind(id).first<{ resources_committed: number }>();
        const payment = await db.prepare("SELECT status FROM payments WHERE order_id = ? AND status IN ('paid','partially_refunded') ORDER BY created_at DESC LIMIT 1").bind(id).first<{ status: string }>();
        if (!order || !order.resources_committed || !payment) return Response.json({ error: `订单 ${id} 尚未完成付款，不能批量进入履约状态` }, { status: 409 });
      }
      await db.batch(ids.map((id) => db.prepare("UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(status, id)));
    } else if (action === "ship-order") {
      await shipOrder({ orderId: String(payload.orderId ?? ""), carrierCode: String(payload.carrierCode ?? ""), trackingNumber: String(payload.trackingNumber ?? ""), actor: actor.email });
    } else if (action === "add-shipment-event") {
      await addShipmentEvent({ shipmentId: String(payload.shipmentId ?? ""), status: String(payload.status ?? ""), description: String(payload.description ?? ""), location: String(payload.location ?? ""), actor: actor.email });
    } else if (action === "cancel-order") {
      await cancelOrder({ orderId: String(payload.orderId ?? ""), reason: String(payload.reason ?? "后台取消订单"), origin: new URL(request.url).origin });
    } else if (action === "update-order-status") {
      const status = String(payload.status ?? "");
      if (!orderStatuses.includes(status)) return Response.json({ error: "订单状态无效" }, { status: 400 });
      if (!roleCan(actor.role, "orders.manage") && !["配货中", "已发货", "已完成"].includes(status)) return Response.json({ error: "仓库账号只能更新订单履约状态" }, { status: 403 });
      const orderId = String(payload.id ?? "");
      const order = await db.prepare("SELECT id, status, resources_committed, resources_released FROM orders WHERE id = ? LIMIT 1").bind(orderId).first<{ id: string; status: string; resources_committed: number; resources_released: number }>();
      if (!order) return Response.json({ error: "订单不存在" }, { status: 404 });
      const payment = await db.prepare("SELECT status FROM payments WHERE order_id = ? AND status IN ('paid','partially_refunded','refunding','refunded') ORDER BY created_at DESC LIMIT 1").bind(orderId).first<{ status: string }>();
      const financiallySettled = Boolean(payment);
      const fulfillable = Boolean(payment && ["paid", "partially_refunded"].includes(payment.status));
      if (["待付款", "支付失败", "已确认", "退款中", "部分退款", "已退款"].includes(status) && status !== order.status) return Response.json({ error: "该状态由支付与退款系统自动维护" }, { status: 409 });
      if (status === "已发货") return Response.json({ error: "请使用发货操作填写物流公司和单号" }, { status: 409 });
      if (status === "已取消") {
        if (financiallySettled || order.resources_committed) return Response.json({ error: "已支付订单不能直接取消，请通过退款流程处理" }, { status: 409 });
        await cancelOrder({ orderId, reason: String(payload.reason ?? "后台取消未付款订单"), origin: new URL(request.url).origin });
        return Response.json({ ok: true });
      }
      if (["配货中", "已发货", "已完成"].includes(status) && (!fulfillable || !order.resources_committed)) return Response.json({ error: "订单尚未完成付款，不能进入履约状态" }, { status: 409 });
      await db.prepare("UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(status, orderId).run();
    } else if (action === "update-member-status") {
      const status = String(payload.status ?? "");
      if (!memberStatuses.includes(status)) return Response.json({ error: "会员状态无效" }, { status: 400 });
      await db.prepare("UPDATE members SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(status, Number(payload.id)).run();
    } else if (action === "update-subscriber-status") {
      const status = String(payload.status ?? "");
      if (!["active", "unsubscribed"].includes(status)) return Response.json({ error: "订阅状态无效" }, { status: 400 });
      await db.prepare("UPDATE subscribers SET status = ? WHERE id = ?").bind(status, Number(payload.id)).run();
    } else if (action === "update-return-status") {
      const status = String(payload.status ?? "");
      if (!returnStatuses.includes(status)) return Response.json({ error: "售后状态无效" }, { status: 400 });
      if (["退款中", "已退款"].includes(status)) return Response.json({ error: "退款状态只能由真实退款流程更新" }, { status: 409 });
      await recordReturnStatusChange({ returnId: String(payload.id), status, actor: actor.email, note: String(payload.note ?? "").trim().slice(0, 1000) });
    } else if (action === "update-return-logistics") {
      const carrier = String(payload.carrier ?? "").trim().slice(0, 60);
      const trackingNumber = String(payload.trackingNumber ?? "").trim().replace(/\s+/g, "").slice(0, 64);
      if (!carrier || !/^[A-Za-z0-9-]{5,64}$/.test(trackingNumber)) return Response.json({ error: "请填写有效退回物流公司和单号" }, { status: 400 });
      const result = await db.prepare("UPDATE returns SET return_carrier = ?, return_tracking_number = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(carrier, trackingNumber, String(payload.id ?? "")).run();
      if (!result.meta.changes) return Response.json({ error: "售后申请不存在" }, { status: 404 });
    } else if (action === "approve-return-refund") {
      const returnId = String(payload.id ?? "");
      const item = await db.prepare(`SELECT r.id, r.order_id, r.refund_id, p.id AS payment_id, p.amount_fen,
        COALESCE((SELECT SUM(rr.amount_fen) FROM refunds rr WHERE rr.payment_id = p.id AND rr.status IN ('pending','processing','succeeded')), 0) AS refunded_fen
        FROM returns r JOIN payments p ON p.order_id = r.order_id AND p.status IN ('paid','partially_refunded') WHERE r.id = ? ORDER BY p.created_at DESC LIMIT 1`).bind(returnId).first<{ id: string; order_id: string; refund_id: string | null; payment_id: string; amount_fen: number; refunded_fen: number }>();
      if (!item || item.refund_id) return Response.json({ error: item?.refund_id ? "该售后单已经关联退款" : "未找到可退款的支付记录" }, { status: 409 });
      const remaining = Number(item.amount_fen) - Number(item.refunded_fen);
      const requested = payload.amountYuan ? Math.round(Number(payload.amountYuan) * 100) : remaining;
      if (!Number.isInteger(requested) || requested <= 0 || requested > remaining) return Response.json({ error: "退款金额超过可退余额" }, { status: 400 });
      const refund = await createRefund(item.payment_id, requested, `售后单 ${returnId}：${String(payload.reason ?? "审核退款")}`.slice(0, 80), new URL(request.url).origin) as { id?: string } | null;
      await recordReturnStatusChange({ returnId, status: "退款中", actor: actor.email, note: String(payload.reason ?? "审核通过并发起退款") });
      await db.prepare("UPDATE returns SET refund_id = ?, requested_amount_fen = ?, reviewed_at = CURRENT_TIMESTAMP, resolution = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(refund?.id ?? null, requested, String(payload.reason ?? "审核通过并原路退款").slice(0, 1000), returnId).run();
  } else return false;
  return true;
}
