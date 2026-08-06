import { getStoreDb } from "../../db/store";
import { COMMUNITY_EXPERIENCE_SCENES, COMMUNITY_HIGHLIGHTS, COMMUNITY_SKIN_TYPES, COMMUNITY_USAGE_PERIODS, type CommunityExperience, type CommunityPurchaseShareTask } from "./experience-contracts";
export type { CommunityExperience, CommunityPurchaseShareTask } from "./experience-contracts";

function enumValue(value: unknown, allowed: readonly string[]) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return allowed.includes(normalized) ? normalized : "";
}

export function normalizeCommunityExperience(payload: Record<string, unknown>): CommunityExperience {
  const rawRating = Number(payload.experienceRating);
  const highlights = Array.isArray(payload.experienceHighlights)
    ? Array.from(new Set(payload.experienceHighlights.map(String).filter((item) => COMMUNITY_HIGHLIGHTS.includes(item as never)))).slice(0, 4)
    : [];
  return {
    skinType: enumValue(payload.experienceSkinType, COMMUNITY_SKIN_TYPES),
    usagePeriod: enumValue(payload.experienceUsagePeriod, COMMUNITY_USAGE_PERIODS),
    scene: enumValue(payload.experienceScene, COMMUNITY_EXPERIENCE_SCENES),
    rating: Number.isInteger(rawRating) && rawRating >= 1 && rawRating <= 5 ? rawRating : null,
    highlights,
    cautions: String(payload.experienceCautions ?? "").trim().slice(0, 240),
  };
}

export function parseCommunityExperience(row: Record<string, unknown>): CommunityExperience {
  let highlights: string[] = [];
  try {
    const parsed = typeof row.experience_highlights_json === "string" ? JSON.parse(row.experience_highlights_json) : row.experience_highlights_json;
    if (Array.isArray(parsed)) highlights = parsed.map(String).filter((item) => COMMUNITY_HIGHLIGHTS.includes(item as never)).slice(0, 4);
  } catch {}
  const rating = Number(row.experience_rating);
  return {
    skinType: enumValue(row.experience_skin_type, COMMUNITY_SKIN_TYPES),
    usagePeriod: enumValue(row.experience_usage_period, COMMUNITY_USAGE_PERIODS),
    scene: enumValue(row.experience_scene, COMMUNITY_EXPERIENCE_SCENES),
    rating: Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null,
    highlights,
    cautions: String(row.experience_cautions ?? "").slice(0, 240),
  };
}

export function hasStructuredExperience(experience: CommunityExperience) {
  return Boolean(experience.skinType || experience.usagePeriod || experience.scene || experience.rating || experience.highlights.length || experience.cautions);
}

export async function listPurchaseShareTasks(memberId: number): Promise<CommunityPurchaseShareTask[]> {
  const db = await getStoreDb();
  await db.prepare(`
    INSERT INTO community_purchase_share_tasks (member_id, order_id, product_slug)
    SELECT o.member_id, o.id, oi.product_slug
    FROM orders o JOIN order_items oi ON oi.order_id = o.id
    JOIN products p ON p.slug = oi.product_slug AND p.status = 'active'
    WHERE o.member_id = ? AND o.status IN ('已确认', '配货中', '已发货', '已完成')
      AND oi.product_slug NOT LIKE 'gift-card-%'
    ON CONFLICT (member_id, order_id, product_slug) DO NOTHING
  `).bind(memberId).run();
  const rows = await db.prepare(`
    SELECT task.id, task.order_id, task.product_slug, task.status, task.created_at,
      p.name AS product_name, p.image AS product_image, o.created_at AS purchased_at
    FROM community_purchase_share_tasks task
    JOIN orders o ON o.id = task.order_id
    JOIN products p ON p.slug = task.product_slug
    WHERE task.member_id = ?
    ORDER BY CASE task.status WHEN 'available' THEN 0 WHEN 'submitted' THEN 1 ELSE 2 END, o.created_at::timestamp DESC
    LIMIT 24
  `).bind(memberId).all<Record<string, unknown>>();
  return rows.results.map((row) => ({
    id: Number(row.id), orderId: String(row.order_id), productSlug: String(row.product_slug),
    productName: String(row.product_name), productImage: String(row.product_image), purchasedAt: String(row.purchased_at),
    status: row.status === "completed" ? "completed" : row.status === "submitted" ? "submitted" : "available",
  }));
}

export async function validatePurchaseShareTask(memberId: number, taskId: number | null, productSlugs: string[]) {
  if (!taskId) return null;
  const db = await getStoreDb();
  const task = await db.prepare(`
    SELECT task.id, task.product_slug FROM community_purchase_share_tasks task
    JOIN orders o ON o.id = task.order_id
    WHERE task.id = ? AND task.member_id = ? AND task.status = 'available'
      AND o.status IN ('已确认', '配货中', '已发货', '已完成') LIMIT 1
  `).bind(taskId, memberId).first<{ id: number; product_slug: string }>();
  if (!task) throw new Error("已购分享任务不存在或已经提交");
  if (!productSlugs.includes(task.product_slug)) throw new Error("已购分享任务必须关联对应商品");
  return { id: Number(task.id), productSlug: task.product_slug };
}

export async function completePurchaseShareTask(postId: string) {
  const db = await getStoreDb();
  await db.prepare("UPDATE community_purchase_share_tasks SET status = 'completed', completed_at = COALESCE(completed_at, CURRENT_TIMESTAMP::TEXT) WHERE post_id = ? AND status = 'submitted'").bind(postId).run();
}
