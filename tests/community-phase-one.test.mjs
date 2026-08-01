import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("community rules verify nickname, body, media bytes and public DTO boundaries", async () => {
  const [rules, posts] = await Promise.all([read("lib/community/media.ts"), read("lib/community/posts.ts")]);
  assert.match(rules, /displayName\.length < 2/);
  assert.match(rules, /正文至少需要 10 个字/);
  assert.match(rules, /detectedImageType\(bytes\) !== mimeType/);
  assert.match(rules, /COMMUNITY_MEDIA_TOTAL_BYTES/);
  assert.match(posts, /delete dto\.member_id/);
  assert.match(posts, /delete dto\.moderation_note/);
});

test("community migration creates phase-one authority tables and phase-two reservations", async () => {
  const [migration, baseline] = await Promise.all([
    read("db/migrations/2026-08-01-community-phase-one.sql"),
    read("db/railway-postgres.sql"),
  ]);
  for (const source of [migration, baseline]) {
    assert.match(source, /CREATE TABLE IF NOT EXISTS community_profiles/);
    assert.match(source, /CREATE TABLE IF NOT EXISTS community_posts/);
    assert.match(source, /CREATE TABLE IF NOT EXISTS community_post_media/);
    assert.match(source, /CREATE TABLE IF NOT EXISTS community_moderation_events/);
    assert.match(source, /community_posts_member_request_idx/);
    assert.match(source, /CREATE TABLE IF NOT EXISTS community_follows/);
    assert.match(source, /CREATE TABLE IF NOT EXISTS community_topics/);
    assert.match(source, /CREATE TABLE IF NOT EXISTS community_notifications/);
    assert.match(source, /UNIQUE \(recipient_member_id, event_key\)/);
  }
});

test("community publication uses existing member sessions with origin checks and double rate limits", async () => {
  const [api, service, media] = await Promise.all([
    read("app/api/community/posts/route.ts"),
    read("lib/community/posts.ts"),
    read("app/api/community/media/[id]/route.ts"),
  ]);
  assert.match(api, /hasTrustedOrigin\(request\)/);
  assert.match(api, /getPreviewMemberIdentity\(\)/);
  assert.match(api, /allowRequest\(request, "community-post"/);
  assert.match(api, /allowRequestForIdentity\("community-post-member"/);
  assert.match(api, /clientRequestId/);
  assert.match(service, /WHERE p\.status = 'approved'/);
  assert.match(service, /community_posts \(id, member_id, client_request_id/);
  assert.match(media, /media\.status === "approved"/);
  assert.match(media, /roleCan\(admin\.role, "community\.read"\)/);
});

test("community moderation has dedicated RBAC and append-only business audit", async () => {
  const [permissions, moderation, adminApi, adminUi] = await Promise.all([
    read("lib/admin-permissions.ts"),
    read("lib/community/moderation.ts"),
    read("app/api/admin/route.ts"),
    read("app/admin/AdminClient.tsx"),
  ]);
  assert.match(permissions, /"community\.read"/);
  assert.match(permissions, /"community\.manage"/);
  assert.match(permissions, /"update-community-post-status": "community\.manage"/);
  assert.match(moderation, /INSERT INTO community_moderation_events/);
  assert.match(moderation, /FOR UPDATE/);
  assert.match(adminApi, /moderateCommunityPost/);
  assert.match(adminApi, /recordAdminAudit/);
  assert.match(adminUi, /社区审核/);
});

test("phase two community interfaces are discoverable but remain disabled", async () => {
  const [contracts, follows, topics, notifications] = await Promise.all([
    read("lib/community/contracts.ts"),
    read("app/api/community/follows/route.ts"),
    read("app/api/community/topics/route.ts"),
    read("app/api/community/notifications/route.ts"),
  ]);
  assert.match(contracts, /COMMUNITY_API_VERSION/);
  assert.match(contracts, /status: 501/);
  assert.match(follows, /phaseTwoDisabled\("follows"\)/);
  assert.match(topics, /phaseTwoDisabled\("topics"\)/);
  assert.match(notifications, /phaseTwoDisabled\("notifications"\)/);
});

test("community pages complete login return, publishing, public profile and navigation paths", async () => {
  const [home, publish, member, login, navigation, account] = await Promise.all([
    read("app/community/page.tsx"),
    read("app/community/publish/PublishCommunityPost.tsx"),
    read("app/community/members/[id]/page.tsx"),
    read("app/account/login/MemberAuthClient.tsx"),
    read("app/data/navigation.ts"),
    read("app/account/AccountClient.tsx"),
  ]);
  assert.match(home, /listCommunityPosts/);
  assert.match(publish, /\/api\/community\/posts/);
  assert.match(member, /showStatus=\{isOwner\}/);
  assert.match(login, /returnTo/);
  assert.match(navigation, /\["社区", "\/community"\]/);
  assert.match(account, /我的社区主页/);
});
