import { getStoreDb } from "../../db/store";
import { completeMemberTask } from "../growth/member-program";
import { chinaDateParts } from "../growth/member-program-shared";

export type CommunityActivityType = "visit" | "post_created" | "like" | "comment" | "comment_like" | "follow" | "topic_follow" | "mention";

const dailyRewards: Partial<Record<CommunityActivityType, { key: string; points: number; reason: string }>> = {
  visit: { key: "community_daily_visit", points: 1, reason: "每日访问社区奖励" },
  like: { key: "community_daily_like", points: 1, reason: "每日社区点赞奖励" },
  comment: { key: "community_daily_comment", points: 2, reason: "每日参与社区讨论奖励" },
};

export async function recordCommunityActivity(input: {
  memberId: number;
  type: CommunityActivityType;
  eventKey: string;
  entityType?: string;
  entityId?: string;
}) {
  const db = await getStoreDb();
  const inserted = await db.prepare(`
    INSERT INTO community_activity_events (event_key, member_id, event_type, entity_type, entity_id)
    VALUES (?, ?, ?, ?, ?) ON CONFLICT (event_key) DO NOTHING
  `).bind(input.eventKey.slice(0, 160), input.memberId, input.type, input.entityType ?? "", input.entityId ?? "").run();
  if (!inserted.meta.changes) return false;
  const reward = dailyRewards[input.type];
  if (reward) {
    const period = chinaDateParts().key;
    await completeMemberTask({ memberId: input.memberId, taskKey: reward.key, periodKey: period, points: reward.points, reason: reward.reason, metadata: { source: "community" } });
  }
  if (input.type === "topic_follow") {
    await completeMemberTask({ memberId: input.memberId, taskKey: "community_first_topic", points: 3, reason: "首次关注社区话题奖励" });
  }
  return true;
}

function dateBefore(key: string) {
  const date = new Date(`${key}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

export async function getCommunityHabitSummary(memberId: number) {
  const db = await getStoreDb();
  const [days, counts, posts] = await Promise.all([
    db.prepare(`SELECT DISTINCT timezone('Asia/Shanghai', created_at::timestamptz)::date::text AS day
      FROM community_activity_events WHERE member_id = ? ORDER BY day DESC LIMIT 60`).bind(memberId).all<{ day: string }>(),
    db.prepare(`SELECT event_type, COUNT(*)::INTEGER AS count FROM community_activity_events
      WHERE member_id = ? GROUP BY event_type`).bind(memberId).all<{ event_type: CommunityActivityType; count: number }>(),
    db.prepare("SELECT COUNT(*)::INTEGER AS count FROM community_posts WHERE member_id = ? AND status = 'approved'").bind(memberId).first<{ count: number }>(),
  ]);
  const activityCounts = Object.fromEntries(counts.results.map((row) => [row.event_type, Number(row.count)])) as Partial<Record<CommunityActivityType, number>>;
  const daySet = new Set(days.results.map((row) => row.day));
  const today = chinaDateParts().key;
  let cursor = daySet.has(today) ? today : dateBefore(today);
  let streak = 0;
  while (daySet.has(cursor)) { streak += 1; cursor = dateBefore(cursor); }
  const [visitedToday, likedToday, commentedToday] = await Promise.all([
    hasTodayEvent(db, memberId, "visit"), hasTodayEvent(db, memberId, "like"), hasTodayEvent(db, memberId, "comment"),
  ]);
  const tasks = [
    { key: "visit", title: "今天逛逛社区", points: 1, completed: visitedToday },
    { key: "like", title: "为真实分享点赞", points: 1, completed: likedToday },
    { key: "comment", title: "参与一次友善讨论", points: 2, completed: commentedToday },
  ];
  const approvedPosts = Number(posts?.count ?? 0);
  const badges = [
    { key: "first-step", name: "社区初见", earned: (activityCounts.visit ?? 0) >= 1 },
    { key: "conversation", name: "真诚交流者", earned: (activityCounts.comment ?? 0) >= 5 },
    { key: "curator", name: "灵感收藏家", earned: (activityCounts.like ?? 0) + (activityCounts.topic_follow ?? 0) >= 10 },
    { key: "creator", name: "持续创作者", earned: approvedPosts >= 3 },
    { key: "connector", name: "社区连接者", earned: (activityCounts.follow ?? 0) >= 5 },
  ];
  return { streak, activeDays: daySet.size, tasks, badges, earnedBadges: badges.filter((badge) => badge.earned).length };
}

async function hasTodayEvent(db: Awaited<ReturnType<typeof getStoreDb>>, memberId: number, type: CommunityActivityType) {
  const row = await db.prepare(`SELECT 1 AS found FROM community_activity_events WHERE member_id = ? AND event_type = ?
    AND timezone('Asia/Shanghai', created_at::timestamptz)::date = timezone('Asia/Shanghai', CURRENT_TIMESTAMP)::date LIMIT 1`).bind(memberId, type).first<{ found: number }>();
  return Boolean(row);
}

export async function getCommunityNotificationPreferences(memberId: number) {
  const db = await getStoreDb();
  const row = await db.prepare("SELECT reactions_enabled, social_enabled, campaigns_enabled FROM community_notification_preferences WHERE member_id = ? LIMIT 1")
    .bind(memberId).first<{ reactions_enabled: number; social_enabled: number; campaigns_enabled: number }>();
  return { reactions: row ? Boolean(row.reactions_enabled) : true, social: row ? Boolean(row.social_enabled) : true, campaigns: row ? Boolean(row.campaigns_enabled) : true };
}

export async function updateCommunityNotificationPreferences(memberId: number, input: { reactions: boolean; social: boolean; campaigns: boolean }) {
  const db = await getStoreDb();
  await db.prepare(`INSERT INTO community_notification_preferences (member_id, reactions_enabled, social_enabled, campaigns_enabled)
    VALUES (?, ?, ?, ?) ON CONFLICT (member_id) DO UPDATE SET reactions_enabled = EXCLUDED.reactions_enabled,
      social_enabled = EXCLUDED.social_enabled, campaigns_enabled = EXCLUDED.campaigns_enabled, updated_at = CURRENT_TIMESTAMP::TEXT`)
    .bind(memberId, input.reactions ? 1 : 0, input.social ? 1 : 0, input.campaigns ? 1 : 0).run();
  return getCommunityNotificationPreferences(memberId);
}
