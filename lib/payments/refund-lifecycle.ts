import { getStoreDb } from "../../db/store";
import { notifyRefundCompleted } from "../notifications/business";
import { restockCancelledPaidOrder } from "../orders/reservations";
import { sha256 } from "./crypto";
import { paymentAdapter } from "./index";
import { applyPaymentStatus } from "./payment-lifecycle";
import { providerConfig, refundId, retryAt, type DbPayment, type DbRefund } from "./payment-shared";
import type { PaymentStatus, RefundStatus } from "./types";

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
  if (status === "refunded") await restockCancelledPaidOrder(payment.order_id);
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
