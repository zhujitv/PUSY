"use client";

import { useMemo, useState } from "react";
import type { Product } from "../data/products";

export function CatalogClient({ initialProducts }: { initialProducts: Product[] }) {
  const [sort, setSort] = useState("popular");
  const [added, setAdded] = useState<Record<string, boolean>>({});
  const sorted = useMemo(() => [...initialProducts].sort((a, b) => sort === "low" ? a.price - b.price : sort === "high" ? b.price - a.price : 0), [initialProducts, sort]);

  return <>
    <div className="catalog-tools"><span>{sorted.length} 件商品</span><label>排序 <select value={sort} onChange={(e) => setSort(e.target.value)}><option value="popular">按人气</option><option value="low">价格从低到高</option><option value="high">价格从高到低</option></select></label></div>
    <div className="catalog-grid">
      {sorted.map((product) => <article className="catalog-card" key={product.slug}>
        <a href={`/products/${product.slug}`} className="catalog-image">{product.badge && <span className="badge">{product.badge}</span>}<img src={product.image} alt={product.name} /></a>
        <div className="catalog-card-copy"><a href={`/products/${product.slug}`}>{product.name}</a><p>{product.price.toLocaleString("ru-RU")} ₽ {product.oldPrice && <del>{product.oldPrice.toLocaleString("ru-RU")} ₽</del>}</p><button onClick={() => setAdded((current) => ({ ...current, [product.slug]: true }))}>{added[product.slug] ? "已加入" : "加入购物袋"}</button></div>
      </article>)}
    </div>
  </>;
}
