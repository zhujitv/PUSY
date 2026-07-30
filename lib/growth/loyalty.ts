import { getStoreDb } from "../../db/store";
import { pointsFromStoredAmount } from "./loyalty-rules";
export { pointsFromStoredAmount, tierForLifetimePoints, tierRules, type MemberTier } from "./loyalty-rules";

export async function syncOrderPoints(orderId: string) {
  const db = await getStoreDb();
  const order = await db.prepare(`
    SELECT o.id, o.member_id, o.total, o.points_awarded, o.status,
      COALESCE((SELECT ROUND(SUM(r.amount_fen) / 12.0)::INTEGER FROM refunds r WHERE r.order_id = o.id AND r.status = 'succeeded'), 0) AS refunded
    FROM orders o WHERE o.id = ? LIMIT 1
  `).bind(orderId).first<{ id: string; member_id: number | null; total: number; points_awarded: number; status: string; refunded: number }>();
  if (!order?.member_id) return null;
  const eligible = !["待付款", "支付失败", "已取消"].includes(order.status);
  const desired = eligible ? pointsFromStoredAmount(Math.max(0, order.total - order.refunded)) : 0;
  if (desired === order.points_awarded) return null;
  const delta = desired - order.points_awarded;
  const referenceId = `${order.id}:${desired}`;
  const result = await db.prepare(`
    WITH changed_order AS (
      UPDATE orders
      SET points_awarded = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND member_id = ? AND points_awarded = ?
      RETURNING member_id
    ), changed_member AS (
      UPDATE members m
      SET points_balance = GREATEST(0, m.points_balance + ?),
          lifetime_points = m.lifetime_points + GREATEST(?, 0),
          tier = CASE
            WHEN m.lifetime_points + GREATEST(?, 0) >= 5000 THEN 'diamond'
            WHEN m.lifetime_points + GREATEST(?, 0) >= 2000 THEN 'gold'
            WHEN m.lifetime_points + GREATEST(?, 0) >= 500 THEN 'silver'
            ELSE 'bronze'
          END,
          updated_at = CURRENT_TIMESTAMP
      FROM changed_order c
      WHERE m.id = c.member_id
      RETURNING m.id, m.points_balance
    )
    INSERT INTO member_points_ledger (member_id, points, balance_after, reason, reference_type, reference_id)
    SELECT id, ?, points_balance, ?, 'order', ? FROM changed_member
    ON CONFLICT (member_id, reference_type, reference_id) DO NOTHING
    RETURNING member_id, points, balance_after
  `).bind(desired, order.id, order.member_id, order.points_awarded, delta, delta, delta, delta, delta, delta, delta >= 0 ? `订单 ${order.id} 消费积分` : `订单 ${order.id} 退款扣回积分`, referenceId).all<{ member_id: number; points: number; balance_after: number }>();
  return result.results[0] ?? null;
}

export async function adjustMemberPoints(memberId: number, points: number, reason: string, referenceId = crypto.randomUUID()) {
  if (!Number.isInteger(points) || !points) throw new Error("积分调整必须为非零整数");
  const db = await getStoreDb();
  const result = await db.prepare(`
    WITH changed_member AS (
      UPDATE members
      SET points_balance = GREATEST(0, points_balance + ?),
          lifetime_points = lifetime_points + GREATEST(?, 0),
          tier = CASE
            WHEN lifetime_points + GREATEST(?, 0) >= 5000 THEN 'diamond'
            WHEN lifetime_points + GREATEST(?, 0) >= 2000 THEN 'gold'
            WHEN lifetime_points + GREATEST(?, 0) >= 500 THEN 'silver'
            ELSE 'bronze'
          END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND points_balance + ? >= 0
      RETURNING id, points_balance
    )
    INSERT INTO member_points_ledger (member_id, points, balance_after, reason, reference_type, reference_id)
    SELECT id, ?, points_balance, ?, 'manual', ? FROM changed_member
    ON CONFLICT (member_id, reference_type, reference_id) DO NOTHING
    RETURNING member_id, points, balance_after
  `).bind(points, points, points, points, points, memberId, points, points, reason.slice(0, 120), referenceId).all<{ member_id: number; points: number; balance_after: number }>();
  if (!result.results[0]) throw new Error("会员不存在、积分不足或该调整已执行");
  return result.results[0];
}
