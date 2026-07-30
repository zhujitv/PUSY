import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("会员消息入箱覆盖交易与营销事件并排除后台库存预警", async () => {
  const [service, schema, migration] = await Promise.all([
    read("lib/notifications/service.ts"),
    read("db/railway-postgres.sql"),
    read("db/migrations/2026-07-30-zzzzzzzzzzzzzz-miniprogram-message-center.sql"),
  ]);
  for (const key of ["order_confirmed", "order_shipped", "refund_completed", "return_updated", "targeted_coupon", "product_restock", "price_drop"]) {
    assert.match(service, new RegExp(key));
  }
  assert.match(service, /memberInboxTemplates/);
  assert.match(service, /enqueueMemberInbox\(input, template\)/);
  assert.doesNotMatch(service.match(/memberInboxTemplates = new Set\(\[([^\]]+)/)?.[1] || "", /low_stock_alert/);
  for (const source of [schema, migration]) {
    assert.match(source, /member_notifications/);
    assert.match(source, /UNIQUE \(member_id, event_key\)/);
  }
});

test("消息接口要求微信会员身份且所有读写都按当前会员隔离", async () => {
  const route = await read("app/api/miniprogram/notifications/route.ts");
  assert.match(route, /getMemberIdentityFromRequest\(request\)/);
  assert.match(route, /allowRequest\(request, "miniprogram-notifications"/);
  assert.match(route, /WHERE member_id = \?/);
  assert.match(route, /WHERE id = \? AND member_id = \?/);
  assert.match(route, /read_at IS NULL/);
  assert.match(route, /COUNT\(\*\) AS count/);
  assert.match(route, /created_at::timestamp <= CURRENT_TIMESTAMP/);
  assert.match(route, /private, no-store/);
});

test("本地预览消息支持单条已读与全部已读且不访问网络", async () => {
  const storage = new Map();
  const badgeCalls = [];
  globalThis.wx = {
    getStorageSync: (key) => storage.get(key),
    setStorageSync: (key, value) => storage.set(key, value),
    removeStorageSync: (key) => storage.delete(key),
    setTabBarBadge: (value) => badgeCalls.push(value),
    removeTabBarBadge: (value) => badgeCalls.push(value),
    request: () => { throw new Error("预览消息不应请求后台"); },
  };
  const require = createRequire(import.meta.url);
  const notifications = require("../miniprogram/utils/notifications.js");
  const initial = await notifications.refreshNotifications();
  assert.ok(initial.notifications.length >= 5);
  assert.ok(initial.unreadCount >= 3);
  const afterOne = await notifications.markNotificationRead(initial.notifications.find((item) => !item.read).id);
  assert.equal(afterOne.unreadCount, initial.unreadCount - 1);
  const afterAll = await notifications.markAllNotificationsRead();
  assert.equal(afterAll.unreadCount, 0);
  await notifications.syncNotificationBadge(0);
  assert.deepEqual(badgeCalls.at(-1), { index: 3 });
  delete globalThis.wx;
});

test("小程序消息中心提供入口、未读筛选和底部角标", async () => {
  const [app, appStyles, appConfig, profile, profileView, page, pageView, pageStyles] = await Promise.all([
    read("miniprogram/app.js"),
    read("miniprogram/app.wxss"),
    read("miniprogram/app.json"),
    read("miniprogram/pages/profile/index.js"),
    read("miniprogram/pages/profile/index.wxml"),
    read("miniprogram/pages/notifications/index.js"),
    read("miniprogram/pages/notifications/index.wxml"),
    read("miniprogram/pages/notifications/index.wxss"),
  ]);
  assert.match(appConfig, /pages\/notifications\/index/);
  assert.match(app, /syncNotificationBadge/);
  assert.match(profile, /key: "notifications"/);
  assert.match(profileView, /notificationUnread/);
  for (const key of ["activeFilter", "markAllNotificationsRead", "markNotificationRead", "switchTab"]) assert.match(page, new RegExp(key));
  for (const label of ["消息中心", "全部已读", "未读", "订单、物流、退款、售后和会员权益"]) assert.match(pageView, new RegExp(label));
  assert.match(pageView, /class="filter-pill[^\n]+role="button"/);
  assert.match(appStyles, /button \{[\s\S]*display: flex;[\s\S]*align-items: center;[\s\S]*justify-content: center;/);
  assert.match(pageStyles, /\.filter-pill \{[^}]*flex: 0 0 auto;[^}]*height: 56rpx;[^}]*align-items: center;[^}]*justify-content: center;/);
  assert.doesNotMatch(`${app}\n${profile}\n${page}`, /wx\.requestPayment/);
});
