import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("小程序结算页接入会员优惠券和云端默认地址", async () => {
  const [checkout, checkoutView, address, addressPage, addressApi] = await Promise.all([
    read("miniprogram/pages/checkout/index.js"),
    read("miniprogram/pages/checkout/index.wxml"),
    read("miniprogram/utils/address.js"),
    read("miniprogram/pages/address/index.js"),
    read("app/api/miniprogram/addresses/route.ts"),
  ]);
  assert.match(checkout, /chooseCoupon/);
  assert.match(checkout, /couponCode:/);
  assert.match(checkoutView, /会员优惠券/);
  assert.match(checkoutView, /会员优惠/);
  assert.match(address, /saveMemberAddress/);
  assert.match(address, /syncMemberAddress/);
  assert.match(addressPage, /saveMemberAddress/);
  assert.match(addressApi, /getMemberIdentityFromRequest\(request\)/);
  assert.match(addressApi, /WHERE id = \? AND member_id = \?/);
  assert.match(addressApi, /is_default = 1/);
});

test("优惠券金额按网站订单计价单位换算且服务端仍做最终校验", async () => {
  const storage = new Map();
  globalThis.wx = {
    getStorageSync: (key) => storage.get(key),
    setStorageSync: (key, value) => storage.set(key, value),
    removeStorageSync: (key) => storage.delete(key),
  };
  const require = createRequire(import.meta.url);
  const { calculate, couponDiscountFen } = require("../miniprogram/utils/orders.js");
  const fixed = { status: "available", kind: "fixed", value: 100, minimum: 500 };
  const percentage = { status: "available", kind: "percentage", value: 20, minimum: 0 };
  assert.equal(couponDiscountFen(fixed, 5999), 0);
  assert.equal(couponDiscountFen(fixed, 6000), 1200);
  assert.equal(couponDiscountFen(percentage, 10000), 2000);
  assert.deepEqual(calculate({ totalFen: 10000 }, "标准快递", percentage), { shippingFen: 4680, discountFen: 2000, totalFen: 12680 });
  delete globalThis.wx;

  const [orderClient, orderApi] = await Promise.all([read("miniprogram/utils/orders.js"), read("app/api/orders/route.ts")]);
  assert.match(orderClient, /couponCode: couponCode \|\| undefined/);
  assert.match(orderApi, /calculateCouponDiscount\(payload\.couponCode, merchandiseTotal, viewer\?\.memberId\)/);
});

test("订单详情展示商品、物流轨迹和售后记录并按会员隔离数据", async () => {
  const [app, orders, detail, detailView, accountApi, session, allMiniSource] = await Promise.all([
    read("miniprogram/app.json"),
    read("miniprogram/pages/orders/index.js"),
    read("miniprogram/pages/order-detail/index.js"),
    read("miniprogram/pages/order-detail/index.wxml"),
    read("app/api/miniprogram/account/route.ts"),
    read("miniprogram/utils/session.js"),
    Promise.all(["miniprogram/utils/orders.js", "miniprogram/pages/checkout/index.js", "miniprogram/pages/order-detail/index.js"].map(read)).then((sources) => sources.join("\n")),
  ]);
  assert.match(app, /pages\/order-detail\/index/);
  assert.match(orders, /pages\/order-detail\/index/);
  assert.match(detail, /orderDetail/);
  for (const label of ["商品明细", "收货与支付", "物流进度", "售后记录"]) assert.match(detailView, new RegExp(label));
  for (const table of ["member_addresses", "order_items", "returns", "shipments", "shipment_events"]) assert.match(accountApi, new RegExp(table));
  assert.match(accountApi, /o\.member_id = \?/);
  for (const field of ["addresses", "orderItems", "returns", "shipments", "shipmentEvents"]) assert.match(session, new RegExp(`${field}: account\\.${field}`));
  assert.doesNotMatch(allMiniSource, /wx\.requestPayment/);
});
