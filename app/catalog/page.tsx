import { CatalogClient } from "../components/CatalogClient";
import { PageShell } from "../components/SiteChrome";
import { products } from "../data/products";
import { publicPageMetadata } from "../../lib/site-metadata";
export const metadata = publicPageMetadata("/catalog", "全部商品｜PÚSY 中国官方网站", "浏览 PÚSY 中国官方网站的彩妆、护肤、身体护理、头发护理和家居产品。");
export default function CatalogIndex() { return <PageShell><main className="catalog-page"><div className="catalog-title"><p>首页 / 商品目录</p><h1>全部商品</h1></div><CatalogClient initialProducts={products} /></main></PageShell>; }
