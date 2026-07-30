import { getStoreDb } from "../../db/store";
import { paymentAdapter } from "./index";
import { sha256 } from "./crypto";
import type { PaymentProviderName, PaymentStatus, ProviderConfig, RefundStatus } from "./types";
import { notifyGiftCards, notifyOrderConfirmed, notifyRefundCompleted } from "../notifications/business";
import { commitPaidOrder, refreshOrderMemberTotals, releaseExpiredOrderReservations } from "../orders/reservations";

type DbPayment = { id: string; order_id: string; provider: PaymentProviderName; merchant_trade_no: string; provider_transaction_id: string | null; amount_fen: number; status: PaymentStatus; checkout_url: string | null; code_url: string | null; attempts: number };
type DbRefund = { id: string; payment_id: string; order_id: string; provider: PaymentProviderName; merchant_refund_no: string; provider_refund_id: string | null; amount_fen: number; reason: string; status: RefundStatus; attempts: number };

export async function providerConfig(provider: PaymentProviderName) {
  const db = await getStoreDb();
  const config = await db.prepare("SELECT * FROM payment_providers WHERE provider = ?").bind(provider).first<ProviderConfig>();
  if (!config) throw new Error("支付渠道不存在");
  return config;
}

export async function paymentProviderState() {
  const db = await getStoreDb();
  const rows = await db.prepare("SELECT * FROM payment_providers ORDER BY provider").all<ProviderConfig>();
  return rows.results.map((config) => ({ ...config, configured: paymentAdapter(config.provider).configured(config), secrets: { privateKey: config.provider === "wechat" ? Boolean(process.env.WECHAT_PAY_PRIVATE_KEY) : Boolean(process.env.ALIPAY_PRIVATE_KEY), publicKey: config.provider === "wechat" ? Boolean(process.env.WECHAT_PAY_PUBLIC_KEY) : Boolean(process.env.ALIPAY_PUBLIC_KEY), apiV3Key: config.provider === "wechat" ? Boolean(process.env.WECHAT_PAY_API_V3_KEY) : undefined } }));
}

function retryAt(attempts: number) { const seconds = [5, 30, 60, 180, 300, 600, 1800][Math.min(attempts, 6)]; return new Date(Date.now() + seconds * 1000).toISOString(); }
function tradeNo(orderId: string, provider: PaymentProviderName) {
  const suffix = provider === "wechat" ? "W" : "A";
  return `${orderId.replace(/[^A-Za-z0-9_*-]/g, "").slice(0, 30)}${suffix}`;
}
function paymentId() { return `PAY-${crypto.randomUUID().slice(0, 12).toUpperCase()}`; }
function refundId() { return `REF-${crypto.randomUUID().slice(0, 12).toUpperCase()}`; }

