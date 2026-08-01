import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { readSource } from "./helpers/read-source.mjs";

const migration = await readFile(new URL("../db/migrations/2026-08-01-zzz-community-phase-six.sql", import.meta.url), "utf8");
const interactionSource = await readSource("lib/community/engagement-comments.ts");
const topicSource = await readSource("app/api/community/topics/route.ts");
const communityPageSource = await readSource("app/community/page.tsx");
const adminSource = await readSource("app/admin/AdminClient.tsx");
const adminRouteSource = await readSource("app/api/admin/route.ts");

test("phase six adds durable reaction, topic, activity and notification preference boundaries", () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS community_comment_likes/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS community_topic_follows/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS community_activity_events/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS community_notification_preferences/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS community_broadcasts/);
  assert.match(migration, /comment_status IN \('active', 'restricted'\)/);
});

test("phase six closes the foreground interaction and return loop", () => {
  assert.match(interactionSource, /'post_like'/);
  assert.match(interactionSource, /'comment_like'/);
  assert.match(interactionSource, /'mention'/);
  assert.match(interactionSource, /recordCommunityActivity/);
  assert.match(topicSource, /setCommunityTopicFollow/);
  assert.match(topicSource, /allowRequestForIdentity\("community-topic-follow"/);
  assert.match(communityPageSource, /CommunityHabitCard/);
  assert.match(communityPageSource, /TopicFollowButton/);
  assert.match(communityPageSource, /community-load-more/);
  assert.match(communityPageSource, /score_follow/);
});

test("phase six gives administrators an audited community operations center", () => {
  assert.match(adminSource, /CommunityOperationsAdmin/);
  assert.match(adminSource, /评论队列/);
  assert.match(adminSource, /会员治理/);
  assert.match(adminSource, /话题管理/);
  assert.match(adminSource, /运营通知/);
  assert.match(adminRouteSource, /getCommunityOperationsData/);
  assert.match(adminRouteSource, /recordAdminAudit/);
  assert.match(adminRouteSource, /send-community-broadcast/);
  assert.match(adminRouteSource, /bulk-update-community-post-status/);
});

test("phase six measures activity, return rate, habits and badges", async () => {
  const activitySource = await readSource("lib/community/activity.ts");
  const operationsSource = await readSource("lib/community/admin-operations.ts");
  assert.match(activitySource, /community_daily_visit/);
  assert.match(activitySource, /community_daily_comment/);
  assert.match(activitySource, /真诚交流者/);
  assert.match(activitySource, /持续创作者/);
  assert.match(operationsSource, /retention7d/);
  assert.match(operationsSource, /COUNT\(DISTINCT member_id\)/);
  assert.match(operationsSource, /community_broadcast/);
});
