import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import test from "node:test";
import { readSource as read } from "./helpers/read-source.mjs";


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
  const [catalogJson, translationsJson, currentTranslationsJson, catalogMigration, productPage, productActions, catalogClient, orderApi, sitemap, mobileCss, nextConfig, imageFiles] = await Promise.all([
    read("app/data/products.generated.json"),
    read("scripts/catalog-translations.zh-CN.json"),
    read("scripts/catalog-translations.2026-08-29.zh-CN.json"),
    read("db/migrations/2026-08-29-catalog-sync.sql"),
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
  const currentTranslations = JSON.parse(currentTranslationsJson);
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
    if (!product) continue;
    for (const field of ["name", "category", "description", "usage", "volume"]) {
      if (Object.hasOwn(override, field)) {
        assert.equal(product[field], override[field] ?? undefined, `${slug}.${field} must use the curated translation`);
      }
    }
  }
  for (const [slug, override] of Object.entries(currentTranslations.products)) {
    const product = bySlug.get(slug);
    assert.ok(product, `Current translation references an unknown product: ${slug}`);
    const inherited = translations.products[currentTranslations.aliases?.[slug]] ?? {};
    for (const [field, value] of Object.entries({ ...inherited, ...override })) {
      if (["name", "category", "description", "usage", "volume"].includes(field)) {
        assert.equal(product[field], value ?? undefined, `${slug}.${field} must use the current curated translation`);
      }
    }
  }
  for (const product of products) assert.match(catalogMigration, new RegExp(`'${product.slug}'`));
  assert.doesNotMatch(catalogMigration, /\b(?:TRUE|FALSE)\b/, "PostgreSQL inventory flags must use integer 0/1 values");
  const conflictUpdate = catalogMigration.split("ON CONFLICT (slug) DO UPDATE SET")[1];
  assert.doesNotMatch(conflictUpdate, /\b(?:stock|inventory_verified)\s*=/);
  const berryTint = bySlug.get("glyancevyiy-tint-dlya-gub-berry-glaze-vinnyiy-100844");
  assert.equal(berryTint?.name, "Berry Glaze 镜面唇釉");
  assert.equal(berryTint?.variants?.[0]?.name, "色号");
  assert.equal(berryTint?.variants?.[0]?.options.find((option) => option.slug === berryTint.slug)?.label, "酒红色");
  assert.ok(!bySlug.has("karandash-dlya-gub-pusy-strawberry-100464"));
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
  assert.match(catalogMigration, /updated_at = CURRENT_TIMESTAMP/);
  assert.match(catalogMigration, /variants_json = EXCLUDED\.variants_json/);
  assert.match(productPage, /generateMetadata/);
  assert.match(productPage, /product\.variants/);
  assert.match(productActions, /inventoryVerified/);
  assert.doesNotMatch(catalogClient, /中国仓|原站库存|原站快照/);
  assert.match(orderApi, /inventory_verified/);
  assert.match(orderApi, /礼品卡面额无效或商品不存在/);
  assert.match(orderApi, /已下架/);
  assert.match(sitemap, /collectionNames/);
  assert.match(mobileCss, /\.hero \{ height: auto; min-height: 0; aspect-ratio: 4 \/ 3/);
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
  assert.match(homepage, /hero-2026-08-lip-tint-desktop\.webp/);
  assert.match(homepage, /hero-2026-08-lip-tint-mobile\.webp/);
  assert.match(homepage, /hero-2026-08-school-desktop\.webp/);
  assert.match(homepage, /hero-2026-08-blush-desktop\.webp/);
  assert.match(homepage, /preload=\{index === 0\}/);
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
