import { getStoreDb } from "../../../../db/store";
import { getMemberIdentityFromRequest } from "../../../../lib/preview-member-auth";
import { allowRequest, rateLimitResponse, safeServerError } from "../../../../lib/request-security";

const alertTypes = new Set(["restock", "price_drop"]);

export async function POST(request: Request) {
  try {
    const viewer = await getMemberIdentityFromRequest(request);
    if (!viewer) return Response.json({ error: "请先登录微信会员" }, { status: 401, headers: { "cache-control": "no-store" } });
    if (!await allowRequest(request, "miniprogram-product-alerts", 20, 3600)) return rateLimitResponse();
    const payload = await request.json() as Record<string, unknown>;
    const productId = String(payload.productId ?? "").trim().slice(0, 160);
    const alertType = String(payload.alertType ?? "");
    const action = String(payload.action ?? "subscribe");
    if (!productId || !alertTypes.has(alertType) || !["subscribe", "remove"].includes(action)) return Response.json({ error: "商品提醒参数无效" }, { status: 400 });
    const db = await getStoreDb();
    const product = await db.prepare("SELECT slug FROM products WHERE slug = ? AND status = 'active' LIMIT 1").bind(productId).first<{ slug: string }>();
    if (!product) return Response.json({ error: "商品不存在或已下架" }, { status: 404 });
    if (action === "remove") {
      await db.prepare("UPDATE member_product_alerts SET status = 'disabled' WHERE member_id = ? AND product_slug = ? AND alert_type = ?").bind(viewer.memberId, product.slug, alertType).run();
    } else {
      const targetPriceFen = Math.max(0, Math.round(Number(payload.targetPriceFen ?? 0)));
      const targetPrice = alertType === "price_drop" && targetPriceFen ? Math.max(1, Math.round(targetPriceFen / 12)) : null;
      await db.prepare("INSERT INTO member_product_alerts (member_id, product_slug, alert_type, target_price, status) VALUES (?, ?, ?, ?, 'active') ON CONFLICT(member_id, product_slug, alert_type) DO UPDATE SET target_price = excluded.target_price, status = 'active', created_at = CURRENT_TIMESTAMP").bind(viewer.memberId, product.slug, alertType, targetPrice).run();
    }
    return Response.json({ ok: true, active: action !== "remove" }, { headers: { "cache-control": "no-store" } });
  } catch {
    return safeServerError("保存商品提醒失败，请稍后再试");
  }
}
