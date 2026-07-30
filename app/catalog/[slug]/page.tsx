import { CatalogClient } from "../../components/CatalogClient";
import { PageShell } from "../../components/SiteChrome";
import { categoryNames, products } from "../../data/products";
import { fallbackNavigationCategories } from "../../data/navigation";
import { getPublicProductCategories } from "../../../db/product-categories";
import type { Metadata } from "next";
import { cache } from "react";

const loadCategories = cache(async () => {
  try { return await getPublicProductCategories(); } catch { return fallbackNavigationCategories; }
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const categories = await loadCategories();
  const title = categories.find((category) => category.slug === slug)?.name ?? categoryNames[slug] ?? "商品目录";
  return { title: `${title}｜PÚSY 中国官方网站`, description: `浏览 PÚSY ${title}商品，人民币结算，支持中国配送与售后服务。`, alternates: { canonical: `/catalog/${slug}` } };
}

export default async function CatalogPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const categories = await loadCategories();
  const managedCategory = categories.find((category) => category.slug === slug);
  const title = managedCategory?.name ?? categoryNames[slug] ?? "全部商品";
  const filters: Record<string, string> = { accessories: "配件", brows: "眉妆", face: "护肤", makiyazh: "彩妆", uhod: "护肤", "uhod-1": "身体护理", hair: "头发护理", "dlya-doma": "家居", nabory: "套装", "sekretnye-boksy": "神秘礼盒" };
  const categoryFilter = managedCategory?.name ?? filters[slug];
  const selected = slug === "hity" ? products.filter((product) => product.badge === "畅销") : categoryFilter ? products.filter((product) => product.category === categoryFilter) : products;
  const categoryLinks = [{ slug: "products", name: "全部商品" }, ...categories.map((category) => ({ slug: category.slug, name: category.parent_name ? `${category.parent_name} / ${category.name}` : category.name }))];
  return <PageShell><main className="catalog-page"><div className="catalog-title"><p>首页 / 商品目录</p><h1>{title}</h1></div><div className="category-pills">{categoryLinks.map((category) => <a className={category.slug === slug ? "active" : ""} href={`/catalog/${category.slug}`} key={category.slug}>{category.name}</a>)}</div><CatalogClient initialProducts={selected} categoryFilter={categoryFilter} /></main></PageShell>;
}
