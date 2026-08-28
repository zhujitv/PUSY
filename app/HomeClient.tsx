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
import { LocalizedReelVideo } from "./components/LocalizedReelVideo";


const reels = [
  { player: "vplvbx7qwc3dhtviylip", slug: "karandash-dlya-gub-pusy-cream-100460", title: "奶油唇线笔" },
  { player: "vplvxcyfckgdw6cs2ewu", slug: "rebrending-prozrachnyiy-gel-fiksator-dlya-broveiy-pusy-5ml-1-100347", title: "透明眉毛定型啫喱" },
  { player: "vplvcp63gpa52inkdmqy", slug: "avtozagar-dlya-lica-pusy-magic-water-face-self-tanner-pusy-magic-water-100-ml-25-100566", title: "面部美黑水" },
  { player: "vplv6qg7qx2yvzt6kudb", slug: "haiylaiyter-sufle-pusy-ice-baby-4-g-1-100693", title: "ICE BABY 慕斯高光" },
  { player: "vplv3xtmkw2btxrxqlnb", slug: "shampun-dlya-volos-pusy-base-hair-750-ml-3-100595", title: "BASE HAIR 洗发水" },
  { player: "vplvtyznzou7usg76z5w", slug: "kremovye-rumyana-pusy-flower-25-gr-9-100359", title: "FLOWER 奶油腮红" },
].map((reel) => ({ ...reel, product: products.find((product) => product.slug === reel.slug) }));

const heroSlides = [
  {
    desktop: "/assets/hero-2026-08-lip-tint-desktop.webp",
    mobile: "/assets/hero-2026-08-lip-tint-mobile.webp",
    alt: "PÚSY 新品镜面唇釉",
    href: "/catalog/products",
  },
  {
    desktop: "/assets/hero-2026-08-school-desktop.webp",
    mobile: "/assets/hero-2026-08-school-mobile.webp",
    alt: "PÚSY 返校季限时活动",
    href: "/collections/back-to-school",
  },
  {
    desktop: "/assets/hero-2026-08-blush-desktop.webp",
    mobile: "/assets/hero-2026-08-blush-mobile.webp",
    alt: "PÚSY 新品液体腮红",
    href: "/collections/novinki",
  },
] as const;

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
    const timer = window.setInterval(() => setHeroIndex((current) => (current + 1) % heroSlides.length), 6000);
    return () => window.clearInterval(timer);
  }, [heroPaused]);

  function moveHero(direction: number) {
    setHeroIndex((current) => (current + direction + heroSlides.length) % heroSlides.length);
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
          {heroSlides.map((slide, index) => {
            const href = index === 0 ? homeContent.hero_cta_url : index === 1 ? homeContent.hero2_cta_url : slide.href;
            const label = index === 0 ? `${slide.alt}，${homeContent.hero_cta_label}` : index === 1 ? `${homeContent.hero2_title.replace("\n", "")}，${homeContent.hero2_cta_label}` : slide.alt;
            return <div className={`hero-slide ${heroIndex === index ? "is-active" : ""}`} aria-hidden={heroIndex !== index} key={slide.desktop}>
            <a href={href} aria-label={label} tabIndex={heroIndex === index ? 0 : -1}>
              <Image className="hero-media hero-media--desktop" src={slide.desktop} alt={slide.alt} fill sizes="100vw" preload={index === 0} fetchPriority={index === 0 ? "high" : "auto"} />
              <Image className="hero-media hero-media--mobile" src={slide.mobile} alt="" fill sizes="100vw" />
            </a>
          </div>})}
        </div>
        <button className="hero-arrow hero-arrow--prev" type="button" aria-label="上一张" onClick={() => moveHero(-1)}>‹</button>
        <button className="hero-arrow hero-arrow--next" type="button" aria-label="下一张" onClick={() => moveHero(1)}>›</button>
        <div className="hero-dots" aria-label="选择轮播图">{heroSlides.map((slide, index) => <button key={slide.desktop} type="button" className={heroIndex === index ? "active" : ""} aria-label={`第 ${index + 1} 张`} aria-current={heroIndex === index ? "true" : undefined} onClick={() => setHeroIndex(index)} />)}</div>
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
          <Image src="/assets/category-2026-08-makeup.webp" alt="彩妆" width={1200} height={1200} sizes="(max-width: 700px) 100vw, 33vw" />
          <span>{homeContent.category_1_label}</span>
        </a>
        <a className="category-card" href={homeContent.category_2_url}>
          <Image src="/assets/category-2026-08-skincare.webp" alt="护肤" width={1440} height={2159} sizes="(max-width: 700px) 100vw, 33vw" />
          <span>{homeContent.category_2_label}</span>
        </a>
        <a className="category-card" href={homeContent.category_3_url}>
          <Image src="/assets/category-2026-08-home.webp" alt="家居护理" width={1200} height={1200} sizes="(max-width: 700px) 100vw, 33vw" />
          <span>{homeContent.category_3_label}</span>
        </a>
      </div></section>}

      {homeContent.show_reels !== "0" && <section className="reels-section" aria-labelledby="reels-title">
        <div className="reels-heading"><h2 id="reels-title">{homeContent.reels_title}</h2><p>{homeContent.reels_subtitle}</p></div>
        <div className="reels-grid">
          {reels.map((reel) => <article className="reel-card" key={reel.player}>
            <LocalizedReelVideo player={reel.player} title={reel.title} />
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
