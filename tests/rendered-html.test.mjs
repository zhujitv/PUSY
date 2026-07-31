import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
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
  const [catalogJson, translationsJson, translationMigration, productPage, productActions, catalogClient, orderApi, sitemap, mobileCss, nextConfig, imageFiles] = await Promise.all([
    read("app/data/products.generated.json"),
    read("scripts/catalog-translations.zh-CN.json"),
    read("db/migrations/2026-07-30-zzzzzzzzzzzz-catalog-translations.sql"),
    read("app/products/[slug]/page.tsx"),
    read("app/products/[slug]/ProductActions.tsx"),
    read("app/components/CatalogClient.tsx"),
    read("app/api/orders/route.ts"),
    read("app/sitemap.ts"),
    read("app/globals.css"),
    read("next.config.ts"),
    readdir(new URL("../public/products/yandex/", import.meta.url)),
  ]);
  const products = JSON.parse(catalogJson);
  const translations = JSON.parse(translationsJson);
  const bySlug = new Map(products.map((product) => [product.slug, product]));
  assert.equal(products.length, 88);
  assert.equal(new Set(products.map((product) => product.slug)).size, 88);
  assert.ok(products.every((product) => product.stock === 0 && product.inventoryVerified === false));
  assert.ok(products.filter((product) => product.variants?.length).length >= 39);
  assert.ok(products.every((product) => product.images?.length >= 1));
  assert.equal(products.find((product) => product.slug === "jidkie-rumyana-dlya-lica-peachland-100768")?.category, "彩妆");
  assert.equal(products.find((product) => product.slug === "maslo-dlya-gub-crystal-pink-svetlo-rozovyiy-100783")?.name, "Crystal Pink 浅粉色唇油");
  for (const [slug, override] of Object.entries(translations.products)) {
    const product = bySlug.get(slug);
    assert.ok(product, `Curated translation references an unknown product: ${slug}`);
    for (const field of ["name", "category", "description", "usage", "volume"]) {
      if (Object.hasOwn(override, field)) {
        assert.equal(product[field], override[field] ?? undefined, `${slug}.${field} must use the curated translation`);
      }
    }
  }
  const migrationPayload = translationMigration.match(/\$catalog_data\$(\[[\s\S]*\])\$catalog_data\$/);
  assert.ok(migrationPayload, "Catalog translation migration must contain its JSON payload");
  const databaseOverrides = JSON.parse(migrationPayload[1]);
  assert.equal(databaseOverrides.length, 86);
  for (const override of databaseOverrides) {
    const product = bySlug.get(override.slug);
    assert.ok(product, `Database translation references an unknown product: ${override.slug}`);
    assert.deepEqual({
      name: product.name,
      category: product.category,
      description: product.description,
      volume: product.volume ?? null,
      usage: product.usage ?? null,
      variants: product.variants ?? [],
    }, {
      name: override.name,
      category: override.category,
      description: override.description,
      volume: override.volume,
      usage: override.usage,
      variants: override.variants,
    });
  }
  const strawberry = bySlug.get("karandash-dlya-gub-pusy-strawberry-100464");
  assert.equal(strawberry?.name, "Strawberry 唇线笔");
  assert.equal(strawberry?.variants?.[0]?.name, "色号");
  assert.equal(strawberry?.variants?.[0]?.options.find((option) => option.slug === strawberry.slug)?.label, "冷调粉色");
  assert.ok(bySlug.get("jele-dlya-gub-autumn-1-100675")?.variants?.[0]?.options.some((option) => option.label === "珊瑚色"));
  assert.equal(bySlug.get("rebrending-utrenniiy-ohlajdayshchiiy-tonik-dlya-koji-lica-i-shei-pusy150ml-100232")?.usage, undefined);
  assert.ok(!products.some((product) => product.slug === "maslo-dlya-gub-black-chernyiy-100710"));
  assert.match(nextConfig, /maslo-dlya-gub-black-chernyiy-100710/);
  assert.match(nextConfig, /maslo-dlya-gub-black-chernyiy-100779/);
  const localImages = new Set(imageFiles);
  assert.ok(products.every((product) => [product.image, product.imageAlt, ...(product.images ?? [])]
    .filter(Boolean)
    .every((image) => image.startsWith("/products/yandex/") && localImages.has(image.split("/").at(-1)))));
  assert.equal(products.find((product) => product.slug === "pusy-home-sol-dlya-vanny-bath-salt-400g-100160")?.price, 810);
  assert.deepEqual(products.find((product) => product.slug === "nabor-hodovoiy-letniiy-vaiyb-100687") && {
    price: products.find((product) => product.slug === "nabor-hodovoiy-letniiy-vaiyb-100687").price,
    oldPrice: products.find((product) => product.slug === "nabor-hodovoiy-letniiy-vaiyb-100687").oldPrice,
  }, { price: 2390, oldPrice: 2860 });
  const visibleCatalogCopy = products.flatMap((product) => [
    product.name,
    product.category,
    product.description,
    product.usage,
    product.volume,
    product.badge,
    ...(product.variants ?? []).flatMap((group) => [group.name, ...group.options.map((option) => option.label)]),
  ]).filter(Boolean).join("\n");
  assert.doesNotMatch(visibleCatalogCopy, /[\u0400-\u04ff]/);
  assert.doesNotMatch(visibleCatalogCopy, /荧光笔|补品|去角质滚轮|睫毛(?:用)?热凝胶|永远不会再做|无需胶水|当您决定不醒来|生发发膜|畅销书|多余的皮肤|将眉毛拉到头发上|粘膜|云存储|层压|长度和体积|涂抹一些然后混合|将油涂到嘴唇|到 12 点|酷粉色/);
  assert.match(translationMigration, /updated_at = CURRENT_TIMESTAMP/);
  assert.match(translationMigration, /variants_json = o\.variants::TEXT/);
  assert.doesNotMatch(translationMigration, /\b(?:stock|inventory_verified|low_stock_threshold)\s*=/);
  assert.match(productPage, /generateMetadata/);
  assert.match(productPage, /product\.variants/);
  assert.match(productActions, /inventoryVerified/);
  assert.doesNotMatch(catalogClient, /中国仓|原站库存|原站快照/);
  assert.match(orderApi, /inventory_verified/);
  assert.match(orderApi, /礼品卡面额无效或商品不存在/);
  assert.match(orderApi, /已下架/);
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

