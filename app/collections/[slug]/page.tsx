import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogClient } from "../../components/CatalogClient";
import { PageShell } from "../../components/SiteChrome";
import { collectionNames, productsForCollection } from "../../data/products";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const title = collectionNames[slug];
  return title ? { title: `${title}｜PÚSY 中国官方网站`, description: `选购 PÚSY ${title}，人民币结算，支持中国配送与售后服务。`, alternates: { canonical: `/collections/${slug}` } } : {};
}

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const title = collectionNames[slug];
  if (!title) notFound();
  const selected = productsForCollection(slug);
  return <PageShell><main className="catalog-page"><div className="catalog-title"><p>首页 / 商品系列</p><h1>{title}</h1></div><div className="category-pills">{Object.entries(collectionNames).slice(0, 12).map(([key, value]) => <a className={key === slug ? "active" : ""} href={`/collections/${key}`} key={key}>{value}</a>)}</div><CatalogClient initialProducts={selected} slugFilter={selected.map((product) => product.slug)} /></main></PageShell>;
}
