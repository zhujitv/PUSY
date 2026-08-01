import { getStoreDb } from "../../db/store";
import { listCommunityCampaigns } from "./creator";
import { listCommunityTopics } from "./topics";

export async function getCommunityOperationsData() {
  const db = await getStoreDb();
  const [metrics, comments, members, topics, campaigns, broadcasts] = await Promise.all([
    db.prepare(`SELECT
      COUNT(DISTINCT member_id) FILTER (WHERE created_at::timestamptz >= CURRENT_TIMESTAMP - INTERVAL '1 day')::INTEGER AS dau,
      COUNT(DISTINCT member_id) FILTER (WHERE created_at::timestamptz >= CURRENT_TIMESTAMP - INTERVAL '7 days')::INTEGER AS wau,
      COUNT(DISTINCT member_id) FILTER (WHERE created_at::timestamptz >= CURRENT_TIMESTAMP - INTERVAL '30 days')::INTEGER AS mau,
      COUNT(*) FILTER (WHERE created_at::timestamptz >= CURRENT_TIMESTAMP - INTERVAL '30 days' AND event_type IN ('like','comment','comment_like','follow','topic_follow'))::INTEGER AS interactions_30d,
      COUNT(DISTINCT member_id) FILTER (WHERE created_at::timestamptz >= CURRENT_TIMESTAMP - INTERVAL '30 days')::INTEGER AS active_members_30d
      FROM community_activity_events`).first<Record<string, number>>(),
    db.prepare(`SELECT c.id, c.post_id, c.body, c.status, c.created_at, cp.public_id AS author_public_id, cp.display_name AS author_name,
      p.title AS post_title, COUNT(DISTINCT cl.member_id)::INTEGER AS like_count,
      COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'pending')::INTEGER AS pending_reports
      FROM community_comments c JOIN community_profiles cp ON cp.member_id = c.member_id JOIN community_posts p ON p.id = c.post_id
      LEFT JOIN community_comment_likes cl ON cl.comment_id = c.id LEFT JOIN community_reports r ON r.comment_id = c.id
      GROUP BY c.id, cp.public_id, cp.display_name, p.title ORDER BY c.created_at::timestamp DESC LIMIT 200`).all(),
    db.prepare(`SELECT cp.member_id, cp.public_id, cp.display_name, cp.account_type, cp.creator_status, cp.comment_status,
      cp.restricted_until, cp.restriction_note, m.status AS member_status,
      COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'approved')::INTEGER AS post_count,
      COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'visible')::INTEGER AS comment_count,
      COUNT(DISTINCT f.follower_member_id)::INTEGER AS follower_count,
      COUNT(DISTINCT v.id)::INTEGER AS violation_count
      FROM community_profiles cp JOIN members m ON m.id = cp.member_id
      LEFT JOIN community_posts p ON p.member_id = cp.member_id LEFT JOIN community_comments c ON c.member_id = cp.member_id
      LEFT JOIN community_follows f ON f.followed_member_id = cp.member_id LEFT JOIN community_creator_violations v ON v.member_id = cp.member_id
      GROUP BY cp.member_id, m.status ORDER BY violation_count DESC, follower_count DESC, cp.created_at::timestamp DESC LIMIT 200`).all(),
    listCommunityTopics(undefined, true),
    listCommunityCampaigns({ includeInactive: true }),
    db.prepare("SELECT * FROM community_broadcasts ORDER BY created_at::timestamp DESC LIMIT 50").all(),
  ]);
  const active7d = await db.prepare(`SELECT COUNT(*)::INTEGER AS count FROM (
    SELECT member_id FROM community_activity_events WHERE created_at::timestamptz >= CURRENT_TIMESTAMP - INTERVAL '7 days'
    GROUP BY member_id HAVING COUNT(DISTINCT timezone('Asia/Shanghai', created_at::timestamptz)::date) >= 2
  ) returning_members`).first<{ count: number }>();
  const values = metrics ?? {};
  const wau = Number(values.wau ?? 0);
  return {
    metrics: { dau: Number(values.dau ?? 0), wau, mau: Number(values.mau ?? 0), interactions30d: Number(values.interactions_30d ?? 0), returning7d: Number(active7d?.count ?? 0), retention7d: wau ? Math.round(Number(active7d?.count ?? 0) / wau * 1000) / 10 : 0 },
    comments: comments.results,
    members: members.results,
    topics,
    campaigns,
    broadcasts: broadcasts.results,
  };
}

