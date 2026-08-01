import { getStoreDb } from "../../db/store";

export type CommunityTopic = {
  id: string;
  slug: string;
  name: string;
  description: string;
  post_count: number;
};

export async function listCommunityTopics() {
  const db = await getStoreDb();
  const rows = await db.prepare(`
    SELECT t.id, t.slug, t.name, t.description,
      COUNT(p.id) FILTER (WHERE p.status = 'approved')::INTEGER AS post_count
    FROM community_topics t
    LEFT JOIN community_post_topics pt ON pt.topic_id = t.id
    LEFT JOIN community_posts p ON p.id = pt.post_id
    WHERE t.status = 'active'
    GROUP BY t.id, t.slug, t.name, t.description
    ORDER BY post_count DESC, t.created_at::timestamp ASC
  `).all<CommunityTopic>();
  return rows.results.map((row) => ({ ...row, post_count: Number(row.post_count) }));
}

export async function resolveCommunityTopics(slugs: string[]) {
  const requested = [...new Set(slugs.map((slug) => slug.trim().toLowerCase()).filter(Boolean))].slice(0, 3);
  if (!requested.length) return [];
  const db = await getStoreDb();
  const topics = await db.prepare(`
    SELECT id, slug, name, description, 0::INTEGER AS post_count
    FROM community_topics
    WHERE status = 'active' AND slug = ANY(?::text[])
    ORDER BY created_at::timestamp ASC
  `).bind(requested).all<CommunityTopic>();
  if (topics.results.length !== requested.length) throw new Error("请选择有效的社区话题");
  return topics.results;
}
