"use client";
import { CatalogClient } from "../components/CatalogClient";
import { PageShell } from "../components/SiteChrome";
import { useStore } from "../components/StoreProvider";
import { products } from "../data/products";
export default function WishlistPage() { const { wishlist } = useStore(); const selected = products.filter((product) => wishlist.includes(product.slug)); return <PageShell><main className="catalog-page"><div className="catalog-title"><p>首页 / 收藏</p><h1>我的收藏</h1></div>{wishlist.length ? <CatalogClient initialProducts={selected} slugFilter={wishlist} /> : <section className="large-empty"><h2>还没有收藏商品</h2><p>点击商品旁边的爱心，就能在这里快速找到它。</p><a className="primary-link" href="/catalog/products">浏览全部商品</a></section>}</main></PageShell>; }
