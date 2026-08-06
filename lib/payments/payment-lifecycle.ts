import { getStoreDb } from "../../db/store";
import { notifyGiftCards, notifyOrderConfirmed } from "../notifications/business";
import { syncOrderPoints } from "../growth/loyalty";
import { syncPaidOrderGrowth } from "../growth/member-program";
import { commitPaidOrder, refreshOrderMemberTotals, releaseExpiredOrderReservations } from "../orders/reservations";
import { sha256 } from "./crypto";
import { paymentAdapter } from "./index";
import { paymentId, providerConfig, retryAt, tradeNo, type DbPayment } from "./payment-shared";
import type { PaymentProviderName, PaymentStatus } from "./types";
import { captureWalletPayment, createPaymentAllocation, releaseWalletPayment } from "../wallet/payment-allocation";
import { markCommunityOrderPaid } from "../community/attribution";

export async function createPayment(orderId: string, provider: PaymentProviderName, origin: string, options: { memberId?: number; paymentPassword?: string } = {}) {
  await releaseExpiredOrderReservations();
  const db = await getStoreDb();
  const order = await db.prepare("SELECT id, member_id, total, status, reservation_expires_at, resources_released FROM orders WHERE id = ?").bind(orderId).first<{ id: string; member_id: number | null; total: number; status: string; reservation_expires_at: string | null; resources_released: number }>();
  if (!order) throw new Error("订单不存在");
  if (["已取消", "已退款"].includes(order.status) || order.resources_released || (order.reservation_expires_at && new Date(order.reservation_expires_at).getTime() <= Date.now())) throw new Error("订单支付时限已过，请重新下单");
  const totalFen = Math.round(order.total * 12);
  const merchantTradeNo = tradeNo(order.id, provider);
  let payment = await db.prepare("SELECT * FROM payments WHERE merchant_trade_no = ? AND provider = ? ORDER BY created_at DESC LIMIT 1").bind(merchantTradeNo, provider).first<DbPayment>();
  if (payment?.status === "paid") {
    await applyPaymentStatus(payment, "paid", payment.provider_transaction_id ?? undefined);
    return db.prepare("SELECT * FROM payments WHERE id = ?").bind(payment.id).first<DbPayment>();
  }
  const walletPreview = !payment && order.member_id ? await db.prepare("SELECT available_balance_fen FROM member_wallets WHERE member_id = ? AND status = 'active' LIMIT 1").bind(order.member_id).first<{ available_balance_fen: number }>() : null;
  if (!payment && Number(walletPreview?.available_balance_fen ?? 0) < totalFen) {
    const previewConfig = await providerConfig(provider);
    const previewAdapter = paymentAdapter(provider);
    if (!previewConfig.enabled) throw new Error(`${provider === "wechat" ? "微信支付" : "支付宝"}尚未启用`);
    if (!previewAdapter.configured(previewConfig)) throw new Error(`${provider === "wechat" ? "微信支付" : "支付宝"}商户参数或服务器密钥未配置完整`);
  }
  const competing = await db.prepare("SELECT provider FROM payments WHERE order_id = ? AND provider != ? AND status IN ('created','pending','failed') LIMIT 1").bind(order.id, provider).first<{ provider: PaymentProviderName }>();
  if (!payment && competing) throw new Error("该订单已有其他渠道支付处理中，请先完成或取消原支付");
  if (!payment) {
    const id = paymentId();
    payment = await createPaymentAllocation({ paymentId: id, order: { id: order.id, member_id: order.member_id, totalFen }, provider, merchantTradeNo, memberId: options.memberId, paymentPassword: options.paymentPassword });
  }
  if (!payment) throw new Error("支付记录创建失败");
  if (payment.external_amount_fen === 0) {
    await applyPaymentStatus(payment, "paid", `WALLET-${payment.id}`);
    return db.prepare("SELECT * FROM payments WHERE id = ?").bind(payment.id).first<DbPayment>();
  }
  const config = await providerConfig(provider);
  const adapter = paymentAdapter(provider);
  if (!config.enabled) throw new Error(`${provider === "wechat" ? "微信支付" : "支付宝"}尚未启用`);
  if (!adapter.configured(config)) throw new Error(`${provider === "wechat" ? "微信支付" : "支付宝"}商户参数或服务器密钥未配置完整`);
  try {
    const returnParams = new URLSearchParams({ orderId: order.id, provider });
    const result = await adapter.create(config, { orderId: order.id, tradeNo: payment.merchant_trade_no, amountFen: payment.external_amount_fen, description: `PUSY.CN 订单 ${order.id}`, notifyUrl: `${origin}/api/payments/webhooks/${provider}`, returnUrl: `${origin}/checkout/payment?${returnParams.toString()}` });
    await db.batch([
      db.prepare("UPDATE payments SET status = ?, checkout_url = ?, code_url = ?, attempts = attempts + 1, last_error = NULL, next_retry_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(result.status, result.checkoutUrl ?? null, result.codeUrl ?? null, payment.id),
      db.prepare("UPDATE orders SET status = '待付款', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status NOT IN ('已确认','已完成')").bind(order.id),
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "支付下单失败";
    await db.prepare("UPDATE payments SET status = 'failed', attempts = attempts + 1, last_error = ?, next_retry_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(message, retryAt(payment.attempts), payment.id).run();
    throw new Error(message);
  }
  return await db.prepare("SELECT * FROM payments WHERE id = ?").bind(payment.id).first<DbPayment>();
}

export async function syncPayment(paymentIdValue: string) {
  const db = await getStoreDb();
  const payment = await db.prepare("SELECT * FROM payments WHERE id = ?").bind(paymentIdValue).first<DbPayment>();
  if (!payment) throw new Error("支付记录不存在");
  if (payment.external_amount_fen === 0) {
    if (payment.status !== "paid") await applyPaymentStatus(payment, "paid", `WALLET-${payment.id}`);
    return db.prepare("SELECT * FROM payments WHERE id = ?").bind(payment.id).first<DbPayment>();
  }
  const config = await providerConfig(payment.provider);
  const result = await paymentAdapter(payment.provider).query(config, payment.merchant_trade_no);
  await applyPaymentStatus(payment, result.status, result.providerTransactionId, result.paidAt, result.message);
  return await db.prepare("SELECT * FROM payments WHERE id = ?").bind(payment.id).first<DbPayment>();
}

export async function applyPaymentStatus(payment: DbPayment, status: PaymentStatus, providerTransactionId?: string, paidAt?: string, message?: string) {
  const db = await getStoreDb();
  const resolvedStatus: PaymentStatus =
    payment.status === "refunded" ? "refunded" :
    payment.status === "partially_refunded" && status !== "refunded" ? "partially_refunded" :
    payment.status === "paid" && ["created", "pending", "failed", "closed"].includes(status) ? "paid" :
    status;
  const order = await db.prepare("SELECT status FROM orders WHERE id = ?").bind(payment.order_id).first<{ status: string }>();
  const fulfillmentStatuses = ["配货中", "已发货", "已完成"];
  const orderStatus =
    resolvedStatus === "paid" ? (order && fulfillmentStatuses.includes(order.status) ? order.status : "已确认") :
    resolvedStatus === "partially_refunded" ? "部分退款" :
    resolvedStatus === "failed" || resolvedStatus === "closed" ? (order?.status === "已取消" ? "已取消" : "支付失败") :
    resolvedStatus === "refunding" ? "退款中" :
    resolvedStatus === "refunded" ? "已退款" :
    order?.status === "已取消" ? "已取消" : "待付款";
  if (resolvedStatus === "paid" && payment.wallet_status === "held") await captureWalletPayment(payment.id);
  if (resolvedStatus === "closed" && payment.wallet_status === "held") await releaseWalletPayment(payment.order_id, "第三方支付关闭，余额冻结退回");
  await db.batch([
    db.prepare("UPDATE payments SET status = ?, provider_transaction_id = COALESCE(?, provider_transaction_id), paid_at = COALESCE(?, paid_at), last_error = ?, next_retry_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(resolvedStatus, providerTransactionId ?? null, paidAt ?? (resolvedStatus === "paid" ? new Date().toISOString() : null), message ?? null, payment.id),
    db.prepare("UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(orderStatus, payment.order_id),
  ]);
  if (resolvedStatus === "paid") await Promise.all([commitPaidOrder(payment.order_id), markCommunityOrderPaid(payment.order_id).catch(() => undefined)]);
  if (resolvedStatus === "paid" && payment.status !== "paid") {
    await Promise.all([notifyOrderConfirmed(payment.order_id), notifyGiftCards(payment.order_id), syncOrderPoints(payment.order_id), syncPaidOrderGrowth(payment.order_id)]).catch(() => undefined);
  }
  await refreshOrderMemberTotals(payment.order_id);
  if (["paid", "partially_refunded", "refunded"].includes(resolvedStatus)) await syncOrderPoints(payment.order_id).catch(() => undefined);
}

export async function processPaymentWebhook(provider: PaymentProviderName, event: { eventId: string; eventType: string; body: string; resource: Record<string, unknown> }) {
  const db = await getStoreDb();
  const duplicate = await db.prepare("SELECT id FROM payment_events WHERE id = ?").bind(event.eventId).first();
  if (duplicate) return { duplicate: true };
  const tradeNo = String(event.resource.out_trade_no ?? "");
  const payment = await db.prepare("SELECT * FROM payments WHERE merchant_trade_no = ? AND provider = ? LIMIT 1").bind(tradeNo, provider).first<DbPayment>();
  const digest = await sha256(event.body);
  if (!payment) {
    await db.prepare("INSERT INTO payment_events (id, provider, event_type, payload_digest, verified, result, message) VALUES (?, ?, ?, ?, 1, 'ignored', '未找到支付记录')").bind(event.eventId, provider, event.eventType, digest).run();
    throw new Error("未找到支付记录");
  }
  const config = await providerConfig(provider);
  const amountFen = provider === "wechat" ? Number((event.resource.amount as Record<string, unknown> | undefined)?.total) : Math.round(Number(event.resource.total_amount) * 100);
  const appMatches = provider === "wechat" ? String(event.resource.appid) === config.app_id && String(event.resource.mchid) === config.merchant_id : String(event.resource.app_id) === config.app_id && (!config.merchant_id || String(event.resource.seller_id) === config.merchant_id);
  if (amountFen !== payment.external_amount_fen || !appMatches) {
    await db.prepare("INSERT INTO payment_events (id, payment_id, provider, event_type, payload_digest, verified, result, message) VALUES (?, ?, ?, ?, ?, 1, 'rejected', '订单金额或商户身份不匹配')").bind(event.eventId, payment.id, provider, event.eventType, digest).run();
    throw new Error("通知业务数据校验失败");
  }
  const rawState = provider === "wechat" ? String(event.resource.trade_state ?? "") : String(event.resource.trade_status ?? "");
  const status: PaymentStatus = provider === "wechat" ? (rawState === "SUCCESS" ? "paid" : rawState === "REFUND" ? "refunded" : rawState === "CLOSED" ? "closed" : "pending") : (["TRADE_SUCCESS", "TRADE_FINISHED"].includes(rawState) ? "paid" : rawState === "TRADE_CLOSED" ? "closed" : "pending");
  await applyPaymentStatus(payment, status, String(event.resource.transaction_id ?? event.resource.trade_no ?? "") || undefined, String(event.resource.success_time ?? event.resource.gmt_payment ?? "") || undefined);
  await db.prepare("INSERT INTO payment_events (id, payment_id, provider, event_type, payload_digest, verified, result) VALUES (?, ?, ?, ?, ?, 1, 'processed')").bind(event.eventId, payment.id, provider, event.eventType, digest).run();
  return { duplicate: false, paymentId: payment.id };
}
