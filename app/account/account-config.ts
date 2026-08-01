export const skinConcerns = ["补水保湿", "控油净肤", "敏感修护", "提亮肤色", "抗老紧致", "痘肌护理"];
export const preferredCategories = ["彩妆", "护肤", "身体护理", "头发护理", "眉妆", "配件"];

export function parseSelections(value: string) {
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed.map(String) : []; } catch { return []; }
}

export const tierNames: Record<string, string> = { bronze: "新锐会员", silver: "银卡会员", gold: "金卡会员", diamond: "钻石会员" };
export function tierName(value: string) { return tierNames[value] ?? "新锐会员"; }
export const tierSteps = [{ key: "bronze", minimum: 0 }, { key: "silver", minimum: 500 }, { key: "gold", minimum: 2000 }, { key: "diamond", minimum: 5000 }];