test("about page presents an optimized, responsive brand story", async () => {
  const [about, css, desktopHero, mobileHero, historyImage] = await Promise.all([
    read("app/about/page.tsx"),
    read("app/about/about.module.css"),
    readFile(new URL("../public/assets/about-hero-2026.webp", import.meta.url)),
    readFile(new URL("../public/assets/about-hero-mobile-2026.webp", import.meta.url)),
    readFile(new URL("../public/assets/about-history-2026.webp", import.meta.url)),
  ]);

  assert.match(about, /from "next\/image"/);
  assert.match(about, /export const metadata/);
  assert.match(about, /canonical: "\/about"/);
  assert.match(about, /about\.module\.css/);
  assert.match(about, /about-hero-2026\.webp/);
  assert.match(about, /about-hero-mobile-2026\.webp/);
  assert.match(about, /about-history-2026\.webp/);
  assert.match(about, /about-30\.webp/);
  assert.match(about, /about-36\.webp/);
  assert.match(about, /<details/);
  assert.match(about, /open=\{index === 0\}/);
  assert.equal((about.match(/year: "202\d"/g) ?? []).length, 6);
  assert.match(about, /href="\/stores-china"/);
  assert.match(about, /href="\/catalog\/products"/);
  assert.equal((about.match(/\bpriority\b/g) ?? []).length, 1);
  assert.doesNotMatch(about, /unoptimized|loading="eager"/);
  assert.doesNotMatch(about, /src="\/assets\/30\.webp"/);
  assert.match(css, /position: sticky/);
  assert.match(css, /\.eyebrow \{[^}]*font-size: var\(--section-eyebrow-size, 14px\);[^}]*white-space: nowrap;/s);
  assert.match(css, /\.sectionHeading h2 \{[^}]*grid-column: span 10;[^}]*font-size: clamp\(42px, 4\.9vw, 78px\);[^}]*white-space: nowrap;/s);
  assert.match(css, /\.chinaCopy h2 \{[^}]*font-size: clamp\(44px, 5\.2vw, 84px\);[^}]*white-space: nowrap;/s);
  assert.match(css, /\.sectionHeading h2,[^}]*\.mission h2 \{[^}]*white-space: normal;/s);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.ok(desktopHero.byteLength > 100_000);
  assert.ok(mobileHero.byteLength > 50_000);
  assert.ok(historyImage.byteLength > 50_000);
});

