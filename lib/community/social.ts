import { getStoreDb } from "../../db/store";
import { ensureCommunityProfile } from "./posts";
import { recordCommunityActivity } from "./activity";
export { listCommunityTopics } from "./topics";
export type { CommunityTopic } from "./topics";

export type CommunityNotification = {
  id: string;
  event_type: string;
  actor_public_id: string | null;
  actor_name: string | null;
  entity_type: string;
  entity_id: string;
  post_id: string | null;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

function notificationId() {
  return `NTF-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
}

function payload(value: unknown) {
  if (typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

export async function getCommunitySocialSummary(memberId: number) {
  const db = await getStoreDb();
  const summary = await db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM community_follows WHERE follower_member_id = ?)::INTEGER AS following_count,
      (SELECT COUNT(*) FROM community_follows WHERE followed_member_id = ?)::INTEGER AS follower_count,
      (SELECT COUNT(*) FROM community_notifications WHERE recipient_member_id = ? AND read_at IS NULL)::INTEGER AS unread_count
  `).bind(memberId, memberId, memberId).first<{ following_count: number; follower_count: number; unread_count: number }>();
  return {
    followingCount: Number(summary?.following_count ?? 0),
    followerCount: Number(summary?.follower_count ?? 0),
    unreadCount: Number(summary?.unread_count ?? 0),
  };
}

