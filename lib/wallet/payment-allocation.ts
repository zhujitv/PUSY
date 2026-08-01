import { getStoreDb } from "../../db/store";
import type { DbPayment } from "../payments/payment-shared";
import type { PaymentProviderName } from "../payments/types";
import { verifyPaymentPassword } from "./security";
import { ensureMemberWallet } from "./service";

export async function createPaymentAllocation(input: {
  paymentId: string;
  order: { id: string; member_id: number | null; totalFen: number };
  provider: PaymentProviderName;
  merchantTradeNo: string;
  memberId?: number;
  paymentPassword?: string;
}) {
  const db = await getStoreDb();
  let walletAmountFen = 0;
  if (input.order.member_id) {
    await ensureMemberWallet(input.order.member_id);
    const wallet = await db.prepare("SELECT available_balance_fen FROM member_wallets WHERE member_id = ? AND status = 'active' LIMIT 1")
      .bind(input.order.member_id).first<{ available_balance_fen: number }>();
    walletAmountFen = Math.min(input.order.totalFen, Number(wallet?.available_balance_fen ?? 0));
    if (walletAmountFen > 0) {
      if (input.memberId !== input.order.member_id) throw new Error("请重新登录会员账户后使用余额支付");
      await verifyPaymentPassword(input.order.member_id, input.paymentPassword ?? "");
    }
  }
  const externalAmountFen = input.order.totalFen - walletAmountFen;
  const statements = [db.prepare(`INSERT INTO payments
    (id, order_id, provider, merchant_trade_no, amount_fen, wallet_amount_fen, external_amount_fen, wallet_status, status)
    SELECT ?, ?, ?, ?, ?, ?, ?, ?, 'created'
    WHERE NOT EXISTS (SELECT 1 FROM payments WHERE order_id = ? AND status IN ('created','pending','failed'))`)
    .bind(input.paymentId, input.order.id, input.provider, input.merchantTradeNo, input.order.totalFen, walletAmountFen, externalAmountFen, walletAmountFen ? "held" : "none", input.order.id)
    .requireChanges("该订单已有支付处理中，请先完成原支付")];
  if (walletAmountFen && input.order.member_id) {
    statements.unshift(db.prepare(`UPDATE member_wallets SET available_balance_fen = available_balance_fen - ?, frozen_balance_fen = frozen_balance_fen + ?, updated_at = CURRENT_TIMESTAMP::TEXT
      WHERE member_id = ? AND status = 'active' AND available_balance_fen >= ? RETURNING member_id`)
      .bind(walletAmountFen, walletAmountFen, input.order.member_id, walletAmountFen).requireChanges("账户余额发生变化，请重新确认支付"));
    statements.push(db.prepare(`INSERT INTO member_wallet_ledger
      (member_id, payment_id, order_id, entry_type, amount_fen, available_balance_after_fen, frozen_balance_after_fen, reference_id, idempotency_key, note)
      SELECT member_id, ?, ?, 'hold', ?, available_balance_fen, frozen_balance_fen, ?, ?, '订单支付余额冻结'
      FROM member_wallets WHERE member_id = ?`)
      .bind(input.paymentId, input.order.id, -walletAmountFen, input.paymentId, `wallet-hold:${input.paymentId}`, input.order.member_id));
  }
  await db.batch([db.prepare("SELECT pg_advisory_xact_lock(hashtext(?))").bind(input.order.id), ...statements]);
  return db.prepare("SELECT * FROM payments WHERE id = ?").bind(input.paymentId).first<DbPayment>();
}

export async function captureWalletPayment(paymentId: string) {
  const db = await getStoreDb();
  const payment = await db.prepare(`SELECT p.*, o.member_id FROM payments p JOIN orders o ON o.id = p.order_id WHERE p.id = ? LIMIT 1`)
    .bind(paymentId).first<DbPayment & { member_id: number | null }>();
  if (!payment || !payment.wallet_amount_fen || payment.wallet_status === "captured") return;
  if (payment.wallet_status !== "held" || !payment.member_id) throw new Error("订单余额冻结状态异常，请人工核对");
  await db.batch([
    db.prepare("SELECT pg_advisory_xact_lock(hashtext(?))").bind(payment.order_id),
    db.prepare(`UPDATE member_wallets SET frozen_balance_fen = frozen_balance_fen - ?, updated_at = CURRENT_TIMESTAMP::TEXT
      WHERE member_id = ? AND frozen_balance_fen >= ? RETURNING member_id`).bind(payment.wallet_amount_fen, payment.member_id, payment.wallet_amount_fen).requireChanges("订单冻结余额不足，请人工核对"),
    db.prepare("UPDATE payments SET wallet_status = 'captured', updated_at = CURRENT_TIMESTAMP::TEXT WHERE id = ? AND wallet_status = 'held'").bind(payment.id).requireChanges("余额支付已经处理"),
    db.prepare(`INSERT INTO member_wallet_ledger
      (member_id, payment_id, order_id, entry_type, amount_fen, available_balance_after_fen, frozen_balance_after_fen, reference_id, idempotency_key, note)
      SELECT member_id, ?, ?, 'capture', ?, available_balance_fen, frozen_balance_fen, ?, ?, '订单余额支付完成'
      FROM member_wallets WHERE member_id = ? ON CONFLICT (idempotency_key) DO NOTHING`)
      .bind(payment.id, payment.order_id, -payment.wallet_amount_fen, payment.id, `wallet-capture:${payment.id}`, payment.member_id),
  ]);
}

export async function releaseWalletPayment(orderId: string, note: string) {
  const db = await getStoreDb();
  const payment = await db.prepare(`SELECT p.*, o.member_id FROM payments p JOIN orders o ON o.id = p.order_id
    WHERE p.order_id = ? AND p.wallet_status = 'held' ORDER BY p.created_at DESC LIMIT 1`)
    .bind(orderId).first<DbPayment & { member_id: number | null }>();
  if (!payment?.member_id || !payment.wallet_amount_fen) return false;
  await db.batch([
    db.prepare("SELECT pg_advisory_xact_lock(hashtext(?))").bind(orderId),
    db.prepare(`UPDATE member_wallets SET available_balance_fen = available_balance_fen + ?, frozen_balance_fen = frozen_balance_fen - ?, updated_at = CURRENT_TIMESTAMP::TEXT
      WHERE member_id = ? AND frozen_balance_fen >= ? RETURNING member_id`).bind(payment.wallet_amount_fen, payment.wallet_amount_fen, payment.member_id, payment.wallet_amount_fen).requireChanges("冻结余额释放失败"),
    db.prepare("UPDATE payments SET wallet_status = 'released', updated_at = CURRENT_TIMESTAMP::TEXT WHERE id = ? AND wallet_status = 'held'").bind(payment.id).requireChanges("余额冻结已经释放"),
    db.prepare(`INSERT INTO member_wallet_ledger
      (member_id, payment_id, order_id, entry_type, amount_fen, available_balance_after_fen, frozen_balance_after_fen, reference_id, idempotency_key, note)
      SELECT member_id, ?, ?, 'release', ?, available_balance_fen, frozen_balance_fen, ?, ?, ?
      FROM member_wallets WHERE member_id = ? ON CONFLICT (idempotency_key) DO NOTHING`)
      .bind(payment.id, orderId, payment.wallet_amount_fen, payment.id, `wallet-release:${payment.id}`, note.slice(0, 200), payment.member_id),
  ]);
  return true;
}
