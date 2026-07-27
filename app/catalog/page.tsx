import { CatalogClient } from "../components/CatalogClient";
import { PageShell } from "../components/SiteChrome";
import { products } from "../data/products";
export default function CatalogIndex() { return <PageShell><main className="catalog-page"><div className="catalog-title"><p>首页 / 商品目录</p><h1>全部商品</h1></div><CatalogClient initialProducts={products} /></main></PageShell>; }
