import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("小程序地址、结算、订单结果和订单列表页面已经接通", async () => {
  const [app, cart, checkout, checkoutView, address, result, orders] = await Promise.all([
    read("miniprogram/app.json"),
    read("miniprogram/pages/cart/index.js"),
    read("miniprogram/pages/checkout/index.js"),
    read("miniprogram/pages/checkout/index.wxml"),
    read("miniprogram/pages/address/index.js"),
    read("miniprogram/pages/order-result/index.js"),
    read("miniprogram/pages/orders/index.js"),
  ]);
  for (const page of ["address", "checkout", "order-result", "orders"]) assert.match(app, new RegExp(`pages/${page}/index`));
  assert.match(cart, /\/pages\/checkout\/index/);
  assert.match(cart, /FREE_SHIPPING_FEN = 60000/);
  assert.match(checkout, /createOrder/);
  assert.match(checkout, /getAddress/);
  assert.match(checkoutView, /不会扣库存或付款/);
  assert.match(address, /saveAddress/);
  assert.match(result, /findLocalOrder/);
  assert.match(orders, /orderHistory/);
});

test("认证前预览订单只保存在本地且不会调用后台", async () => {
  const storage = new Map();
  globalThis.wx = {
    getStorageSync: (key) => storage.get(key),
    setStorageSync: (key, value) => storage.set(key, value),
    removeStorageSync: (key) => storage.delete(key),
    setTabBarBadge: () => undefined,
    removeTabBarBadge: () => undefined,
    request: () => { throw new Error("预览订单不应请求后台"); },
  };
  const require = createRequire(import.meta.url);
  const { addressText, saveAddress } = require("../miniprogram/utils/address.js");
  const { createOrder } = require("../miniprogram/utils/orders.js");
  assert.throws(() => saveAddress({}), /收货人/);
  const address = saveAddress({ recipient: "测试会员", phone: "13800138000", email: "preview@example.com", province: "上海市", city: "上海市", district: "浦东新区", detail: "测试路 1 号" });
  assert.equal(addressText(address), "上海市 上海市 浦东新区 测试路 1 号");
  storage.set("pusy_cart_v1", [{ productId: "preview-product", quantity: 1 }]);
  const cart = { items: [{ productId: "preview-product", quantity: 1, product: { id: "preview-product", name: "预览商品", priceText: "¥100", image: "/assets/01.jpg" }, subtotalText: "¥100" }], count: 1, totalFen: 10000, totalText: "¥100" };
  const order = await createOrder({ cart, address, delivery: "标准快递" });
  assert.match(order.id, /^PREVIEW-/);
  assert.equal(order.preview, true);
  assert.equal(order.totalFen, 14680);
  assert.deepEqual(storage.get("pusy_cart_v1"), []);
  assert.equal(storage.get("pusy_orders_v1")[0].id, order.id);
  delete globalThis.wx;
});

test("正式小程序订单复用网站会员会话与服务端价格库存校验", async () => {
  const [orderService, orderClient, checkoutView, allMiniSource] = await Promise.all([
    read("app/api/orders/route.ts"),
    read("miniprogram/utils/orders.js"),
    read("miniprogram/pages/checkout/index.wxml"),
    Promise.all(["miniprogram/utils/orders.js", "miniprogram/pages/checkout/index.js", "miniprogram/pages/checkout/index.wxml"].map(read)).then((items) => items.join("\n")),
  ]);
  assert.match(orderService, /getMemberIdentityFromRequest\(request\)/);
  assert.match(orderService, /!viewer\.email\.endsWith\("@members\.pusy\.cn"\)/);
  assert.match(orderService, /SELECT name, price, stock, inventory_verified, status FROM products/);
  assert.match(orderService, /stock = stock - \?/);
  assert.match(orderClient, /request\("\/api\/orders"/);
  assert.match(orderClient, /payment: "微信支付"/);
  assert.match(orderClient, /if \(config\.previewMode\)/);
  assert.match(checkoutView, /认证和商户配置完成后再调起微信收银台/);
  assert.doesNotMatch(allMiniSource, /wx\.requestPayment/);
});
