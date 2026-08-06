export const COMMUNITY_SKIN_TYPES = ["normal", "dry", "oily", "combination", "sensitive"] as const;
export const COMMUNITY_USAGE_PERIODS = ["first-use", "one-week", "one-month", "three-months-plus"] as const;
export const COMMUNITY_EXPERIENCE_SCENES = ["daily", "work", "date", "travel", "special-occasion"] as const;
export const COMMUNITY_HIGHLIGHTS = ["显色", "持妆", "质地", "保湿", "香气", "便携", "温和", "性价比"] as const;

export type CommunityExperience = {
  skinType: string;
  usagePeriod: string;
  scene: string;
  rating: number | null;
  highlights: string[];
  cautions: string;
};

export type CommunityPurchaseShareTask = {
  id: number;
  orderId: string;
  productSlug: string;
  productName: string;
  productImage: string;
  purchasedAt: string;
  status: "available" | "submitted" | "completed";
};
