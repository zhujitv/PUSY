import { getStoreDb } from "../../../db/store";
import { allowRequest, hasTrustedOrigin, rateLimitResponse, safeServerError } from "../../../lib/request-security";

export async function POST(request: Request) {
  try {
    if (!hasTrustedOrigin(request)) return Response.json({ error: "请求来源无效" }, { status: 403 });
    if (!await allowRequest(request, "returns", 8, 3600)) return rateLimitResponse();
    const payload = await request.json() as Record<string, unknown>;
    const orderId = String(payload.orderId ?? "").trim().toUpperCase();
    const email = String(payload.email ?? "").trim().toLowerCase();
    const reason = String(payload.reason ?? "").trim();
    const details = String(payload.details ?? "").trim().slice(0, 1000);
    if (!orderId || !email || !reason) return Response.json({ error: "请填写订单号、下单邮箱和申请原因" }, { status: 400 });

    const db = await getStoreDb();
    const order = await db.prepare("SELECT id, email FROM orders WHERE upper(id) = ?").bind(orderId).first<{ id: string; email: string }>();
    if (!order || order.email.toLowerCase() !== email) return Response.json({ error: "未找到与订单号和邮箱匹配的订单" }, { status: 404 });
    const existing = await db.prepare("SELECT id FROM returns WHERE order_id = ? AND status NOT IN ('已拒绝','已关闭') LIMIT 1").bind(order.id).first<{ id: string }>();
    if (existing) return Response.json({ error: `该订单已有进行中的申请：${existing.id}` }, { status: 409 });

    const id = `RET-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    await db.prepare("INSERT INTO returns (id, order_id, email, reason, details, status) VALUES (?, ?, ?, ?, ?, '待审核')").bind(id, order.id, email, reason, details).run();
    return Response.json({ ok: true, id, status: "待审核" });
  } catch {
    return safeServerError("提交售后申请失败，请稍后再试");
  }
}
