"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { PageShell } from "../components/SiteChrome";
import { ProductCardMedia } from "../components/ProductCardMedia";
import { useStore } from "../components/StoreProvider";
import { formatCnyFromRub, getProduct, productDetailHref, products, type Product } from "../data/products";
import { calculateShippingFee, FREE_STANDARD_SHIPPING_THRESHOLD, STANDARD_DELIVERY } from "../../lib/shipping";

export default function CartPage() {
  const [recommendationSource, setRecommendationSource] = useState<Product[]>(products);
  const { cart, subtotal, physicalSubtotal, requiresShipping, updateQuantity, removeFromCart, clearCart, toggleWishlist, isWishlisted, addToCart } = useStore();
  const delivery = calculateShippingFee(STANDARD_DELIVERY, physicalSubtotal);
  const remaining = Math.max(0, FREE_STANDARD_SHIPPING_THRESHOLD - physicalSubtotal);
  const progress = Math.min(100, physicalSubtotal / FREE_STANDARD_SHIPPING_THRESHOLD * 100);
  const recommendations = recommendationSource.filter((product) => product.inventoryVerified && (product.stock ?? 0) > 0 && !cart.some((line) => line.slug === product.slug)).slice(0, 4);
  useEffect(() => { fetch("/api/products", { cache: "no-store" }).then((response) => response.ok ? response.json() : null).then((body) => { if (body?.products) setRecommendationSource(body.products); }).catch(() => {}); }, []);

  return <PageShell><main className="commerce-page"><header><p>首页 / 购物袋</p><h1>购物袋</h1></header>{cart.length === 0 ? <section className="large-empty"><h2>购物袋还是空的</h2><p>去看看 PÚSY 的新品与畅销单品。</p><a className="primary-link" href="/catalog/products">浏览全部商品</a></section> : <>
    {requiresShipping ? <section className="shipping-progress"><div><b>{remaining ? `实体商品再选 ${formatCnyFromRub(remaining)}，即可免标准快递费` : "实体商品已享受标准快递免费"}</b><span>{Math.round(progress)}%</span></div><i><span style={{ width: `${progress}%` }} /></i></section> : <section className="shipping-progress shipping-progress--digital"><div><b>电子礼品卡通过邮箱发送，免配送费</b><span>0 元</span></div></section>}
    <div className="cart-page-grid"><section className="cart-page-lines"><div className="cart-lines-heading"><span>{cart.length} 种商品</span><button onClick={clearCart}>清空购物袋</button></div>{cart.map((line) => { const product = line.product ?? getProduct(line.slug); const max = Math.max(1, product.stock ?? line.quantity); return <article key={line.slug}><a href={productDetailHref(product)}><Image src={product.image} alt={product.name} width={220} height={230} sizes="(max-width: 700px) 35vw, 220px" /></a><div><p>{product.category}</p><a href={productDetailHref(product)}><h2>{product.name}</h2></a><small className="cart-stock">{product.inventoryVerified ? `库存 ${product.stock ?? 0} 件` : "库存待核验"}</small><b>{formatCnyFromRub(product.price * line.quantity)}</b><div className="line-controls"><div className="mini-quantity"><button onClick={() => updateQuantity(line.slug, line.quantity - 1)} aria-label="减少数量">−</button><span>{line.quantity}</span><button disabled={line.quantity >= max} onClick={() => updateQuantity(line.slug, line.quantity + 1)} aria-label="增加数量">+</button></div><button className="remove-line" onClick={() => { if (!isWishlisted(line.slug)) toggleWishlist(line.slug); removeFromCart(line.slug); }}>移入收藏</button><button className="remove-line" onClick={() => removeFromCart(line.slug)}>删除</button></div></div></article>; })}</section><aside className="order-summary"><h2>订单摘要</h2><p><span>商品小计</span><b>{formatCnyFromRub(subtotal)}</b></p><p><span>配送</span><b>{delivery ? formatCnyFromRub(delivery) : "免费"}</b></p><p className="summary-total"><span>合计</span><b>{formatCnyFromRub(subtotal + delivery)}</b></p><a className="primary-link" href="/checkout">去结账</a><small>{requiresShipping ? "最终配送方式、价格与库存将在提交订单时再次确认。" : "电子礼品卡将在支付完成后按填写的邮箱发送。"}</small></aside></div>
    {recommendations.length > 0 && <section className="cart-recommendations"><div className="section-heading"><h2>顺手带上</h2><a href="/catalog/products">查看更多</a></div><div>{recommendations.map((product) => <article className="product-hover-trigger" key={product.slug}><a href={productDetailHref(product)}><ProductCardMedia product={product} sizes="(max-width: 700px) 50vw, 25vw" contain square /><h3>{product.name}</h3></a><p>{formatCnyFromRub(product.price)}</p><button onClick={() => addToCart(product)}>加入购物袋</button></article>)}</div></section>}
  </>}</main></PageShell>;
}