test("uses readable section eyebrows across public and member pages", async () => {
  const css = await read("app/globals.css");

  assert.match(css, /--section-eyebrow-size: clamp\(14px, 1vw, 16px\)/);
  assert.match(css, /\.info-page > header > p \{[^}]*font-size: var\(--section-eyebrow-size\)/);
  assert.match(css, /\.stores-page header p, \.blog-page header p \{[^}]*font-size: var\(--section-eyebrow-size\)/);
  assert.match(css, /\.reviews-heading p \{[^}]*font-size: var\(--section-eyebrow-size\)/);
  assert.match(css, /\.payment-page > section > p \{[^}]*font-size: var\(--section-eyebrow-size\)/);
  assert.match(css, /\.member-auth-heading > p \{[^}]*font-size: var\(--section-eyebrow-size\)/);
  assert.match(css, /\.membership-card p \{[^}]*font-size: 13px;/);
});

test("gift card layout stays compact without title overlap", async () => {
  const css = await read("app/globals.css");

  assert.match(css, /\.gift-page \{[^}]*grid-template-columns: minmax\(0, 1fr\) minmax\(0, 1fr\);[^}]*align-items: stretch;[^}]*min-height: 0;/);
  assert.match(css, /\.gift-visual \{[^}]*height: auto;[^}]*min-height: clamp\(620px, 75vh, 860px\);[^}]*place-items: start center;/);
  assert.match(css, /\.gift-copy > p:first-child \{[^}]*font-size: clamp\(14px, 1\.05vw, 16px\);[^}]*line-height: 1\.4;/);
  assert.match(css, /\.gift-copy h1 \{[^}]*font-size: clamp\(44px, 4\.7vw, 68px\);[^}]*line-height: 1;[^}]*white-space: nowrap;/);
  assert.match(css, /\.gift-visual \{ height: clamp\(330px, 82vw, 420px\); min-height: 0; place-items: center;/);
});

test("gift card product links always open the dedicated gift card page", async () => {
  const [productsData, catalog, catalogPage, cart, store, productPage] = await Promise.all([
    read("app/data/products.ts"),
    read("app/components/CatalogClient.tsx"),
    read("app/catalog/[slug]/page.tsx"),
    read("app/cart/page.tsx"),
    read("app/components/StoreProvider.tsx"),
    read("app/products/[slug]/page.tsx"),
  ]);

  assert.match(productsData, /productDetailHref/);
  assert.match(productsData, /product\.category === "礼品卡"/);
  assert.ok((catalog.match(/productDetailHref\(product\)/g) ?? []).length >= 2);
  assert.doesNotMatch(catalog, /href=\{`\/products\/\$\{product\.slug\}`\}/);
  assert.match(catalogPage, /category\.slug === "gift-card" \? "\/gift-card" : `\/catalog\/\$\{category\.slug\}`/);
  assert.match(catalogPage, /slug === "gift-card".*redirect\("\/gift-card"\)/s);
  assert.ok((cart.match(/productDetailHref\(product\)/g) ?? []).length >= 3);
  assert.ok((store.match(/productDetailHref\(product\)/g) ?? []).length >= 3);
  assert.match(productPage, /isGiftCardProductSlug\(slug\).*redirect\("\/gift-card"\)/s);
  assert.match(productPage, /canonical: `\$\{siteUrl\}\/gift-card`/);
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
  assert.match(authApi, /member_verification_codes/);
  assert.match(authApi, /crypto\.getRandomValues/);
  assert.doesNotMatch(authApi, /123456|MEMBER_VERIFICATION_CODE/);
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
  assert.match(profileSchema, /INSERT INTO member_profiles/);
  assert.doesNotMatch(profileSchema, /CREATE TABLE/);
  assert.match(railwaySchema, /CREATE TABLE IF NOT EXISTS member_profiles/);
  assert.match(css, /profile-completion/);
});

test("protects admin and member sessions from spoofed identity headers", async () => {
  const [adminApi, adminPage, adminAuth, memberAuth, accountApi, reviewsApi] = await Promise.all([
    read("app/api/admin/route.ts"),
    read("app/admin/page.tsx"),
    read("lib/admin-auth.ts"),
    read("lib/preview-member-auth.ts"),
    read("app/api/account/route.ts"),
    read("app/api/reviews/route.ts"),
  ]);
  const combined = [adminApi, adminPage, accountApi, reviewsApi].join("\n");
  assert.doesNotMatch(combined, /oai-authenticated-user-email|getChatGPTUser/);
  assert.match(adminApi, /getAdminIdentity/);
  assert.match(adminAuth, /HMAC/);
  assert.match(memberAuth, /member_sessions/);
  assert.match(memberAuth, /sha256\(token\)/);
  assert.match(memberAuth, /HttpOnly; SameSite=Lax/);
});

