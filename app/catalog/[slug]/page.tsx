import { CatalogClient } from "../../components/CatalogClient";
import { PageShell } from "../../components/SiteChrome";
import { categoryNames, products } from "../../data/products";

export default async function CatalogPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const title = categoryNames[slug] ?? "全部商品";
  const filters: Record<string, string> = { brows: "眉妆", makiyazh: "彩妆", uhod: "护肤", hair: "头发护理", "dlya-doma": "家居", nabory: "套装", "sekretnye-boksy": "神秘礼盒" };
  const selected = filters[slug] ? products.filter((p) => p.category === filters[slug]) : products;
  return <PageShell><main className="catalog-page"><div className="catalog-title"><p>首页 / 商品目录</p><h1>{title}</h1></div><div className="category-pills">{Object.entries(categoryNames).slice(0, 12).map(([key, value]) => <a className={key === slug ? "active" : ""} href={`/catalog/${key}`} key={key}>{value}</a>)}</div><CatalogClient initialProducts={selected.length ? selected : products} /></main></PageShell>;
}
