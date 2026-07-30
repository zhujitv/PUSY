import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  calculatePhysicalSubtotal,
  calculateShippingFee,
  ELECTRONIC_DELIVERY,
  FREE_STANDARD_SHIPPING_THRESHOLD,
  isGiftCardLineSlug,
  SF_DELIVERY,
  SF_SHIPPING_FEE,
  STANDARD_DELIVERY,
  STANDARD_SHIPPING_FEE,
} from "../lib/shipping.ts";

test("customer-facing fixed prices resolve to 9, 18 and 198 yuan", () => {
  assert.equal(STANDARD_SHIPPING_FEE * 0.12, 9);
  assert.equal(SF_SHIPPING_FEE * 0.12, 18);
  assert.equal(FREE_STANDARD_SHIPPING_THRESHOLD * 0.12, 198);
});

test("electronic gift cards never create a shipping fee", () => {
  assert.equal(calculatePhysicalSubtotal([{ slug: "gift-card-3000-1720000000000", price: 3000, quantity: 1 }]), 0);
  assert.equal(calculateShippingFee(ELECTRONIC_DELIVERY, 0), 0);
  assert.equal(isGiftCardLineSlug("gift-card-3000-1720000000000"), true);
  assert.equal(isGiftCardLineSlug("gift-card-2000-1720000000000"), false);
});

test("gift cards do not help mixed orders reach the free-shipping threshold", () => {
  const physicalSubtotal = calculatePhysicalSubtotal([
    { slug: "physical-product", price: FREE_STANDARD_SHIPPING_THRESHOLD - 1, quantity: 1 },
    { slug: "gift-card-10000-1720000000000", price: 10000, quantity: 1 },
  ]);
  assert.equal(physicalSubtotal, FREE_STANDARD_SHIPPING_THRESHOLD - 1);
  assert.equal(calculateShippingFee(STANDARD_DELIVERY, physicalSubtotal), STANDARD_SHIPPING_FEE);
});

test("standard delivery is free at the threshold while SF remains a paid upgrade", () => {
  assert.equal(calculateShippingFee(STANDARD_DELIVERY, FREE_STANDARD_SHIPPING_THRESHOLD - 1), STANDARD_SHIPPING_FEE);
  assert.equal(calculateShippingFee(STANDARD_DELIVERY, FREE_STANDARD_SHIPPING_THRESHOLD), 0);
  assert.equal(calculateShippingFee(SF_DELIVERY, FREE_STANDARD_SHIPPING_THRESHOLD), SF_SHIPPING_FEE);
});

test("checkout, server and logistics all enforce the shared fulfillment policy", async () => {
  const [checkout, orders, logistics, admin, adminApi, migration, miniProgramCart, miniProgramHome] = await Promise.all([
    readFile(new URL("../app/checkout/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/orders/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/logistics/service.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/AdminClient.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/migrations/2026-07-30-zzzzzzzzzzzzzzzzzz-shipping-policy.sql", import.meta.url), "utf8"),
    readFile(new URL("../miniprogram/pages/cart/index.js", import.meta.url), "utf8"),
    readFile(new URL("../miniprogram/pages/home/index.wxml", import.meta.url), "utf8"),
  ]);
  assert.match(checkout, /requiresShipping \? <><section>/);
  assert.doesNotMatch(checkout, /门店自提/);
  assert.match(orders, /const physicalSubtotal = calculatePhysicalSubtotal\(resolvedItems\)/);
  assert.match(orders, /const orderAddress = requiresShipping \? address : "电子礼品卡通过收件人邮箱发送"/);
  assert.match(logistics, /电子礼品卡订单无需快递发货/);
  assert.match(admin, /order\.has_physical_items/);
  assert.match(adminApi, /AS has_physical_items/);
  assert.match(orders, /请填写有效的礼品卡收件人姓名和邮箱/);
  assert.match(migration, /gift_card_sent/);
  assert.match(migration, /UPDATE site_content/);
  assert.match(miniProgramCart, /FREE_SHIPPING_FEN = 19800/);
  assert.match(miniProgramHome, /实体商品满 ¥198 免标准快递费/);
});
