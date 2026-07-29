"use client";
import { useState } from "react";
import type { Product } from "../../data/products";
import { useStore } from "../../components/StoreProvider";
export function ProductActions({ product }: { product: Product }) {
  const [count, setCount] = useState(1);
  const { addToCart, toggleWishlist, isWishlisted } = useStore();
  const purchasable = Boolean(product.inventoryVerified && (product.stock ?? 0) > 0);
  const maxQuantity = Math.max(1, product.stock ?? 1);
  const actionLabel = !product.inventoryVerified || (product.stock ?? 0) < 1 ? "暂时缺货" : "加入购物袋";
  return <><div className="product-actions"><div className="quantity"><button disabled={!purchasable || count <= 1} onClick={() => setCount(Math.max(1, count - 1))} aria-label="减少数量">−</button><span>{count}</span><button disabled={!purchasable || count >= maxQuantity} onClick={() => setCount(Math.min(maxQuantity, count + 1))} aria-label="增加数量">+</button></div><button className="add-main" disabled={!purchasable} onClick={() => addToCart(product, count)}>{actionLabel}</button></div><button className={`product-wishlist ${isWishlisted(product.slug) ? "active" : ""}`} onClick={() => toggleWishlist(product.slug)}>♡ {isWishlisted(product.slug) ? "已收藏" : "加入收藏"}</button></>;
}
