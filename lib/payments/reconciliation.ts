import { getStoreDb } from "../../db/store";

export type ReconciliationRow = {
  payment_id: string; order_id: string; provider: string; merchant_trade_no: string; provider_transaction_id: string | null;
  payment_status: string; order_status: string; amount_fen: number; external_amount_fen: number; succeeded_refund_fen: number; pending_refund_fen: number;
  net_fen: number; resources_committed: number; paid_at: string | null; updated_at: string; anomalies: string[];
};

export function reconciliationAnomalies(row: Omit<ReconciliationRow, "anomalies">) {
  const anomalies: string[] = [];
  if (row.external_amount_fen > 0 && ["paid", "partially_refunded", "refunding", "refunded"].includes(row.payment_status) && !row.provider_transaction_id) anomalies.push("缺少渠道交易号");
  if (["paid", "partially_refunded"].includes(row.payment_status) && !row.resources_committed) anomalies.push("已支付但库存未确认");
  if (row.succeeded_refund_fen + row.pending_refund_fen > row.amount_fen) anomalies.push("退款金额超过支付金额");
  if (row.payment_status === "refunded" && row.succeeded_refund_fen < row.amount_fen) anomalies.push("支付状态与退款合计不一致");
  if (row.order_status === "已退款" && row.payment_status !== "refunded") anomalies.push("订单与支付状态不一致");
  if (["待付款", "支付失败", "已取消"].includes(row.order_status) && ["paid", "partially_refunded"].includes(row.payment_status)) anomalies.push("已收款订单处于关闭状态");
  return anomalies;
}

export async function paymentReconciliation(limit = 1000) {
  const db = await getStoreDb();
  const rows = await db.prepare(`SELECT p.id AS payment_id, p.order_id, p.provider, p.merchant_trade_no, p.provider_transaction_id,
    p.status AS payment_status, o.status AS order_status, p.amount_fen, p.external_amount_fen,
    COALESCE(SUM(r.amount_fen) FILTER (WHERE r.status = 'succeeded'), 0)::INTEGER AS succeeded_refund_fen,
    COALESCE(SUM(r.amount_fen) FILTER (WHERE r.status IN ('pending','processing')), 0)::INTEGER AS pending_refund_fen,
    (p.amount_fen - COALESCE(SUM(r.amount_fen) FILTER (WHERE r.status = 'succeeded'), 0))::INTEGER AS net_fen,
    o.resources_committed, p.paid_at, p.updated_at
    FROM payments p JOIN orders o ON o.id = p.order_id LEFT JOIN refunds r ON r.payment_id = p.id
    GROUP BY p.id, o.id ORDER BY p.updated_at DESC LIMIT ?`).bind(Math.min(Math.max(limit, 1), 5000)).all<Omit<ReconciliationRow, "anomalies">>();
  const items = rows.results.map((row) => ({ ...row, anomalies: reconciliationAnomalies(row) }));
  return {
    items,
    summary: {
      paymentCount: items.length,
      paidFen: items.filter((item) => ["paid", "partially_refunded", "refunding", "refunded"].includes(item.payment_status)).reduce((sum, item) => sum + Number(item.amount_fen), 0),
      refundedFen: items.reduce((sum, item) => sum + Number(item.succeeded_refund_fen), 0),
      netFen: items.filter((item) => ["paid", "partially_refunded", "refunding", "refunded"].includes(item.payment_status)).reduce((sum, item) => sum + Number(item.net_fen), 0),
      anomalyCount: items.filter((item) => item.anomalies.length).length,
    },
  };
}
