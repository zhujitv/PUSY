import { getStoreDb } from "../../../../db/store";
import { getMemberIdentityFromRequest } from "../../../../lib/preview-member-auth";
import { allowRequest, rateLimitResponse, safeServerError } from "../../../../lib/request-security";
import { createWebsiteReturnThread } from "../../../../lib/support/service";

export async function POST(request: Request) {
  try {
    const viewer = await getMemberIdentityFromRequest(request);
    if (!viewer) return Response.json({ error: "请先登录微信会员" }, { status: 401, headers: { "cache-control": "no-store" } });
    if (!await allowRequest(request, "miniprogram-returns", 8, 3600)) return rateLimitResponse();
    const payload = await request.json() as Record<string, unknown>;
    const orderId = String(payload.orderId ?? "").trim().toUpperCase().slice(0, 64);
    const requestType = String(payload.requestType ?? "refund");
    const reason = String(payload.reason ?? "").trim().slice(0, 120);
    const details = String(payload.details ?? "").trim().slice(0, 1000);
    if (!orderId || !["refund", "exchange", "reship"].includes(requestType) || !reason) return Response.json({ error: "请选择订单、售后类型和申请原因" }, { status: 400 });

    const db = await getStoreDb();
    const order = await db.prepare("SELECT id, member_id, customer, email, status FROM orders WHERE upper(id) = ? AND member_id = ? LIMIT 1").bind(orderId, viewer.memberId).first<{ id: string; member_id: number; customer: string; email: string; status: string }>();
    if (!order) return Response.json({ error: "未找到当前会员的对应订单" }, { status: 404 });
    if (["待付款", "支付失败", "已取消", "已退款"].includes(order.status)) return Response.json({ error: "该订单当前不符合售后申请条件" }, { status: 409 });
    const existing = await db.prepare("SELECT id, support_thread_id FROM returns WHERE order_id = ? AND status NOT IN ('已拒绝','已关闭') LIMIT 1").bind(order.id).first<{ id: string; support_thread_id: string | null }>();
    if (existing) return Response.json({ error: `该订单已有进行中的申请：${existing.id}` }, { status: 409 });
    const items = await db.prepare("SELECT product_slug, product_name, quantity, unit_price FROM order_items WHERE order_id = ? ORDER BY id").bind(order.id).all();
    const id = `RET-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    await db.prepare("INSERT INTO returns (id, order_id, email, reason, details, request_type, items_json, status) VALUES (?, ?, ?, ?, ?, ?, ?, '待审核')").bind(id, order.id, order.email, reason, details, requestType, JSON.stringify(items.results)).run();
    await createWebsiteReturnThread({ returnId: id, orderId: order.id, memberId: order.member_id, customer: order.customer, email: order.email, reason, details });
    return Response.json({ ok: true, id, status: "待审核" }, { status: 201, headers: { "cache-control": "no-store" } });
  } catch {
    return safeServerError("提交售后申请失败，请稍后再试");
  }
}
