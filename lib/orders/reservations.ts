import { getStoreDb } from "../../db/store";

export async function releaseExpiredOrderReservations(limit = 50) {
  const db = await getStoreDb();
  const rows = await db.prepare(`
    SELECT id, coupon_code, discount
    FROM orders
    WHERE resources_committed = 0
      AND resources_released = 0
      AND reservation_expires_at IS NOT NULL
      AND reservation_expires_at::timestamp <= CURRENT_TIMESTAMP
      AND status IN ('待付款', '支付失败')
    ORDER BY reservation_expires_at
    LIMIT ?
  `).bind(Math.min(Math.max(limit, 1), 100)).all<{ id: string; coupon_code: string | null; discount: number }>();

  for (const order of rows.results) await releaseOrderReservation(order.id).catch(() => undefined);
  return rows.results.length;
}

export async function releaseOrderReservation(orderId: string) {
  const db = await getStoreDb();
  const order = await db.prepare("SELECT id, coupon_code, discount, resources_committed, resources_released FROM orders WHERE id = ? LIMIT 1").bind(orderId).first<{ id: string; coupon_code: string | null; discount: number; resources_committed: number; resources_released: number }>();
  if (!order || order.resources_committed || order.resources_released) return false;
  const statements = [
    db.prepare("UPDATE orders SET resources_released = 1, status = '已取消', cancelled_at = COALESCE(cancelled_at, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP WHERE id = ? AND resources_committed = 0 AND resources_released = 0").bind(order.id).requireChanges("订单资源已经释放"),
    db.prepare("UPDATE products p SET stock = p.stock + oi.quantity, updated_at = CURRENT_TIMESTAMP FROM order_items oi WHERE oi.order_id = ? AND oi.product_slug = p.slug").bind(order.id),
    db.prepare(`INSERT INTO inventory_movements (product_slug, order_id, movement_type, quantity, stock_after, reference_id)
      SELECT oi.product_slug, oi.order_id, 'release', oi.quantity, p.stock, oi.order_id
      FROM order_items oi JOIN products p ON p.slug = oi.product_slug WHERE oi.order_id = ?
      ON CONFLICT (product_slug, movement_type, reference_id) DO NOTHING`).bind(order.id),
    db.prepare("UPDATE gift_cards SET status = 'void' WHERE order_id = ? AND status = 'pending'").bind(order.id),
  ];
  if (order.coupon_code) {
    statements.push(db.prepare("UPDATE coupons SET used_count = GREATEST(used_count - 1, 0) WHERE code = ?").bind(order.coupon_code));
    statements.push(db.prepare("UPDATE coupon_assignments SET status = 'available', used_at = NULL, order_id = NULL WHERE order_id = ? AND status = 'used'").bind(order.id));
    statements.push(db.prepare("UPDATE gift_cards SET balance = balance + ?, status = 'active' WHERE code = ? AND order_id != ?").bind(order.discount, order.coupon_code, order.id));
  }
  await db.batch(statements);
  return true;
}

export async function commitPaidOrder(orderId: string) {
  const db = await getStoreDb();
  const order = await db.prepare("SELECT resources_committed, resources_released FROM orders WHERE id = ? LIMIT 1").bind(orderId).first<{ resources_committed: number; resources_released: number }>();
  if (!order || order.resources_committed) return;
  if (order.resources_released) throw new Error("订单资源预留已过期，请人工核对已支付订单");
  await db.batch([
    db.prepare("UPDATE orders SET resources_committed = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND resources_committed = 0 AND resources_released = 0").bind(orderId).requireChanges("订单资源无法确认"),
    db.prepare("UPDATE gift_cards SET status = 'active' WHERE order_id = ? AND status = 'pending'").bind(orderId),
    db.prepare(`INSERT INTO inventory_movements (product_slug, order_id, movement_type, quantity, stock_after, reference_id)
      SELECT oi.product_slug, oi.order_id, 'commit', 0, p.stock, oi.order_id
      FROM order_items oi JOIN products p ON p.slug = oi.product_slug WHERE oi.order_id = ?
      ON CONFLICT (product_slug, movement_type, reference_id) DO NOTHING`).bind(orderId),
  ]);
}

export async function restockCancelledPaidOrder(orderId: string) {
  const db = await getStoreDb();
  const order = await db.prepare(`SELECT o.id, o.resources_committed, o.inventory_restocked, o.cancel_requested_at,
    EXISTS(SELECT 1 FROM shipments s WHERE s.order_id = o.id) AS has_shipment
    FROM orders o WHERE o.id = ? LIMIT 1`).bind(orderId).first<{ id: string; resources_committed: number; inventory_restocked: number; cancel_requested_at: string | null; has_shipment: boolean }>();
  if (!order?.resources_committed || order.inventory_restocked || !order.cancel_requested_at || order.has_shipment) return false;
  await db.batch([
    db.prepare("UPDATE orders SET inventory_restocked = 1, cancelled_at = COALESCE(cancelled_at, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP WHERE id = ? AND inventory_restocked = 0").bind(order.id).requireChanges("取消订单库存已经回补"),
    db.prepare("UPDATE products p SET stock = p.stock + oi.quantity, updated_at = CURRENT_TIMESTAMP FROM order_items oi WHERE oi.order_id = ? AND oi.product_slug = p.slug").bind(order.id),
    db.prepare(`INSERT INTO inventory_movements (product_slug, order_id, movement_type, quantity, stock_after, reference_id)
      SELECT oi.product_slug, oi.order_id, 'refund_restock', oi.quantity, p.stock, oi.order_id
      FROM order_items oi JOIN products p ON p.slug = oi.product_slug WHERE oi.order_id = ?
      ON CONFLICT (product_slug, movement_type, reference_id) DO NOTHING`).bind(order.id),
  ]);
  return true;
}

export async function refreshOrderMemberTotals(orderId: string) {
  const db = await getStoreDb();
  const order = await db.prepare("SELECT member_id FROM orders WHERE id = ? LIMIT 1").bind(orderId).first<{ member_id: number | null }>();
  if (!order?.member_id) return;
  await db.prepare(`
    UPDATE members SET
      total_orders = (SELECT COUNT(*) FROM orders o WHERE o.member_id = ? AND o.status NOT IN ('待付款','支付失败','已取消','已退款')),
      total_spent = COALESCE((
        SELECT SUM(GREATEST(o.total - COALESCE((SELECT ROUND(SUM(r.amount_fen) / 12.0)::INTEGER FROM refunds r WHERE r.order_id = o.id AND r.status = 'succeeded'), 0), 0))
        FROM orders o
        WHERE o.member_id = ? AND o.status NOT IN ('待付款','支付失败','已取消','已退款')
      ), 0),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(order.member_id, order.member_id, order.member_id).run();
}
