import type { AdminIdentity } from "../admin-auth";
import { getStoreDb } from "../../db/store";
import type { CommunityPostStatus } from "./posts";
import { notifyCommunityModeration } from "./social";
import { parseCommunityProducts, type CommunityLinkedProduct, type CommunityPromotion } from "./commerce";

export type CommunityModerationPost = {
  id: string;
  member_id: number;
  author_public_id: string;
  author_name: string;
  title: string;
  body: string;
  status: CommunityPostStatus;
  moderation_note: string;
  moderated_by: string | null;
  moderated_at: string | null;
  published_at: string | null;
  created_at: string;
  media_ids: string[];
  products: CommunityLinkedProduct[];
  promotion_placement: CommunityPromotion | "";
  promotion_rank: number;
  promotion_note: string;
  impression_count: number;
  product_click_count: number;
  add_to_cart_count: number;
};

function mediaIds(value: unknown) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean).slice(0, 4);
  if (typeof value !== "string") return [];
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed.map(String).filter(Boolean).slice(0, 4) : []; }
  catch { return []; }
}

export async function listCommunityModerationPosts(limit = 300) {
  const db = await getStoreDb();
  const rows = await db.prepare(`
    SELECT p.id, p.member_id, cp.public_id AS author_public_id, cp.display_name AS author_name,
      p.title, p.body, p.status, p.moderation_note, p.moderated_by, p.moderated_at, p.published_at, p.created_at,
      COALESCE(json_agg(cm.id ORDER BY cm.position) FILTER (WHERE cm.id IS NOT NULL), '[]'::json) AS media_ids,
      COALESCE((SELECT json_agg(json_build_object('slug', product.slug, 'name', product.name, 'image', product.image, 'price', product.price, 'verified_purchase', false) ORDER BY cpp.position)
        FROM community_post_products cpp JOIN products product ON product.slug = cpp.product_slug
        WHERE cpp.post_id = p.id), '[]'::json) AS products,
      COALESCE((SELECT placement FROM community_post_promotions WHERE post_id = p.id), '') AS promotion_placement,
      COALESCE((SELECT sort_order FROM community_post_promotions WHERE post_id = p.id), 0)::INTEGER AS promotion_rank,
      COALESCE((SELECT note FROM community_post_promotions WHERE post_id = p.id), '') AS promotion_note,
      (SELECT COUNT(*) FROM community_content_events WHERE post_id = p.id AND event_type = 'post_impression')::INTEGER AS impression_count,
      (SELECT COUNT(*) FROM community_content_events WHERE post_id = p.id AND event_type = 'product_click')::INTEGER AS product_click_count,
      (SELECT COUNT(*) FROM community_content_events WHERE post_id = p.id AND event_type = 'add_to_cart')::INTEGER AS add_to_cart_count
    FROM community_posts p
    JOIN community_profiles cp ON cp.member_id = p.member_id
    LEFT JOIN community_post_media cm ON cm.post_id = p.id
    GROUP BY p.id, p.member_id, cp.public_id, cp.display_name, p.title, p.body, p.status, p.moderation_note,
      p.moderated_by, p.moderated_at, p.published_at, p.created_at
    ORDER BY CASE p.status WHEN 'pending' THEN 0 ELSE 1 END, p.created_at::timestamp DESC
    LIMIT ?
  `).bind(Math.min(500, Math.max(1, limit))).all<Omit<CommunityModerationPost, "media_ids" | "products"> & { media_ids: unknown; products: unknown }>();
  return rows.results.map((row) => ({
    ...row,
    member_id: Number(row.member_id),
    media_ids: mediaIds(row.media_ids),
    products: parseCommunityProducts(row.products),
    promotion_placement: row.promotion_placement === "featured" || row.promotion_placement === "pinned" ? row.promotion_placement : "",
    promotion_rank: Number(row.promotion_rank),
    impression_count: Number(row.impression_count),
    product_click_count: Number(row.product_click_count),
    add_to_cart_count: Number(row.add_to_cart_count),
  }));
}

export async function moderateCommunityPost(input: { postId: string; status: CommunityPostStatus; reason: string; actor: AdminIdentity }) {
  const { postId, status, actor } = input;
  const reason = input.reason.trim().slice(0, 500);
  if (!/^PST-[A-Z0-9]{12}$/.test(postId)) throw new Error("社区内容标识无效");
  if (!(["pending", "approved", "rejected", "hidden"] as string[]).includes(status)) throw new Error("社区审核状态无效");
  if (status === "rejected" && reason.length < 2) throw new Error("拒绝公开时请填写审核说明");
  const db = await getStoreDb();
  const event = await db.prepare(`
    WITH previous AS MATERIALIZED (
      SELECT id, status FROM community_posts WHERE id = ? FOR UPDATE
    ), updated AS (
      UPDATE community_posts p SET
        status = ?, moderation_note = ?, moderated_by = ?, moderated_at = CURRENT_TIMESTAMP,
        published_at = CASE WHEN ? = 'approved' THEN COALESCE(p.published_at, CURRENT_TIMESTAMP::TEXT) ELSE p.published_at END,
        updated_at = CURRENT_TIMESTAMP
      FROM previous WHERE p.id = previous.id
      RETURNING p.id, previous.status AS from_status, p.status AS to_status
    )
    INSERT INTO community_moderation_events (post_id, from_status, to_status, reason, admin_id, actor_email)
    SELECT id, from_status, to_status, ?, ?, ? FROM updated
    RETURNING post_id
  `).bind(postId, status, reason, actor.email, status, reason, actor.id, actor.email).first<{ post_id: string }>();
  if (!event) throw new Error("社区内容不存在");
  const post = await db.prepare("SELECT member_id FROM community_posts WHERE id = ? LIMIT 1").bind(postId).first<{ member_id: number }>();
  if (post && status !== "pending") await notifyCommunityModeration({ postId, authorMemberId: Number(post.member_id), status });
  return event.post_id;
}
