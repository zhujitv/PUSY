"use client";

import { useState } from "react";

const products = [
  { name: "轻盈卸妆油", price: "990 ₽", image: "/assets/21.webp", badge: "新品" },
  { name: "Ice Baby 慕斯高光", price: "990 ₽", image: "/assets/20.webp", badge: "新品" },
  { name: "「美丽随身」限定套装", price: "5 490 ₽", oldPrice: "6 050 ₽", image: "/assets/32.webp", badge: "新品" },
  { name: "晨间焕肤护理套装", price: "2 590 ₽", oldPrice: "3 070 ₽", image: "/assets/37.webp", badge: "新品" },
];

const stories = [
  { image: "/assets/18.webp", title: "奶油唇线笔", price: "490 ₽" },
  { image: "/assets/07.webp", title: "透明眉毛定型啫喱", price: "810 ₽" },
  { image: "/assets/02.webp", title: "面部美黑水", price: "1 010 ₽" },
  { image: "/assets/34.webp", title: "ICE BABY 慕斯高光", price: "990 ₽" },
  { image: "/assets/15.webp", title: "BASE HAIR 洗发水", price: "590 ₽" },
  { image: "/assets/31.webp", title: "FLOWER 奶油腮红", price: "910 ₽" },
];

const navItems = [
  ["神秘礼盒", "/catalog/sekretnye-boksy"], ["全部商品", "/catalog/products"], ["套装", "/catalog/nabory"], ["新品", "/collections/novinki"], ["畅销", "/catalog/hity"], ["眉妆", "/catalog/brows"], ["彩妆", "/catalog/makiyazh"], ["护肤", "/catalog/uhod"], ["身体护理", "/catalog/uhod-1"], ["头发护理", "/catalog/hair"], ["家居", "/catalog/dlya-doma"], ["配件", "/catalog/accessories"], ["礼品卡", "/gift-card"],
];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  function subscribe(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim()) return;
    setSubscribed(true);
  }

  return (
    <main>
      <div className="shipping-bar">俄罗斯境内订单满 5 000 ₽ 免费配送</div>

      <header className="site-header">
        <button className="icon-button menu-button" aria-label="打开菜单" onClick={() => setMenuOpen(!menuOpen)}>
          <span /><span />
        </button>
        <a className="brand" href="#top" aria-label="PÚSY 首页">púsy</a>
        <div className="header-actions">
          <button className="text-action" aria-label="搜索">搜索</button>
          <button className="bag-button" aria-label={`购物袋，${cartCount} 件商品`}>购物袋 <b>{cartCount}</b></button>
        </div>
      </header>

      <nav className={`nav-row ${menuOpen ? "is-open" : ""}`} aria-label="商品分类">
        {navItems.map(([item, href]) => <a href={href} key={href} onClick={() => setMenuOpen(false)}>{item}</a>)}
      </nav>

      <section className="hero" id="top">
        <img src="/assets/22.webp" alt="PÚSY 夏日神秘礼盒" />
        <div className="hero-shade" />
        <div className="hero-copy">
          <p>夏日限定神秘礼盒</p>
          <h1>这个夏天需要的<br />都在里面</h1>
          <a className="outline-button" href="#products">了解更多</a>
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
              <p className="price">{product.price} {product.oldPrice && <del>{product.oldPrice}</del>}</p>
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
              <div><b>{story.title}</b><em>{story.price}</em></div>
            </a>
          ))}
        </div>
      </section>

      <section className="newsletter">
        <div>
          <p>PÚSY CLUB</p>
          <h2>订阅邮件，立享 9 折</h2>
        </div>
        {subscribed ? (
          <p className="success-message">订阅成功，欢迎加入 PÚSY CLUB。</p>
        ) : (
          <form onSubmit={subscribe}>
            <label className="sr-only" htmlFor="email">电子邮箱</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="电子邮箱" required />
            <button type="submit">订阅 →</button>
          </form>
        )}
      </section>

      <footer>
        <div className="footer-logo">púsy</div>
        <div className="footer-links">
          <div><a href="/catalog/products">商品目录</a><a href="/about">关于我们</a><a href="/delivery">配送说明</a><a href="/return">退换货</a><a href="/payment">支付方式</a></div>
          <div><a href="https://t.me/pusy_beauty">客户服务</a><a href="/stores-china">线下门店</a><a href="mailto:help@pusy.beauty">合作申请</a><a href="/faq">常见问题</a></div>
        </div>
        <div className="footer-contact">
          <a href="tel:+79266740938">+7 (926) 674-09-38</a>
          <a href="mailto:help@pusy.beauty">help@pusy.beauty</a>
          <span>© PÚSY 2026</span>
        </div>
      </footer>
    </main>
  );
}
