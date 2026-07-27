"use client";

import { useState } from "react";

const nav = [
  ["神秘礼盒", "/catalog/sekretnye-boksy"], ["全部商品", "/catalog/products"], ["套装", "/catalog/nabory"], ["新品", "/collections/novinki"], ["畅销", "/catalog/hity"], ["眉妆", "/catalog/brows"], ["彩妆", "/catalog/makiyazh"], ["护肤", "/catalog/uhod"], ["身体护理", "/catalog/uhod-1"], ["头发护理", "/catalog/hair"], ["家居", "/catalog/dlya-doma"], ["配件", "/catalog/accessories"], ["礼品卡", "/gift-card"],
];

export function SiteHeader({ cartCount = 0 }: { cartCount?: number }) {
  const [open, setOpen] = useState(false);
  return <>
    <div className="shipping-bar">俄罗斯境内订单满 5 000 ₽ 免费配送</div>
    <header className="site-header subpage-header">
      <button className="icon-button menu-button" aria-label="打开菜单" onClick={() => setOpen(!open)}><span /><span /></button>
      <a className="brand" href="/" aria-label="PÚSY 首页">púsy</a>
      <div className="header-actions"><a className="header-symbol" href="/catalog/products" aria-label="搜索">⌕</a><a className="header-symbol" href="/catalog/products" aria-label="收藏">♡</a><a className="header-symbol account-symbol" href="/faq" aria-label="账户">♙</a><a className="bag-button" href="/catalog/products" aria-label={`购物袋，${cartCount} 件商品`}>▢<b>{cartCount}</b></a></div>
    </header>
    <nav className={`nav-row ${open ? "is-open" : ""}`} aria-label="商品分类">
      {nav.map(([label, href]) => <a href={href} key={href} onClick={() => setOpen(false)}>{label}</a>)}
    </nav>
  </>;
}

export function SiteFooter() {
  return <footer className="pusy-footer">
      <div className="footer-contact-line"><span>© PÚSY 2026</span><div><a href="tel:+79266740938">+7 (926) 674-09-38</a><a href="https://www.instagram.com/pusy.beauty">Instagram</a><a href="mailto:help@pusy.beauty">help@pusy.beauty</a><a href="https://t.me/pusybeautyy">Telegram</a></div></div>
      <a className="footer-logo" href="/">púsy</a>
      <div className="footer-links"><div><a href="/catalog/products">商品目录</a><a href="/about">关于我们</a><a href="/delivery">配送说明</a><a href="/return">退换货</a><a href="/payment">支付方式</a></div><div><a href="https://t.me/pusy_beauty">客户服务</a><a href="/stores-china">线下门店</a><a href="/faq">常见问题</a><a href="/privacy">隐私政策</a></div></div>
      <div className="footer-subscribe"><p>订阅邮件，立享 9 折</p><form><input aria-label="电子邮箱" type="email" placeholder="电子邮箱" /><button type="button">➤</button></form></div>
    </footer>;
}

export function PageShell({ children, cartCount = 0 }: { children: React.ReactNode; cartCount?: number }) {
  return <><SiteHeader cartCount={cartCount} />{children}<SiteFooter /></>;
}