test("reserves order resources atomically and commits them only after payment", async () => {
  const [orders, reservations, paymentService, checkout, paymentApi, success] = await Promise.all([
    read("app/api/orders/route.ts"),
    read("lib/orders/reservations.ts"),
    read("lib/payments/service.ts"),
    read("app/checkout/page.tsx"),
    read("app/api/payments/route.ts"),
    read("app/checkout/success/page.tsx"),
  ]);
  assert.match(orders, /stock >= \?/);
  assert.match(orders, /requireChanges/);
  assert.match(orders, /reservationExpiresAt/);
  assert.match(orders, /'pending'/);
  assert.doesNotMatch(orders, /total_orders = total_orders \+ 1/);
  assert.match(paymentService, /commitPaidOrder/);
  assert.match(reservations, /resources_committed/);
  assert.match(reservations, /status = 'void'/);
  assert.doesNotMatch(checkout, /Date\.now\(\)\.toString\(\)\.slice/);
  assert.doesNotMatch(checkout, /token=\$\{/);
  assert.match(paymentApi, /HttpOnly; SameSite=Lax/);
  assert.match(success, /payment_token_hash/);
});

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
  const [home, chrome, contactPage, contactForm, supportApi, supportService, supportAdmin, storesPage, partnershipForm, returnsPage, returnForm, details, privacy, cookie, payment, sitemap, migration, schema] = await Promise.all([
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
    read("app/return/ReturnForm.tsx"),
    read("app/details/page.tsx"),
    read("app/privacy/page.tsx"),
    read("app/cookie/page.tsx"),
    read("app/checkout/payment/PaymentClient.tsx"),
    read("app/sitemap.ts"),
    read("db/migrations/2026-07-30-zzz-support-web-form.sql"),
    read("db/railway-postgres.sql"),
  ]);
  const customerFacing = [home, chrome, contactPage, contactForm, storesPage, partnershipForm, returnsPage, returnForm, details, privacy, cookie, payment].join("\n");
  assert.doesNotMatch(customerFacing, /mailto:/i);
  assert.match(home, /href="\/contact">客户服务/);
  assert.match(home, /\/stores-china#retail-partnership/);
  assert.match(chrome, /href="\/contact">客户服务/);
  assert.match(contactPage, /无需打开邮件客户端/);
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
  assert.match(returnForm, /客服审核后会通过工单与你联系/);
  assert.match(sitemap, /"\/contact"/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS customer_phone/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS customer_wechat/);
  assert.match(schema, /customer_phone TEXT NOT NULL DEFAULT ''/);
  assert.match(schema, /customer_wechat TEXT NOT NULL DEFAULT ''/);
});