export async function createPayment(orderId: string, provider: PaymentProviderName, origin: string) {
  await releaseExpiredOrderReservations();
  const db = await getStoreDb();
  const order = await db.prepare("SELECT id, total, status, reservation_expires_at, resources_released FROM orders WHERE id = ?").bind(orderId).first<{ id: string; total: number; status: string; reservation_expires_at: string | null; resources_released: number }>();
  if (!order) throw new Error("订单不存在");
  if (["已取消", "已退款"].includes(order.status) || order.resources_released || (order.reservation_expires_at && new Date(order.reservation_expires_at).getTime() <= Date.now())) throw new Error("订单支付时限已过，请重新下单");
  const config = await providerConfig(provider);
  const adapter = paymentAdapter(provider);
  if (!config.enabled) throw new Error(`${provider === "wechat" ? "微信支付" : "支付宝"}尚未启用`);
  if (!adapter.configured(config)) throw new Error(`${provider === "wechat" ? "微信支付" : "支付宝"}商户参数或服务器密钥未配置完整`);
  const merchantTradeNo = tradeNo(order.id, provider);
  let payment = await db.prepare("SELECT * FROM payments WHERE merchant_trade_no = ? AND provider = ? ORDER BY created_at DESC LIMIT 1").bind(merchantTradeNo, provider).first<DbPayment>();
  if (payment?.status === "paid") return payment;
  if (!payment) {
    const id = paymentId();
    await db.prepare("INSERT INTO payments (id, order_id, provider, merchant_trade_no, amount_fen, status) VALUES (?, ?, ?, ?, ?, 'created')").bind(id, order.id, provider, merchantTradeNo, Math.round(order.total * 12)).run();
    payment = await db.prepare("SELECT * FROM payments WHERE id = ?").bind(id).first<DbPayment>();
  }
  if (!payment) throw new Error("支付记录创建失败");
  try {
    const returnParams = new URLSearchParams({ orderId: order.id, provider });
    const result = await adapter.create(config, { orderId: order.id, tradeNo: payment.merchant_trade_no, amountFen: payment.amount_fen, description: `PUSY.CN 订单 ${order.id}`, notifyUrl: `${origin}/api/payments/webhooks/${provider}`, returnUrl: `${origin}/checkout/payment?${returnParams.toString()}` });
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
  await db.batch([
    db.prepare("UPDATE payments SET status = ?, provider_transaction_id = COALESCE(?, provider_transaction_id), paid_at = COALESCE(?, paid_at), last_error = ?, next_retry_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(resolvedStatus, providerTransactionId ?? null, paidAt ?? (resolvedStatus === "paid" ? new Date().toISOString() : null), message ?? null, payment.id),
    db.prepare("UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(orderStatus, payment.order_id),
  ]);
  if (resolvedStatus === "paid" && payment.status !== "paid") {
    await commitPaidOrder(payment.order_id);
    await Promise.all([notifyOrderConfirmed(payment.order_id), notifyGiftCards(payment.order_id)]).catch(() => undefined);
  }
  await refreshOrderMemberTotals(payment.order_id);
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
  if (amountFen !== payment.amount_fen || !appMatches) {
    await db.prepare("INSERT INTO payment_events (id, payment_id, provider, event_type, payload_digest, verified, result, message) VALUES (?, ?, ?, ?, ?, 1, 'rejected', '订单金额或商户身份不匹配')").bind(event.eventId, payment.id, provider, event.eventType, digest).run();
    throw new Error("通知业务数据校验失败");
  }
  const rawState = provider === "wechat" ? String(event.resource.trade_state ?? "") : String(event.resource.trade_status ?? "");
  const status: PaymentStatus = provider === "wechat" ? (rawState === "SUCCESS" ? "paid" : rawState === "REFUND" ? "refunded" : rawState === "CLOSED" ? "closed" : "pending") : (["TRADE_SUCCESS", "TRADE_FINISHED"].includes(rawState) ? "paid" : rawState === "TRADE_CLOSED" ? "closed" : "pending");
  await applyPaymentStatus(payment, status, String(event.resource.transaction_id ?? event.resource.trade_no ?? "") || undefined, String(event.resource.success_time ?? event.resource.gmt_payment ?? "") || undefined);
  await db.prepare("INSERT INTO payment_events (id, payment_id, provider, event_type, payload_digest, verified, result) VALUES (?, ?, ?, ?, ?, 1, 'processed')").bind(event.eventId, payment.id, provider, event.eventType, digest).run();
  return { duplicate: false, paymentId: payment.id };
}

export async function createRefund(paymentIdValue: string, amountFen: number, reason: string, origin: string) {
  const db = await getStoreDb();
  const payment = await db.prepare("SELECT * FROM payments WHERE id = ?").bind(paymentIdValue).first<DbPayment>();
  if (!payment || !["paid", "partially_refunded"].includes(payment.status)) throw new Error("仅已支付订单可以退款");
  if (!Number.isInteger(amountFen) || amountFen <= 0) throw new Error("退款金额无效");
  const id = refundId();
  const merchantRefundNo = id.replaceAll("-", "").slice(0, 32);
  await db.batch([
    db.prepare("SELECT pg_advisory_xact_lock(hashtext(?))").bind(payment.id),
    db.prepare(`
      INSERT INTO refunds (id, payment_id, order_id, provider, merchant_refund_no, amount_fen, reason)
      SELECT ?, p.id, p.order_id, p.provider, ?, ?, ?
      FROM payments p
      WHERE p.id = ?
        AND p.status IN ('paid','partially_refunded')
        AND ? <= p.amount_fen - COALESCE((SELECT SUM(r.amount_fen) FROM refunds r WHERE r.payment_id = p.id AND r.status IN ('pending','processing','succeeded')), 0)
    `).bind(id, merchantRefundNo, amountFen, reason, payment.id, amountFen).requireChanges("退款金额超过可退余额"),
  ]);
  return retryRefund(id, origin);
}

export async function retryRefund(refundIdValue: string, origin: string) {
  const db = await getStoreDb();
  const refund = await db.prepare("SELECT * FROM refunds WHERE id = ?").bind(refundIdValue).first<DbRefund>();
  if (!refund) throw new Error("退款记录不存在");
  const payment = await db.prepare("SELECT * FROM payments WHERE id = ?").bind(refund.payment_id).first<DbPayment>();
  if (!payment) throw new Error("支付记录不存在");
  try {
    const config = await providerConfig(refund.provider);
    const result = await paymentAdapter(refund.provider).refund(config, { tradeNo: payment.merchant_trade_no, transactionId: payment.provider_transaction_id ?? undefined, refundNo: refund.merchant_refund_no, amountFen: refund.amount_fen, totalFen: payment.amount_fen, reason: refund.reason, notifyUrl: `${origin}/api/payments/webhooks/${refund.provider}/refund` });
    await db.prepare("UPDATE refunds SET status = ?, provider_refund_id = COALESCE(?, provider_refund_id), attempts = attempts + 1, last_error = ?, next_retry_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(result.status, result.providerRefundId ?? null, result.message ?? null, refund.id).run();
    await updateRefundRollup(payment.id);
    await notifyRefundCompleted(refund.id).catch(() => undefined);
  } catch (error) {
    const message = error instanceof Error ? error.message : "退款请求失败";
    await db.prepare("UPDATE refunds SET status = 'failed', attempts = attempts + 1, last_error = ?, next_retry_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(message, retryAt(refund.attempts), refund.id).run();
    throw new Error(message);
  }
  return db.prepare("SELECT * FROM refunds WHERE id = ?").bind(refund.id).first<DbRefund>();
}

export async function updateRefundRollup(paymentIdValue: string) {
  const db = await getStoreDb();
  const payment = await db.prepare("SELECT * FROM payments WHERE id = ?").bind(paymentIdValue).first<DbPayment>();
  if (!payment) return;
  const sums = await db.prepare("SELECT COALESCE(SUM(CASE WHEN status = 'succeeded' THEN amount_fen ELSE 0 END), 0) AS succeeded, COALESCE(SUM(CASE WHEN status IN ('pending','processing') THEN amount_fen ELSE 0 END), 0) AS processing FROM refunds WHERE payment_id = ?").bind(payment.id).first<{ succeeded: number; processing: number }>();
  const status: PaymentStatus = (sums?.succeeded ?? 0) >= payment.amount_fen ? "refunded" : (sums?.processing ?? 0) > 0 ? "refunding" : (sums?.succeeded ?? 0) > 0 ? "partially_refunded" : "paid";
  await applyPaymentStatus(payment, status);
}

export async function syncRefund(refundIdValue: string) {
  const db = await getStoreDb();
  const refund = await db.prepare("SELECT * FROM refunds WHERE id = ?").bind(refundIdValue).first<DbRefund>();
  if (!refund) throw new Error("退款记录不存在");
  const payment = await db.prepare("SELECT * FROM payments WHERE id = ?").bind(refund.payment_id).first<DbPayment>();
  if (!payment) throw new Error("支付记录不存在");
  const config = await providerConfig(refund.provider);
  const result = await paymentAdapter(refund.provider).queryRefund(config, refund.merchant_refund_no, payment.merchant_trade_no);
  await db.prepare("UPDATE refunds SET status = ?, provider_refund_id = COALESCE(?, provider_refund_id), last_error = ?, next_retry_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(result.status, result.providerRefundId ?? null, result.message ?? null, refund.id).run();
  await updateRefundRollup(payment.id);
  await notifyRefundCompleted(refund.id).catch(() => undefined);
  return db.prepare("SELECT * FROM refunds WHERE id = ?").bind(refund.id).first<DbRefund>();
}

export async function processWechatRefundWebhook(event: { eventId: string; eventType: string; body: string; resource: Record<string, unknown> }) {
  const db = await getStoreDb();
  const duplicate = await db.prepare("SELECT id FROM payment_events WHERE id = ?").bind(event.eventId).first();
  if (duplicate) return { duplicate: true };
  const refundNo = String(event.resource.out_refund_no ?? "");
  const refund = await db.prepare("SELECT * FROM refunds WHERE merchant_refund_no = ? AND provider = 'wechat'").bind(refundNo).first<DbRefund>();
  const digest = await sha256(event.body);
  if (!refund) throw new Error("未找到退款记录");
  const payment = await db.prepare("SELECT * FROM payments WHERE id = ?").bind(refund.payment_id).first<DbPayment>();
  const config = await providerConfig("wechat");
  const amount = event.resource.amount as Record<string, unknown> | undefined;
  if (!payment || String(event.resource.mchid) !== config.merchant_id || String(event.resource.out_trade_no) !== payment.merchant_trade_no || Number(amount?.refund) !== refund.amount_fen) throw new Error("退款通知业务数据校验失败");
  const state = String(event.resource.refund_status ?? "");
  const status: RefundStatus = state === "SUCCESS" ? "succeeded" : state === "CLOSED" || state === "ABNORMAL" ? "failed" : "processing";
  await db.batch([
    db.prepare("UPDATE refunds SET status = ?, provider_refund_id = COALESCE(?, provider_refund_id), updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(status, String(event.resource.refund_id ?? "") || null, refund.id),
    db.prepare("INSERT INTO payment_events (id, payment_id, provider, event_type, payload_digest, verified, result) VALUES (?, ?, 'wechat', ?, ?, 1, 'processed')").bind(event.eventId, refund.payment_id, event.eventType, digest),
  ]);
  await updateRefundRollup(refund.payment_id);
  await notifyRefundCompleted(refund.id).catch(() => undefined);
  return { duplicate: false };
}
