import { PageShell } from "../../components/SiteChrome";
import { formatCnyFromRub, getProduct, products } from "../../data/products";
import { ProductActions } from "./ProductActions";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = getProduct(slug);
  const related = products.filter((p) => p.slug !== product.slug).slice(0, 4);
  return <PageShell><main className="product-page"><div className="product-gallery"><img src={product.image} alt={product.name} /><img src={product.imageAlt ?? product.image} alt={`${product.name} 使用展示`} /></div><section className="product-info"><p className="breadcrumbs">首页 / {product.category}</p>{product.badge && <span className="product-new">{product.badge}</span>}<h1>{product.name}</h1><p className="product-price">{formatCnyFromRub(product.price)} {product.oldPrice && <del>{formatCnyFromRub(product.oldPrice)}</del>}</p><p className="product-desc">{product.description}</p><ProductActions /><div className="product-notes"><details open><summary>产品说明</summary><p>{product.description} 产品经过严格质量控制，包装简洁，适合日常使用。</p></details><details><summary>使用方法</summary><p>取适量产品，按照日常护理或上妆步骤均匀使用。首次使用前建议进行局部测试。</p></details><details><summary>配送与退换</summary><p>订单付款后 96 小时内完成处理。未拆封并保留完整包装的商品可按退换货政策申请处理。</p></details></div></section></main><section className="related"><h2>你可能也喜欢</h2><div>{related.map((item) => <a href={`/products/${item.slug}`} key={item.slug}><img src={item.image} alt={item.name} /><span>{item.name}</span><b>{formatCnyFromRub(item.price)}</b></a>)}</div></section></PageShell>;
}
