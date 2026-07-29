"use client";
import { PageShell } from "../components/SiteChrome";
import { useStore } from "../components/StoreProvider";
import { formatCnyFromRub, getProduct } from "../data/products";

export default function CartPage() {
  const { cart, subtotal, updateQuantity, removeFromCart } = useStore();
  const delivery = subtotal >= 5000 || subtotal === 0 ? 0 : 390;
  return <PageShell><main className="commerce-page"><header><p>首页 / 购物袋</p><h1>购物袋</h1></header>{cart.length === 0 ? <section className="large-empty"><h2>购物袋还是空的</h2><p>去看看 PÚSY 的新品与畅销单品。</p><a className="primary-link" href="/catalog/products">浏览全部商品</a></section> : <div className="cart-page-grid"><section className="cart-page-lines">{cart.map((line) => { const product = line.product ?? getProduct(line.slug); return <article key={line.slug}><a href={`/products/${product.slug}`}><img src={product.image} alt={product.name} /></a><div><p>{product.category}</p><a href={`/products/${product.slug}`}><h2>{product.name}</h2></a><b>{formatCnyFromRub(product.price)}</b><div className="line-controls"><div className="mini-quantity"><button onClick={() => updateQuantity(line.slug, line.quantity - 1)}>−</button><span>{line.quantity}</span><button onClick={() => updateQuantity(line.slug, line.quantity + 1)}>+</button></div><button className="remove-line" onClick={() => removeFromCart(line.slug)}>删除</button></div></div></article>; })}</section><aside className="order-summary"><h2>订单摘要</h2><p><span>商品小计</span><b>{formatCnyFromRub(subtotal)}</b></p><p><span>配送</span><b>{delivery ? formatCnyFromRub(delivery) : "免费"}</b></p><p className="summary-total"><span>合计</span><b>{formatCnyFromRub(subtotal + delivery)}</b></p><a className="primary-link" href="/checkout">去结账</a><small>订单满 {formatCnyFromRub(5000)} 免费配送</small></aside></div>}</main></PageShell>;
}
