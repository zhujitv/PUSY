import { getStoreDb } from "../../../db/store";
import { getProduct } from "../../data/products";
import { calculateCouponDiscount } from "../../../db/promotions";
import { getPreviewMemberIdentity } from "../../../lib/preview-member-auth";
import { sha256 } from "../../../lib/payments/crypto";
import { releaseExpiredOrderReservations } from "../../../lib/orders/reservations";
import { allowRequest, hasTrustedOrigin, rateLimitResponse, safeServerError } from "../../../lib/request-security";

type OrderPayload = { customer?: string; email?: string; phone?: string; address?: string; delivery?: string; payment?: string; couponCode?: string; items?: { slug: string; quantity: number; product?: { description?: string } }[] };
const giftCode = () => `PUSY-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase().replace(/(.{4})/, "$1-")}`;
const orderId = () => `PUSY-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`;
function giftDetail(description = "", label: string) { const match = description.match(new RegExp(`${label}：([^；]+)`)); return match?.[1]?.trim() ?? ""; }

export async function POST(request: Request) {
  try {
    if (!hasTrustedOrigin(request)) return Response.json({ error: "请求来源无效" }, { status: 403 });
    if (!await allowRequest(request, "create-order", 8, 10 * 60)) return rateLimitResponse();
    await releaseExpiredOrderReservations();
    const payload = await request.json() as OrderPayload;
    const customer = String(payload.customer ?? "").trim().slice(0, 50);
    const email = String(payload.email ?? "").trim().toLowerCase().slice(0, 120);
    const phone = String(payload.phone ?? "").replace(/\s|-/g, "");
    const address = String(payload.address ?? "").trim().slice(0, 300);
    if (!customer || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^1[3-9]\d{9}$/.test(phone) || !address || !["标准快递", "顺丰速运", "门店自提"].includes(String(payload.delivery)) || !["支付宝", "微信支付"].includes(String(payload.payment)) || !payload.items?.length || payload.items.length > 50) return Response.json({ error: "订单信息不完整或格式无效" }, { status: 400 });
    const db = await getStoreDb();
    const viewer = await getPreviewMemberIdentity();
    const memberEmail = (viewer?.email ?? email).toLowerCase();
    const resolvedItems: { slug: string; name: string; price: number; quantity: number; manageStock: boolean; description: string }[] = [];
    for (const line of payload.items) {
      const quantity = Math.round(Number(line.quantity));
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) return Response.json({ error: "单件商品购买数量应为 1 至 20" }, { status: 400 });
      const stored = await db.prepare("SELECT name, price, stock, inventory_verified, status FROM products WHERE slug = ? LIMIT 1").bind(line.slug).first<{ name: string; price: number; stock: number; inventory_verified: number; status: string }>();
      if (stored) {
        if (stored.status !== "active") return Response.json({ error: `${stored.name} 已下架` }, { status: 409 });
        if (!stored.inventory_verified || stored.stock < quantity) return Response.json({ error: `${stored.name} 库存不足` }, { status: 409 });
        resolvedItems.push({ slug: line.slug, name: stored.name, price: stored.price, quantity, manageStock: true, description: line.product?.description ?? "" });
      } else {
        if (!line.slug.startsWith("gift-card-")) return Response.json({ error: "商品不存在或已下架" }, { status: 404 });
        const fallback = getProduct(line.slug);
        resolvedItems.push({ slug: line.slug, name: fallback.name, price: fallback.price, quantity, manageStock: false, description: line.product?.description ?? "" });
      }
    }
    const merchandiseTotal = resolvedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shipping = payload.delivery === "门店自提" || merchandiseTotal >= 5000 ? 0 : payload.delivery === "顺丰速运" ? 590 : 390;
    const coupon = payload.couponCode ? await calculateCouponDiscount(payload.couponCode, merchandiseTotal) : { valid: false, code: "", discount: 0, message: "" };
    const verifiedTotal = Math.max(0, merchandiseTotal + shipping - coupon.discount);
    const id = orderId();
    const paymentToken = `${crypto.randomUUID()}${crypto.randomUUID()}`;
    const reservationExpiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    await db.prepare("INSERT INTO members (name, email, phone) VALUES (?, ?, ?) ON CONFLICT(email) DO UPDATE SET name = excluded.name, phone = excluded.phone, updated_at = CURRENT_TIMESTAMP").bind(customer, memberEmail, phone).run();
    const member = await db.prepare("SELECT id FROM members WHERE email = ?").bind(memberEmail).first<{ id: number }>();
    const statements = [db.prepare("INSERT INTO orders (id, member_id, customer, email, phone, address, delivery, payment, total, discount, coupon_code, payment_token_hash, reservation_expires_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '待付款')").bind(id, member?.id ?? null, customer, email, phone, address, payload.delivery, payload.payment, verifiedTotal, coupon.discount, coupon.valid ? coupon.code : null, await sha256(paymentToken), reservationExpiresAt)];
    if (coupon.valid && coupon.couponId) statements.push(db.prepare("UPDATE coupons SET used_count = used_count + 1 WHERE id = ? AND status = 'active' AND (usage_limit = 0 OR used_count < usage_limit)").bind(coupon.couponId).requireChanges("优惠码使用次数已达上限"));
    if (coupon.valid && coupon.giftCardCode) statements.push(db.prepare("UPDATE gift_cards SET balance = balance - ?, status = CASE WHEN balance - ? <= 0 THEN 'used' ELSE status END WHERE code = ? AND status = 'active' AND balance >= ?").bind(coupon.discount, coupon.discount, coupon.giftCardCode, coupon.discount).requireChanges("礼品卡余额不足或已被使用"));
    for (const line of resolvedItems) {
      statements.push(db.prepare("INSERT INTO order_items (order_id, product_slug, product_name, quantity, unit_price) VALUES (?, ?, ?, ?, ?)").bind(id, line.slug, line.name, line.quantity, line.price));
      if (line.manageStock) statements.push(db.prepare("UPDATE products SET stock = stock - ?, updated_at = CURRENT_TIMESTAMP WHERE slug = ? AND inventory_verified = 1 AND stock >= ?").bind(line.quantity, line.slug, line.quantity).requireChanges(`${line.name} 库存不足`));
      if (line.slug.startsWith("gift-card-")) for (let index = 0; index < line.quantity; index += 1) statements.push(db.prepare("INSERT INTO gift_cards (code, order_id, initial_balance, balance, recipient_name, recipient_email, message, delivery_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')").bind(giftCode(), id, line.price, line.price, giftDetail(line.description, "收件人"), giftDetail(line.description, "邮箱"), giftDetail(line.description, "祝福"), giftDetail(line.description, "发送日期") || null));
    }
    await db.batch(statements);
    return Response.json({ orderId: id, paymentToken, total: verifiedTotal, discount: coupon.discount, couponCode: coupon.valid ? coupon.code : null, reservationExpiresAt }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error && /库存不足|优惠码|礼品卡/.test(error.message) ? error.message : "创建订单失败，请稍后再试";
    return safeServerError(message, message.startsWith("创建") ? 500 : 409);
  }
}
