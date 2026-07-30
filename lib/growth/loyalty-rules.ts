export type MemberTier = "bronze" | "silver" | "gold" | "diamond";

export const tierRules: Array<{ key: MemberTier; name: string; minimum: number; benefit: string }> = [
  { key: "bronze", name: "新锐会员", minimum: 0, benefit: "每消费 1 元积 1 分" },
  { key: "silver", name: "银卡会员", minimum: 500, benefit: "会员活动与补货优先提醒" },
  { key: "gold", name: "金卡会员", minimum: 2000, benefit: "专属优惠券与新品优先体验" },
  { key: "diamond", name: "钻石会员", minimum: 5000, benefit: "最高等级专属权益" },
];

export function tierForLifetimePoints(points: number): MemberTier {
  if (points >= 5000) return "diamond";
  if (points >= 2000) return "gold";
  if (points >= 500) return "silver";
  return "bronze";
}

export function pointsFromStoredAmount(storedAmount: number) {
  return Math.max(0, Math.floor(Number(storedAmount) * 0.12));
}