test("customer inbox links verified order replies, returns and protected attachments", async () => {
  const [supportAdmin, admin, adminApi, webhook, attachmentApi, returnApi, supportService, email, migration, managementMigration, env] = await Promise.all([
    read("app/admin/SupportAdmin.tsx"),
    read("app/admin/AdminClient.tsx"),
    read("app/api/admin/route.ts"),
    read("app/api/notifications/webhooks/resend/route.ts"),
    read("app/api/admin/support/attachment/route.ts"),
    read("app/api/returns/route.ts"),
    read("lib/support/service.ts"),
    read("lib/notifications/email.ts"),
    read("db/migrations/2026-07-30-support-inbox.sql"),
    read("db/migrations/2026-07-30-support-inbox-management.sql"),
    read(".env.example"),
  ]);
  assert.match(admin, /客服收件箱/);
  assert.match(supportAdmin, /订单 .*order_status/);
  assert.match(supportAdmin, /售后处理记录/);
  assert.match(adminApi, /reply-support-thread/);
  assert.match(adminApi, /open-linked-support-thread/);
  assert.match(adminApi, /manage-support-threads/);
  assert.match(adminApi, /delete-permanent/);
  assert.match(supportAdmin, /收件箱/);
  assert.match(supportAdmin, /已归档/);
  assert.match(supportAdmin, /垃圾箱/);
  assert.match(supportAdmin, /永久删除/);
  assert.match(webhook, /request\.text\(\)/);
  assert.match(webhook, /new Webhook\(secret\)\.verify/);
  assert.match(webhook, /email\.received/);
  assert.match(attachmentApi, /getAdminIdentity/);
  assert.match(attachmentApi, /attachments_json/);
  assert.match(returnApi, /createWebsiteReturnThread/);
  assert.match(supportService, /lower\(email\) = \?/);
  assert.match(supportService, /In-Reply-To/);
  assert.match(supportService, /ensureLinkedSupportThread/);
  assert.match(supportService, /订单 .*建立客户邮件沟通/);
  assert.match(admin, /邮件联系客户/);
  assert.match(admin, /查看并回复/);
  assert.match(email, /reply_to/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS support_threads/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS support_messages/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS return_events/);
  assert.match(managementMigration, /ADD COLUMN IF NOT EXISTS starred/);
  assert.match(managementMigration, /ADD COLUMN IF NOT EXISTS archived_at/);
  assert.match(managementMigration, /ADD COLUMN IF NOT EXISTS deleted_at/);
  assert.match(env, /RESEND_RECEIVING_API_KEY/);
  assert.match(env, /RESEND_INBOUND_DOMAIN/);
});

test("admin workspace uses grouped navigation and responsive branded UI", async () => {
  const [admin, login, css] = await Promise.all([
    read("app/admin/AdminClient.tsx"),
    read("app/admin/login/AdminLoginClient.tsx"),
    read("app/globals.css"),
  ]);
  assert.match(admin, /adminNavGroups/);
  assert.match(admin, /经营/);
  assert.match(admin, /商品与内容/);
  assert.match(admin, /searchPlaceholders/);
  assert.match(admin, /掌握销售、订单、库存和客户服务/);
  assert.match(login, /统一经营工作台/);
  assert.match(login, /客服邮件与售后联动/);
  assert.match(css, /admin-nav-group/);
  assert.match(css, /admin-login-intro/);
  assert.match(css, /admin-loading i/);
});

test("admin governance enforces roles, audits changes and supports safe bulk fulfillment", async () => {
  const [admin, governanceUi, adminApi, permissions, auth, authApi, audit, exportApi, attachmentApi, migration, schema] = await Promise.all([
    read("app/admin/AdminClient.tsx"),
    read("app/admin/AdminGovernance.tsx"),
    read("app/api/admin/route.ts"),
    read("lib/admin-permissions.ts"),
    read("lib/admin-auth.ts"),
    read("app/api/admin/auth/route.ts"),
    read("lib/admin-governance.ts"),
    read("app/api/admin/export/route.ts"),
    read("app/api/admin/support/attachment/route.ts"),
    read("db/migrations/2026-07-30-zz-admin-governance.sql"),
    read("db/railway-postgres.sql"),
  ]);

  assert.match(migration, /CREATE TABLE IF NOT EXISTS admin_users/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS admin_audit_logs/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS admin_users/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS admin_audit_logs/);
  assert.match(auth, /PBKDF2/);
  assert.match(auth, /PASSWORD_ITERATIONS = 210_000/);
  assert.match(auth, /createAdminPasswordHash/);
  assert.match(auth, /verifyAdminCredentials/);
  assert.match(auth, /legacyOwner/);
  assert.match(authApi, /recordAdminAudit/);
  assert.match(adminApi, /adminActionPermissions\[action\]/);
  assert.match(adminApi, /roleCan\(actor\.role, requiredPermission\)/);
  assert.match(adminApi, /currentAdminId|不能降级或停用当前登录账号/);
  assert.match(adminApi, /bulk-update-order-status/);
  assert.match(adminApi, /\.slice\(0, 100\)/);
  assert.match(adminApi, /尚未完成付款，不能批量进入履约状态/);
  assert.match(adminApi, /recordAdminAudit/);
  assert.doesNotMatch(adminApi, /password_hash.*results|password_salt.*results/);
  assert.match(audit, /requestIp\(input\.request\)/);
  assert.match(exportApi, /roleCan\(actor\.role, config\.permission\)/);
  assert.match(attachmentApi, /roleCan\(actor\.role, "support\.read"\)/);
  assert.match(admin, /账号与权限/);
  assert.match(admin, /操作日志/);
  assert.match(admin, /批量更新/);
  assert.match(governanceUi, /操作审计日志/);
  assert.match(governanceUi, /初始密码至少 12 位/);

  const routeActions = new Set([...adminApi.matchAll(/action === "([^"]+)"/g)].map((match) => match[1]));
  const permissionActions = new Set([...permissions.matchAll(/^\s+"([^"]+)": "[^"]+",$/gm)].map((match) => match[1]));
  assert.deepEqual([...routeActions].filter((action) => !permissionActions.has(action)), []);
});

