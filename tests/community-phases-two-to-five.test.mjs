import assert from "node:assert/strict";
import test from "node:test";
import { readSource as read } from "./helpers/read-source.mjs";

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
  assert.match(contracts, /COMMUNITY_FEATURE_PHASE = 7/);
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
