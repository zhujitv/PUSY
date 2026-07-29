"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { formatCnyFromRub, getProduct, products, type Product } from "../data/products";

export type CartLine = { slug: string; quantity: number; product?: Product };
export type Order = {
  id: string;
  createdAt: string;
  total: number;
  items: CartLine[];
  customer: string;
  delivery: string;
};

type StoreContextValue = {
  cart: CartLine[];
  wishlist: string[];
  cartCount: number;
  subtotal: number;
  cartOpen: boolean;
  searchOpen: boolean;
  addToCart: (product: Product, quantity?: number) => void;
  updateQuantity: (slug: string, quantity: number) => void;
  removeFromCart: (slug: string) => void;
  clearCart: () => void;
  toggleWishlist: (slug: string) => void;
  isWishlisted: (slug: string) => boolean;
  setCartOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
};

const StoreContext = createContext<StoreContextValue | null>(null);
const serverFallback: StoreContextValue = {
  cart: [], wishlist: [], cartCount: 0, subtotal: 0, cartOpen: false, searchOpen: false,
  addToCart: () => {}, updateQuantity: () => {}, removeFromCart: () => {}, clearCart: () => {},
  toggleWishlist: () => {}, isWishlisted: () => false, setCartOpen: () => {}, setSearchOpen: () => {},
};
const CART_KEY = "pusy-cn-cart";
const WISHLIST_KEY = "pusy-cn-wishlist";

function readStored<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setCart(readStored<CartLine[]>(CART_KEY, []));
      setWishlist(readStored<string[]>(WISHLIST_KEY, []));
      setReady(true);
    });
  }, []);

  useEffect(() => { if (ready) window.localStorage.setItem(CART_KEY, JSON.stringify(cart)); }, [cart, ready]);
  useEffect(() => { if (ready) window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist)); }, [wishlist, ready]);
  useEffect(() => {
    document.body.classList.toggle("overlay-open", cartOpen || searchOpen);
    return () => document.body.classList.remove("overlay-open");
  }, [cartOpen, searchOpen]);

  const addToCart = (product: Product, quantity = 1) => {
    if (!product.inventoryVerified || (product.stock ?? 0) < 1) return;
    setCart((current) => {
      const existing = current.find((line) => line.slug === product.slug);
      const nextQuantity = Math.min(product.stock ?? quantity, (existing?.quantity ?? 0) + quantity);
      return existing
        ? current.map((line) => line.slug === product.slug ? { ...line, product, quantity: nextQuantity } : line)
        : [...current, { slug: product.slug, product, quantity: Math.min(product.stock ?? quantity, quantity) }];
    });
    setCartOpen(true);
  };
  const updateQuantity = (slug: string, quantity: number) => setCart((current) => quantity < 1 ? current.filter((line) => line.slug !== slug) : current.map((line) => line.slug === slug ? { ...line, quantity: Math.min(line.product?.stock ?? quantity, quantity) } : line));
  const removeFromCart = (slug: string) => setCart((current) => current.filter((line) => line.slug !== slug));
  const clearCart = () => setCart([]);
  const toggleWishlist = (slug: string) => setWishlist((current) => current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug]);
  const isWishlisted = (slug: string) => wishlist.includes(slug);
  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = cart.reduce((sum, line) => sum + (line.product ?? getProduct(line.slug)).price * line.quantity, 0);
  const value = { cart, wishlist, cartCount, subtotal, cartOpen, searchOpen, addToCart, updateQuantity, removeFromCart, clearCart, toggleWishlist, isWishlisted, setCartOpen, setSearchOpen };

  return <StoreContext.Provider value={value}>{children}<SearchOverlay /><CartDrawer /></StoreContext.Provider>;
}

export function useStore() {
  const value = useContext(StoreContext);
  return value ?? serverFallback;
}

function SearchOverlay() {
  const { searchOpen, setSearchOpen } = useStore();
  const [query, setQuery] = useState("");
  const [searchProducts, setSearchProducts] = useState(products);
  useEffect(() => { if (searchOpen) fetch("/api/products", { cache: "no-store" }).then((response) => response.ok ? response.json() : null).then((body) => { if (body?.products) setSearchProducts(body.products); }).catch(() => {}); }, [searchOpen]);
  const results = query.trim() ? searchProducts.filter((product) => `${product.name} ${product.category}`.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 8) : searchProducts.slice(0, 4);
  if (!searchOpen) return null;
  return <div className="store-overlay" role="dialog" aria-modal="true" aria-label="搜索商品" onMouseDown={(event) => { if (event.target === event.currentTarget) setSearchOpen(false); }}>
    <section className="search-panel">
      <div className="panel-title"><span>搜索</span><button onClick={() => setSearchOpen(false)} aria-label="关闭搜索">×</button></div>
      <form action="/search" className="search-form"><input name="q" autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="输入商品名称或品类" /><button type="submit">搜索</button></form>
      <p className="search-caption">{query ? `找到 ${results.length} 件相关商品` : "热门搜索"}</p>
      <div className="search-results">{results.map((product) => <a href={`/products/${product.slug}`} key={product.slug} onClick={() => setSearchOpen(false)}><img src={product.image} alt="" /><span>{product.name}<b>{formatCnyFromRub(product.price)}</b></span></a>)}</div>
    </section>
  </div>;
}

function CartDrawer() {
  const { cart, cartOpen, subtotal, setCartOpen, updateQuantity, removeFromCart } = useStore();
  if (!cartOpen) return null;
  return <div className="store-overlay" role="dialog" aria-modal="true" aria-label="购物袋" onMouseDown={(event) => { if (event.target === event.currentTarget) setCartOpen(false); }}>
    <aside className="cart-drawer">
      <div className="panel-title"><span>购物袋</span><button onClick={() => setCartOpen(false)} aria-label="关闭购物袋">×</button></div>
      {cart.length === 0 ? <div className="empty-state"><p>购物袋还是空的</p><a href="/catalog/products" onClick={() => setCartOpen(false)}>去挑选商品</a></div> : <>
        <div className="cart-lines">{cart.map((line) => { const product = line.product ?? getProduct(line.slug); return <article key={line.slug}><a href={`/products/${product.slug}`} onClick={() => setCartOpen(false)}><img src={product.image} alt={product.name} /></a><div><a href={`/products/${product.slug}`} onClick={() => setCartOpen(false)}>{product.name}</a><b>{formatCnyFromRub(product.price)}</b><div className="mini-quantity"><button onClick={() => updateQuantity(line.slug, line.quantity - 1)}>−</button><span>{line.quantity}</span><button onClick={() => updateQuantity(line.slug, line.quantity + 1)}>+</button></div><button className="remove-line" onClick={() => removeFromCart(line.slug)}>删除</button></div></article>; })}</div>
        <div className="cart-summary"><p><span>小计</span><b>{formatCnyFromRub(subtotal)}</b></p><small>配送费用将在结账时计算</small><a href="/checkout" onClick={() => setCartOpen(false)}>去结账</a><a className="text-link" href="/cart" onClick={() => setCartOpen(false)}>查看购物袋</a></div>
      </>}
    </aside>
  </div>;
}
