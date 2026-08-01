import { getStoreDb } from "../../db/store";
import type { CommunityMediaInput } from "./media";
import { parseCommunityProducts, resolveCommunityProducts, type CommunityLinkedProduct, type CommunityPromotion } from "./commerce";
import { resolveCommunityTopics, type CommunityTopic } from "./topics";

export type CommunityPostStatus = "pending" | "approved" | "rejected" | "hidden";

export type CommunityPost = {
  id: string;
  member_id: number;
  author_public_id: string;
  title: string;
  body: string;
  status: CommunityPostStatus;
  moderation_note: string;
  published_at: string | null;
  created_at: string;
  author_name: string;
  author_bio: string;
  media_ids: string[];
  topics: Array<Pick<CommunityTopic, "id" | "slug" | "name">>;
  products: CommunityLinkedProduct[];
  promotion_placement: CommunityPromotion | "";
  promotion_rank: number;
  follower_count: number;
  viewer_is_following: boolean;
  like_count: number;
  comment_count: number;
  bookmark_count: number;
  viewer_has_liked: boolean;
  viewer_has_bookmarked: boolean;
};

export type CommunityMember = {
  member_id: number;
  public_id: string;
  display_name: string;
  bio: string;
  joined_at: string;
  post_count: number;
  follower_count: number;
  following_count: number;
  viewer_is_following: boolean;
};

type CommunityPostRow = Omit<CommunityPost, "media_ids" | "topics" | "products"> & { media_ids: unknown; topics: unknown; products: unknown };

function mediaIds(value: unknown) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean).slice(0, 4);
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean).slice(0, 4) : [];
  } catch {
    return [];
  }
}

function serializePost(row: CommunityPostRow): CommunityPost {
  let topics: CommunityPost["topics"] = [];
  const value = typeof row.topics === "string" ? (() => { try { return JSON.parse(row.topics); } catch { return []; } })() : row.topics;
  if (Array.isArray(value)) topics = value.filter((item) => item && typeof item === "object").map((item) => ({
    id: String((item as Record<string, unknown>).id ?? ""),
    slug: String((item as Record<string, unknown>).slug ?? ""),
    name: String((item as Record<string, unknown>).name ?? ""),
  })).filter((item) => item.id && item.slug && item.name).slice(0, 3);
  return {
    ...row,
    member_id: Number(row.member_id),
    media_ids: mediaIds(row.media_ids),
    topics,
    products: parseCommunityProducts(row.products),
    promotion_placement: row.promotion_placement === "pinned" || row.promotion_placement === "featured" ? row.promotion_placement : "",
    promotion_rank: Number(row.promotion_rank),
    follower_count: Number(row.follower_count),
    viewer_is_following: Boolean(row.viewer_is_following),
    like_count: Number(row.like_count),
    comment_count: Number(row.comment_count),
    bookmark_count: Number(row.bookmark_count),
    viewer_has_liked: Boolean(row.viewer_has_liked),
    viewer_has_bookmarked: Boolean(row.viewer_has_bookmarked),
  };
}

export function communityPostDto(post: CommunityPost, includeModeration = false) {
  const dto: Partial<CommunityPost> = { ...post };
  delete dto.member_id;
  if (!includeModeration) delete dto.moderation_note;
  return dto;
}

export function communityMemberDto(member: CommunityMember) {
  const dto: Partial<CommunityMember> = { ...member };
  delete dto.member_id;
  return dto;
}

