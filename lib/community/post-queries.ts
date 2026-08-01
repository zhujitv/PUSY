import { getStoreDb } from "../../db/store";
import { serializePost, type CommunityMember, type CommunityPostRow } from "./post-types";

const postSelect = `
  SELECT p.id, p.member_id, p.title, p.body, p.status, p.moderation_note, p.published_at, p.created_at, p.updated_at,
    cp.public_id AS author_public_id, cp.display_name AS author_name, cp.bio AS author_bio,
    cp.account_type AS author_account_type, cp.official_label AS author_official_label,
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
  GROUP BY p.id, p.member_id, p.title, p.body, p.status, p.moderation_note, p.published_at, p.created_at, p.updated_at,
    cp.public_id, cp.display_name, cp.bio, cp.account_type, cp.official_label, promotion.placement, promotion.sort_order
`;

export async function listCommunityPosts(input: { publicId?: string; viewerMemberId?: number; topicSlug?: string; productSlug?: string; query?: string; feed?: "all" | "following" | "bookmarks"; sort?: "featured" | "latest" | "popular"; cursor?: string; limit?: number } = {}) {
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
  if (input.cursor) {
    const [cursorTime, cursorId] = input.cursor.split("|");
    if (/^\d{4}-\d{2}-\d{2}/.test(cursorTime ?? "") && /^PST-[A-Z0-9]{12}$/.test(cursorId ?? "")) {
      where += `${where ? " AND" : "WHERE"} (COALESCE(p.published_at, p.created_at)::timestamp, p.id) < (?::timestamp, ?)`;
      values.push(cursorTime, cursorId);
    }
  }
  values.push(limit);
  const viewerScoreId = Number.isInteger(input.viewerMemberId) && Number(input.viewerMemberId) > 0 ? Number(input.viewerMemberId) : 0;
  const order = input.sort === "latest"
    ? "COALESCE(p.published_at, p.created_at)::timestamp DESC"
    : input.sort === "popular"
      ? "like_count DESC, comment_count DESC, bookmark_count DESC, COALESCE(p.published_at, p.created_at)::timestamp DESC"
      : `CASE COALESCE(promotion.placement, '') WHEN 'pinned' THEN 0 WHEN 'featured' THEN 1 ELSE 2 END,
        CASE WHEN EXISTS(SELECT 1 FROM community_follows score_follow WHERE score_follow.follower_member_id = ${viewerScoreId} AND score_follow.followed_member_id = p.member_id) THEN 0 ELSE 1 END,
        CASE WHEN EXISTS(SELECT 1 FROM community_post_topics score_pt JOIN community_topic_follows score_tf ON score_tf.topic_id = score_pt.topic_id WHERE score_pt.post_id = p.id AND score_tf.member_id = ${viewerScoreId}) THEN 0 ELSE 1 END,
        COALESCE(promotion.sort_order, 0) DESC, comment_count DESC, like_count DESC, bookmark_count DESC,
        COALESCE(p.published_at, p.created_at)::timestamp DESC`;
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
    SELECT m.id AS member_id, cp.public_id, cp.display_name, cp.bio, cp.account_type, cp.official_label, m.joined_at,
      COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'approved')::INTEGER AS post_count,
      (SELECT COUNT(*) FROM community_follows WHERE followed_member_id = m.id)::INTEGER AS follower_count,
      (SELECT COUNT(*) FROM community_follows WHERE follower_member_id = m.id)::INTEGER AS following_count,
      EXISTS(SELECT 1 FROM community_follows WHERE follower_member_id = ? AND followed_member_id = m.id) AS viewer_is_following
    FROM community_profiles cp
    JOIN members m ON m.id = cp.member_id
    LEFT JOIN community_posts p ON p.member_id = m.id
    WHERE cp.public_id = ? AND cp.status = 'active' AND m.status != 'blocked'
    GROUP BY m.id, cp.public_id, cp.display_name, cp.bio, cp.account_type, cp.official_label, m.joined_at
    LIMIT 1
  `).bind(viewerMemberId ?? 0, publicId).first<CommunityMember>();
  return member ? {
    ...member,
    member_id: Number(member.member_id),
    post_count: Number(member.post_count),
    follower_count: Number(member.follower_count),
    following_count: Number(member.following_count),
    viewer_is_following: Boolean(member.viewer_is_following),
    account_type: member.account_type === "official" ? "official" : "member",
  } : null;
}

export async function getCommunityProfileForMember(memberId: number) {
  const db = await getStoreDb();
  return db.prepare("SELECT member_id, public_id, display_name, bio, status, account_type, official_label, creator_status, restricted_until, reward_blocked_at FROM community_profiles WHERE member_id = ? LIMIT 1")
    .bind(memberId)
    .first<{ member_id: number; public_id: string; display_name: string; bio: string; status: string; account_type: string; official_label: string; creator_status: string; restricted_until: string | null; reward_blocked_at: string | null }>();
}
