import type { SiteContent } from "./commerce-admin-types";

export const groups = [
  { title: "全站公告", description: "控制页面顶部的即时促销信息。", toggle: ["show_announcement", "显示顶部公告"], fields: [["announcement", "公告内容", "例如：实体商品满 198 元免标准快递费", "text"]] },
  { title: "首屏主活动", description: "首页第一张主视觉的活动主题、标题和行动入口。", fields: [["hero_eyebrow", "活动标识", "例如：púsy × Ü", "text"], ["hero_title", "主标题", "支持换行", "textarea"], ["hero_subtitle", "副标题", "一句话说明活动价值", "text"], ["hero_cta_label", "按钮文字", "例如：立即探索", "text"], ["hero_cta_url", "按钮链接", "站内路径，例如 /catalog/products", "url"]] },
  { title: "第二活动位", description: "轮播第二张内容，可用于礼盒、节日或品牌联名。", fields: [["hero2_eyebrow", "活动标识", "例如：PÚSY 神秘礼盒", "text"], ["hero2_title", "主标题", "支持换行", "textarea"], ["hero2_cta_label", "按钮文字", "例如：了解更多", "text"], ["hero2_cta_url", "按钮链接", "站内路径", "url"]] },
  { title: "精选商品", description: "控制首页商品推荐区的表达和显示状态。", toggle: ["show_featured", "显示精选商品区"], fields: [["featured_title", "区块标题", "例如：当季新品", "text"], ["featured_subtitle", "区块说明", "补充选品理由", "textarea"], ["featured_cta_label", "入口文字", "例如：查看全部", "text"]] },
  { title: "热门分类", description: "运营三个主要分类入口，无需改代码。", toggle: ["show_categories", "显示热门分类区"], fields: [["categories_title", "区块标题", "例如：按心情探索", "text"], ["category_1_label", "分类一名称", "彩妆", "text"], ["category_1_url", "分类一链接", "/catalog/makiyazh", "url"], ["category_2_label", "分类二名称", "护肤", "text"], ["category_2_url", "分类二链接", "/catalog/uhod", "url"], ["category_3_label", "分类三名称", "家居", "text"], ["category_3_url", "分类三链接", "/catalog/dlya-doma", "url"]] },
  { title: "短视频与订阅", description: "维护社区内容标题和邮件订阅表达。", fields: [["reels_title", "短视频标题", "例如：你与 PÚSY", "text"], ["reels_subtitle", "短视频说明", "内容定位说明", "textarea"], ["newsletter_title", "订阅标题", "例如：订阅邮件，立享 9 折", "text"], ["newsletter_success", "订阅成功提示", "提交后的反馈文案", "text"]], toggles: [["show_reels", "显示短视频区"], ["show_newsletter", "显示邮件订阅区"]] },
] as const;

export const revisionLabels: Record<string, string> = { draft: "草稿", scheduled: "待发布", published: "当前版本", archived: "历史版本" };
export const contentToggleKeys = ["show_announcement", "show_featured", "show_categories", "show_reels", "show_newsletter"];

export function parseRevisionSnapshot(value = "") {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return Object.fromEntries(Object.entries(parsed).map(([key, item]) => [key, String(item ?? "")])) as SiteContent;
  } catch {
    return null;
  }
}