export async function updateCommunityCommentStatus(input: { id: string; status: "visible" | "hidden" }) {
  const db = await getStoreDb();
  const result = await db.prepare("UPDATE community_comments SET status = ?, updated_at = CURRENT_TIMESTAMP::TEXT WHERE id = ? AND status != 'deleted' RETURNING id")
    .bind(input.status, input.id).first();
  if (!result) throw new Error("社区评论不存在或已经删除");
}

export async function saveCommunityTopic(input: { id?: string; slug: string; name: string; description: string; status: "draft" | "active" | "archived"; sortOrder: number; featured: boolean }) {
  const db = await getStoreDb();
  const id = input.id || `TPC-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
  await db.prepare(`INSERT INTO community_topics (id, slug, name, description, status, sort_order, featured)
    VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description,
      status = EXCLUDED.status, sort_order = EXCLUDED.sort_order, featured = EXCLUDED.featured, updated_at = CURRENT_TIMESTAMP::TEXT`)
    .bind(id, input.slug, input.name, input.description, input.status, input.sortOrder, input.featured ? 1 : 0).run();
}

export async function updateCommunityCampaignStatus(id: string, status: "draft" | "active" | "ended") {
  const db = await getStoreDb();
  const result = await db.prepare("UPDATE community_campaigns SET status = ?, updated_at = CURRENT_TIMESTAMP::TEXT WHERE id = ? RETURNING id").bind(status, id).first();
  if (!result) throw new Error("社区活动不存在");
}

export async function saveCommunityCampaign(input: { id: string; title: string; description: string; status: "draft" | "active" | "ended"; rewardPoints: number; startsAt?: string; endsAt?: string }) {
  const db = await getStoreDb();
  const result = await db.prepare(`UPDATE community_campaigns SET title = ?, description = ?, status = ?, reward_points = ?, starts_at = ?, ends_at = ?,
    updated_at = CURRENT_TIMESTAMP::TEXT WHERE id = ? RETURNING id`)
    .bind(input.title, input.description, input.status, input.rewardPoints, input.startsAt || null, input.endsAt || null, input.id).first();
  if (!result) throw new Error("社区活动不存在");
}

export async function updateCommunityMemberGovernance(input: { memberId: number; creatorStatus: "active" | "restricted"; commentStatus: "active" | "restricted"; restrictedUntil?: string; note: string }) {
  const db = await getStoreDb();
  const result = await db.prepare(`UPDATE community_profiles SET creator_status = ?, comment_status = ?, restricted_until = ?, restriction_note = ?,
    updated_at = CURRENT_TIMESTAMP::TEXT WHERE member_id = ? RETURNING member_id`)
    .bind(input.creatorStatus, input.commentStatus, input.restrictedUntil || null, input.note, input.memberId).first();
  if (!result) throw new Error("社区会员不存在");
}

export async function sendCommunityBroadcast(input: { title: string; body: string; target: "all" | "active" | "creators"; actorEmail: string }) {
  const db = await getStoreDb();
  const id = `BCS-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
  const condition = input.target === "active" ? "AND EXISTS (SELECT 1 FROM community_activity_events a WHERE a.member_id = cp.member_id AND a.created_at::timestamptz >= CURRENT_TIMESTAMP - INTERVAL '30 days')" : input.target === "creators" ? "AND EXISTS (SELECT 1 FROM community_posts p WHERE p.member_id = cp.member_id AND p.status = 'approved')" : "";
  const recipients = await db.prepare(`SELECT cp.member_id FROM community_profiles cp
    WHERE cp.status = 'active' ${condition} AND NOT EXISTS (SELECT 1 FROM community_notification_preferences pref WHERE pref.member_id = cp.member_id AND pref.campaigns_enabled = 0)`).all<{ member_id: number }>();
  await db.prepare("INSERT INTO community_broadcasts (id, title, body, target, recipient_count, created_by) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(id, input.title, input.body, input.target, recipients.results.length, input.actorEmail).run();
  if (recipients.results.length) await db.batch(recipients.results.map((recipient) => db.prepare(`INSERT INTO community_notifications
    (id, recipient_member_id, event_key, event_type, entity_type, entity_id, payload_json)
    VALUES (?, ?, ?, 'community_broadcast', 'broadcast', ?, ?) ON CONFLICT (recipient_member_id, event_key) DO NOTHING`)
    .bind(`NTF-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`, recipient.member_id, `broadcast:${id}`, id, JSON.stringify({ title: input.title, body: input.body }))));
  return recipients.results.length;
}
