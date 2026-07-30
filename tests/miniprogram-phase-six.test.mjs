import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("订单列表提供状态筛选且详情展示倒计时、退款和物流刷新", async () => {
  const [orders, ordersView, ordersStyles, detail, detailView] = await Promise.all([
    read("miniprogram/pages/orders/index.js"),
    read("miniprogram/pages/orders/index.wxml"),
    read("miniprogram/pages/orders/index.wxss"),
    read("miniprogram/pages/order-detail/index.js"),
    read("miniprogram/pages/order-detail/index.wxml"),
  ]);
  for (const key of ["payment", "processing", "shipping", "service"]) assert.match(orders, new RegExp(key));
  for (const label of ["全部", "待付款", "处理中", "物流", "售后"]) assert.match(`${orders}\n${ordersView}`, new RegExp(label));
  assert.match(ordersView, /class="order-tabs-inner"/);
  assert.match(ordersStyles, /\.order-tabs-inner \{ display: inline-flex; flex-flow: row nowrap;/);
  assert.match(detail, /countdownText/);
  assert.match(detail, /refreshDetail/);
  assert.match(detail, /cancelMemberOrder/);
  for (const label of ["剩余支付时间", "退款进度", "物流进度", "取消订单"]) assert.match(detailView, new RegExp(label));
});

test("本地预览订单取消不请求后台且倒计时可确定计算", async () => {
  const storage = new Map();
  globalThis.wx = {
    getStorageSync: (key) => storage.get(key),
    setStorageSync: (key, value) => storage.set(key, value),
    removeStorageSync: (key) => storage.delete(key),
    request: () => { throw new Error("预览订单取消不应请求后台"); },
  };
  const require = createRequire(import.meta.url);
  const { cancelMemberOrder, countdownText } = require("../miniprogram/utils/orders.js");
  const previewOrder = { id: "PREVIEW-CANCEL", preview: true, status: "开发预览", items: [], totalFen: 1000, totalText: "¥10" };
  storage.set("pusy_orders_v1", [previewOrder]);
  const result = await cancelMemberOrder(previewOrder.id, "测试取消");
  assert.equal(result.outcome, "preview_cancelled");
  assert.equal(storage.get("pusy_orders_v1")[0].status, "已取消（预览）");
  assert.equal(storage.get("pusy_orders_v1")[0].cancelReason, "测试取消");
  assert.equal(countdownText("2026-01-01T00:01:05.000Z", Date.parse("2026-01-01T00:00:00.000Z")), "01:05");
  assert.equal(countdownText("2026-01-01T00:00:00.000Z", Date.parse("2026-01-01T00:00:01.000Z")), "支付时限已结束");
  delete globalThis.wx;
});

test("正式订单取消和退款数据始终按当前微信会员隔离", async () => {
  const [ordersApi, accountApi, session, cancellation, allMiniSource] = await Promise.all([
    read("app/api/miniprogram/orders/route.ts"),
    read("app/api/miniprogram/account/route.ts"),
    read("miniprogram/utils/session.js"),
    read("lib/orders/cancellation.ts"),
    Promise.all(["miniprogram/utils/orders.js", "miniprogram/pages/order-detail/index.js", "miniprogram/pages/order-detail/index.wxml"].map(read)).then((sources) => sources.join("\n")),
  ]);
  assert.match(ordersApi, /getMemberIdentityFromRequest\(request\)/);
  assert.match(ordersApi, /memberId: viewer\.memberId/);
  assert.match(ordersApi, /allowRequest\(request, "miniprogram-orders"/);
  assert.match(cancellation, /order\.member_id !== input\.memberId/);
  assert.match(cancellation, /releaseOrderReservation/);
  assert.match(cancellation, /createRefund/);
  assert.match(accountApi, /reservation_expires_at/);
  assert.match(accountApi, /FROM refunds r JOIN orders o/);
  assert.match(session, /refunds: account\.refunds/);
  assert.doesNotMatch(allMiniSource, /wx\.requestPayment/);
});
