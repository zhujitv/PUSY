"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { formatCnyFromRub, products, type Product } from "./data/products";
import { useStore } from "./components/StoreProvider";
import { HeaderIcon } from "./components/HeaderIcons";
import { storefrontNavItems, type NavigationCategory } from "./data/navigation";
import type { SiteContentSnapshot } from "../db/commerce-features";
import { SiteFooter } from "./components/SiteChrome";
import { ProductCardMedia } from "./components/ProductCardMedia";


const reels = [
  { player: "vplvbx7qwc3dhtviylip", slug: "karandash-dlya-gub-pusy-cream-100460", title: "奶油唇线笔" },
  { player: "vplvxcyfckgdw6cs2ewu", slug: "rebrending-prozrachnyiy-gel-fiksator-dlya-broveiy-pusy-5ml-1-100347", title: "透明眉毛定型啫喱" },
  { player: "vplvcp63gpa52inkdmqy", slug: "avtozagar-dlya-lica-pusy-magic-water-face-self-tanner-pusy-magic-water-100-ml-25-100566", title: "面部美黑水" },
  { player: "vplv6qg7qx2yvzt6kudb", slug: "haiylaiyter-sufle-pusy-ice-baby-4-g-1-100693", title: "ICE BABY 慕斯高光" },
  { player: "vplv3xtmkw2btxrxqlnb", slug: "shampun-dlya-volos-pusy-base-hair-750-ml-3-100595", title: "BASE HAIR 洗发水" },
  { player: "vplvtyznzou7usg76z5w", slug: "kremovye-rumyana-pusy-flower-25-gr-9-100359", title: "FLOWER 奶油腮红" },
].map((reel) => ({ ...reel, product: products.find((product) => product.slug === reel.slug) }));

export default function HomeClient({ homeContent, featuredProducts, navigationCategories }: {
  homeContent: SiteContentSnapshot;
  featuredProducts: Product[];
  navigationCategories: NavigationCategory[];
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);
  const navItems = storefrontNavItems(navigationCategories);
  const heroTouchStart = useRef<number | null>(null);
  const { cartCount, addToCart, setCartOpen, setSearchOpen } = useStore();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 560);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (heroPaused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setHeroIndex((current) => (current + 1) % 2), 6000);
    return () => window.clearInterval(timer);
  }, [heroPaused]);

  function moveHero(direction: number) {
    setHeroIndex((current) => (current + direction + 2) % 2);
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
          <div className={`hero-slide ${heroIndex === 0 ? "is-active" : ""}`} aria-hidden={heroIndex !== 0}><Image src="/assets/hero-clean-v2-42a264aa.webp" alt="PÚSY 夏日礼物活动" fill sizes="100vw" preload unoptimized fetchPriority="high" /></div>
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
            <article className="product-card product-hover-trigger" key={product.slug}>
              <div className="product-image-wrap">
                <span className="badge">{product.badge}</span>
                <a className="product-card-image-link" href={`/products/${product.slug}`}><ProductCardMedia product={product} sizes="(max-width: 700px) 50vw, 25vw" /></a>
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

      <SiteFooter newsletterTitle={homeContent.newsletter_title} newsletterSuccess={homeContent.newsletter_success} showNewsletter={homeContent.show_newsletter !== "0"} source="homepage" />
    </main>
  );
}
