"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { formatCnyFromRub, products } from "./data/products";
import { useStore } from "./components/StoreProvider";
import { HeaderIcon } from "./components/HeaderIcons";

const featuredProducts = products.slice(1, 9);
const defaultHomeContent = { announcement: `订单满 ${formatCnyFromRub(5000)} 免费配送`, hero_eyebrow: "púsy × Ü", hero_title: "礼物飞进\n你的订单", hero_subtitle: "猜猜你会收到哪一份？", featured_title: "新品" };

const reels = [
  { player: "vplvbx7qwc3dhtviylip", slug: "karandash-dlya-gub-pusy-cream-100460", title: "奶油唇线笔" },
  { player: "vplvxcyfckgdw6cs2ewu", slug: "rebrending-prozrachnyiy-gel-fiksator-dlya-broveiy-pusy-5ml-1-100347", title: "透明眉毛定型啫喱" },
  { player: "vplvcp63gpa52inkdmqy", slug: "avtozagar-dlya-lica-pusy-magic-water-face-self-tanner-pusy-magic-water-100-ml-25-100566", title: "面部美黑水" },
  { player: "vplv6qg7qx2yvzt6kudb", slug: "haiylaiyter-sufle-pusy-ice-baby-4-g-1-100693", title: "ICE BABY 慕斯高光" },
  { player: "vplv3xtmkw2btxrxqlnb", slug: "shampun-dlya-volos-pusy-base-hair-750-ml-3-100595", title: "BASE HAIR 洗发水" },
  { player: "vplvtyznzou7usg76z5w", slug: "kremovye-rumyana-pusy-flower-25-gr-9-100359", title: "FLOWER 奶油腮红" },
].map((reel) => ({ ...reel, product: products.find((product) => product.slug === reel.slug) }));

