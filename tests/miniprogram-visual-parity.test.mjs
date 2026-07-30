import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("小程序使用与网站一致的品牌颜色和移动端排版语言", async () => {
  const [globalStyles, appConfig, home, homeView] = await Promise.all([
    read("miniprogram/app.wxss"),
    read("miniprogram/app.json"),
    read("miniprogram/pages/home/index.wxss"),
    read("miniprogram/pages/home/index.wxml"),
  ]);
  assert.match(globalStyles, /--pink: #eb2f83/);
  assert.match(globalStyles, /--ink: #0a0a0a/);
  assert.match(globalStyles, /--soft-pink: #f7a5ca/);
  assert.match(appConfig, /"selectedColor": "#eb2f83"/);
  assert.match(home, /\.shipping \{[^}]*background: #eb2f83/);
  assert.match(home, /\.product-cell \{ width: 540rpx/);
  assert.match(homeView, /scroll-view class="product-scroll"/);
});

test("商品卡片复用网站的大图、粉色角标和底部购买条", async () => {
  const [component, view, styles] = await Promise.all([
    read("miniprogram/components/product-card/index.js"),
    read("miniprogram/components/product-card/index.wxml"),
    read("miniprogram/components/product-card/index.wxss"),
  ]);
  assert.match(component, /variant: \{ type: String/);
  assert.match(view, /card-\{\{variant\}\}/);
  assert.match(view, /加入购物袋/);
  assert.match(styles, /\.card \{[^}]*border-radius: 12rpx;[^}]*background: #f2f2f2/);
  assert.match(styles, /\.badge \{[^}]*background: #eb2f83;[^}]*color: #fff/);
  assert.match(styles, /\.quick-add \{[^}]*left: 14rpx;[^}]*right: 14rpx;[^}]*background: rgba\(255,255,255,.94\)/);
});

test("会员、订单、消息、权益和交易页移除不一致的渐变与悬浮卡片", async () => {
  const paths = [
    "miniprogram/pages/profile/index.wxss",
    "miniprogram/pages/orders/index.wxss",
    "miniprogram/pages/order-detail/index.wxss",
    "miniprogram/pages/notifications/index.wxss",
    "miniprogram/pages/benefits/index.wxss",
    "miniprogram/pages/checkout/index.wxss",
    "miniprogram/pages/address/index.wxss",
    "miniprogram/pages/support/index.wxss",
  ];
  const sources = await Promise.all(paths.map(read));
  assert.match(sources[0], /\.profile-hero \{[^}]*background: #f7a5ca;[^}]*color: #111/);
  assert.match(sources[0], /\.profile-login \{[^}]*background: #111;[^}]*color: #fff/);
  assert.doesNotMatch(sources.join("\n"), /linear-gradient/);
  for (const source of sources.slice(1)) assert.match(source, /background: #fff/);
});
