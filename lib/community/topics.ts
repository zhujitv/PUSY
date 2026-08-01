import { getStoreDb } from "../../db/store";
import { recordCommunityActivity } from "./activity";

export type CommunityTopic = {
  id: string;
  slug: string;
  name: string;
  description: string;
  post_count: number;
  follower_count: number;
  viewer_is_following: boolean;
  status?: "draft" | "active" | "archived";
  sort_order?: number;
  featured?: number;
};

export async function listCommunityTopics(viewerMemberId?: number, includeInactive = false) {
  const db = await getStoreDb();
  const rows = await db.prepare(`
    SELECT t.id, t.slug, t.name, t.description, t.status, t.sort_order, t.featured,
      COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'approved')::INTEGER AS post_count,
      COUNT(DISTINCT tf.member_id)::INTEGER AS follower_count,
      EXISTS(SELECT 1 FROM community_topic_follows viewer_tf WHERE viewer_tf.topic_id = t.id AND viewer_tf.member_id = ?) AS viewer_is_following
    FROM community_topics t
    LEFT JOIN community_post_topics pt ON pt.topic_id = t.id
    LEFT JOIN community_posts p ON p.id = pt.post_id
    LEFT JOIN community_topic_follows tf ON tf.topic_id = t.id
    ${includeInactive ? "" : "WHERE t.status = 'active'"}
    GROUP BY t.id, t.slug, t.name, t.description, t.status, t.sort_order, t.featured
    ORDER BY t.featured DESC, t.sort_order DESC, post_count DESC, t.created_at::timestamp ASC
  `).bind(viewerMemberId ?? 0).all<CommunityTopic>();
  return rows.results.map((row) => ({ ...row, post_count: Number(row.post_count), follower_count: Number(row.follower_count), viewer_is_following: Boolean(row.viewer_is_following) }));
}

export async function resolveCommunityTopics(slugs: string[]) {
  const requested = [...new Set(slugs.map((slug) => slug.trim().toLowerCase()).filter(Boolean))].slice(0, 3);
  if (!requested.length) return [];
  const db = await getStoreDb();
  const topics = await db.prepare(`
    SELECT id, slug, name, description, 0::INTEGER AS post_count, 0::INTEGER AS follower_count, false AS viewer_is_following
    FROM community_topics
    WHERE status = 'active' AND slug = ANY(?::text[])
    ORDER BY created_at::timestamp ASC
  `).bind(requested).all<CommunityTopic>();
  if (topics.results.length !== requested.length) throw new Error("请选择有效的社区话题");
  return topics.results;
}

export async function setCommunityTopicFollow(input: { memberId: number; slug: string; enabled: boolean }) {
  const db = await getStoreDb();
  const topic = await db.prepare("SELECT id, slug, name FROM community_topics WHERE slug = ? AND status = 'active' LIMIT 1")
    .bind(input.slug).first<{ id: string; slug: string; name: string }>();
  if (!topic) throw new Error("社区话题不存在或已停用");
  if (input.enabled) {
    const result = await db.prepare("INSERT INTO community_topic_follows (topic_id, member_id) VALUES (?, ?) ON CONFLICT DO NOTHING")
      .bind(topic.id, input.memberId).run();
    if (result.meta.changes) await recordCommunityActivity({ memberId: input.memberId, type: "topic_follow", eventKey: `topic-follow:${topic.id}:${input.memberId}`, entityType: "topic", entityId: topic.id });
  } else {
    await db.prepare("DELETE FROM community_topic_follows WHERE topic_id = ? AND member_id = ?").bind(topic.id, input.memberId).run();
  }
  const count = await db.prepare("SELECT COUNT(*)::INTEGER AS count FROM community_topic_follows WHERE topic_id = ?").bind(topic.id).first<{ count: number }>();
  return { slug: topic.slug, name: topic.name, following: input.enabled, followerCount: Number(count?.count ?? 0) };
}