const postSelect = `
  SELECT p.id, p.member_id, p.title, p.body, p.status, p.moderation_note, p.published_at, p.created_at,
    cp.public_id AS author_public_id, cp.display_name AS author_name, cp.bio AS author_bio,
    COALESCE(json_agg(cm.id ORDER BY cm.position) FILTER (WHERE cm.id IS NOT NULL), '[]'::json) AS media_ids,
    COALESCE((SELECT json_agg(json_build_object('id', topic.id, 'slug', topic.slug, 'name', topic.name) ORDER BY topic.name)
      FROM community_post_topics post_topic JOIN community_topics topic ON topic.id = post_topic.topic_id
      WHERE post_topic.post_id = p.id AND topic.status = 'active'), '[]'::json) AS topics,
    COALESCE((SELECT json_agg(json_build_object(
        'slug', product.slug,
        'name', product.name,
        'image', product.image,
        'price', product.price,
        'verified_purchase', EXISTS (
          SELECT 1 FROM orders purchase
          JOIN order_items purchased_item ON purchased_item.order_id = purchase.id
          WHERE purchase.member_id = p.member_id
            AND purchased_item.product_slug = product.slug
            AND purchase.status NOT IN ('待付款', '支付失败', '已取消', '已退款')
        )
      ) ORDER BY linked_product.position)
      FROM community_post_products linked_product
      JOIN products product ON product.slug = linked_product.product_slug AND product.status = 'active'
      WHERE linked_product.post_id = p.id), '[]'::json) AS products,
    COALESCE(promotion.placement, '') AS promotion_placement,
    COALESCE(promotion.sort_order, 0)::INTEGER AS promotion_rank,
    (SELECT COUNT(*) FROM community_follows followers WHERE followers.followed_member_id = p.member_id)::INTEGER AS follower_count,
    EXISTS(SELECT 1 FROM community_follows viewer_follow
      WHERE viewer_follow.follower_member_id = ? AND viewer_follow.followed_member_id = p.member_id) AS viewer_is_following,
    (SELECT COUNT(*) FROM community_post_likes likes WHERE likes.post_id = p.id)::INTEGER AS like_count,
    (SELECT COUNT(*) FROM community_comments comments WHERE comments.post_id = p.id AND comments.status = 'visible')::INTEGER AS comment_count,
    (SELECT COUNT(*) FROM community_post_bookmarks bookmarks WHERE bookmarks.post_id = p.id)::INTEGER AS bookmark_count,
    EXISTS(SELECT 1 FROM community_post_likes viewer_like
      WHERE viewer_like.post_id = p.id AND viewer_like.member_id = ?) AS viewer_has_liked,
    EXISTS(SELECT 1 FROM community_post_bookmarks viewer_bookmark
      WHERE viewer_bookmark.post_id = p.id AND viewer_bookmark.member_id = ?) AS viewer_has_bookmarked
  FROM community_posts p
  JOIN members m ON m.id = p.member_id AND m.status != 'blocked'
  JOIN community_profiles cp ON cp.member_id = m.id AND cp.status = 'active'
  LEFT JOIN community_post_media cm ON cm.post_id = p.id
  LEFT JOIN community_post_promotions promotion ON promotion.post_id = p.id
`;

const postGroup = `
  GROUP BY p.id, p.member_id, p.title, p.body, p.status, p.moderation_note, p.published_at, p.created_at,
    cp.public_id, cp.display_name, cp.bio, promotion.placement, promotion.sort_order
`;

