import { calculateCouponDiscount } from "../../../../db/promotions";

export async function POST(request: Request) {
  try {
    const payload = await request.json() as { code?: string; subtotal?: number };
    const subtotal = Math.max(0, Number(payload.subtotal) || 0);
    const result = await calculateCouponDiscount(payload.code ?? "", subtotal);
    return Response.json(result, { status: result.valid ? 200 : 400 });
  } catch (error) {
    return Response.json({ valid: false, error: error instanceof Error ? error.message : "优惠码验证失败" }, { status: 500 });
  }
}
