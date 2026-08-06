"use client";

import { useEffect, useMemo, useState } from "react";
import type { Product } from "../data/products";
import { formatCnyFromRub, productDetailHref } from "../data/products";
import { useStore } from "./StoreProvider";
import { ProductCardMedia } from "./ProductCardMedia";

export function CatalogClient({ initialProducts, categoryFilter, slugFilter, searchQuery }: { initialProducts: Product[]; categoryFilter?: string; slugFilter?: string[]; searchQuery?: string }) {
  const [sourceProducts, setSourceProducts] = useState(initialProducts);
  const [sort, setSort] = useState("popular");
  const [category, setCategory] = useState("全部");
  const [badge, setBadge] = useState("全部");
  const [inStock, setInStock] = useState(false);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [localQuery, setLocalQuery] = useState(searchQuery ?? "");
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { addToCart, toggleWishlist, isWishlisted } = useStore();
  const slugKey = slugFilter?.join("|") ?? "";
  const hasSlugFilter = slugFilter !== undefined;

  useEffect(() => {
    fetch("/api/products", { cache: "no-store" }).then((response) => response.ok ? response.json() : null).then((body) => {
      if (!body?.products) return;
      let next = body.products as Product[];
      if (categoryFilter) next = next.filter((product) => product.category === categoryFilter);
      if (hasSlugFilter) next = next.filter((product) => slugKey.split("|").filter(Boolean).includes(product.slug));
      if (searchQuery) { const query = searchQuery.toLowerCase(); next = next.filter((product) => `${product.name} ${product.category} ${product.description} ${product.sku ?? ""}`.toLowerCase().includes(query)); }
      setSourceProducts(next);
    }).catch(() => {});
  }, [categoryFilter, hasSlugFilter, slugKey, searchQuery]);

  const categories = ["全部", ...Array.from(new Set(sourceProducts.map((product) => product.category)))];
  const badges = ["全部", ...Array.from(new Set(sourceProducts.map((product) => product.badge).filter(Boolean) as string[]))];
  const filtered = useMemo(() => {
    const query = localQuery.trim().toLowerCase();
    const minimum = minPrice === "" ? 0 : Number(minPrice);
    const maximum = maxPrice === "" ? Number.POSITIVE_INFINITY : Number(maxPrice);
    return [...sourceProducts]
      .filter((product) => category === "全部" || product.category === category)
      .filter((product) => badge === "全部" || product.badge === badge)
      .filter((product) => !inStock || Boolean(product.inventoryVerified && (product.stock ?? 0) > 0))
      .filter((product) => { const yuan = product.price * 0.12; return yuan >= minimum && yuan <= maximum; })
      .filter((product) => !query || `${product.name} ${product.category} ${product.description} ${product.sku ?? ""}`.toLowerCase().includes(query))
      .sort((a, b) => {
        if (sort === "low") return a.price - b.price;
        if (sort === "high") return b.price - a.price;
        if (sort === "new") return Number(b.badge === "新品") - Number(a.badge === "新品");
        const aAvailable = Number(Boolean(a.inventoryVerified && (a.stock ?? 0) > 0));
        const bAvailable = Number(Boolean(b.inventoryVerified && (b.stock ?? 0) > 0));
        return bAvailable - aAvailable;
      });
  }, [sourceProducts, category, badge, inStock, minPrice, maxPrice, localQuery, sort]);
  const pageSize = 12;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  const filtersActive = category !== "全部" || badge !== "全部" || inStock || minPrice || maxPrice || localQuery.trim();
  const activeFilterLabels = [category !== "全部" ? category : "", badge !== "全部" ? badge : "", inStock ? "只看有货" : "", minPrice ? `最低 ¥${minPrice}` : "", maxPrice ? `最高 ¥${maxPrice}` : "", localQuery.trim() ? `搜索：${localQuery.trim()}` : ""].filter(Boolean);
  function resetFilters() { setCategory("全部"); setBadge("全部"); setInStock(false); setMinPrice(""); setMaxPrice(""); setLocalQuery(searchQuery ?? ""); setSort("popular"); setPage(1); setFiltersOpen(false); }

  return <>
    <div className="mobile-catalog-toolbar">
      <button type="button" aria-expanded={filtersOpen} aria-controls="catalog-filters" onClick={() => setFiltersOpen((current) => !current)}>筛选与排序{activeFilterLabels.length ? ` · ${activeFilterLabels.length}` : ""}<span aria-hidden="true">{filtersOpen ? "−" : "+"}</span></button>
      <span>{filtered.length} 件商品</span>
    </div>
    <section id="catalog-filters" className={`catalog-filter-panel ${filtersOpen ? "is-open" : ""}`}>
      <label className="catalog-query">搜索商品<input value={localQuery} onChange={(event) => { setLocalQuery(event.target.value); setPage(1); }} placeholder="名称、品类、功效或商品编号" /></label>
      <label>分类<select value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }}>{categories.map((item) => <option value={item} key={item}>{item}</option>)}</select></label>
      <label>商品标签<select value={badge} onChange={(event) => { setBadge(event.target.value); setPage(1); }}>{badges.map((item) => <option value={item} key={item}>{item}</option>)}</select></label>
      <label>最低价（元）<input type="number" min="0" value={minPrice} onChange={(event) => { setMinPrice(event.target.value); setPage(1); }} placeholder="0" /></label>
      <label>最高价（元）<input type="number" min="0" value={maxPrice} onChange={(event) => { setMaxPrice(event.target.value); setPage(1); }} placeholder="不限" /></label>
      <label>排序<select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }}><option value="popular">推荐排序</option><option value="new">新品优先</option><option value="low">价格从低到高</option><option value="high">价格从高到低</option></select></label>
      <label className="stock-filter"><input type="checkbox" checked={inStock} onChange={(event) => { setInStock(event.target.checked); setPage(1); }} />只看有货</label>
      {filtersActive && <button type="button" className="filter-reset" onClick={resetFilters}>清除筛选</button>}
    </section>
    {activeFilterLabels.length > 0 && <div className="active-filter-chips" aria-label="当前筛选条件">{activeFilterLabels.map((label) => <span key={label}>{label}</span>)}<button type="button" onClick={resetFilters}>全部清除</button></div>}
    <div className="catalog-tools"><span>找到 {filtered.length} 件商品</span><small>{filtersActive ? "已按当前条件筛选" : "可组合使用多个筛选条件"}</small></div>
    {visible.length ? <div className="catalog-grid">
      {visible.map((product) => <article className="catalog-card product-hover-trigger" key={product.slug}>
        <a href={productDetailHref(product)} className="catalog-image">{product.badge && <span className="badge">{product.badge}</span>}<ProductCardMedia product={product} sizes="(max-width: 700px) 50vw, 25vw" /></a><button className={`wishlist-button ${isWishlisted(product.slug) ? "active" : ""}`} onClick={() => toggleWishlist(product.slug)} aria-label={isWishlisted(product.slug) ? "取消收藏" : "收藏商品"}>♡</button>
        <div className="catalog-card-copy"><a href={productDetailHref(product)}>{product.name}</a><p>{formatCnyFromRub(product.price)} {product.oldPrice && <del>{formatCnyFromRub(product.oldPrice)}</del>}</p>{product.inventoryVerified && (product.stock ?? 0) > 0 ? <><small className="inventory-label available">有货 · {product.stock} 件</small><button onClick={() => addToCart(product)}>加入购物袋</button></> : <a className="restock-link" href={productDetailHref(product)}>到货提醒</a>}</div>
      </article>)}
    </div> : <section className="large-empty"><h2>没有找到相关商品</h2><p>请减少筛选条件，或尝试其他关键词。</p><button className="primary-link" onClick={resetFilters}>清除全部筛选</button></section>}
    {pageCount > 1 && <nav className="pagination" aria-label="商品分页">{Array.from({ length: pageCount }, (_, index) => index + 1).map((item) => <button className={page === item ? "active" : ""} onClick={() => { setPage(item); window.scrollTo({ top: 260, behavior: "smooth" }); }} key={item}>{item}</button>)}</nav>}
  </>;
}
