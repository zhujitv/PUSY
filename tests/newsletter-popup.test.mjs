import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("订阅弹窗复用正式订阅名单并提供真实的一次性新客优惠", async () => {
  const [layout, popup, route, migration, schema, admin, css] = await Promise.all([
    read("app/layout.tsx"),
    read("app/components/NewsletterPopup.tsx"),
    read("app/api/newsletter/route.ts"),
    read("db/migrations/2026-09-11-newsletter-popup.sql"),
    read("db/schema.ts"),
    read("app/admin/AdminClient.tsx"),
    read("app/styles/26-newsletter-popup.css"),
  ]);

  assert.match(layout, /<NewsletterPopup \/>/);
  assert.match(popup, /setTimeout\(\(\) => \{/);
  assert.match(popup, /}, 3000\)/);
  assert.match(popup, /role="dialog"/);
  assert.match(popup, /aria-modal="true"/);
  assert.match(popup, /privacyConsent/);
  assert.match(popup, /marketingConsent/);
  assert.match(popup, /sessionStorage\.setItem\(dismissedKey/);
  assert.match(popup, /localStorage\.setItem\(subscribedKey/);
  assert.match(route, /source !== "popup"/);
  assert.match(route, /usage_limit, status, assignment_mode/);
  assert.match(route, /10, 0, 1, 'active', 'public'/);
  assert.match(route, /newsletter_welcome/);
  assert.match(route, /welcome_coupon_code = COALESCE\(subscribers\.welcome_coupon_code/);
  assert.match(migration, /privacy_consented_at/);
  assert.match(migration, /marketing_consented_at/);
  assert.match(migration, /newsletter_welcome/);
  assert.match(schema, /welcomeCouponCode: text\("welcome_coupon_code"\)/);
  assert.match(admin, /subscriber\.source === "popup" \? "订阅弹窗"/);
  assert.match(css, /@media \(max-width: 640px\)/);
  assert.match(css, /place-items: end center/);
});
