import { getStoreDb } from "../../../../db/store";
import { getMemberIdentityFromRequest } from "../../../../lib/preview-member-auth";
import { safeServerError } from "../../../../lib/request-security";

export async function GET(request: Request) {
  try {
    const identity = await getMemberIdentityFromRequest(request);
    if (!identity) return Response.json({ error: "请先登录微信会员" }, { status: 401, headers: { "cache-control": "no-store" } });
    const db = await getStoreDb();
    const [member, profile, addresses, orders, orderItems, returns, refunds, pointsLedger, coupons, productAlerts, shipments, shipmentEvents] = await Promise.all([
      db.prepare("SELECT id, name, email, phone, email_verified, phone_verified, tier, points_balance, lifetime_points, total_orders, total_spent, status FROM members WHERE id = ? LIMIT 1").bind(identity.memberId).first<{ id: number; name: string; email: string; phone: string; email_verified: number; phone_verified: number; tier: string; points_balance: number; lifetime_points: number; total_orders: number; total_spent: number; status: string }>(),
      db.prepare("SELECT nickname, province, city, skin_type FROM member_profiles WHERE member_id = ? LIMIT 1").bind(identity.memberId).first<Record<string, unknown>>(),
      db.prepare("SELECT id, label, recipient, phone, province, city, district, detail, postcode, is_default, updated_at FROM member_addresses WHERE member_id = ? ORDER BY is_default DESC, id DESC").bind(identity.memberId).all<Record<string, unknown>>(),
      db.prepare("SELECT id, customer, email, phone, address, total, discount, coupon_code, status, payment, delivery, reservation_expires_at, cancel_reason, cancel_requested_at, cancelled_at, created_at, updated_at FROM orders WHERE member_id = ? ORDER BY created_at DESC LIMIT 30").bind(identity.memberId).all<Record<string, unknown>>(),
      db.prepare("SELECT oi.id, oi.order_id, oi.product_slug, oi.product_name, oi.quantity, oi.unit_price FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE o.member_id = ? ORDER BY oi.id").bind(identity.memberId).all<Record<string, unknown>>(),
      db.prepare("SELECT r.* FROM returns r JOIN orders o ON o.id = r.order_id WHERE o.member_id = ? ORDER BY r.created_at DESC").bind(identity.memberId).all<Record<string, unknown>>(),
      db.prepare("SELECT r.id, r.order_id, r.provider, r.amount_fen, r.reason, r.status, r.created_at, r.updated_at FROM refunds r JOIN orders o ON o.id = r.order_id WHERE o.member_id = ? ORDER BY r.created_at DESC").bind(identity.memberId).all<Record<string, unknown>>(),
      db.prepare("SELECT id, points, balance_after, reason, reference_type, reference_id, created_at FROM member_points_ledger WHERE member_id = ? ORDER BY created_at DESC LIMIT 20").bind(identity.memberId).all<Record<string, unknown>>(),
      db.prepare("SELECT c.id, c.code, c.kind, c.value, c.minimum, c.starts_at, c.ends_at, ca.status, ca.assigned_at FROM coupon_assignments ca JOIN coupons c ON c.id = ca.coupon_id WHERE ca.member_id = ? AND c.status = 'active' ORDER BY ca.assigned_at DESC").bind(identity.memberId).all<Record<string, unknown>>(),
      db.prepare("SELECT a.id, a.product_slug, a.alert_type, a.target_price, a.last_notified_at, a.created_at, p.name AS product_name, p.image, p.price, p.stock FROM member_product_alerts a JOIN products p ON p.slug = a.product_slug WHERE a.member_id = ? AND a.status = 'active' ORDER BY a.created_at DESC").bind(identity.memberId).all<Record<string, unknown>>(),
      db.prepare("SELECT s.* FROM shipments s JOIN orders o ON o.id = s.order_id WHERE o.member_id = ? ORDER BY s.shipped_at DESC").bind(identity.memberId).all<Record<string, unknown>>(),
      db.prepare("SELECT se.* FROM shipment_events se JOIN shipments s ON s.id = se.shipment_id JOIN orders o ON o.id = s.order_id WHERE o.member_id = ? ORDER BY se.event_time DESC").bind(identity.memberId).all<Record<string, unknown>>(),
    ]);
    if (!member || member.status === "blocked") return Response.json({ error: "该会员账户不可用" }, { status: 403 });
    return Response.json({
      member: {
        id: member.id,
        name: member.name,
        email: member.email_verified ? member.email : "",
        phone: member.phone_verified ? member.phone : "",
        tier: member.tier,
        pointsBalance: member.points_balance,
        lifetimePoints: member.lifetime_points,
        totalOrders: member.total_orders,
        totalSpent: member.total_spent,
      },
      profile: profile ?? {},
      addresses: addresses.results,
      orders: orders.results,
      orderItems: orderItems.results,
      returns: returns.results,
      refunds: refunds.results,
      pointsLedger: pointsLedger.results,
      coupons: coupons.results,
      productAlerts: productAlerts.results,
      shipments: shipments.results,
      shipmentEvents: shipmentEvents.results,
    }, { headers: { "cache-control": "private, no-store" } });
  } catch {
    return safeServerError("读取微信会员资料失败，请稍后再试");
  }
}