export async function listCommunityPosts(input: { publicId?: string; viewerMemberId?: number; topicSlug?: string; productSlug?: string; query?: string; feed?: "all" | "following" | "bookmarks"; sort?: "featured" | "latest" | "popular"; limit?: number } = {}) {
  const db = await getStoreDb();
  const limit = Math.min(48, Math.max(1, Math.round(input.limit ?? 24)));
  let where = "WHERE p.status = 'approved'";
  const values: unknown[] = [input.viewerMemberId ?? 0, input.viewerMemberId ?? 0, input.viewerMemberId ?? 0];
  if (input.publicId) {
    const profile = await getCommunityMember(input.publicId);
    if (!profile) return [];
    where = input.viewerMemberId === profile.member_id
      ? "WHERE cp.public_id = ? AND p.status != 'hidden'"
      : "WHERE cp.public_id = ? AND p.status = 'approved'";
    values.push(input.publicId);
  }
  if (input.topicSlug) {
    where += `${where ? " AND" : "WHERE"} EXISTS (
      SELECT 1 FROM community_post_topics filter_pt
      JOIN community_topics filter_topic ON filter_topic.id = filter_pt.topic_id
      WHERE filter_pt.post_id = p.id AND filter_topic.slug = ? AND filter_topic.status = 'active'
    )`;
    values.push(input.topicSlug);
  }
  if (input.productSlug) {
    where += `${where ? " AND" : "WHERE"} EXISTS (
      SELECT 1 FROM community_post_products product_filter
      WHERE product_filter.post_id = p.id AND product_filter.product_slug = ?
    )`;
    values.push(input.productSlug);
  }
  const query = input.query?.trim().slice(0, 80);
  if (query) {
    const pattern = `%${query}%`;
    where += `${where ? " AND" : "WHERE"} (
      p.title ILIKE ? OR p.body ILIKE ? OR cp.display_name ILIKE ?
      OR EXISTS (
        SELECT 1 FROM community_post_topics search_pt
        JOIN community_topics search_topic ON search_topic.id = search_pt.topic_id
        WHERE search_pt.post_id = p.id AND search_topic.name ILIKE ?
      )
      OR EXISTS (
        SELECT 1 FROM community_post_products search_pp
        JOIN products search_product ON search_product.slug = search_pp.product_slug
        WHERE search_pp.post_id = p.id AND search_product.name ILIKE ?
      )
    )`;
    values.push(pattern, pattern, pattern, pattern, pattern);
  }
  if (input.feed === "following") {
    where += `${where ? " AND" : "WHERE"} EXISTS (
      SELECT 1 FROM community_follows feed_follow
      WHERE feed_follow.follower_member_id = ? AND feed_follow.followed_member_id = p.member_id
    )`;
    values.push(input.viewerMemberId ?? 0);
  }
  if (input.feed === "bookmarks") {
    where += `${where ? " AND" : "WHERE"} EXISTS (
      SELECT 1 FROM community_post_bookmarks feed_bookmark
      WHERE feed_bookmark.member_id = ? AND feed_bookmark.post_id = p.id
    )`;
    values.push(input.viewerMemberId ?? 0);
  }
  values.push(limit);
  const order = input.sort === "latest"
    ? "COALESCE(p.published_at, p.created_at)::timestamp DESC"
    : input.sort === "popular"
      ? "like_count DESC, comment_count DESC, bookmark_count DESC, COALESCE(p.published_at, p.created_at)::timestamp DESC"
      : "CASE COALESCE(promotion.placement, '') WHEN 'pinned' THEN 0 WHEN 'featured' THEN 1 ELSE 2 END, COALESCE(promotion.sort_order, 0) DESC, COALESCE(p.published_at, p.created_at)::timestamp DESC";
  const rows = await db.prepare(`${postSelect} ${where} ${postGroup} ORDER BY ${order} LIMIT ?`)
    .bind(...values)
    .all<CommunityPostRow>();
  return rows.results.map(serializePost);
}

export async function getCommunityPost(id: string, viewerMemberId?: number) {
  const db = await getStoreDb();
  const row = await db.prepare(`${postSelect} WHERE p.id = ? AND (p.status = 'approved' OR p.member_id = ?) AND p.status != 'hidden' ${postGroup} LIMIT 1`)
    .bind(viewerMemberId ?? 0, viewerMemberId ?? 0, viewerMemberId ?? 0, id, viewerMemberId ?? 0)
    .first<CommunityPostRow>();
  return row ? serializePost(row) : null;
}

export async function getCommunityMember(publicId: string, viewerMemberId?: number): Promise<CommunityMember | null> {
  const db = await getStoreDb();
  const member = await db.prepare(`
    SELECT m.id AS member_id, cp.public_id, cp.display_name, cp.bio, m.joined_at,
      COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'approved')::INTEGER AS post_count,
      (SELECT COUNT(*) FROM community_follows WHERE followed_member_id = m.id)::INTEGER AS follower_count,
      (SELECT COUNT(*) FROM community_follows WHERE follower_member_id = m.id)::INTEGER AS following_count,
      EXISTS(SELECT 1 FROM community_follows WHERE follower_member_id = ? AND followed_member_id = m.id) AS viewer_is_following
    FROM community_profiles cp
    JOIN members m ON m.id = cp.member_id
    LEFT JOIN community_posts p ON p.member_id = m.id
    WHERE cp.public_id = ? AND cp.status = 'active' AND m.status != 'blocked'
    GROUP BY m.id, cp.public_id, cp.display_name, cp.bio, m.joined_at
    LIMIT 1
  `).bind(viewerMemberId ?? 0, publicId).first<CommunityMember>();
  return member ? {
    ...member,
    member_id: Number(member.member_id),
    post_count: Number(member.post_count),
    follower_count: Number(member.follower_count),
    following_count: Number(member.following_count),
    viewer_is_following: Boolean(member.viewer_is_following),
  } : null;
}

