import { ensureMember } from "../../../../db/member-account";
import { getStoreDb } from "../../../../db/store";
import { getPreviewMemberIdentity } from "../../../../lib/preview-member-auth";
import { hasTrustedOrigin, safeServerError } from "../../../../lib/request-security";

const alertTypes = new Set(["restock", "price_drop"]);

export async function GET(request: Request) {
  try {
    const viewer = await getPreviewMemberIdentity();
    if (!viewer) return Response.json({ alerts: [] }, { headers: { "cache-control": "private, no-store" } });
    const member = await ensureMember(viewer);
    const slug = new URL(request.url).searchParams.get("slug")?.trim() ?? "";
    const db = await getStoreDb();
    const rows = await db.prepare("SELECT alert_type, target_price, status FROM member_product_alerts WHERE member_id = ? AND product_slug = ? AND status = 'active'").bind(member.id, slug).all();
    return Response.json({ alerts: rows.results }, { headers: { "cache-control": "private, no-store" } });
  } catch {
    return safeServerError("读取商品提醒失败，请稍后再试");
  }
}

export async function POST(request: Request) {
  try {
    if (!hasTrustedOrigin(request)) return Response.json({ error: "请求来源无效" }, { status: 403 });
    const viewer = await getPreviewMemberIdentity();
    if (!viewer) return Response.json({ error: "请先登录会员账户" }, { status: 401 });
    const member = await ensureMember(viewer);
    const payload = await request.json() as Record<string, unknown>;
    const slug = String(payload.slug ?? "").trim().slice(0, 160);
    const alertType = String(payload.alertType ?? "");
    const action = String(payload.action ?? "subscribe");
    if (!slug || !alertTypes.has(alertType)) return Response.json({ error: "商品提醒类型无效" }, { status: 400 });
    const db = await getStoreDb();
    const product = await db.prepare("SELECT slug, price FROM products WHERE slug = ? AND status = 'active' LIMIT 1").bind(slug).first<{ slug: string; price: number }>();
    if (!product) return Response.json({ error: "商品不存在或已下架" }, { status: 404 });
    if (action === "remove") {
      await db.prepare("UPDATE member_product_alerts SET status = 'disabled' WHERE member_id = ? AND product_slug = ? AND alert_type = ?").bind(member.id, slug, alertType).run();
    } else {
      const targetPrice = alertType === "price_drop" && Number(payload.targetPrice) > 0 ? Math.round(Number(payload.targetPrice) / 0.12) : null;
      await db.prepare("INSERT INTO member_product_alerts (member_id, product_slug, alert_type, target_price, status) VALUES (?, ?, ?, ?, 'active') ON CONFLICT(member_id, product_slug, alert_type) DO UPDATE SET target_price = excluded.target_price, status = 'active', created_at = CURRENT_TIMESTAMP").bind(member.id, slug, alertType, targetPrice).run();
    }
    return Response.json({ ok: true });
  } catch {
    return safeServerError("保存商品提醒失败，请稍后再试");
  }
}
