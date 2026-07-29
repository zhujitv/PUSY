import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageShell } from "../../components/SiteChrome";
import { formatCnyFromRub, products, type Product, type ProductVariantGroup } from "../../data/products";
import { ProductActions } from "./ProductActions";
import { getStoreDb, type DbProduct } from "../../../db/store";

const siteUrl = "https://pusy.cn";

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  try { return value ? JSON.parse(value) as T : fallback; } catch { return fallback; }
}

function productFromRow(row: DbProduct): Product {
  const images = parseJson<string[]>(row.images_json, []);
  return {
    slug: row.slug,
    name: row.name,
    category: row.category,
    description: row.description,
    image: row.image,
    imageAlt: row.image_alt ?? undefined,
    images: images.length ? images : [row.image],
    badge: row.badge ?? undefined,
    price: row.price,
    oldPrice: row.old_price ?? undefined,
    stock: row.stock,
    inventoryVerified: Boolean(row.inventory_verified),
    variants: parseJson<ProductVariantGroup[]>(row.variants_json, []),
    sku: row.sku ?? undefined,
    volume: row.volume ?? undefined,
    ingredients: row.ingredients ?? undefined,
    usage: row.usage ?? undefined,
  };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = products.find((item) => item.slug === slug);
  if (!product) return { title: "商品未找到 | PUSY.CN" };
  const description = product.description.slice(0, 150);
  return {
    title: `${product.name} | PUSY.CN`,
    description,
    alternates: { canonical: `${siteUrl}/products/${product.slug}` },
    openGraph: { title: product.name, description, url: `${siteUrl}/products/${product.slug}`, images: [{ url: product.image }] },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const catalogProduct = products.find((item) => item.slug === slug);
  if (!catalogProduct) notFound();
  let product: Product = catalogProduct;
  try {
    const db = await getStoreDb();
    const row = await db.prepare("SELECT * FROM products WHERE slug = ? LIMIT 1").bind(slug).first<DbProduct>();
    if (row) product = productFromRow(row);
  } catch {}

  const gallery = Array.from(new Set([product.image, ...(product.images ?? []), product.imageAlt].filter(Boolean))) as string[];
  const related = products.filter((item) => item.slug !== product.slug && item.category === product.category).slice(0, 4);
  const inventoryText = product.inventoryVerified && (product.stock ?? 0) > 0 ? `有货 · ${product.stock} 件` : "暂时缺货";

  return <PageShell>
    <main className="product-page">
      <div className="product-gallery">{gallery.slice(0, 6).map((image, index) => <img src={image} alt={index === 0 ? product.name : `${product.name} 商品图 ${index + 1}`} key={`${image}-${index}`} loading={index === 0 ? "eager" : "lazy"} fetchPriority={index === 0 ? "high" : "auto"} decoding="async" />)}</div>
      <section className="product-info">
        <p className="breadcrumbs"><a href="/">首页</a> / <a href="/catalog/products">{product.category}</a></p>
        {product.badge && <span className="product-new">{product.badge}</span>}
        <h1>{product.name}</h1>
        <p className="product-price">{formatCnyFromRub(product.price)} {product.oldPrice && <del>{formatCnyFromRub(product.oldPrice)}</del>}</p>
        <p className={`product-inventory ${product.inventoryVerified && (product.stock ?? 0) > 0 ? "available" : ""}`}>{inventoryText}</p>
        {(product.sku || product.volume) && <dl className="product-specs">{product.sku && <><dt>商品编号</dt><dd>{product.sku}</dd></>}{product.volume && <><dt>规格容量</dt><dd>{product.volume}</dd></>}</dl>}
        <p className="product-desc">{product.description}</p>
        {product.variants?.map((group) => <section className="product-variants" key={group.name}><h2>{group.name}</h2><div>{group.options.map((option) => option.slug ? <a className={option.slug === product.slug ? "active" : ""} href={`/products/${option.slug}`} key={`${option.label}-${option.slug}`}>{option.color && <i style={{ backgroundColor: option.color }} />}{option.label}</a> : <span key={option.label}>{option.color && <i style={{ backgroundColor: option.color }} />}{option.label}</span>)}</div></section>)}
        <ProductActions product={product} />
        <div className="product-notes">
          <details open><summary>产品说明</summary><p>{product.description}</p></details>
          <details><summary>成分</summary><p>{product.ingredients || "产品成分以中国实物包装标注为准。敏感肌肤首次使用前请先进行局部测试，如有不适请停止使用。"}</p></details>
          <details><summary>使用方法</summary><p>{product.usage || "取适量产品，按照日常护理或上妆步骤均匀使用。首次使用前建议进行局部测试。"}</p></details>
          <details><summary>配送与退换</summary><p>现货订单通常在付款后 1–3 个工作日内处理。退换条件、例外商品与申请方式以<a href="/return">中国退换货政策</a>为准。</p></details>
        </div>
      </section>
    </main>
    {related.length > 0 && <section className="related"><h2>你可能也喜欢</h2><div>{related.map((item) => <a href={`/products/${item.slug}`} key={item.slug}><img src={item.image} alt={item.name} loading="lazy" decoding="async" /><span>{item.name}</span><b>{formatCnyFromRub(item.price)}</b></a>)}</div></section>}
  </PageShell>;
}
