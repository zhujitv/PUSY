import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("uses China-region identity, payment, delivery and legal copy", async () => {
  const [layout, payment, delivery, returns, privacy, details, terms] = await Promise.all([
    read("app/layout.tsx"),
    read("app/payment/page.tsx"),
    read("app/delivery/page.tsx"),
    read("app/return/page.tsx"),
    read("app/privacy/page.tsx"),
    read("app/details/page.tsx"),
    read("app/oferta/page.tsx"),
  ]);

  assert.match(layout, /PÚSY 中国官方网站/);
  assert.match(layout, /locale: "zh_CN"/);
  assert.match(payment, /微信支付/);
  assert.match(payment, /支付宝/);
  assert.doesNotMatch(payment, /МИР|СБП|CDEK|Yandex/);
  assert.match(delivery, /中国大陆订单/);
  assert.match(delivery, /顺丰速运/);
  assert.match(returns, /七日无理由退货/);
  assert.match(returns, /一次性密封包装/);
  assert.match(privacy, /中华人民共和国个人信息保护法/);
  assert.match(details, /统一社会信用代码/);
  assert.match(terms, /人民币元/);
});

test("requires checkout consent and exposes China compliance settings", async () => {
  const [checkout, admin, adminApi, region, env, sitemap, giftCard] = await Promise.all([
    read("app/checkout/page.tsx"),
    read("app/admin/AdminClient.tsx"),
    read("app/api/admin/route.ts"),
    read("lib/china-region.ts"),
    read(".env.example"),
    read("app/sitemap.ts"),
    read("app/gift-card/page.tsx"),
  ]);

  assert.match(checkout, /用户服务与销售条款/);
  assert.match(checkout, /一次性密封包装拆除或损坏后/);
  assert.match(checkout, /type="checkbox" required/);
  assert.match(admin, /中国区设置/);
  assert.match(adminApi, /chinaComplianceReady/);
  assert.match(region, /CHINA_OPERATOR_NAME/);
  assert.match(env, /CHINA_UNIFIED_SOCIAL_CREDIT_CODE/);
  assert.doesNotMatch(sitemap, /stores-russia|stores-sng|stores-oae/);
  assert.match(giftCard, /记名电子礼品卡不设有效期/);
});

