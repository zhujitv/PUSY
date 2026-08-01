import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { readSource as read } from "./helpers/read-source.mjs";


test("uses real WebP assets and applies baseline response hardening", async () => {
  const [config, proxy, exportApi, commerceSchema, profileSchema] = await Promise.all([
    read("next.config.ts"),
    read("proxy.ts"),
    read("app/api/admin/export/route.ts"),
    read("db/commerce-features.ts"),
    read("db/member-profile.ts"),
  ]);
  assert.match(config, /Content-Security-Policy/);
  assert.match(config, /X-Content-Type-Options/);
  assert.doesNotMatch(config, /sri:/);
  assert.match(config, /script-src-attr 'none'/);
  assert.match(proxy, /nonce-\$\{nonce\}/);
  assert.match(proxy, /'strict-dynamic'/);
  assert.doesNotMatch(proxy, /script-src[^;]*unsafe-inline/);
  assert.match(exportApi, /\^\[=\+\\-@\]/);
  assert.doesNotMatch(commerceSchema, /CREATE TABLE/);
  assert.doesNotMatch(profileSchema, /CREATE TABLE/);
  const assetDir = new URL("../public/assets/", import.meta.url);
  const numbered = (await readdir(assetDir)).filter((name) => /^\d{2}\.webp$/.test(name));
  assert.equal(numbered.length, 42);
  for (const name of numbered) {
    const bytes = await readFile(new URL(name, assetDir));
    assert.equal(bytes.subarray(0, 4).toString(), "RIFF");
    assert.equal(bytes.subarray(8, 12).toString(), "WEBP");
  }
});

test("retail partnership requests use an online form, admin workflow and notifications", async () => {
  const [page, form, api, admin, adminApi, exportApi, schema] = await Promise.all([
    read("app/stores-china/page.tsx"),
    read("app/stores-china/RetailPartnershipForm.tsx"),
    read("app/api/retail-partnerships/route.ts"),
    read("app/admin/AdminClient.tsx"),
    read("app/api/admin/route.ts"),
    read("app/api/admin/export/route.ts"),
    read("db/railway-postgres.sql"),
  ]);
  assert.doesNotMatch(page, /mailto:/);
  assert.match(page, /RetailPartnershipForm/);
  assert.match(form, /手机号码/);
  assert.match(form, /电子邮箱（选填）/);
  assert.match(form, /没有设置邮箱可留空/);
  assert.match(api, /retail_partnerships/);
  assert.match(api, /retail_partnership_internal/);
  assert.match(api, /retail_partnership_confirmation/);
  assert.match(admin, /零售合作/);
  assert.match(admin, /update-retail-partnership-status/);
  assert.match(adminApi, /partnershipStatuses/);
  assert.match(exportApi, /partnerships/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS retail_partnerships/);
  assert.match(schema, /cooperation_type TEXT NOT NULL/);
});

test("customer service and business cooperation use website forms instead of email-client links", async () => {
  const [home, chrome, contactPage, contactForm, supportApi, supportService, supportAdmin, storesPage, partnershipForm, returnsPage, returnApi, details, privacy, cookie, payment, sitemap, migration, schema] = await Promise.all([
    read("app/page.tsx"),
    read("app/components/SiteChrome.tsx"),
    read("app/contact/page.tsx"),
    read("app/contact/ContactForm.tsx"),
    read("app/api/support/route.ts"),
    read("lib/support/service.ts"),
    read("app/admin/SupportAdmin.tsx"),
    read("app/stores-china/page.tsx"),
    read("app/stores-china/RetailPartnershipForm.tsx"),
    read("app/return/page.tsx"),
    read("app/api/returns/route.ts"),
    read("app/details/page.tsx"),
    read("app/privacy/page.tsx"),
    read("app/cookie/page.tsx"),
    read("app/checkout/payment/PaymentClient.tsx"),
    read("app/sitemap.ts"),
    read("db/migrations/2026-07-30-zzz-support-web-form.sql"),
    read("db/railway-postgres.sql"),
  ]);
  const customerFacing = [home, chrome, contactPage, contactForm, storesPage, partnershipForm, returnsPage, details, privacy, cookie, payment].join("\n");
  assert.doesNotMatch(customerFacing, /mailto:/i);
  assert.match(chrome, /href="\/contact">客户服务/);
  assert.match(chrome, /\/stores-china#retail-partnership/);
  assert.doesNotMatch(contactPage, /咨询与退换货共用一个入口/);
  assert.match(contactForm, /提交客服工单/);
  assert.match(contactForm, /手机号码/);
  assert.match(contactForm, /电子邮箱（选填）/);
  assert.match(supportApi, /hasTrustedOrigin/);
  assert.match(supportApi, /allowRequest\(request, "website-support"/);
  assert.match(supportApi, /contactPreference === "微信"/);
  assert.match(supportApi, /getPreviewMemberIdentity/);
  assert.match(supportApi, /upper\(id\) = \? AND member_id = \?/);
  assert.doesNotMatch(supportApi, /phone = \? OR/);
  assert.match(supportApi, /createWebsiteSupportThread/);
  assert.match(supportService, /source, from_email, to_email, subject, text_body/);
  assert.match(supportService, /'inbound', 'website'/);
  assert.match(supportAdmin, /customer_phone/);
  assert.match(supportAdmin, /客户未填写电子邮箱/);
  assert.match(storesPage, /id="retail-partnership"/);
  assert.match(partnershipForm, /提交合作申请/);
  assert.match(contactForm, /isAfterSales/);
  assert.match(contactForm, /验证并查询订单/);
  assert.match(contactForm, /selectedReturnOrder/);
  assert.match(returnApi, /createWebsiteReturnCase/);
  assert.match(returnsPage, /在线联系客服/);
  assert.match(sitemap, /"\/contact"/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS customer_phone/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS customer_wechat/);
  assert.match(schema, /customer_phone TEXT NOT NULL DEFAULT ''/);
  assert.match(schema, /customer_wechat TEXT NOT NULL DEFAULT ''/);
});

test("customer service title stays compact and on one line", async () => {
  const [contactPage, styles] = await Promise.all([
    read("app/contact/page.tsx"),
    read("app/globals.css"),
  ]);
  assert.match(contactPage, /className="contact-page"/);
  assert.match(styles, /\.info-page\.contact-page h1 \{[^}]*font-size: clamp\(38px, 4\.5vw, 68px\);[^}]*white-space: nowrap;/s);
});
