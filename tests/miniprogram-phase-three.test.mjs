import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("小程序收藏、客服工单和订单售后入口已经接通", async () => {
  const [app, profile, product, orders, favorites, support, afterSale] = await Promise.all([
    read("miniprogram/app.json"),
    read("miniprogram/pages/profile/index.js"),
    read("miniprogram/pages/product/index.js"),
    read("miniprogram/pages/orders/index.js"),
    read("miniprogram/pages/favorites/index.js"),
    read("miniprogram/pages/support/index.js"),
    read("miniprogram/pages/after-sale/index.js"),
  ]);
  for (const page of ["favorites", "support", "after-sale"]) assert.match(app, new RegExp(`pages/${page}/index`));
  assert.match(profile, /\/pages\/favorites\/index/);
  assert.match(profile, /\/pages\/support\/index/);
  assert.match(product, /toggleFavorite/);
  assert.match(orders, /\/pages\/after-sale\/index/);
  assert.match(favorites, /favoriteProducts/);
  assert.match(support, /createSupportTicket/);
  assert.match(afterSale, /createReturnRequest/);
});

test("认证前客服和售后记录只保存在本地", async () => {
  const storage = new Map();
  globalThis.wx = {
    getStorageSync: (key) => storage.get(key),
    setStorageSync: (key, value) => storage.set(key, value),
    removeStorageSync: (key) => storage.delete(key),
    request: () => { throw new Error("预览工单不应请求后台"); },
  };
  const require = createRequire(import.meta.url);
  const { createSupportTicket, createReturnRequest, supportHistory, returnHistory } = require("../miniprogram/utils/service.js");
  const support = await createSupportTicket({ name: "预览会员", phone: "13800138000", wechat: "preview_wechat", category: "商品咨询", contactPreference: "微信", message: "我想了解这件商品适合哪一种肤质使用。" });
  const afterSale = await createReturnRequest({ orderId: "PREVIEW-100", requestType: "exchange", reason: "商品与预期不符", details: "仅用于开发预览，不产生真实售后。" });
  assert.match(support.id, /^PREVIEW-CS-/);
  assert.match(afterSale.id, /^PREVIEW-RET-/);
  assert.equal(supportHistory()[0].id, support.id);
  assert.equal(returnHistory()[0].id, afterSale.id);
  delete globalThis.wx;
});

test("正式客服与售后 API 使用会员令牌并校验订单归属", async () => {
  const [supportApi, returnsApi, allMiniSource] = await Promise.all([
    read("app/api/miniprogram/support/route.ts"),
    read("app/api/miniprogram/returns/route.ts"),
    Promise.all([
      "miniprogram/utils/service.js",
      "miniprogram/pages/support/index.js",
      "miniprogram/pages/after-sale/index.js",
    ].map(read)).then((sources) => sources.join("\n")),
  ]);
  for (const source of [supportApi, returnsApi]) assert.match(source, /getMemberIdentityFromRequest\(request\)/);
  assert.match(supportApi, /upper\(id\) = \? AND member_id = \?/);
  assert.match(returnsApi, /upper\(id\) = \? AND member_id = \?/);
  assert.match(returnsApi, /该订单当前不符合售后申请条件/);
  assert.doesNotMatch(allMiniSource, /wx\.requestPayment/);
});