export async function getCommunityStats() {
  const db = await getStoreDb();
  const stats = await db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM community_profiles WHERE status = 'active')::INTEGER AS member_count,
      (SELECT COUNT(*) FROM community_posts WHERE status = 'approved')::INTEGER AS post_count
  `).first<{ member_count: number; post_count: number }>();
  return { memberCount: Number(stats?.member_count ?? 0), postCount: Number(stats?.post_count ?? 0) };
}

export async function listSuggestedCommunityMembers(viewerMemberId?: number, limit = 3) {
  const db = await getStoreDb();
  const rows = await db.prepare(`
    SELECT cp.public_id, cp.display_name, cp.bio,
      COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'approved')::INTEGER AS post_count,
      COUNT(DISTINCT follower.follower_member_id)::INTEGER AS follower_count,
      EXISTS(SELECT 1 FROM community_follows viewer_follow
        WHERE viewer_follow.follower_member_id = ? AND viewer_follow.followed_member_id = cp.member_id) AS viewer_is_following
    FROM community_profiles cp
    JOIN members m ON m.id = cp.member_id AND m.status != 'blocked'
    LEFT JOIN community_posts p ON p.member_id = cp.member_id
    LEFT JOIN community_follows follower ON follower.followed_member_id = cp.member_id
    WHERE cp.status = 'active' AND cp.member_id != ?
    GROUP BY cp.member_id, cp.public_id, cp.display_name, cp.bio
    ORDER BY follower_count DESC, post_count DESC, cp.created_at::timestamp ASC
    LIMIT ?
  `).bind(viewerMemberId ?? 0, viewerMemberId ?? 0, Math.min(12, Math.max(1, limit))).all<{
    public_id: string; display_name: string; bio: string; post_count: number; follower_count: number; viewer_is_following: boolean;
  }>();
  return rows.results.map((row) => ({
    ...row,
    post_count: Number(row.post_count),
    follower_count: Number(row.follower_count),
    viewer_is_following: Boolean(row.viewer_is_following),
  }));
}

export async function listCommunityFollows(memberId: number) {
  const db = await getStoreDb();
  const [following, followers, counts] = await Promise.all([
    db.prepare(`
      SELECT cp.public_id, cp.display_name, cp.bio
      FROM community_follows f
      JOIN community_profiles cp ON cp.member_id = f.followed_member_id AND cp.status = 'active'
      JOIN members m ON m.id = cp.member_id AND m.status != 'blocked'
      WHERE f.follower_member_id = ? ORDER BY f.created_at::timestamp DESC LIMIT 100
    `).bind(memberId).all<{ public_id: string; display_name: string; bio: string }>(),
    db.prepare(`
      SELECT cp.public_id, cp.display_name, cp.bio
      FROM community_follows f
      JOIN community_profiles cp ON cp.member_id = f.follower_member_id AND cp.status = 'active'
      JOIN members m ON m.id = cp.member_id AND m.status != 'blocked'
      WHERE f.followed_member_id = ? ORDER BY f.created_at::timestamp DESC LIMIT 100
    `).bind(memberId).all<{ public_id: string; display_name: string; bio: string }>(),
    getCommunitySocialSummary(memberId),
  ]);
  return { following: following.results, followers: followers.results, counts };
}

export async function listCommunityConnections(publicId: string, viewerMemberId?: number) {
  const db = await getStoreDb();
  const target = await db.prepare("SELECT member_id, public_id, display_name FROM community_profiles WHERE public_id = ? AND status = 'active' LIMIT 1")
    .bind(publicId).first<{ member_id: number; public_id: string; display_name: string }>();
  if (!target) return null;
  const [followers, following] = await Promise.all([
    db.prepare(`SELECT cp.public_id, cp.display_name, cp.bio,
      EXISTS(SELECT 1 FROM community_follows mine WHERE mine.follower_member_id = ? AND mine.followed_member_id = cp.member_id) AS viewer_is_following
      FROM community_follows f JOIN community_profiles cp ON cp.member_id = f.follower_member_id AND cp.status = 'active'
      JOIN members m ON m.id = cp.member_id AND m.status != 'blocked' WHERE f.followed_member_id = ? ORDER BY f.created_at::timestamp DESC LIMIT 200`)
      .bind(viewerMemberId ?? 0, target.member_id).all<{ public_id: string; display_name: string; bio: string; viewer_is_following: boolean }>(),
    db.prepare(`SELECT cp.public_id, cp.display_name, cp.bio,
      EXISTS(SELECT 1 FROM community_follows mine WHERE mine.follower_member_id = ? AND mine.followed_member_id = cp.member_id) AS viewer_is_following
      FROM community_follows f JOIN community_profiles cp ON cp.member_id = f.followed_member_id AND cp.status = 'active'
      JOIN members m ON m.id = cp.member_id AND m.status != 'blocked' WHERE f.follower_member_id = ? ORDER BY f.created_at::timestamp DESC LIMIT 200`)
      .bind(viewerMemberId ?? 0, target.member_id).all<{ public_id: string; display_name: string; bio: string; viewer_is_following: boolean }>(),
  ]);
  const normalize = (rows: typeof followers.results) => rows.map((row) => ({ ...row, viewer_is_following: Boolean(row.viewer_is_following) }));
  return { member: target, followers: normalize(followers.results), following: normalize(following.results) };
}

export async function followCommunityMember(input: { memberId: number; displayName: string; publicId: string }) {
  const db = await getStoreDb();
  const target = await db.prepare(`
    SELECT cp.member_id, cp.public_id, cp.display_name
    FROM community_profiles cp JOIN members m ON m.id = cp.member_id
    WHERE cp.public_id = ? AND cp.status = 'active' AND m.status != 'blocked' LIMIT 1
  `).bind(input.publicId).first<{ member_id: number; public_id: string; display_name: string }>();
  if (!target) throw new Error("要关注的会员不存在");
  if (Number(target.member_id) === input.memberId) throw new Error("不能关注自己");
  const actorPublicId = await ensureCommunityProfile(input.memberId, input.displayName.slice(0, 30));
  const inserted = await db.prepare(`
    INSERT INTO community_follows (follower_member_id, followed_member_id)
    VALUES (?, ?) ON CONFLICT DO NOTHING
  `).bind(input.memberId, target.member_id).run();
  if (inserted.meta.changes) {
    await db.prepare(`
      INSERT INTO community_notifications
        (id, recipient_member_id, event_key, event_type, actor_member_id, entity_type, entity_id, payload_json)
      SELECT ?, ?, ?, 'new_follower', ?, 'member', ?, ?
      WHERE NOT EXISTS (SELECT 1 FROM community_notification_preferences pref WHERE pref.member_id = ? AND pref.social_enabled = 0)
      ON CONFLICT (recipient_member_id, event_key) DO UPDATE SET read_at = NULL, created_at = CURRENT_TIMESTAMP
    `).bind(
      notificationId(), target.member_id, `follow:${input.memberId}:${target.member_id}`,
      input.memberId, actorPublicId, JSON.stringify({ actorName: input.displayName.slice(0, 30) }), target.member_id,
    ).run();
    await recordCommunityActivity({ memberId: input.memberId, type: "follow", eventKey: `follow:${input.memberId}:${target.member_id}`, entityType: "member", entityId: target.public_id });
  }
  return { publicId: target.public_id, displayName: target.display_name, following: true };
}

export async function unfollowCommunityMember(memberId: number, publicId: string) {
  const db = await getStoreDb();
  await db.prepare(`
    DELETE FROM community_follows f USING community_profiles cp
    WHERE cp.public_id = ? AND cp.member_id = f.followed_member_id AND f.follower_member_id = ?
  `).bind(publicId, memberId).run();
  return { publicId, following: false };
}

export async function listCommunityNotifications(memberId: number, limit = 50) {
  const db = await getStoreDb();
  const rows = await db.prepare(`
    SELECT n.id, n.event_type, actor.public_id AS actor_public_id, actor.display_name AS actor_name,
      n.entity_type, n.entity_id, n.post_id, n.payload_json, n.read_at, n.created_at
    FROM community_notifications n
    LEFT JOIN community_profiles actor ON actor.member_id = n.actor_member_id
    WHERE n.recipient_member_id = ?
    ORDER BY n.created_at::timestamp DESC LIMIT ?
  `).bind(memberId, Math.min(100, Math.max(1, limit))).all<Omit<CommunityNotification, "payload"> & { payload_json: string }>();
  return rows.results.map(({ payload_json, ...row }) => ({ ...row, payload: payload(payload_json) }));
}

export async function markCommunityNotificationsRead(memberId: number, id?: string) {
  const db = await getStoreDb();
  const result = id
    ? await db.prepare("UPDATE community_notifications SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP::TEXT) WHERE recipient_member_id = ? AND id = ?").bind(memberId, id).run()
    : await db.prepare("UPDATE community_notifications SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP::TEXT) WHERE recipient_member_id = ? AND read_at IS NULL").bind(memberId).run();
  return result.meta.changes;
}

export async function notifyCommunityModeration(input: { postId: string; authorMemberId: number; status: string; actorMemberId?: number }) {
  const db = await getStoreDb();
  const eventType = input.status === "approved" ? "post_approved" : input.status === "rejected" ? "post_rejected" : "post_hidden";
  await db.prepare(`
    INSERT INTO community_notifications
      (id, recipient_member_id, event_key, event_type, actor_member_id, entity_type, entity_id, post_id)
    VALUES (?, ?, ?, ?, ?, 'post', ?, ?)
    ON CONFLICT (recipient_member_id, event_key) DO UPDATE SET read_at = NULL, created_at = CURRENT_TIMESTAMP
  `).bind(notificationId(), input.authorMemberId, `moderation:${input.postId}:${input.status}`, eventType, input.actorMemberId ?? null, input.postId, input.postId).run();
  if (input.status !== "approved") return;
  const followers = await db.prepare("SELECT follower_member_id FROM community_follows WHERE followed_member_id = ?").bind(input.authorMemberId).all<{ follower_member_id: number }>();
  if (followers.results.length) await db.batch(followers.results.map((follower) => db.prepare(`
    INSERT INTO community_notifications
      (id, recipient_member_id, event_key, event_type, actor_member_id, entity_type, entity_id, post_id)
    SELECT ?, ?, ?, 'following_post', ?, 'post', ?, ?
    WHERE NOT EXISTS (SELECT 1 FROM community_notification_preferences pref WHERE pref.member_id = ? AND pref.social_enabled = 0)
    ON CONFLICT (recipient_member_id, event_key) DO NOTHING
  `).bind(notificationId(), follower.follower_member_id, `following-post:${input.postId}`, input.authorMemberId, input.postId, input.postId, follower.follower_member_id)));
  const topicFollowers = await db.prepare(`SELECT DISTINCT tf.member_id FROM community_topic_follows tf
    JOIN community_post_topics pt ON pt.topic_id = tf.topic_id WHERE pt.post_id = ? AND tf.member_id != ?`).bind(input.postId, input.authorMemberId).all<{ member_id: number }>();
  if (topicFollowers.results.length) await db.batch(topicFollowers.results.map((follower) => db.prepare(`
    INSERT INTO community_notifications (id, recipient_member_id, event_key, event_type, actor_member_id, entity_type, entity_id, post_id)
    SELECT ?, ?, ?, 'topic_post', ?, 'post', ?, ?
    WHERE NOT EXISTS (SELECT 1 FROM community_notification_preferences pref WHERE pref.member_id = ? AND pref.social_enabled = 0)
    ON CONFLICT (recipient_member_id, event_key) DO NOTHING
  `).bind(notificationId(), follower.member_id, `topic-post:${input.postId}`, input.authorMemberId, input.postId, input.postId, follower.member_id)));
}
