import { getMemberIdentityFromRequest } from "../../../../lib/preview-member-auth";
import { cancelOrder } from "../../../../lib/orders/cancellation";
import { allowRequest, rateLimitResponse, safeServerError } from "../../../../lib/request-security";

export async function POST(request: Request) {
  try {
    const viewer = await getMemberIdentityFromRequest(request);
    if (!viewer) return Response.json({ error: "请先登录微信会员" }, { status: 401, headers: { "cache-control": "no-store" } });
    if (!await allowRequest(request, "miniprogram-orders", 12, 3600)) return rateLimitResponse();
    const payload = await request.json() as Record<string, unknown>;
    const action = String(payload.action ?? "");
    const orderId = String(payload.orderId ?? "").trim().toUpperCase().slice(0, 64);
    if (action !== "cancel" || !orderId) return Response.json({ error: "订单操作参数无效" }, { status: 400 });
    const reason = String(payload.reason ?? "小程序会员申请取消").trim().slice(0, 200) || "小程序会员申请取消";
    const result = await cancelOrder({ orderId, memberId: viewer.memberId, reason, origin: new URL(request.url).origin });
    return Response.json({ ok: true, ...result }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/订单不存在|订单已经|已经发货|不能取消|没有可退/.test(message)) return safeServerError(message, 409);
    return safeServerError("取消订单失败，请稍后再试");
  }
}
