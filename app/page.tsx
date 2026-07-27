"use client";

import { useEffect, useState } from "react";
import { formatCnyFromRub } from "./data/products";

const products = [
  { name: "轻盈卸妆油", price: 990, image: "/assets/21.webp", badge: "新品" },
  { name: "Ice Baby 慕斯高光", price: 990, image: "/assets/20.webp", badge: "新品" },
  { name: "「美丽随身」限定套装", price: 5490, oldPrice: 6050, image: "/assets/32.webp", badge: "新品" },
  { name: "晨间焕肤护理套装", price: 2590, oldPrice: 3070, image: "/assets/37.webp", badge: "新品" },
];

const stories = [
  { image: "/assets/18.webp", title: "奶油唇线笔", price: 490 },
  { image: "/assets/07.webp", title: "透明眉毛定型啫喱", price: 810 },
  { image: "/assets/02.webp", title: "面部美黑水", price: 1010 },
  { image: "/assets/34.webp", title: "ICE BABY 慕斯高光", price: 990 },
  { image: "/assets/15.webp", title: "BASE HAIR 洗发水", price: 590 },
  { image: "/assets/31.webp", title: "FLOWER 奶油腮红", price: 910 },
];

const navItems = [
  ["神秘礼盒", "/catalog/sekretnye-boksy"], ["全部商品", "/catalog/products"], ["套装", "/catalog/nabory"], ["新品", "/collections/novinki"], ["畅销", "/catalog/hity"], ["眉妆", "/catalog/brows"], ["彩妆", "/catalog/makiyazh"], ["护肤", "/catalog/uhod"], ["身体护理", "/catalog/uhod-1"], ["头发护理", "/catalog/hair"], ["家居", "/catalog/dlya-doma"], ["配件", "/catalog/accessories"], ["礼品卡", "/gift-card"],
];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 560);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function subscribe(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim()) return;
    setSubscribed(true);
  }

  return (
    <main>
      <div className="shipping-bar">订单满 {formatCnyFromRub(5000)} 免费配送</div>

      <header className={`site-header home-header ${scrolled ? "is-scrolled" : ""}`}>
        <button className="icon-button menu-button" aria-label="打开菜单" onClick={() => setMenuOpen(!menuOpen)}>
          <span /><span />
        </button>
        <a className="brand" href="#top" aria-label="PÚSY 首页">púsy</a>
        <div className="header-actions"><button className="header-symbol" aria-label="搜索">⌕</button><button className="header-symbol" aria-label="收藏">♡</button><button className="header-symbol account-symbol" aria-label="账户">♙</button><button className="bag-button" aria-label={`购物袋，${cartCount} 件商品`}>▢<b>{cartCount}</b></button></div>
      </header>

      <nav className={`nav-row ${menuOpen ? "is-open" : ""}`} aria-label="商品分类">
        {navItems.map(([item, href]) => <a href={href} key={href} onClick={() => setMenuOpen(false)}>{item}</a>)}
      </nav>

      <section className="hero" id="top">
        <img src="/assets/hero-clean-v2.png" alt="PÚSY 夏日礼物活动" />
        <div className="hero-copy">
          <div className="campaign-mark">púsy <span>×</span> Ü</div>
          <h1>礼物飞进<br />你的订单</h1>
          <p>猜猜你会收到哪一份？</p>
          <div className="prize-panel"><div><small>随机赢取</small><b>9 款礼物<br />中的 1 款</b></div><div><small>重磅好礼</small><b>Dyson、Paper Shoot、<br />Apple 等惊喜</b></div></div>
        </div>
      </section>

      <section className="product-section" id="products">
        <div className="section-heading">
          <h2>新品</h2>
          <a href="/catalog/products">查看全部</a>
        </div>
        <div className="product-grid">
          {products.map((product) => (
            <article className="product-card" key={product.name}>
              <div className="product-image-wrap">
                <span className="badge">{product.badge}</span>
                <img src={product.image} alt={product.name} />
                <button onClick={() => setCartCount((n) => n + 1)}>加入购物袋</button>
              </div>
              <h3>{product.name}</h3>
              <p className="price">{formatCnyFromRub(product.price)} {product.oldPrice && <del>{formatCnyFromRub(product.oldPrice)}</del>}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="category-grid" aria-label="热门分类">
        <a className="category-card" href="/catalog/makiyazh">
          <img src="/assets/04.webp" alt="彩妆" />
          <span>彩妆</span>
        </a>
        <a className="category-card" href="/catalog/uhod">
          <img src="/assets/01.webp" alt="护肤" />
          <span>护肤</span>
        </a>
        <a className="category-card" href="/catalog/dlya-doma">
          <img src="/assets/13.webp" alt="家居护理" />
          <span>家居</span>
        </a>
      </section>

      <section className="stories-section">
        <h2>你与 PÚSY</h2>
        <div className="story-grid">
          {stories.map((story) => (
            <a className="story-card" href="#products" key={story.title}>
              <img src={story.image} alt={story.title} />
              <span className="play-dot">▶</span>
              <div><b>{story.title}</b><em>{formatCnyFromRub(story.price)}</em></div>
            </a>
          ))}
        </div>
      </section>

      <footer className="pusy-footer">
        <div className="footer-contact-line"><span>© PÚSY 2026</span><div><a href="tel:+79266740938">+7 (926) 674-09-38</a><a href="https://www.instagram.com/pusy.beauty">Instagram</a><a href="mailto:help@pusy.beauty">help@pusy.beauty</a><a href="https://t.me/pusybeautyy">Telegram</a></div></div>
        <div className="footer-logo">púsy</div>
        <div className="footer-links">
          <div><a href="/catalog/products">商品目录</a><a href="/about">关于我们</a><a href="/delivery">配送说明</a><a href="/return">退换货</a><a href="/payment">支付方式</a></div>
          <div><a href="https://t.me/pusy_beauty">客户服务</a><a href="/stores-china">线下门店</a><a href="mailto:help@pusy.beauty">合作申请</a><a href="/faq">常见问题</a></div>
        </div>
        <div className="footer-subscribe"><p>订阅邮件，立享 9 折</p>{subscribed ? <span>订阅成功，欢迎加入 PÚSY CLUB。</span> : <form onSubmit={subscribe}><label className="sr-only" htmlFor="email">电子邮箱</label><input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="电子邮箱" required /><button type="submit">➤</button></form>}</div>
      </footer>
    </main>
  );
}
