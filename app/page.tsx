"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { formatCnyFromRub, products, type Product } from "./data/products";
import { useStore } from "./components/StoreProvider";
import { HeaderIcon } from "./components/HeaderIcons";
import { fallbackNavigationCategories, storefrontNavItems, type NavigationCategory } from "./data/navigation";
import { FREE_STANDARD_SHIPPING_THRESHOLD } from "../lib/shipping";

function availableFirst(items: Product[]) {
  return [...items].sort((a, b) => Number(Boolean(b.inventoryVerified && (b.stock ?? 0) > 0)) - Number(Boolean(a.inventoryVerified && (a.stock ?? 0) > 0)));
}
const defaultFeaturedProducts = availableFirst(products).slice(0, 8);
const defaultAnnouncement = `实体商品满 ${formatCnyFromRub(FREE_STANDARD_SHIPPING_THRESHOLD)} 免标准快递费`;
const previousDefaultAnnouncements = new Set(["订单满 600.00 元免费配送", "订单满 600.00 元 免费配送", "订单满 600 元 免费配送"]);
const defaultHomeContent = { announcement: defaultAnnouncement, show_announcement: "1", hero_eyebrow: "púsy × Ü", hero_title: "礼物飞进\n你的订单", hero_subtitle: "猜猜你会收到哪一份？", hero_cta_label: "立即探索", hero_cta_url: "/catalog/products", hero2_eyebrow: "PÚSY 神秘礼盒", hero2_title: "装下这个夏天\n需要的一切", hero2_cta_label: "了解更多", hero2_cta_url: "/catalog/sekretnye-boksy", show_featured: "1", featured_title: "新品", featured_subtitle: "从当季新品开始，找到你的下一件日常心动。", featured_cta_label: "查看全部", show_categories: "1", categories_title: "按心情探索", category_1_label: "彩妆", category_1_url: "/catalog/makiyazh", category_2_label: "护肤", category_2_url: "/catalog/uhod", category_3_label: "家居", category_3_url: "/catalog/dlya-doma", show_reels: "1", reels_title: "你与 PÚSY", reels_subtitle: "真实灵感、使用方式与热门单品。", show_newsletter: "1", newsletter_title: "订阅邮件，立享 9 折", newsletter_success: "订阅成功，欢迎加入 PÚSY CLUB。" };

