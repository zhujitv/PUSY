"use client";

import { useState } from "react";
import { formatCnyFromRub } from "../data/products";
import { useStore } from "./StoreProvider";
import { HeaderIcon } from "./HeaderIcons";

const nav = [
  ["神秘礼盒", "/catalog/sekretnye-boksy"], ["全部商品", "/catalog/products"], ["套装", "/catalog/nabory"], ["新品", "/collections/novinki"], ["畅销", "/catalog/hity"], ["眉妆", "/catalog/brows"], ["彩妆", "/catalog/makiyazh"], ["护肤", "/catalog/uhod"], ["身体护理", "/catalog/uhod-1"], ["头发护理", "/catalog/hair"], ["家居", "/catalog/dlya-doma"], ["配件", "/catalog/accessories"], ["礼品卡", "/gift-card"],
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { cartCount, setCartOpen, setSearchOpen } = useStore();
  return <>
    <div className="shipping-bar">订单满 {formatCnyFromRub(5000)} 免费配送</div>
    <header className="site-header subpage-header">
      <button className="icon-button menu-button" aria-label="打开菜单" onClick={() => setOpen(!open)}><span /><span /></button>
      <a className="brand" href="/" aria-label="PÚSY 首页">púsy</a>
      <div className="header-actions"><button className="header-symbol" onClick={() => setSearchOpen(true)} aria-label="搜索"><HeaderIcon name="search" /></button><a className="header-symbol" href="/wishlist" aria-label="收藏"><HeaderIcon name="heart" /></a><a className="header-symbol account-symbol" href="/account" aria-label="账户"><HeaderIcon name="account" /></a><button className="bag-button" onClick={() => setCartOpen(true)} aria-label={`购物袋，${cartCount} 件商品`}><HeaderIcon name="bag" /><b>{cartCount}</b></button></div>
    </header>
    <nav className={`nav-row ${open ? "is-open" : ""}`} aria-label="商品分类">
      {nav.map(([label, href]) => <a href={href} key={href} onClick={() => setOpen(false)}>{label}</a>)}
    </nav>
  </>;
}

export function SiteFooter() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [subscribeError, setSubscribeError] = useState("");
  async function subscribe(event: React.FormEvent) { event.preventDefault(); setSubscribeError(""); const response = await fetch("/api/newsletter", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, source: "footer" }) }); if (response.ok) setSubscribed(true); else { const body = await response.json().catch(() => ({})); setSubscribeError(body.error || "订阅失败，请稍后再试"); } }
  return <footer className="pusy-footer">
      <div className="footer-contact-line"><span>© PÚSY 2026 · <a href="https://pusy.cn">PUSY.CN</a> · 中国</span><div><a href="mailto:help@PUSY.CN">客户服务</a><a href="mailto:help@PUSY.CN?subject=PUSY.CN%20商务合作">商务合作</a><a href="/details">经营者信息</a></div></div>
      <a className="footer-logo" href="/">púsy</a>
      <div className="footer-links"><div><a href="/catalog/products">商品目录</a><a href="/about">关于我们</a><a href="/delivery">配送说明</a><a href="/return">退换货政策</a><a href="/payment">支付方式</a><a href="/stores-china">中国渠道</a></div><div><a href="/faq">常见问题</a><a href="/gift-card/questions">礼品卡问题</a><a href="/oferta">用户服务协议</a><a href="/privacy">隐私政策</a><a href="/cookie">Cookie 政策</a><a href="/details">经营者信息</a></div></div>
      <div className="footer-subscribe"><p>订阅邮件，立享 9 折</p>{subscribed ? <span>订阅成功，欢迎加入 PÚSY CLUB。</span> : <><form onSubmit={subscribe}><input aria-label="电子邮箱" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="电子邮箱" required /><button type="submit">➤</button></form><small>提交即表示同意我们按照<a href="/privacy">隐私政策</a>发送品牌资讯，可随时退订。</small>{subscribeError && <small className="form-error">{subscribeError}</small>}</>}</div>
    </footer>;
}

export function PageShell({ children }: { children: React.ReactNode }) {
  return <><SiteHeader />{children}<SiteFooter /></>;
}
