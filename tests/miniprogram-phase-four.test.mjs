import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("小程序会员权益中心展示等级、积分、优惠券和商品提醒", async () => {
  const [app, profile, benefits, benefitsView, product, productView] = await Promise.all([
    read("miniprogram/app.json"),
    read("miniprogram/pages/profile/index.js"),
    read("miniprogram/pages/benefits/index.js"),
    read("miniprogram/pages/benefits/index.wxml"),
    read("miniprogram/pages/product/index.js"),
    read("miniprogram/pages/product/index.wxml"),
  ]);
  assert.match(app, /pages\/benefits\/index/);
  assert.match(profile, /\/pages\/benefits\/index/);
  assert.match(benefits, /memberBenefits/);
  for (const label of ["会员权益", "我的优惠券", "积分明细", "商品提醒"]) assert.match(benefitsView, new RegExp(label));
  assert.match(product, /toggleProductAlert/);
  assert.match(productView, /补货时通知我/);
  assert.match(productView, /降价时通知我/);
});

test("认证前商品提醒只保存在开发者工具本地", async () => {
  const storage = new Map();
  globalThis.wx = {
    getStorageSync: (key) => storage.get(key),
    setStorageSync: (key, value) => storage.set(key, value),
    removeStorageSync: (key) => storage.delete(key),
    request: () => { throw new Error("预览商品提醒不应请求后台"); },
  };
  const require = createRequire(import.meta.url);
  const { memberBenefits, productAlertState, toggleProductAlert } = require("../miniprogram/utils/member.js");
  storage.set("pusy_member_session_v1", { preview: true, member: { id: 0, name: "预览会员", tier: "preview", pointsBalance: 0, lifetimePoints: 0 } });
  const product = { id: "preview-product", name: "预览商品", image: "/assets/01.jpg", priceText: "¥100" };
  assert.equal((await toggleProductAlert(product, "price_drop")), true);
  assert.equal(productAlertState(product.id).priceDrop, true);
  const benefits = await memberBenefits();
  assert.equal(benefits.preview, true);
  assert.equal(benefits.productAlerts.length, 1);
  assert.equal((await toggleProductAlert(product, "price_drop")), false);
  assert.equal(productAlertState(product.id).priceDrop, false);
  delete globalThis.wx;
});

test("正式会员权益接口返回增长数据且商品提醒按会员隔离", async () => {
  const [accountApi, alertsApi, session, allMiniSource] = await Promise.all([
    read("app/api/miniprogram/account/route.ts"),
    read("app/api/miniprogram/product-alerts/route.ts"),
    read("miniprogram/utils/session.js"),
    Promise.all(["miniprogram/utils/member.js", "miniprogram/pages/benefits/index.js", "miniprogram/pages/product/index.js"].map(read)).then((sources) => sources.join("\n")),
  ]);
  for (const field of ["lifetime_points", "member_points_ledger", "coupon_assignments", "member_product_alerts"]) assert.match(accountApi, new RegExp(field));
  assert.match(session, /pointsLedger: account\.pointsLedger/);
  assert.match(session, /coupons: account\.coupons/);
  assert.match(session, /productAlerts: account\.productAlerts/);
  assert.match(alertsApi, /getMemberIdentityFromRequest\(request\)/);
  assert.match(alertsApi, /member_id = \? AND product_slug = \? AND alert_type = \?/);
  assert.match(alertsApi, /ON CONFLICT\(member_id, product_slug, alert_type\)/);
  assert.doesNotMatch(allMiniSource, /wx\.requestPayment/);
});
