"use client";

import { useEffect, useMemo, useState } from "react";
import type { Product } from "../data/products";
import { formatCnyFromRub } from "../data/products";
import { useStore } from "./StoreProvider";

export function CatalogClient({ initialProducts, categoryFilter, slugFilter, searchQuery }: { initialProducts: Product[]; categoryFilter?: string; slugFilter?: string[]; searchQuery?: string }) {
  const [sourceProducts, setSourceProducts] = useState(initialProducts);
  const [sort, setSort] = useState("popular");
  const [category, setCategory] = useState("全部");
  const [page, setPage] = useState(1);
  const { addToCart, toggleWishlist, isWishlisted } = useStore();
  const slugKey = slugFilter?.join("|") ?? "";
  const hasSlugFilter = slugFilter !== undefined;
  useEffect(() => { fetch("/api/products", { cache: "no-store" }).then((response) => response.ok ? response.json() : null).then((body) => { if (body?.products) { let next = body.products as Product[]; if (categoryFilter) next = next.filter((product) => product.category === categoryFilter); if (hasSlugFilter) next = next.filter((product) => slugKey.split("|").filter(Boolean).includes(product.slug)); if (searchQuery) { const query = searchQuery.toLowerCase(); next = next.filter((product) => `${product.name} ${product.category} ${product.description}`.toLowerCase().includes(query)); } setSourceProducts(next); } }).catch(() => {}); }, [categoryFilter, hasSlugFilter, slugKey, searchQuery]);
  const categories = ["全部", ...Array.from(new Set(sourceProducts.map((product) => product.category)))];
  const sorted = useMemo(() => [...sourceProducts]
    .filter((product) => category === "全部" || product.category === category)
    .sort((a, b) => sort === "low" ? a.price - b.price : sort === "high" ? b.price - a.price : 0), [sourceProducts, sort, category]);
  const pageSize = 8;
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const visible = sorted.slice((page - 1) * pageSize, page * pageSize);

  return <>
    <div className="catalog-tools"><span>{sorted.length} 件商品</span><div><label>筛选 <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>{categories.map((item) => <option value={item} key={item}>{item}</option>)}</select></label><label>排序 <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }}><option value="popular">按人气</option><option value="low">价格从低到高</option><option value="high">价格从高到低</option></select></label></div></div>
    {visible.length ? <div className="catalog-grid">
      {visible.map((product) => <article className="catalog-card" key={product.slug}>
        <a href={`/products/${product.slug}`} className="catalog-image">{product.badge && <span className="badge">{product.badge}</span>}<img src={product.image} alt={product.name} loading="lazy" decoding="async" /></a><button className={`wishlist-button ${isWishlisted(product.slug) ? "active" : ""}`} onClick={() => toggleWishlist(product.slug)} aria-label={isWishlisted(product.slug) ? "取消收藏" : "收藏商品"}>♡</button>
        <div className="catalog-card-copy"><a href={`/products/${product.slug}`}>{product.name}</a><p>{formatCnyFromRub(product.price)} {product.oldPrice && <del>{formatCnyFromRub(product.oldPrice)}</del>}</p><small className={`inventory-label ${product.inventoryVerified && (product.stock ?? 0) > 0 ? "available" : ""}`}>{product.inventoryVerified && (product.stock ?? 0) > 0 ? `有货 · ${product.stock} 件` : "暂时缺货"}</small><button disabled={!product.inventoryVerified || (product.stock ?? 0) < 1} onClick={() => addToCart(product)}>{!product.inventoryVerified || (product.stock ?? 0) < 1 ? "暂时缺货" : "加入购物袋"}</button></div>
      </article>)}
    </div> : <section className="large-empty"><h2>没有找到相关商品</h2><p>请更换筛选条件或搜索关键词。</p></section>}
    {pageCount > 1 && <nav className="pagination" aria-label="商品分页">{Array.from({ length: pageCount }, (_, index) => index + 1).map((item) => <button className={page === item ? "active" : ""} onClick={() => { setPage(item); window.scrollTo({ top: 260, behavior: "smooth" }); }} key={item}>{item}</button>)}</nav>}
  </>;
}
