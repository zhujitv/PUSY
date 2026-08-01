import type { Metadata } from "next";
import { getSiteContent, siteContentDefaults, type SiteContentSnapshot } from "../db/commerce-features";
import { getPublicProductCategories } from "../db/product-categories";
import { getPublicProducts } from "../db/public-products";
import { FREE_STANDARD_SHIPPING_THRESHOLD } from "../lib/shipping";
import HomeClient from "./HomeClient";
import { fallbackNavigationCategories, type NavigationCategory } from "./data/navigation";
import { formatCnyFromRub, products, type Product } from "./data/products";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: { canonical: "https://pusy.cn/" },
  openGraph: { url: "https://pusy.cn/" },
};

const previousDefaultAnnouncements = new Set(["订单满 600.00 元免费配送", "订单满 600.00 元 免费配送", "订单满 600 元 免费配送"]);
const defaultAnnouncement = `实体商品满 ${formatCnyFromRub(FREE_STANDARD_SHIPPING_THRESHOLD)} 免标准快递费`;

function availableFirst(items: Product[]) {
  return [...items].sort((a, b) => Number(Boolean(b.inventoryVerified && (b.stock ?? 0) > 0)) - Number(Boolean(a.inventoryVerified && (a.stock ?? 0) > 0)));
}

function normalizeHomeContent(content: SiteContentSnapshot) {
  return previousDefaultAnnouncements.has(content.announcement)
    ? { ...content, announcement: defaultAnnouncement }
    : content;
}

export default async function Home() {
  const [content, categoryRows, productRows] = await Promise.all([
    getSiteContent().catch(() => ({ ...siteContentDefaults } as SiteContentSnapshot)),
    getPublicProductCategories().catch(() => fallbackNavigationCategories),
    getPublicProducts().catch(() => products),
  ]);
  return <HomeClient
    homeContent={normalizeHomeContent(content)}
    featuredProducts={availableFirst(productRows).slice(0, 8)}
    navigationCategories={categoryRows as NavigationCategory[]}
  />;
}