test("matches the catalog scope while keeping inventory independently managed", async () => {
  const [catalogJson, productPage, productActions, catalogClient, orderApi, sitemap, mobileCss] = await Promise.all([
    read("app/data/products.generated.json"),
    read("app/products/[slug]/page.tsx"),
    read("app/products/[slug]/ProductActions.tsx"),
    read("app/components/CatalogClient.tsx"),
    read("app/api/orders/route.ts"),
    read("app/sitemap.ts"),
    read("app/globals.css"),
  ]);
  const products = JSON.parse(catalogJson);
  assert.equal(products.length, 83);
  assert.equal(new Set(products.map((product) => product.slug)).size, 83);
  assert.ok(products.every((product) => product.stock === 0 && product.inventoryVerified === false));
  assert.ok(products.filter((product) => product.variants?.length).length >= 39);
  assert.ok(products.every((product) => product.images?.length >= 1));
  assert.equal(products.find((product) => product.slug === "pusy-home-sol-dlya-vanny-bath-salt-400g-100160")?.price, 810);
  assert.deepEqual(products.find((product) => product.slug === "nabor-hodovoiy-letniiy-vaiyb-100687") && {
    price: products.find((product) => product.slug === "nabor-hodovoiy-letniiy-vaiyb-100687").price,
    oldPrice: products.find((product) => product.slug === "nabor-hodovoiy-letniiy-vaiyb-100687").oldPrice,
  }, { price: 2390, oldPrice: 2860 });
  assert.doesNotMatch(products.map((product) => `${product.name} ${product.description} ${product.usage ?? ""}`).join("\n"), /[\u0400-\u04ff]/);
  assert.match(productPage, /generateMetadata/);
  assert.match(productPage, /product\.variants/);
  assert.match(productActions, /inventoryVerified/);
  assert.doesNotMatch(catalogClient, /中国仓|原站库存|原站快照/);
  assert.match(orderApi, /inventory_verified/);
  assert.match(orderApi, /商品不存在或已下架/);
  assert.match(sitemap, /collectionNames/);
  assert.match(mobileCss, /\.hero \{ height: 430px; min-height: 430px/);
});

test("preserves original blog URLs with Chinese content and unique metadata", async () => {
  const [blogData, blogPage, articlePage, sitemap] = await Promise.all([
    read("app/data/blog.ts"),
    read("app/blog/page.tsx"),
    read("app/blog/[slug]/page.tsx"),
    read("app/sitemap.ts"),
  ]);
  assert.match(blogData, /01981b2b-ea79-77ad-80e6-8b2f1f808928/);
  assert.match(blogData, /01981b2d-54d8-765e-8906-afec86d506ad/);
  assert.match(blogData, /01981b32-12e9-7a71-929d-fb7801521ff9/);
  assert.doesNotMatch(blogData, /[\u0400-\u04ff]/);
  assert.match(blogPage, /PUSY\.CN/);
  assert.match(articlePage, /generateMetadata/);
  assert.match(articlePage, /notFound/);
  assert.match(sitemap, /post\.aliases/);
});

test("homepage videos require manual playback", async () => {
  const homepage = await read("app/page.tsx");
  assert.match(homepage, /runtime\.strm\.yandex\.ru\/player\/video/);
  assert.doesNotMatch(homepage, /allow="[^"]*autoplay/);
  assert.match(homepage, /hero-clean-v2-42a264aa\.webp/);
  assert.match(homepage, /35\.webp/);
  assert.match(homepage, /hero-copy--box/);
  assert.match(homepage, /setInterval\(\(\) => setHeroIndex/);
  assert.match(homepage, /aria-label="上一张"/);
  assert.match(homepage, /aria-label="下一张"/);
});

test("uses the pink PUSY wordmark as the domain icon", async () => {
  const [favicon, layout, manifest] = await Promise.all([
    read("public/favicon.svg"),
    read("app/layout.tsx"),
    read("app/manifest.ts"),
  ]);
  assert.match(favicon, /#EF398B/);
  assert.match(favicon, /viewBox="0 0 128 128"/);
  assert.match(layout, /manifest\.webmanifest/);
  assert.match(layout, /apple:/);
  assert.match(manifest, /theme_color: "#ef398b"/);
});

test("about page uses valid local WebP assets", async () => {
  const about = await read("app/about/page.tsx");
  assert.match(about, /from "next\/image"/);
  assert.match(about, /about-30\.webp/);
  assert.match(about, /about-36\.webp/);
  assert.doesNotMatch(about, /src="\/assets\/30\.webp"/);
});

test("commerce feature set covers discovery, cart, membership, reviews and content operations", async () => {
  const [catalog, cart, account, productPage, gallery, reviews, reviewsApi, admin, adminApi, contentApi, schema, css] = await Promise.all([
    read("app/components/CatalogClient.tsx"),
    read("app/cart/page.tsx"),
    read("app/account/AccountClient.tsx"),
    read("app/products/[slug]/page.tsx"),
    read("app/products/[slug]/ProductGallery.tsx"),
    read("app/products/[slug]/ProductReviews.tsx"),
    read("app/api/reviews/route.ts"),
    read("app/admin/AdminClient.tsx"),
    read("app/api/admin/route.ts"),
    read("app/api/content/route.ts"),
    read("db/railway-postgres.sql"),
    read("app/globals.css"),
  ]);
  assert.match(catalog, /只看有货/);
  assert.match(catalog, /最低价（元）/);
  assert.match(catalog, /商品标签/);
  assert.match(cart, /shipping-progress/);
  assert.match(cart, /顺手带上/);
  assert.match(account, /我的收藏/);
  assert.match(productPage, /ProductGallery/);
  assert.match(productPage, /ProductReviews/);
  assert.match(gallery, /product-gallery-thumbs/);
  assert.match(reviews, /写下你的评价/);
  assert.match(reviewsApi, /verified_purchase/);
  assert.match(admin, /评价审核/);
  assert.match(admin, /内容运营/);
  assert.match(adminApi, /update-review-status/);
  assert.match(adminApi, /update-site-content/);
  assert.match(contentApi, /getSiteContent/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS product_reviews/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS site_content/);
  assert.match(css, /product-gallery-stage img[^}]*object-fit: contain/);
});

test("member center always exposes a working sign-out entry", async () => {
  const [account, accountClient, logout, login, authApi] = await Promise.all([
    read("app/account/page.tsx"),
    read("app/account/AccountClient.tsx"),
    read("app/account/logout/route.ts"),
    read("app/account/login/MemberAuthClient.tsx"),
    read("app/api/account/auth/route.ts"),
  ]);
  assert.doesNotMatch(account, /canSignOut/);
  assert.match(account, /redirect\("\/account\/login"\)/);
  assert.match(accountClient, /href="\/account\/logout">退出登录/);
  assert.match(logout, /Response\.redirect\(new URL\("\/account\/login"/);
  assert.match(logout, /clearPreviewMemberCookie/);
  assert.match(login, /会员登录/);
  assert.match(login, /注册会员/);
  assert.match(login, /手机号或邮箱/);
  assert.match(authApi, /PREVIEW_VERIFICATION_CODE/);
});

test("member profile supports complete personal and beauty preferences", async () => {
  const [account, accountApi, profileSchema, railwaySchema, css] = await Promise.all([
    read("app/account/AccountClient.tsx"),
    read("app/api/account/route.ts"),
    read("db/member-profile.ts"),
    read("db/railway-postgres.sql"),
    read("app/globals.css"),
  ]);
  assert.match(account, /资料完整度/);
  assert.match(account, /美妆档案/);
  assert.match(account, /主要护理诉求/);
  assert.match(account, /感兴趣的品类/);
  assert.match(account, /邮件新品通知/);
  assert.match(accountApi, /validBirthday/);
  assert.match(accountApi, /skinConcernValues/);
  assert.match(accountApi, /preferred_categories/);
  assert.match(profileSchema, /CREATE TABLE IF NOT EXISTS member_profiles/);
  assert.match(railwaySchema, /CREATE TABLE IF NOT EXISTS member_profiles/);
  assert.match(css, /profile-completion/);
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
