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

test("phase two community interfaces activate follows, topics and notifications", async () => {
  const [contracts, follows, topics, notifications, social, topicService, moderation] = await Promise.all([
    read("lib/community/contracts.ts"),
    read("app/api/community/follows/route.ts"),
    read("app/api/community/topics/route.ts"),
    read("app/api/community/notifications/route.ts"),
    read("lib/community/social.ts"),
    read("lib/community/topics.ts"),
    read("lib/community/moderation.ts"),
  ]);
  assert.match(contracts, /COMMUNITY_API_VERSION/);
  assert.match(contracts, /COMMUNITY_FEATURE_PHASE = 5/);
  assert.match(follows, /followCommunityMember/);
  assert.match(follows, /unfollowCommunityMember/);
  assert.match(follows, /hasTrustedOrigin/);
  assert.match(topics, /listCommunityTopics/);
  assert.match(notifications, /listCommunityNotifications/);
  assert.match(notifications, /markCommunityNotificationsRead/);
  assert.match(social, /community_follows/);
  assert.match(topicService, /community_post_topics/);
  assert.match(social, /community_notifications/);
  assert.match(social, /following_post/);
  assert.match(moderation, /notifyCommunityModeration/);
});

test("phase four connects community discovery, products, merchandising and conversion measurement", async () => {
  const [contracts, posts, commerce, eventApi, home, publish, productPage, productActions, moderation, permissions, adminApi, adminUi] = await Promise.all([
    read("lib/community/contracts.ts"),
    read("lib/community/posts.ts"),
    read("lib/community/commerce.ts"),
    read("app/api/community/events/route.ts"),
    read("app/community/page.tsx"),
    read("app/community/publish/PublishCommunityPost.tsx"),
    read("app/products/[slug]/page.tsx"),
    read("app/products/[slug]/ProductActions.tsx"),
    read("lib/community/moderation.ts"),
    read("lib/admin-permissions.ts"),
    read("app/api/admin/route.ts"),
    read("app/admin/CommunityAdmin.tsx"),
  ]);
  assert.match(contracts, /communityPhaseFourFeatures/);
  assert.match(posts, /community_post_products/);
  assert.match(posts, /purchase\.status NOT IN/);
  assert.match(posts, /p\.title ILIKE/);
  assert.match(posts, /promotion_placement/);
  assert.match(commerce, /ON CONFLICT\(event_key\) DO NOTHING/);
  assert.match(commerce, /getCommunityCommerceInsights/);
  assert.match(eventApi, /hasTrustedOrigin\(request\)/);
  assert.match(eventApi, /allowRequest\(request, "community-content-event"/);
  assert.match(home, /community-discovery-tools/);
  assert.match(publish, /productSlugs/);
  assert.match(productPage, /product-community-section/);
  assert.match(productActions, /add_to_cart/);
  assert.match(moderation, /product_click_count/);
  assert.match(permissions, /"update-community-promotion": "community\.manage"/);
  assert.match(adminApi, /setCommunityPromotion/);
  assert.match(adminUi, /近 30 天曝光/);
});

test("phase three community engagement is authenticated, rate-limited and auditable", async () => {
  const [contracts, interactionApi, commentsApi, commentApi, reportsApi, engagement, postCard, discussion, permissions, adminApi, adminUi] = await Promise.all([
    read("lib/community/contracts.ts"),
    read("app/api/community/posts/[id]/interactions/route.ts"),
    read("app/api/community/posts/[id]/comments/route.ts"),
    read("app/api/community/comments/[id]/route.ts"),
    read("app/api/community/reports/route.ts"),
    read("lib/community/engagement.ts"),
    read("app/community/CommunityPostCard.tsx"),
    read("app/community/CommunityDiscussion.tsx"),
    read("lib/admin-permissions.ts"),
    read("app/api/admin/route.ts"),
    read("app/admin/CommunityAdmin.tsx"),
  ]);
  assert.match(contracts, /communityPhaseThreeFeatures/);
  for (const source of [interactionApi, commentsApi, reportsApi]) {
    assert.match(source, /hasTrustedOrigin\(request\)/);
    assert.match(source, /allowRequestForIdentity/);
  }
  assert.match(interactionApi, /setCommunityPostInteraction/);
  assert.match(commentsApi, /createCommunityComment/);
  assert.match(commentApi, /deleteCommunityComment/);
  assert.match(reportsApi, /createCommunityReport/);
  assert.match(engagement, /ON CONFLICT DO NOTHING/);
  assert.match(engagement, /INSERT INTO community_report_events/);
  assert.match(engagement, /FOR UPDATE/);
  assert.match(postCard, /initialLikeCount/);
  assert.match(discussion, /评论与回复/);
  assert.match(permissions, /"update-community-report-status": "community\.manage"/);
  assert.match(adminApi, /moderateCommunityReport/);
  assert.match(adminUi, /用户举报/);
});

test("community pages complete login return, publishing, public profile and navigation paths", async () => {
  const [home, publish, member, notifications, login, navigation, account, styles] = await Promise.all([
    read("app/community/page.tsx"),
    read("app/community/publish/PublishCommunityPost.tsx"),
    read("app/community/members/[id]/page.tsx"),
    read("app/community/notifications/page.tsx"),
    read("app/account/login/MemberAuthClient.tsx"),
    read("app/data/navigation.ts"),
    read("app/account/AccountClient.tsx"),
    read("app/globals.css"),
  ]);
  assert.match(home, /listCommunityPosts/);
  assert.match(publish, /\/api\/community\/posts/);
  assert.match(publish, /topicSlugs/);
  assert.match(member, /showStatus=\{isOwner\}/);
  assert.match(member, /FollowButton/);
  assert.match(notifications, /NotificationsClient/);
  assert.match(login, /returnTo/);
  assert.match(navigation, /\["社区", "\/community"\]/);
  assert.match(account, /我的社区主页/);
  assert.match(home, /<h1><span>让每一种美，<\/span><span>都有自己的表达。<\/span><\/h1>/);
  assert.match(home, /community-hero-gallery/);
  assert.match(home, /community-topic-strip/);
  assert.match(styles, /community-mobile-nav/);
  assert.match(styles, /community-prototype-hero h1 span \{ display: block; white-space: nowrap; \}/);
  assert.match(styles, /community-subnav > div a,[^}]*font-size: 12px;/);
  assert.match(styles, /community-topic-strip small \{[^}]*font-size: 10px;/);
  assert.match(styles, /community-post-actions button \{[^}]*font-size: 10px;/);
});

