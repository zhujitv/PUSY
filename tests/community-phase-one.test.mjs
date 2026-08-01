import assert from "node:assert/strict";
import test from "node:test";
import { readSource as read } from "./helpers/read-source.mjs";

test("community rules verify nickname, body, media bytes and public DTO boundaries", async () => {
  const [rules, posts] = await Promise.all([read("lib/community/media.ts"), read("lib/community/posts.ts")]);
  assert.match(rules, /displayName\.length < 2/);
  assert.match(rules, /正文至少需要 10 个字/);
  assert.match(rules, /detectedImageType\(bytes\) !== mimeType/);
  assert.match(rules, /COMMUNITY_MEDIA_TOTAL_BYTES/);
  assert.match(posts, /delete dto\.member_id/);
  assert.match(posts, /delete dto\.moderation_note/);
});

test("community migrations create phase-one authority and phase-two/three/four relations", async () => {
  const [migration, phaseTwo, phaseThree, phaseFour, baseline] = await Promise.all([
    read("db/migrations/2026-08-01-community-phase-one.sql"),
    read("db/migrations/2026-08-01-community-phase-two.sql"),
    read("db/migrations/2026-08-01-community-phase-three.sql"),
    read("db/migrations/2026-08-01-z-community-phase-four.sql"),
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
  assert.match(phaseTwo, /INSERT INTO community_topics/);
  assert.match(phaseTwo, /daily-makeup/);
  assert.match(phaseTwo, /community_post_topics_topic_idx/);
  for (const source of [phaseThree, baseline]) {
    assert.match(source, /CREATE TABLE IF NOT EXISTS community_post_likes/);
    assert.match(source, /CREATE TABLE IF NOT EXISTS community_post_bookmarks/);
    assert.match(source, /CREATE TABLE IF NOT EXISTS community_comments/);
    assert.match(source, /CREATE TABLE IF NOT EXISTS community_reports/);
    assert.match(source, /CREATE TABLE IF NOT EXISTS community_report_events/);
    assert.match(source, /UNIQUE \(reporter_member_id, entity_type, entity_id\)/);
  }
  for (const source of [phaseFour, baseline]) {
    assert.match(source, /CREATE TABLE IF NOT EXISTS community_post_products/);
    assert.match(source, /CREATE TABLE IF NOT EXISTS community_post_promotions/);
    assert.match(source, /CREATE TABLE IF NOT EXISTS community_content_events/);
    assert.match(source, /event_type IN \('post_impression', 'product_click', 'add_to_cart'\)/);
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