test("invoice workflow, upgraded support desk and business analytics are connected", async () => {
  const [account, accountApi, admin, businessAdmin, supportAdmin, adminApi, migration] = await Promise.all([
    read("app/account/AccountClient.tsx"),
    read("app/api/account/route.ts"),
    read("app/admin/AdminClient.tsx"),
    read("app/admin/BusinessFeaturesAdmin.tsx"),
    read("app/admin/SupportAdmin.tsx"),
    read("app/api/admin/route.ts"),
    read("db/migrations/2026-07-30-workflows-and-analytics.sql"),
  ]);
  assert.match(account, /发票管理/);
  assert.match(account, /下载电子发票/);
  assert.match(accountApi, /request-invoice/);
  assert.match(admin, /经营分析/);
  assert.match(admin, /发票管理/);
  assert.match(businessAdmin, /订单成交率/);
  assert.match(businessAdmin, /热销商品排行/);
  assert.match(supportAdmin, /内部备注/);
  assert.match(supportAdmin, /快捷回复/);
  assert.match(supportAdmin, /处理时限/);
  assert.match(adminApi, /add-support-note/);
  assert.match(adminApi, /update-invoice/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS invoices/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS support_canned_replies/);
  assert.match(migration, /ADD COLUMN IF NOT EXISTS due_at/);
});

test("audit guards member identity, financial transitions and concurrent refunds", async () => {
  const [orders, shipping, accountApi, adminApi, adminUi, paymentApi, paymentService, reservations, returnsApi, exportApi, migration] = await Promise.all([
    read("app/api/orders/route.ts"),
    read("lib/shipping.ts"),
    read("app/api/account/route.ts"),
    read("app/api/admin/route.ts"),
    read("app/admin/AdminClient.tsx"),
    read("app/api/payments/route.ts"),
    read("lib/payments/service.ts"),
    read("lib/orders/reservations.ts"),
    read("app/api/returns/route.ts"),
    read("app/api/admin/export/route.ts"),
    read("db/migrations/2026-07-30-z-audit-integrity.sql"),
  ]);
  assert.doesNotMatch(orders, /ON CONFLICT\(email\) DO UPDATE SET name = excluded\.name, phone = excluded\.phone/);
  assert.match(orders, /const memberId = viewer\?\.memberId \?\? null/);
  assert.doesNotMatch(orders, /INSERT INTO members/);
  assert.doesNotMatch(orders, /SELECT id FROM members WHERE email/);
  assert.match(orders, /validGiftCardSlug/);
  assert.match(shipping, /gift-card-\(1000\|3000\|5000\|10000\)/);
  assert.doesNotMatch(accountApi, /SELECT \* FROM invoices WHERE member_id/);
  assert.match(accountApi, /cache-control.*private, no-store/);
  assert.doesNotMatch(accountApi, /UPDATE members SET name = \?, phone = \?/);
  assert.match(adminApi, /已支付订单不能直接取消/);
  assert.match(adminApi, /该状态由支付与退款系统自动维护/);
  assert.match(adminApi, /WITH refund_totals AS/);
  assert.match(adminApi, /\[api\/admin\] read failed/);
  assert.ok(adminApi.includes(String.raw`/^(https:\/\/|\/(?!\/))/.test(fileUrl)`));
  assert.match(adminUi, /orderStatusOptions/);
  assert.match(paymentApi, /status: 503, headers: \{ "set-cookie": paymentCookie\(orderId, token\)/);
  assert.match(paymentService, /pg_advisory_xact_lock/);
  assert.match(paymentService, /requireChanges\("退款金额超过可退余额"\)/);
  assert.match(reservations, /refreshOrderMemberTotals/);
  assert.match(returnsApi, /该订单当前不符合售后申请条件/);
  assert.match(exportApi, /private, no-store/);
  assert.match(migration, /status NOT IN \('待付款', '支付失败', '已取消', '已退款'\)/);
});