test("phase five closes the creator growth, campaign and governance loop", async () => {
  const [contracts, migration, creator, postApi, creatorApi, creatorPage, editor, publish, moderation, permissions, adminApi, adminUi, baseline] = await Promise.all([
    read("lib/community/contracts.ts"),
    read("db/migrations/2026-08-01-zz-community-phase-five.sql"),
    read("lib/community/creator.ts"),
    read("app/api/community/posts/route.ts"),
    read("app/api/community/posts/[id]/route.ts"),
    read("app/community/creator/page.tsx"),
    read("app/community/posts/[id]/edit/CreatorPostEditor.tsx"),
    read("app/community/publish/PublishCommunityPost.tsx"),
    read("lib/community/moderation.ts"),
    read("lib/admin-permissions.ts"),
    read("app/api/admin/route.ts"),
    read("app/admin/CommunityAdmin.tsx"),
    read("db/railway-postgres.sql"),
  ]);
  assert.match(contracts, /communityPhaseFiveFeatures/);
  for (const source of [migration, baseline]) {
    assert.match(source, /community_post_versions/);
    assert.match(source, /community_campaigns/);
    assert.match(source, /community_campaign_entries/);
    assert.match(source, /community_reward_grants/);
    assert.match(source, /content_fingerprint/);
  }
  assert.match(postApi, /intent === "draft"/);
  assert.match(creatorApi, /expectedUpdatedAt/);
  assert.match(creatorApi, /hasTrustedOrigin/);
  assert.match(creator, /creator_status === "restricted"/);
  assert.match(creator, /community_post_approved/);
  assert.match(creator, /community_verified_purchase/);
  assert.match(creator, /completeMemberTask/);
  assert.match(creatorPage, /累计曝光/);
  assert.match(editor, /历史版本仅用于审计/);
  assert.match(publish, /保存草稿/);
  assert.match(moderation, /rewardApprovedCommunityPost/);
  assert.match(permissions, /"create-community-campaign": "community\.manage"/);
  assert.match(adminApi, /qualifyCampaignEntry/);
  assert.match(adminUi, /创作者治理/);
  assert.match(adminUi, /创建并启用活动/);
});
