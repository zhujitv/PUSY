import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { readSource } from "./helpers/read-source.mjs";

const migration = await readFile(new URL("../db/migrations/2026-08-07-community-phase-seven.sql", import.meta.url), "utf8");

test("phase seven persists purchase tasks, interests and conversion attribution", async () => {
  const baseline = await readSource("db/railway-postgres.sql");
  for (const source of [migration, baseline]) {
    assert.match(source, /community_purchase_share_tasks/);
    assert.match(source, /community_member_interests/);
    assert.match(source, /community_order_attributions/);
    assert.match(source, /experience_usage_period/);
    assert.match(source, /share_open/);
    assert.match(source, /checkout_started/);
  }
});

test("verified purchase sharing uses structured templates and the existing moderation reward loop", async () => {
  const [experience, publish, postApi, moderation] = await Promise.all([
    readSource("lib/community/experience.ts"),
    readSource("app/community/publish/PublishCommunityPost.tsx"),
    readSource("app/api/community/posts/route.ts"),
    readSource("lib/community/moderation.ts"),
  ]);
  assert.match(experience, /listPurchaseShareTasks/);
  assert.match(experience, /validatePurchaseShareTask/);
  assert.match(publish, /PurchaseExperienceTemplate/);
  assert.match(postApi, /purchaseTaskId/);
  assert.match(moderation, /completePurchaseShareTask/);
});

test("personalized feed is explicit, inspectable and initialized by members", async () => {
  const [personalization, interestApi, home, queries, interaction] = await Promise.all([
    readSource("lib/community/personalization.ts"),
    readSource("app/api/community/interests/route.ts"),
    readSource("app/community/page.tsx"),
    readSource("lib/community/post-queries.ts"),
    readSource("lib/community/engagement-comments.ts"),
  ]);
  assert.match(personalization, /source = 'onboarding'/);
  assert.match(interestApi, /hasTrustedOrigin/);
  assert.match(home, /为你推荐/);
  assert.match(queries, /viewer_interest_score/);
  assert.match(interaction, /learnCommunityTopicInterest/);
});

test("wechat poster and checkout attribution close the paid-order funnel", async () => {
  const [poster, share, checkout, orders, payment, insights] = await Promise.all([
    readSource("app/api/community/posts/[id]/share-poster/route.ts"),
    readSource("app/community/CommunityShareActions.tsx"),
    readSource("app/checkout/page.tsx"),
    readSource("app/api/orders/route.ts"),
    readSource("lib/payments/payment-lifecycle.ts"),
    readSource("lib/community/commerce.ts"),
  ]);
  assert.match(poster, /QRCode\.toDataURL/);
  assert.match(share, /pusy-community-attribution/);
  assert.match(checkout, /checkout_started/);
  assert.match(orders, /createCommunityOrderAttribution/);
  assert.match(payment, /markCommunityOrderPaid/);
  assert.match(insights, /revenueFen/);
});
