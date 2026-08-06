import { getStoreDb } from "../../db/store";

export type CommunityInterestProfile = {
  topicSlugs: string[];
  initialized: boolean;
};

function normalizedTopicSlugs(value: unknown) {
  return Array.isArray(value)
    ? Array.from(new Set(value.map(String).map((slug) => slug.trim().toLowerCase()).filter((slug) => /^[a-z0-9-]{2,40}$/.test(slug)))).slice(0, 8)
    : [];
}

export async function getCommunityInterestProfile(memberId: number): Promise<CommunityInterestProfile> {
  const db = await getStoreDb();
  const rows = await db.prepare("SELECT interest_key FROM community_member_interests WHERE member_id = ? AND interest_type = 'topic' ORDER BY weight DESC, updated_at DESC")
    .bind(memberId).all<{ interest_key: string }>();
  return { topicSlugs: rows.results.map((row) => row.interest_key), initialized: rows.results.length > 0 };
}

export async function setCommunityInterestProfile(memberId: number, rawTopicSlugs: unknown) {
  const topicSlugs = normalizedTopicSlugs(rawTopicSlugs);
  if (topicSlugs.length < 2) throw new Error("请至少选择 2 个感兴趣的话题");
  const db = await getStoreDb();
  const topics = await db.prepare("SELECT slug FROM community_topics WHERE slug = ANY(?::text[]) AND status = 'active'").bind(topicSlugs).all<{ slug: string }>();
  if (topics.results.length !== topicSlugs.length) throw new Error("兴趣话题不存在或已停用");
  await db.batch([
    db.prepare("DELETE FROM community_member_interests WHERE member_id = ? AND interest_type = 'topic'").bind(memberId),
    ...topicSlugs.map((slug, index) => db.prepare(`
      INSERT INTO community_member_interests (member_id, interest_type, interest_key, weight, source)
      VALUES (?, 'topic', ?, ?, 'onboarding')
      ON CONFLICT(member_id, interest_type, interest_key) DO UPDATE SET
        weight = excluded.weight, source = 'onboarding', updated_at = CURRENT_TIMESTAMP
    `).bind(memberId, slug, Math.max(5, 10 - index))),
  ]);
  return getCommunityInterestProfile(memberId);
}

export async function learnCommunityTopicInterest(memberId: number, postId: string, strength = 1) {
  const db = await getStoreDb();
  await db.prepare(`
    INSERT INTO community_member_interests (member_id, interest_type, interest_key, weight, source)
    SELECT ?, 'topic', topic.slug, ?, 'behavior'
    FROM community_post_topics post_topic JOIN community_topics topic ON topic.id = post_topic.topic_id
    WHERE post_topic.post_id = ? AND topic.status = 'active'
    ON CONFLICT(member_id, interest_type, interest_key) DO UPDATE SET
      weight = LEAST(10, community_member_interests.weight + excluded.weight), updated_at = CURRENT_TIMESTAMP
  `).bind(memberId, Math.min(3, Math.max(1, strength)), postId).run();
}
