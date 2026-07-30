BEGIN;

UPDATE members m
SET total_orders = (
      SELECT COUNT(*)
      FROM orders o
      WHERE o.member_id = m.id
        AND o.status NOT IN ('待付款', '支付失败', '已取消', '已退款')
    ),
    total_spent = COALESCE((
      SELECT SUM(GREATEST(
        o.total - COALESCE((
          SELECT ROUND(SUM(r.amount_fen) / 12.0)::INTEGER
          FROM refunds r
          WHERE r.order_id = o.id AND r.status = 'succeeded'
        ), 0),
        0
      ))
      FROM orders o
      WHERE o.member_id = m.id
        AND o.status NOT IN ('待付款', '支付失败', '已取消', '已退款')
    ), 0),
    updated_at = CURRENT_TIMESTAMP;

COMMIT;
