import type { AdminIdentity } from "../admin-auth";
import { getStoreDb } from "../../db/store";

export type CommunityLinkedProduct = {
  slug: string;
  name: string;
  image: string;
  price: number;
  verified_purchase: boolean;
};

export type CommunityProductOption = Omit<CommunityLinkedProduct, "verified_purchase">;
export type CommunityPromotion = "featured" | "pinned";
export type CommunityContentEventType = "post_impression" | "product_click" | "add_to_cart";

export function parseCommunityProducts(value: unknown): CommunityLinkedProduct[] {
  const parsed = typeof value === "string" ? (() => { try { return JSON.parse(value); } catch { return []; } })() : value;
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((item) => item && typeof item === "object").map((item) => {
    const product = item as Record<string, unknown>;
    return {
      slug: String(product.slug ?? ""),
      name: String(product.name ?? ""),
      image: String(product.image ?? ""),
      price: Number(product.price ?? 0),
      verified_purchase: Boolean(product.verified_purchase),
    };
  }).filter((product) => product.slug && product.name && product.image).slice(0, 3);
}

export async function listCommunityProductOptions(limit = 120): Promise<CommunityProductOption[]> {
  const db = await getStoreDb();
  const rows = await db.prepare(`
    SELECT slug, name, image, price
    FROM products
    WHERE status = 'active' AND slug NOT LIKE 'gift-card-%'
    ORDER BY category, name
    LIMIT ?
  `).bind(Math.min(200, Math.max(1, limit))).all<CommunityProductOption>();
  return rows.results.map((row) => ({ ...row, price: Number(row.price) }));
}

export async function resolveCommunityProducts(rawSlugs: string[]) {
  const slugs = Array.from(new Set(rawSlugs.map((slug) => slug.trim().toLowerCase()).filter((slug) => /^[a-z0-9][a-z0-9-]{1,119}$/.test(slug)))).slice(0, 3);
  if (!slugs.length) return [];
  const db = await getStoreDb();
  const rows = await db.prepare(`
    SELECT slug, name, image, price
    FROM products
    WHERE status = 'active' AND slug = ANY(?::text[]) AND slug NOT LIKE 'gift-card-%'
  `).bind(slugs).all<CommunityProductOption>();
  if (rows.results.length !== slugs.length) throw new Error("关联商品不存在或已停止销售");
  const bySlug = new Map(rows.results.map((product) => [product.slug, product]));
  return slugs.map((slug) => bySlug.get(slug)).filter((product): product is CommunityProductOption => Boolean(product));
}

export async function recordCommunityContentEvent(input: {
  eventKey: string;
  eventType: CommunityContentEventType;
  postId: string;
  productSlug?: string;
  memberId?: number;
}) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.eventKey)) throw new Error("社区统计事件标识无效");
  if (!/^PST-[A-Z0-9]{12}$/.test(input.postId)) throw new Error("社区内容标识无效");
  if (!(["post_impression", "product_click", "add_to_cart"] as string[]).includes(input.eventType)) throw new Error("社区统计事件类型无效");
  const productSlug = String(input.productSlug ?? "").trim().toLowerCase();
  if (input.eventType !== "post_impression" && !/^[a-z0-9][a-z0-9-]{1,119}$/.test(productSlug)) throw new Error("关联商品标识无效");
  const db = await getStoreDb();
  const target = await db.prepare(`
    SELECT p.id
    FROM community_posts p
    WHERE p.id = ? AND p.status = 'approved'
      AND (? = 'post_impression' OR EXISTS (
        SELECT 1 FROM community_post_products cpp
        WHERE cpp.post_id = p.id AND cpp.product_slug = ?
      ))
    LIMIT 1
  `).bind(input.postId, input.eventType, productSlug || null).first<{ id: string }>();
  if (!target) throw new Error("社区内容或关联商品不存在");
  await db.prepare(`
    INSERT INTO community_content_events (event_key, event_type, post_id, product_slug, member_id)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(event_key) DO NOTHING
  `).bind(input.eventKey, input.eventType, input.postId, input.eventType === "post_impression" ? null : productSlug, input.memberId ?? null).run();
}

