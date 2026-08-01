export type WalletSummary = {
  availableBalanceFen: number;
  frozenBalanceFen: number;
  status: "active" | "frozen";
  paymentPasswordSet: boolean;
  accountPasswordSet: boolean;
  passwordLockedUntil: string | null;
};

export type WalletLedgerEntry = {
  id: number;
  entry_type: "hold" | "capture" | "release" | "refund" | "adjustment";
  amount_fen: number;
  available_balance_after_fen: number;
  frozen_balance_after_fen: number;
  order_id: string | null;
  reference_id: string;
  note: string;
  created_at: string;
};
