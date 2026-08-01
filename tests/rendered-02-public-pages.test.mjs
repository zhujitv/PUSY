import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { readSource as read } from "./helpers/read-source.mjs";


test("about page presents an optimized, responsive brand story", async () => {
  const [about, css, heroSource, desktopHero, mobileHero, historyImage] = await Promise.all([
    read("app/about/page.tsx"),
    read("app/about/page.tsx"),
    readFile(new URL("../app/about/AboutHero.tsx", import.meta.url), "utf8"),
    readFile(new URL("../public/assets/about-hero-2026.webp", import.meta.url)),
    readFile(new URL("../public/assets/about-hero-mobile-2026.webp", import.meta.url)),
    readFile(new URL("../public/assets/about-history-2026.webp", import.meta.url)),
  ]);

  assert.match(about, /from "next\/image"/);
  assert.match(about, /export const metadata/);
  assert.match(about, /canonical: "\/about"/);
  assert.match(about, /about-(?:page|shared|hero|principles|history|product-worlds|china-mission)\.module\.css/);
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
  assert.equal((heroSource.match(/\bpriority\b/g) ?? []).length, 1);
  assert.doesNotMatch(about, /unoptimized|loading="eager"/);
  assert.doesNotMatch(about, /src="\/assets\/30\.webp"/);
  assert.match(css, /position: sticky/);
  assert.match(css, /\.about-eyebrow \{[^}]*font-size: var\(--section-eyebrow-size, 14px\);[^}]*white-space: nowrap;/s);
  assert.match(css, /\.about-section-heading h2 \{[^}]*grid-column: span 10;[^}]*font-size: clamp\(42px, 4\.9vw, 78px\);[^}]*white-space: nowrap;/s);
  assert.match(css, /\.chinaCopy h2 \{[^}]*font-size: clamp\(44px, 5\.2vw, 84px\);[^}]*white-space: nowrap;/s);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.about-section-heading h2 \{[^}]*white-space: normal;/s);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.mission h2 \{[^}]*white-space: normal;/s);
  assert.match(css, /\.principles \{\s*padding: clamp\(76px, 8vw, 120px\)/);
  assert.match(css, /\.china \{[^}]*min-height: 600px;/s);
  assert.match(css, /\.mission \{[^}]*padding: clamp\(88px, 9vw, 142px\)/s);
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
  assert.match(css, /\.membership-card-tier h2 \{[^}]*font-size: 48px;/);
  assert.match(css, /\.membership-card-tier p \{[^}]*font-size: 15px;/);
});

test("gift card layout stays compact without title overlap", async () => {
  const css = await read("app/globals.css");

  assert.match(css, /\.gift-page \{[^}]*grid-template-columns: minmax\(0, 1fr\) minmax\(0, 1fr\);[^}]*align-items: stretch;[^}]*min-height: 0;/);
  assert.match(css, /\.gift-visual \{[^}]*height: auto;[^}]*min-height: clamp\(620px, 75vh, 860px\);[^}]*place-items: start center;/);
  assert.match(css, /\.gift-copy > p:first-child \{[^}]*font-size: clamp\(14px, 1\.05vw, 16px\);[^}]*line-height: 1\.4;/);
  assert.match(css, /\.gift-copy h1 \{[^}]*font-size: clamp\(44px, 4\.7vw, 68px\);[^}]*line-height: 1;[^}]*white-space: nowrap;/);
  assert.match(css, /\.gift-visual \{ height: clamp\(330px, 82vw, 420px\); min-height: 0; place-items: center;/);
});

test("storefront keeps mobile discovery and purchasing actions close at hand", async () => {
  const [homepage, homepageClient, catalog, productPage, productActions, chrome, giftCard, css, aboutCss] = await Promise.all([
    read("app/page.tsx"),
    read("app/HomeClient.tsx"),
    read("app/components/CatalogClient.tsx"),
    read("app/products/[slug]/page.tsx"),
    read("app/products/[slug]/ProductActions.tsx"),
    read("app/components/SiteChrome.tsx"),
    read("app/gift-card/page.tsx"),
    read("app/globals.css"),
    read("app/about/page.tsx"),
  ]);

  assert.match(homepage, /function availableFirst/);
  assert.match(homepage, /getPublicProducts\(\)/);
  assert.match(homepage, /featuredProducts=\{availableFirst\(productRows\)\.slice\(0, 8\)\}/);
  assert.match(homepageClient, /home-restock-link/);
  assert.match(catalog, /mobile-catalog-toolbar/);
  assert.match(catalog, /activeFilterLabels/);
  assert.match(catalog, /return bAvailable - aAvailable/);
  assert.match(catalog, />到货提醒<\/a>/);
  assert.ok(productPage.indexOf("<ProductActions") < productPage.indexOf('className="product-notes"'));
  assert.doesNotMatch(productPage, /className="product-desc"/);
  assert.match(productActions, /mobile-purchase-bar/);
  assert.match(productActions, /runPrimaryAction/);
  assert.match(chrome, /header-primary-nav/);
  assert.match(giftCard, /gift-benefits/);
  assert.match(css, /@media \(max-width: 700px\)[\s\S]*\.catalog-filter-panel\.is-open \{ display: grid; \}/);
  assert.match(css, /\.mobile-purchase-bar \{ position: fixed;/);
  assert.match(aboutCss, /height: clamp\(400px, 38vw, 560px\)/);
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