export async function setCommunityPromotion(input: {
  postId: string;
  placement: CommunityPromotion | "none";
  sortOrder: number;
  note: string;
  actor: AdminIdentity;
}) {
  if (!/^PST-[A-Z0-9]{12}$/.test(input.postId)) throw new Error("社区内容标识无效");
  if (!(input.placement === "none" || input.placement === "featured" || input.placement === "pinned")) throw new Error("社区推荐位置无效");
  const sortOrder = Math.min(999, Math.max(0, Math.round(Number.isFinite(input.sortOrder) ? input.sortOrder : 0)));
  const note = input.note.trim().slice(0, 300);
  const db = await getStoreDb();
  if (input.placement === "none") {
    await db.prepare("DELETE FROM community_post_promotions WHERE post_id = ?").bind(input.postId).run();
    return;
  }
  const post = await db.prepare("SELECT id FROM community_posts WHERE id = ? AND status = 'approved' LIMIT 1").bind(input.postId).first();
  if (!post) throw new Error("只有公开内容可以设为社区精选");
  await db.prepare(`
    INSERT INTO community_post_promotions (post_id, placement, sort_order, note, promoted_by)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(post_id) DO UPDATE SET
      placement = excluded.placement,
      sort_order = excluded.sort_order,
      note = excluded.note,
      promoted_by = excluded.promoted_by,
      updated_at = CURRENT_TIMESTAMP
  `).bind(input.postId, input.placement, sortOrder, note, input.actor.email).run();
}

export async function getCommunityCommerceInsights() {
  const db = await getStoreDb();
  const [summary, products] = await Promise.all([
    db.prepare(`
      SELECT
        COUNT(*) FILTER (WHERE event_type = 'post_impression')::INTEGER AS impressions,
        COUNT(*) FILTER (WHERE event_type = 'product_click')::INTEGER AS product_clicks,
        COUNT(*) FILTER (WHERE event_type = 'add_to_cart')::INTEGER AS add_to_carts,
        COUNT(DISTINCT post_id)::INTEGER AS measured_posts
      FROM community_content_events
      WHERE created_at::timestamp >= CURRENT_TIMESTAMP - INTERVAL '30 days'
    `).first<{ impressions: number; product_clicks: number; add_to_carts: number; measured_posts: number }>(),
    db.prepare(`
      SELECT e.product_slug, p.name AS product_name,
        COUNT(*) FILTER (WHERE e.event_type = 'product_click')::INTEGER AS product_clicks,
        COUNT(*) FILTER (WHERE e.event_type = 'add_to_cart')::INTEGER AS add_to_carts
      FROM community_content_events e
      JOIN products p ON p.slug = e.product_slug
      WHERE e.product_slug IS NOT NULL AND e.created_at::timestamp >= CURRENT_TIMESTAMP - INTERVAL '30 days'
      GROUP BY e.product_slug, p.name
      ORDER BY add_to_carts DESC, product_clicks DESC
      LIMIT 10
    `).all<{ product_slug: string; product_name: string; product_clicks: number; add_to_carts: number }>(),
  ]);
  const values = summary ?? { impressions: 0, product_clicks: 0, add_to_carts: 0, measured_posts: 0 };
  return {
    summary: {
      impressions: Number(values.impressions),
      productClicks: Number(values.product_clicks),
      addToCarts: Number(values.add_to_carts),
      measuredPosts: Number(values.measured_posts),
    },
    products: products.results.map((product) => ({
      productSlug: product.product_slug,
      productName: product.product_name,
      productClicks: Number(product.product_clicks),
      addToCarts: Number(product.add_to_carts),
    })),
  };
}