const reels = [
  { player: "vplvbx7qwc3dhtviylip", slug: "karandash-dlya-gub-pusy-cream-100460", title: "奶油唇线笔" },
  { player: "vplvxcyfckgdw6cs2ewu", slug: "rebrending-prozrachnyiy-gel-fiksator-dlya-broveiy-pusy-5ml-1-100347", title: "透明眉毛定型啫喱" },
  { player: "vplvcp63gpa52inkdmqy", slug: "avtozagar-dlya-lica-pusy-magic-water-face-self-tanner-pusy-magic-water-100-ml-25-100566", title: "面部美黑水" },
  { player: "vplv6qg7qx2yvzt6kudb", slug: "haiylaiyter-sufle-pusy-ice-baby-4-g-1-100693", title: "ICE BABY 慕斯高光" },
  { player: "vplv3xtmkw2btxrxqlnb", slug: "shampun-dlya-volos-pusy-base-hair-750-ml-3-100595", title: "BASE HAIR 洗发水" },
  { player: "vplvtyznzou7usg76z5w", slug: "kremovye-rumyana-pusy-flower-25-gr-9-100359", title: "FLOWER 奶油腮红" },
].map((reel) => ({ ...reel, product: products.find((product) => product.slug === reel.slug) }));

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [homeContent, setHomeContent] = useState(defaultHomeContent);
  const [featuredProducts, setFeaturedProducts] = useState(defaultFeaturedProducts);
  const [navItems, setNavItems] = useState(() => storefrontNavItems(fallbackNavigationCategories));
  const heroTouchStart = useRef<number | null>(null);
  const { cartCount, addToCart, setCartOpen, setSearchOpen } = useStore();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 560);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    fetch("/api/content").then((response) => response.ok ? response.json() : null).then((body) => { if (body?.content) setHomeContent((current) => { const next = { ...current, ...body.content }; return { ...next, announcement: previousDefaultAnnouncements.has(next.announcement) ? defaultAnnouncement : next.announcement }; }); }).catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/categories").then((response) => response.ok ? response.json() : null).then((body) => { if (Array.isArray(body?.categories)) setNavItems(storefrontNavItems(body.categories as NavigationCategory[])); }).catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/products", { cache: "no-store" }).then((response) => response.ok ? response.json() : null).then((body) => {
      if (Array.isArray(body?.products)) setFeaturedProducts(availableFirst(body.products as Product[]).slice(0, 8));
    }).catch(() => {});
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
      {homeContent.show_announcement !== "0" && <div className="shipping-bar">{homeContent.announcement}</div>}

      <header className={`site-header home-header ${scrolled ? "is-scrolled" : ""}`}>
        <div className="header-leading"><button className="icon-button menu-button" aria-label="打开菜单" onClick={() => setMenuOpen(!menuOpen)}><span /><span /></button><nav className="header-primary-nav" aria-label="主要商品分类">{navItems.slice(0, 4).map(([item, href]) => <a href={href} key={href}>{item}</a>)}</nav></div>
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
          <a className="hero-primary-cta" href={homeContent.hero_cta_url}>{homeContent.hero_cta_label} →</a>
          <div className="prize-panel"><div><small>随机赢取</small><b>9 款礼物<br />中的 1 款</b></div><div><small>重磅好礼</small><b>Dyson、Paper Shoot、<br />Apple 等惊喜</b></div></div>
        </div> : <div className="hero-copy hero-copy--box">
          <p>{homeContent.hero2_eyebrow}</p>
          <h1 className="multiline-title">{homeContent.hero2_title}</h1>
          <a className="outline-button" href={homeContent.hero2_cta_url}>{homeContent.hero2_cta_label}</a>
        </div>}
        <button className="hero-arrow hero-arrow--prev" type="button" aria-label="上一张" onClick={() => moveHero(-1)}>‹</button>
        <button className="hero-arrow hero-arrow--next" type="button" aria-label="下一张" onClick={() => moveHero(1)}>›</button>
        <div className="hero-dots" aria-label="选择轮播图">{[0, 1].map((index) => <button key={index} type="button" className={heroIndex === index ? "active" : ""} aria-label={`第 ${index + 1} 张`} aria-current={heroIndex === index ? "true" : undefined} onClick={() => setHeroIndex(index)} />)}</div>
      </section>

      {homeContent.show_featured !== "0" && <section className="product-section" id="products">
        <div className="section-heading">
          <div><h2>{homeContent.featured_title}</h2><p>{homeContent.featured_subtitle}</p></div>
          <a href="/catalog/products">{homeContent.featured_cta_label}</a>
        </div>
        <div className="product-grid">
          {featuredProducts.map((product) => (
            <article className="product-card" key={product.slug}>
              <div className="product-image-wrap">
                <span className="badge">{product.badge}</span>
                <a href={`/products/${product.slug}`}><Image src={product.image} alt={product.name} width={700} height={727} sizes="(max-width: 700px) 50vw, 25vw" /></a>
                {product.inventoryVerified && (product.stock ?? 0) > 0 ? <button onClick={() => addToCart(product)}>加入购物袋</button> : <a className="home-restock-link" href={`/products/${product.slug}`}>到货提醒</a>}
              </div>
              <h3><a href={`/products/${product.slug}`}>{product.name}</a></h3>
              <p className="price">{formatCnyFromRub(product.price)} {product.oldPrice && <del>{formatCnyFromRub(product.oldPrice)}</del>}</p>
            </article>
          ))}
        </div>
      </section>}

      {homeContent.show_categories !== "0" && <section className="category-section" aria-label="热门分类"><div className="section-heading"><h2>{homeContent.categories_title}</h2></div><div className="category-grid">
        <a className="category-card" href={homeContent.category_1_url}>
          <Image src="/assets/04.webp" alt="彩妆" width={960} height={1280} sizes="(max-width: 700px) 100vw, 33vw" />
          <span>{homeContent.category_1_label}</span>
        </a>
        <a className="category-card" href={homeContent.category_2_url}>
          <Image src="/assets/01.webp" alt="护肤" width={960} height={1439} sizes="(max-width: 700px) 100vw, 33vw" />
          <span>{homeContent.category_2_label}</span>
        </a>
        <a className="category-card" href={homeContent.category_3_url}>
          <Image src="/assets/13.webp" alt="家居护理" width={960} height={960} sizes="(max-width: 700px) 100vw, 33vw" />
          <span>{homeContent.category_3_label}</span>
        </a>
      </div></section>}

      {homeContent.show_reels !== "0" && <section className="reels-section" aria-labelledby="reels-title">
        <div className="reels-heading"><h2 id="reels-title">{homeContent.reels_title}</h2><p>{homeContent.reels_subtitle}</p></div>
        <div className="reels-grid">
          {reels.map((reel) => <article className="reel-card" key={reel.player}>
            <div className="reel-video"><iframe src={`https://runtime.strm.yandex.ru/player/video/${reel.player}`} title={`${reel.title} 视频`} loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div>
            <a className="reel-product" href={`/products/${reel.slug}`}>
              {reel.product && <Image src={reel.product.image} alt="" width={700} height={727} sizes="(max-width: 700px) 80vw, 20vw" />}
              <span><b>{reel.title}</b><em>{reel.product ? formatCnyFromRub(reel.product.price) : "查看商品"}</em></span>
            </a>
          </article>)}
        </div>
      </section>}

      <footer className="pusy-footer">
        <div className="footer-contact-line"><span>© PÚSY 2026 · <a href="https://pusy.cn">PUSY.CN</a> · 中国</span><div><a href="/contact">客户服务</a><a href="/stores-china#retail-partnership">商务合作</a><a href="/details">经营者信息</a></div></div>
        <div className="footer-logo">púsy</div>
        <div className="footer-links">
          <div><a href="/catalog/products">商品目录</a><a href="/about">关于我们</a><a href="/delivery">配送说明</a><a href="/return">退换货</a><a href="/payment">支付方式</a></div>
          <div><a href="/stores-china">中国渠道</a><a href="/gift-card/questions">礼品卡问题</a><a href="/faq">常见问题</a><a href="/oferta">用户服务协议</a><a href="/privacy">隐私政策</a><a href="/cookie">Cookie 政策</a><a href="/details">经营者信息</a></div>
        </div>
        {homeContent.show_newsletter !== "0" && <div className="footer-subscribe"><p>{homeContent.newsletter_title}</p>{subscribed ? <span>{homeContent.newsletter_success}</span> : <><form onSubmit={subscribe}><label className="sr-only" htmlFor="email">电子邮箱</label><input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="电子邮箱" required /><button type="submit">➤</button></form><small>提交即表示同意我们按照<a href="/privacy">隐私政策</a>发送品牌资讯，可随时退订。</small></>}</div>}
      </footer>
    </main>
  );
}
