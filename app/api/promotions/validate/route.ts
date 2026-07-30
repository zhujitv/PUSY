import { calculateCouponDiscount } from "../../../../db/promotions";
import { allowRequest, hasTrustedOrigin, rateLimitResponse, safeServerError } from "../../../../lib/request-security";

export async function POST(request: Request) {
  try {
    if (!hasTrustedOrigin(request)) return Response.json({ error: "请求来源无效" }, { status: 403 });
    if (!await allowRequest(request, "promotions", 30, 600)) return rateLimitResponse();
    const payload = await request.json() as { code?: string; subtotal?: number };
    const subtotal = Math.max(0, Number(payload.subtotal) || 0);
    const result = await calculateCouponDiscount(payload.code ?? "", subtotal);
    return Response.json({
      valid: result.valid,
      code: result.promotionType === "gift-card" ? "" : result.code,
      discount: result.discount,
      message: result.message,
      promotionType: result.promotionType,
    }, { status: result.valid ? 200 : 400 });
  } catch {
    return safeServerError("优惠码验证失败，请稍后再试");
  }
}
