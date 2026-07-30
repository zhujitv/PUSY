import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("小程序使用大字号自定义底部导航并保留四个主入口", async () => {
  const [appConfigText, component, view, styles] = await Promise.all([
    read("miniprogram/app.json"),
    read("miniprogram/custom-tab-bar/index.js"),
    read("miniprogram/custom-tab-bar/index.wxml"),
    read("miniprogram/custom-tab-bar/index.wxss"),
  ]);
  const appConfig = JSON.parse(appConfigText);
  assert.equal(appConfig.tabBar.custom, true);
  assert.deepEqual(appConfig.tabBar.list.map((item) => item.text), ["首页", "分类", "购物袋", "我的"]);
  assert.match(component, /wx\.switchTab\(\{ url: item\.pagePath \}\)/);
  assert.match(component, /getCurrentPages/);
  assert.match(view, /role="tablist"/);
  assert.match(view, /aria-selected/);
  assert.match(styles, /\.tab-item \{[\s\S]*font-size: 29rpx;/);
  assert.match(styles, /align-items: center;/);
  assert.match(styles, /justify-content: center;/);
});

test("自定义底部导航同步购物袋和消息角标且为安全区预留空间", async () => {
  const [component, cart, notifications, homeStyles, categoryStyles, cartStyles, profileStyles] = await Promise.all([
    read("miniprogram/custom-tab-bar/index.js"),
    read("miniprogram/utils/cart.js"),
    read("miniprogram/utils/notifications.js"),
    read("miniprogram/pages/home/index.wxss"),
    read("miniprogram/pages/category/index.wxss"),
    read("miniprogram/pages/cart/index.wxss"),
    read("miniprogram/pages/profile/index.wxss"),
  ]);
  assert.match(component, /cartBadge/);
  assert.match(component, /notificationBadge/);
  assert.match(cart, /refreshCustomTabBar\(\)/);
  assert.match(notifications, /refreshCustomTabBar\(\)/);
  for (const styles of [homeStyles, categoryStyles, cartStyles, profileStyles]) {
    assert.match(styles, /env\(safe-area-inset-bottom\)/);
  }
});
