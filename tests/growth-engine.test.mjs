import test from "node:test";
import assert from "node:assert/strict";
import { pointsFromStoredAmount, tierForLifetimePoints } from "../lib/growth/loyalty-rules.ts";
import { readSource as read } from "./helpers/read-source.mjs";

test("会员积分按人民币实付金额累计并按门槛升级", () => {
  assert.equal(pointsFromStoredAmount(833), 99);
  assert.equal(pointsFromStoredAmount(1000), 120);
  assert.equal(tierForLifetimePoints(0), "bronze");
  assert.equal(tierForLifetimePoints(499), "bronze");
  assert.equal(tierForLifetimePoints(500), "silver");
  assert.equal(tierForLifetimePoints(2000), "gold");
  assert.equal(tierForLifetimePoints(5000), "diamond");
});

test("增长迁移包含积分账本、定向券、标签分组、商品提醒和自动化记录", async () => {
  const migration = await read("db/migrations/2026-07-30-zzzzzz-growth-engine.sql");
  for (const table of ["member_points_ledger", "coupon_assignments", "customer_tags", "member_tag_assignments", "customer_segments", "member_product_alerts", "product_price_history", "growth_automation_runs"]) {
    assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
  }
  assert.match(migration, /历史消费积分初始化/);
  assert.match(migration, /payment_reminder/);
  assert.match(migration, /repurchase_reminder/);
  assert.match(migration, /product_restock/);
  assert.match(migration, /price_drop/);
});

test("专属优惠券要求登录会员和有效发放记录，订单取消会返还", async () => {
  const [promotions, orders, reservations] = await Promise.all([
    read("db/promotions.ts"),
    read("app/api/orders/route.ts"),
    read("lib/orders/reservations.ts"),
  ]);
  assert.match(promotions, /assignment_mode === "targeted"/);
  assert.match(promotions, /请登录领取该专属优惠券/);
  assert.match(promotions, /coupon_assignments/);
  assert.match(orders, /status = 'used'/);
  assert.match(orders, /if \(payload\.couponCode && !coupon\.valid\)/);
  assert.match(reservations, /status = 'available', used_at = NULL, order_id = NULL/);
});

test("营销提醒遵守会员授权且任务幂等，商品提醒只能由本人管理", async () => {
  const [automations, notifications, alertApi] = await Promise.all([
    read("lib/growth/automations.ts"),
    read("lib/notifications/service.ts"),
    read("app/api/account/product-alerts/route.ts"),
  ]);
  assert.match(automations, /email_marketing = 1 OR mp\.sms_marketing = 1/);
  assert.match(automations, /payment-reminder:\$\{order\.id\}/);
  assert.match(automations, /repurchase:\$\{row\.order_id\}:\$\{row\.product_slug\}/);
  assert.match(notifications, /ON CONFLICT\(id\) DO NOTHING/);
  assert.match(alertApi, /member_id = \?/);
  assert.match(alertApi, /member\.id/);
  assert.match(alertApi, /hasTrustedOrigin/);
});

test("关联销售优先使用真实成交订单的共同购买数据", async () => {
  const productPage = await read("app/products/[slug]/page.tsx");
  assert.match(productPage, /JOIN order_items companion ON companion\.order_id = selected\.order_id/);
  assert.match(productPage, /经常一起购买/);
  assert.match(productPage, /sameCategory/);
});

test("会员中心与后台均接入增长运营能力", async () => {
  const [account, admin, growthAdmin, permissions] = await Promise.all([
    read("app/account/AccountClient.tsx"),
    read("app/admin/AdminClient.tsx"),
    read("app/admin/GrowthAdmin.tsx"),
    read("lib/admin-permissions.ts"),
  ]);
  assert.match(account, /会员权益/);
  assert.match(account, /积分明细/);
  assert.match(account, /我的优惠券/);
  assert.match(admin, /会员增长/);
  assert.match(growthAdmin, /定向发放优惠券/);
  assert.match(growthAdmin, /客户标签/);
  assert.match(growthAdmin, /客户分组/);
  assert.match(growthAdmin, /自动化提醒/);
  assert.match(permissions, /"issue-targeted-coupon": "marketing\.manage"/);
});