export async function getCommunityProfileForMember(memberId: number) {
  const db = await getStoreDb();
  return db.prepare("SELECT member_id, public_id, display_name, bio, status FROM community_profiles WHERE member_id = ? LIMIT 1")
    .bind(memberId)
    .first<{ member_id: number; public_id: string; display_name: string; bio: string; status: string }>();
}

export async function ensureCommunityProfile(memberId: number, displayName: string) {
  const db = await getStoreDb();
  const existing = await getCommunityProfileForMember(memberId);
  if (existing) {
    const approved = await db.prepare("SELECT id FROM community_posts WHERE member_id = ? AND status = 'approved' LIMIT 1").bind(memberId).first();
    if (!approved && existing.display_name !== displayName) await db.prepare("UPDATE community_profiles SET display_name = ?, updated_at = CURRENT_TIMESTAMP WHERE member_id = ?").bind(displayName, memberId).run();
    return existing.public_id;
  }
  const publicId = `MBR-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
  await db.prepare("INSERT INTO community_profiles (member_id, public_id, display_name) VALUES (?, ?, ?) ON CONFLICT(member_id) DO NOTHING").bind(memberId, publicId, displayName).run();
  return (await getCommunityProfileForMember(memberId))?.public_id ?? publicId;
}

export async function createCommunityPost(input: { memberId: number; displayName: string; title: string; body: string; media: CommunityMediaInput[]; topicSlugs: string[]; productSlugs: string[]; clientRequestId: string }) {
  const db = await getStoreDb();
  const member = await db.prepare("SELECT id, status FROM members WHERE id = ? LIMIT 1").bind(input.memberId).first<{ id: number; status: string }>();
  if (!member || member.status === "blocked") throw new Error("该会员账户不可发布社区内容");
  const publicId = await ensureCommunityProfile(input.memberId, input.displayName);
  const existing = await db.prepare("SELECT id FROM community_posts WHERE member_id = ? AND client_request_id = ? LIMIT 1").bind(input.memberId, input.clientRequestId).first<{ id: string }>();
  if (existing) return { id: existing.id, publicId, duplicate: true };
  const [topics, linkedProducts] = await Promise.all([
    resolveCommunityTopics(input.topicSlugs),
    resolveCommunityProducts(input.productSlugs),
  ]);
  const id = `PST-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
  try {
    await db.batch([
      db.prepare("INSERT INTO community_posts (id, member_id, client_request_id, title, body) VALUES (?, ?, ?, ?, ?)").bind(id, input.memberId, input.clientRequestId, input.title, input.body),
      ...input.media.map((item, position) => db.prepare("INSERT INTO community_post_media (id, post_id, position, mime_type, byte_size, bytes) VALUES (?, ?, ?, ?, ?, ?)")
        .bind(`MED-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`, id, position, item.mimeType, item.bytes.length, item.bytes)),
      ...topics.map((topic) => db.prepare("INSERT INTO community_post_topics (post_id, topic_id) VALUES (?, ?)").bind(id, topic.id)),
      ...linkedProducts.map((product, position) => db.prepare("INSERT INTO community_post_products (post_id, product_slug, position) VALUES (?, ?, ?)").bind(id, product.slug, position)),
    ]);
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "23505") {
      const retried = await db.prepare("SELECT id FROM community_posts WHERE member_id = ? AND client_request_id = ? LIMIT 1").bind(input.memberId, input.clientRequestId).first<{ id: string }>();
      if (retried) return { id: retried.id, publicId, duplicate: true };
    }
    throw error;
  }
  return { id, publicId, duplicate: false };
}

export async function getCommunityMedia(id: string) {
  const db = await getStoreDb();
  return db.prepare(`
    SELECT cm.bytes, cm.mime_type, cm.byte_size, p.member_id, p.status
    FROM community_post_media cm JOIN community_posts p ON p.id = cm.post_id
    WHERE cm.id = ? LIMIT 1
  `).bind(id).first<{ bytes: Buffer; mime_type: string; byte_size: number; member_id: number; status: CommunityPostStatus }>();
}
