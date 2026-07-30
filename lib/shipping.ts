export const STANDARD_DELIVERY = "标准快递" as const;
export const SF_DELIVERY = "顺丰速运" as const;
export const ELECTRONIC_DELIVERY = "电子发送" as const;

export type PhysicalDeliveryMethod = typeof STANDARD_DELIVERY | typeof SF_DELIVERY;

// 商品与订单仍沿用历史存储单位，前台按 1 单位 = 0.12 元显示。
// 对应顾客支付价：普通快递 9 元、顺丰 18 元、实体商品满 198 元免普通快递费。
export const STANDARD_SHIPPING_FEE = 75;
export const SF_SHIPPING_FEE = 150;
export const FREE_STANDARD_SHIPPING_THRESHOLD = 1650;

const GIFT_CARD_LINE_PATTERN = /^gift-card-(1000|3000|5000|10000)(?:-\d+)?$/;

export function giftCardAmountFromSlug(slug: string) {
  const match = slug.match(GIFT_CARD_LINE_PATTERN);
  return match ? Number(match[1]) : null;
}

export function isGiftCardLineSlug(slug: string) {
  return giftCardAmountFromSlug(slug) !== null;
}

export function isGiftCardProductSlug(slug: string) {
  return slug === "gift-card" || isGiftCardLineSlug(slug);
}

export function isPhysicalDeliveryMethod(value: string): value is PhysicalDeliveryMethod {
  return value === STANDARD_DELIVERY || value === SF_DELIVERY;
}

export function calculatePhysicalSubtotal(lines: Array<{ slug: string; price: number; quantity: number }>) {
  return lines.reduce((sum, line) => isGiftCardLineSlug(line.slug) ? sum : sum + line.price * line.quantity, 0);
}

export function calculateShippingFee(delivery: PhysicalDeliveryMethod | typeof ELECTRONIC_DELIVERY, physicalSubtotal: number) {
  if (physicalSubtotal <= 0 || delivery === ELECTRONIC_DELIVERY) return 0;
  if (delivery === SF_DELIVERY) return SF_SHIPPING_FEE;
  return physicalSubtotal >= FREE_STANDARD_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_FEE;
}
