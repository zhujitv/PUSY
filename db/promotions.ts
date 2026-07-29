import { getStoreDb } from "./store";

export type CouponResult = { valid: boolean; code: string; discount: number; message: string; couponId?: number; giftCardCode?: string; promotionType?: "coupon" | "gift-card" };

export async function calculateCouponDiscount(rawCode: string, subtotal: number): Promise<CouponResult> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { valid: false, code: "", discount: 0, message: "请输入优惠码或礼品卡号" };
  const db = await getStoreDb();
  const coupon = await db.prepare("SELECT * FROM coupons WHERE code = ? LIMIT 1").bind(code).first<{ id: number; kind: string; value: number; minimum: number; usage_limit: number; used_count: number; status: string; starts_at: string | null; ends_at: string | null }>();
  if (!coupon) {
    const card = await db.prepare("SELECT code, balance, status FROM gift_cards WHERE code = ? LIMIT 1").bind(code).first<{ code: string; balance: number; status: string }>();
    if (!card || card.status !== "active" || card.balance <= 0) return { valid: false, code, discount: 0, message: "优惠码或礼品卡号无效" };
    return { valid: true, code, discount: Math.min(subtotal, card.balance), message: "礼品卡已使用", giftCardCode: card.code, promotionType: "gift-card" };
  }
  if (coupon.status !== "active") return { valid: false, code, discount: 0, message: "优惠码不存在或已停用" };
  const now = new Date().toISOString();
  if (coupon.starts_at && coupon.starts_at > now) return { valid: false, code, discount: 0, message: "优惠活动尚未开始" };
  if (coupon.ends_at && coupon.ends_at < now) return { valid: false, code, discount: 0, message: "优惠码已过期" };
  if (coupon.usage_limit > 0 && coupon.used_count >= coupon.usage_limit) return { valid: false, code, discount: 0, message: "优惠码使用次数已达上限" };
  if (subtotal < coupon.minimum) return { valid: false, code, discount: 0, message: `订单金额未达到使用条件` };
  const rawDiscount = coupon.kind === "fixed" ? coupon.value : Math.round(subtotal * coupon.value / 100);
  return { valid: true, code, discount: Math.min(subtotal, Math.max(0, rawDiscount)), message: "优惠码已使用", couponId: coupon.id, promotionType: "coupon" };
}