const navItems = [
  ["神秘礼盒", "/catalog/sekretnye-boksy"], ["全部商品", "/catalog/products"], ["套装", "/catalog/nabory"], ["新品", "/collections/novinki"], ["畅销", "/catalog/hity"], ["眉妆", "/catalog/brows"], ["彩妆", "/catalog/makiyazh"], ["护肤", "/catalog/uhod"], ["身体护理", "/catalog/uhod-1"], ["头发护理", "/catalog/hair"], ["家居", "/catalog/dlya-doma"], ["配件", "/catalog/accessories"], ["礼品卡", "/gift-card"],
];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [homeContent, setHomeContent] = useState(defaultHomeContent);
  const heroTouchStart = useRef<number | null>(null);
  const { cartCount, addToCart, setCartOpen, setSearchOpen } = useStore();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 560);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    fetch("/api/content").then((response) => response.ok ? response.json() : null).then((body) => { if (body?.content) setHomeContent((current) => ({ ...current, ...body.content })); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (heroPaused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setHeroIndex((current) => (current + 1) % 2), 6000);
    return () => window.clearInterval(timer);
  }, [heroPaused]);

  function moveHero(direction: number) {
    setHeroIndex((current) => (current + direction + 2) % 2);
  }

  async function subscribe(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim()) return;
    const response = await fetch("/api/newsletter", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, source: "homepage" }) });
    if (response.ok) setSubscribed(true);
  }

  return (
    <main>
      <div className="shipping-bar">{homeContent.announcement}</div>

      <header className={`site-header home-header ${scrolled ? "is-scrolled" : ""}`}>
        <button className="icon-button menu-button" aria-label="打开菜单" onClick={() => setMenuOpen(!menuOpen)}>
          <span /><span />
        </button>
        <a className="brand" href="#top" aria-label="PÚSY 首页">púsy</a>
        <div className="header-actions"><button className="header-symbol" onClick={() => setSearchOpen(true)} aria-label="搜索"><HeaderIcon name="search" /></button><a className="header-symbol" href="/wishlist" aria-label="收藏"><HeaderIcon name="heart" /></a><a className="header-symbol account-symbol" href="/account" aria-label="账户"><HeaderIcon name="account" /></a><button className="bag-button" onClick={() => setCartOpen(true)} aria-label={`购物袋，${cartCount} 件商品`}><HeaderIcon name="bag" /><b>{cartCount}</b></button></div>
      </header>

      <nav className={`nav-row ${menuOpen ? "is-open" : ""}`} aria-label="商品分类">
        {navItems.map(([item, href]) => <a href={href} key={href} onClick={() => setMenuOpen(false)}>{item}</a>)}
      </nav>

      <section className="hero hero-carousel" id="top" aria-roledescription="轮播图" aria-label="PÚSY 首页活动" onMouseEnter={() => setHeroPaused(true)} onMouseLeave={() => setHeroPaused(false)} onFocus={() => setHeroPaused(true)} onBlur={() => setHeroPaused(false)} onTouchStart={(event) => { heroTouchStart.current = event.touches[0]?.clientX ?? null; }} onTouchEnd={(event) => { if (heroTouchStart.current === null) return; const distance = (event.changedTouches[0]?.clientX ?? heroTouchStart.current) - heroTouchStart.current; if (Math.abs(distance) > 45) moveHero(distance > 0 ? -1 : 1); heroTouchStart.current = null; }}>
        <div className="hero-slides">
          <div className={`hero-slide ${heroIndex === 0 ? "is-active" : ""}`} aria-hidden={heroIndex !== 0}><Image src="/assets/hero-clean-v2-42a264aa.webp" alt="PÚSY 夏日礼物活动" fill sizes="100vw" priority /></div>
          <div className={`hero-slide hero-slide--box ${heroIndex === 1 ? "is-active" : ""}`} aria-hidden={heroIndex !== 1}><Image src="/assets/35.webp" alt="PÚSY 海滩神秘礼盒" fill sizes="100vw" /></div>
        </div>
        {heroIndex === 0 ? <div className="hero-copy">
          <div className="campaign-mark">{homeContent.hero_eyebrow}</div>
          <h1 className="multiline-title">{homeContent.hero_title}</h1>
          <p>{homeContent.hero_subtitle}</p>
          <div className="prize-panel"><div><small>随机赢取</small><b>9 款礼物<br />中的 1 款</b></div><div><small>重磅好礼</small><b>Dyson、Paper Shoot、<br />Apple 等惊喜</b></div></div>
        </div> : <div className="hero-copy hero-copy--box">
          <p>PÚSY 神秘礼盒</p>
          <h1>装下这个夏天<br />需要的一切</h1>
          <a className="outline-button" href="/catalog/sekretnye-boksy">了解更多</a>
        </div>}
        <button className="hero-arrow hero-arrow--prev" type="button" aria-label="上一张" onClick={() => moveHero(-1)}>‹</button>
        <button className="hero-arrow hero-arrow--next" type="button" aria-label="下一张" onClick={() => moveHero(1)}>›</button>
        <div className="hero-dots" aria-label="选择轮播图">{[0, 1].map((index) => <button key={index} type="button" className={heroIndex === index ? "active" : ""} aria-label={`第 ${index + 1} 张`} aria-current={heroIndex === index ? "true" : undefined} onClick={() => setHeroIndex(index)} />)}</div>
      </section>

      <section className="product-section" id="products">
        <div className="section-heading">
          <h2>{homeContent.featured_title}</h2>
          <a href="/catalog/products">查看全部</a>
        </div>
        <div className="product-grid">
          {featuredProducts.map((product) => (
            <article className="product-card" key={product.slug}>
              <div className="product-image-wrap">
                <span className="badge">{product.badge}</span>
                <a href={`/products/${product.slug}`}><Image src={product.image} alt={product.name} width={700} height={727} sizes="(max-width: 700px) 50vw, 25vw" /></a>
                <button disabled={!product.inventoryVerified || (product.stock ?? 0) < 1} onClick={() => addToCart(product)}>{!product.inventoryVerified || (product.stock ?? 0) < 1 ? "暂时缺货" : "加入购物袋"}</button>
              </div>
              <h3><a href={`/products/${product.slug}`}>{product.name}</a></h3>
              <p className="price">{formatCnyFromRub(product.price)} {product.oldPrice && <del>{formatCnyFromRub(product.oldPrice)}</del>}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="category-grid" aria-label="热门分类">
        <a className="category-card" href="/catalog/makiyazh">
          <Image src="/assets/04.webp" alt="彩妆" width={960} height={1280} sizes="(max-width: 700px) 100vw, 33vw" />
          <span>彩妆</span>
        </a>
        <a className="category-card" href="/catalog/uhod">
          <Image src="/assets/01.webp" alt="护肤" width={960} height={1439} sizes="(max-width: 700px) 100vw, 33vw" />
          <span>护肤</span>
        </a>
        <a className="category-card" href="/catalog/dlya-doma">
          <Image src="/assets/13.webp" alt="家居护理" width={960} height={960} sizes="(max-width: 700px) 100vw, 33vw" />
          <span>家居</span>
        </a>
      </section>

      <section className="reels-section" aria-labelledby="reels-title">
        <h2 id="reels-title">你与 PÚSY</h2>
        <div className="reels-grid">
          {reels.map((reel) => <article className="reel-card" key={reel.player}>
            <div className="reel-video"><iframe src={`https://runtime.strm.yandex.ru/player/video/${reel.player}`} title={`${reel.title} 视频`} loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div>
            <a className="reel-product" href={`/products/${reel.slug}`}>
              {reel.product && <Image src={reel.product.image} alt="" width={700} height={727} sizes="(max-width: 700px) 80vw, 20vw" />}
              <span><b>{reel.title}</b><em>{reel.product ? formatCnyFromRub(reel.product.price) : "查看商品"}</em></span>
            </a>
          </article>)}
        </div>
      </section>

      <footer className="pusy-footer">
        <div className="footer-contact-line"><span>© PÚSY 2026 · <a href="https://pusy.cn">PUSY.CN</a> · 中国</span><div><a href="/contact">客户服务</a><a href="/stores-china#retail-partnership">商务合作</a><a href="/details">经营者信息</a></div></div>
        <div className="footer-logo">púsy</div>
        <div className="footer-links">
          <div><a href="/catalog/products">商品目录</a><a href="/about">关于我们</a><a href="/delivery">配送说明</a><a href="/return">退换货</a><a href="/payment">支付方式</a></div>
          <div><a href="/stores-china">中国渠道</a><a href="/gift-card/questions">礼品卡问题</a><a href="/faq">常见问题</a><a href="/oferta">用户服务协议</a><a href="/privacy">隐私政策</a><a href="/cookie">Cookie 政策</a><a href="/details">经营者信息</a></div>
        </div>
        <div className="footer-subscribe"><p>订阅邮件，立享 9 折</p>{subscribed ? <span>订阅成功，欢迎加入 PÚSY CLUB。</span> : <><form onSubmit={subscribe}><label className="sr-only" htmlFor="email">电子邮箱</label><input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="电子邮箱" required /><button type="submit">➤</button></form><small>提交即表示同意我们按照<a href="/privacy">隐私政策</a>发送品牌资讯，可随时退订。</small></>}</div>
      </footer>
    </main>
  );
}
