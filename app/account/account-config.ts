export const skinConcerns = ["补水保湿", "控油净肤", "敏感修护", "提亮肤色", "抗老紧致", "痘肌护理"];
export const preferredCategories = ["彩妆", "护肤", "身体护理", "头发护理", "眉妆", "配件"];

export function parseSelections(value: string) {
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed.map(String) : []; } catch { return []; }
}

export const tierNames: Record<string, string> = { bronze: "新锐会员", silver: "银卡会员", gold: "金卡会员", diamond: "钻石会员" };
export function tierName(value: string) { return tierNames[value] ?? "新锐会员"; }
export const tierSteps = [{ key: "bronze", minimum: 0 }, { key: "silver", minimum: 500 }, { key: "gold", minimum: 2000 }, { key: "diamond", minimum: 5000 }];

export const tierBenefits = {
  bronze: {
    eyebrow: "初见礼遇",
    summary: "注册即可开启，认识你的偏好，也记录每一次变美灵感。",
    multiplier: "1×",
    items: [
      { icon: "✦", title: "消费积分", copy: "每消费 1 元累计 1 积分" },
      { icon: "◇", title: "会员首礼", copy: "首次入会领取新人专属券" },
      { icon: "♡", title: "心愿清单", copy: "收藏商品并接收补货提醒" },
      { icon: "◎", title: "美妆档案", copy: "获得更贴合偏好的商品推荐" },
    ],
  },
  silver: {
    eyebrow: "进阶礼遇",
    summary: "更早收到心仪商品动态，每一笔消费也积累得更快。",
    multiplier: "1.2×",
    items: [
      { icon: "✦", title: "1.2 倍积分", copy: "日常消费享额外积分加速" },
      { icon: "◷", title: "补货优先提醒", copy: "热门商品到货时优先通知" },
      { icon: "▱", title: "生日月礼券", copy: "生日月获赠会员专享礼券" },
      { icon: "↗", title: "活动早知道", copy: "品牌活动提前 24 小时通知" },
    ],
  },
  gold: {
    eyebrow: "挚爱礼遇",
    summary: "享受新品优先体验、专属券与更从容的售后服务。",
    multiplier: "1.5×",
    items: [
      { icon: "✦", title: "1.5 倍积分", copy: "日常消费享积分加速" },
      { icon: "◈", title: "新品优先购", copy: "重点新品提前 48 小时选购" },
      { icon: "⌁", title: "季度专享券", copy: "每季度获赠一张会员礼券" },
      { icon: "↺", title: "无忧退换", copy: "符合条件订单延长售后时效" },
    ],
  },
  diamond: {
    eyebrow: "至臻礼遇",
    summary: "最高等级专属体验，以定制服务回应每一份长期喜爱。",
    multiplier: "2×",
    items: [
      { icon: "✦", title: "双倍积分", copy: "日常消费享 2 倍积分回馈" },
      { icon: "♢", title: "年度臻选礼", copy: "每年获赠一次品牌精选礼遇" },
      { icon: "∞", title: "专属顾问", copy: "一对一选购与产品咨询服务" },
      { icon: "◉", title: "私享活动", copy: "优先受邀新品预览与限定活动" },
    ],
  },
} as const;
