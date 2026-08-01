import { getStoreDb } from "../../db/store";
import type { WalletLedgerEntry, WalletSummary } from "./types";

export async function ensureMemberWallet(memberId: number) {
  const db = await getStoreDb();
  await db.prepare("INSERT INTO member_wallets (member_id) VALUES (?) ON CONFLICT (member_id) DO NOTHING").bind(memberId).run();
}

export async function getMemberWallet(memberId: number) {
  await ensureMemberWallet(memberId);
  const db = await getStoreDb();
  const [wallet, credential, ledger] = await Promise.all([
    db.prepare(`SELECT available_balance_fen, frozen_balance_fen, status, payment_password_hash IS NOT NULL AS payment_password_set,
      password_locked_until FROM member_wallets WHERE member_id = ? LIMIT 1`).bind(memberId).first<{ available_balance_fen: number; frozen_balance_fen: number; status: "active" | "frozen"; payment_password_set: boolean; password_locked_until: string | null }>(),
    db.prepare("SELECT 1 AS found FROM member_credentials WHERE member_id = ? LIMIT 1").bind(memberId).first<{ found: number }>(),
    db.prepare(`SELECT id, entry_type, amount_fen, available_balance_after_fen, frozen_balance_after_fen, order_id, reference_id, note, created_at
      FROM member_wallet_ledger WHERE member_id = ? ORDER BY created_at::timestamp DESC, id DESC LIMIT 100`).bind(memberId).all<WalletLedgerEntry>(),
  ]);
  const summary: WalletSummary = {
    availableBalanceFen: Number(wallet?.available_balance_fen ?? 0),
    frozenBalanceFen: Number(wallet?.frozen_balance_fen ?? 0),
    status: wallet?.status === "frozen" ? "frozen" : "active",
    paymentPasswordSet: Boolean(wallet?.payment_password_set),
    accountPasswordSet: Boolean(credential),
    passwordLockedUntil: wallet?.password_locked_until ?? null,
  };
  return { summary, ledger: ledger.results.map((entry) => ({ ...entry, amount_fen: Number(entry.amount_fen), available_balance_after_fen: Number(entry.available_balance_after_fen), frozen_balance_after_fen: Number(entry.frozen_balance_after_fen) })) };
}

export async function adjustMemberWallet(input: { memberId: number; amountFen: number; reason: string; actor: string; referenceId: string }) {
  if (!Number.isInteger(input.amountFen) || input.amountFen === 0 || Math.abs(input.amountFen) > 10_000_000) throw new Error("余额调整金额无效");
  const db = await getStoreDb();
  await ensureMemberWallet(input.memberId);
  await db.batch([
    db.prepare("SELECT pg_advisory_xact_lock(?)").bind(input.memberId),
    db.prepare(`UPDATE member_wallets SET available_balance_fen = available_balance_fen + ?, updated_at = CURRENT_TIMESTAMP::TEXT
      WHERE member_id = ? AND available_balance_fen + ? >= 0
        AND NOT EXISTS (SELECT 1 FROM member_wallet_ledger WHERE idempotency_key = ?)
      RETURNING member_id`).bind(input.amountFen, input.memberId, input.amountFen, `wallet-adjust:${input.referenceId}`).requireChanges("余额调整已处理，或会员余额不足"),
    db.prepare(`INSERT INTO member_wallet_ledger (member_id, entry_type, amount_fen, available_balance_after_fen, frozen_balance_after_fen, reference_id, idempotency_key, note, actor)
      SELECT member_id, 'adjustment', ?, available_balance_fen, frozen_balance_fen, ?, ?, ?, ? FROM member_wallets WHERE member_id = ?
      ON CONFLICT (idempotency_key) DO NOTHING`).bind(input.amountFen, input.referenceId, `wallet-adjust:${input.referenceId}`, input.reason.slice(0, 200), input.actor.slice(0, 160), input.memberId),
  ]);
}
