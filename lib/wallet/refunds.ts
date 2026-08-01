import { getStoreDb } from "../../db/store";
import type { DbRefund } from "../payments/payment-shared";

export async function creditWalletRefund(refundId: string) {
  const db = await getStoreDb();
  const refund = await db.prepare(`SELECT r.*, o.member_id FROM refunds r JOIN orders o ON o.id = r.order_id WHERE r.id = ? LIMIT 1`)
    .bind(refundId).first<DbRefund & { member_id: number | null }>();
  if (!refund?.member_id || !refund.wallet_amount_fen || refund.wallet_credited) return;
  await db.batch([
    db.prepare("SELECT pg_advisory_xact_lock(hashtext(?))").bind(refund.order_id),
    db.prepare("UPDATE member_wallets SET available_balance_fen = available_balance_fen + ?, updated_at = CURRENT_TIMESTAMP::TEXT WHERE member_id = ? RETURNING member_id")
      .bind(refund.wallet_amount_fen, refund.member_id).requireChanges("退款余额入账失败"),
    db.prepare("UPDATE refunds SET wallet_credited = 1, updated_at = CURRENT_TIMESTAMP::TEXT WHERE id = ? AND wallet_credited = 0").bind(refund.id).requireChanges("退款余额已经入账"),
    db.prepare(`UPDATE payments SET wallet_status = CASE WHEN wallet_amount_fen <= (
      SELECT COALESCE(SUM(wallet_amount_fen), 0) FROM refunds WHERE payment_id = ? AND status = 'succeeded'
    ) THEN 'refunded' ELSE wallet_status END, updated_at = CURRENT_TIMESTAMP::TEXT WHERE id = ?`).bind(refund.payment_id, refund.payment_id),
    db.prepare(`INSERT INTO member_wallet_ledger
      (member_id, payment_id, order_id, entry_type, amount_fen, available_balance_after_fen, frozen_balance_after_fen, reference_id, idempotency_key, note)
      SELECT member_id, ?, ?, 'refund', ?, available_balance_fen, frozen_balance_fen, ?, ?, '订单退款退回账户余额'
      FROM member_wallets WHERE member_id = ? ON CONFLICT (idempotency_key) DO NOTHING`)
      .bind(refund.payment_id, refund.order_id, refund.wallet_amount_fen, refund.id, `wallet-refund:${refund.id}`, refund.member_id),
  ]);
}
