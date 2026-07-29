import { getStoreDb } from "../../../db/store";
import { getProduct } from "../../data/products";
import { calculateCouponDiscount } from "../../../db/promotions";
import { getChatGPTUser } from "../../chatgpt-auth";
import { sha256 } from "../../../lib/payments/crypto";

type OrderPayload = { id?: string; customer?: string; email?: string; phone?: string; address?: string; delivery?: string; payment?: string; total?: number; couponCode?: string; items?: { slug: string; quantity: number; product?: { name?: string; price?: number; description?: string } }[] };
const giftCode = () => `PUSY-${crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase().replace(/(.{4})/, "$1-")}`;
function giftDetail(description = "", label: string) { const match = description.match(new RegExp(`${label}：([^；]+)`)); return match?.[1]?.trim() ?? ""; }

export async function POST(request: Request) {
  try {
    const payload = await request.json() as OrderPayload;
    if (!payload.id || !payload.customer || !payload.email || !payload.phone || !payload.address || !payload.delivery || !payload.payment || !payload.items?.length || !Number.isFinite(payload.total)) return Response.json({ error: "订单信息不完整" }, { status: 400 });
    const db = await getStoreDb();
    const signedInUser = await getChatGPTUser();
    const memberEmail = (signedInUser?.email ?? payload.email).toLowerCase();
    const resolvedItems: { slug: string; name: string; price: number; quantity: number; manageStock: boolean; description: string }[] = [];
    for (const line of payload.items) {
      const quantity = Math.max(1, Math.round(Number(line.quantity) || 1));
      const stored = await db.prepare("SELECT name, price, stock, inventory_verified, status FROM products WHERE slug = ? LIMIT 1").bind(line.slug).first<{ name: string; price: number; stock: number; inventory_verified: number; status: string }>();
      if (stored) {
        if (stored.status !== "active") return Response.json({ error: `${stored.name} 已下架` }, { status: 409 });
        if (!stored.inventory_verified) return Response.json({ error: `${stored.name} 暂时缺货` }, { status: 409 });
        if (stored.stock < quantity) return Response.json({ error: `${stored.name} 库存不足，仅剩 ${stored.stock} 件` }, { status: 409 });
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
    const paymentToken = `${crypto.randomUUID()}${crypto.randomUUID()}`;
    const paymentTokenHash = await sha256(paymentToken);
    await db.prepare("INSERT INTO members (name, email, phone, total_orders, total_spent) VALUES (?, ?, ?, 1, ?) ON CONFLICT(email) DO UPDATE SET name = excluded.name, phone = excluded.phone, total_orders = total_orders + 1, total_spent = total_spent + excluded.total_spent, updated_at = CURRENT_TIMESTAMP").bind(payload.customer, memberEmail, payload.phone, verifiedTotal).run();
    const member = await db.prepare("SELECT id FROM members WHERE email = ?").bind(memberEmail).first<{ id: number }>();
    const statements = [db.prepare("INSERT INTO orders (id, member_id, customer, email, phone, address, delivery, payment, total, discount, coupon_code, payment_token_hash, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '待付款')").bind(payload.id, member?.id ?? null, payload.customer, payload.email.toLowerCase(), payload.phone, payload.address, payload.delivery, payload.payment, verifiedTotal, coupon.discount, coupon.valid ? coupon.code : null, paymentTokenHash)];
    if (coupon.valid && coupon.couponId) statements.push(db.prepare("UPDATE coupons SET used_count = used_count + 1 WHERE id = ?").bind(coupon.couponId));
    if (coupon.valid && coupon.giftCardCode) statements.push(db.prepare("UPDATE gift_cards SET balance = balance - ?, status = CASE WHEN balance - ? <= 0 THEN 'used' ELSE status END WHERE code = ? AND status = 'active' AND balance >= ?").bind(coupon.discount, coupon.discount, coupon.giftCardCode, coupon.discount));
    for (const line of resolvedItems) {
      statements.push(db.prepare("INSERT INTO order_items (order_id, product_slug, product_name, quantity, unit_price) VALUES (?, ?, ?, ?, ?)").bind(payload.id, line.slug, line.name, line.quantity, line.price));
      if (line.manageStock) statements.push(db.prepare("UPDATE products SET stock = stock - ?, updated_at = CURRENT_TIMESTAMP WHERE slug = ? AND inventory_verified = 1").bind(line.quantity, line.slug));
      if (line.slug.startsWith("gift-card-")) for (let index = 0; index < line.quantity; index++) statements.push(db.prepare("INSERT INTO gift_cards (code, order_id, initial_balance, balance, recipient_name, recipient_email, message, delivery_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')").bind(giftCode(), payload.id, line.price, line.price, giftDetail(line.description, "收件人"), giftDetail(line.description, "邮箱"), giftDetail(line.description, "祝福"), giftDetail(line.description, "发送日期") || null));
    }
    await db.batch(statements);
    return Response.json({ orderId: payload.id, paymentToken, total: verifiedTotal, discount: coupon.discount, couponCode: coupon.valid ? coupon.code : null }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "创建订单失败" }, { status: 500 });
  }
}
