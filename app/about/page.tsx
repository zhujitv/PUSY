import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageShell } from "../components/SiteChrome";
import styles from "./about.module.css";

export const metadata: Metadata = {
  title: "关于 PÚSY｜品牌故事与发展历程",
  description:
    "了解 PÚSY 从 2021 年至今的品牌故事、产品理念与发展历程，探索彩妆、护理、家居与头发护理产品。",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "关于 PÚSY｜品牌故事与发展历程",
    description: "让日常变美更简单。了解 PÚSY 的品牌理念、发展历程与中国市场故事。",
    url: "/about",
    type: "website",
  },
};

const chapters = [
  {
    year: "2021",
    title: "故事开始",
    copy: "PÚSY 推出首批产品。我们从配方体验、皮肤感受与稳定品质出发，希望把日常护理做得更直观，也更轻松。",
  },
  {
    year: "2022",
    title: "从代表单品到更多生活场景",
    copy: "眉毛定型啫喱逐渐成为品牌代表单品，PÚSY Make-Up 彩妆系列随之亮相；同年，PÚSY Home 家居与沐浴产品线开始研发。",
  },
  {
    year: "2023",
    title: "从妆容延伸至全面护理",
    copy: "产品版图继续扩展至面部、身体与家居护理，带来沐浴露、果冻磨砂、香氛蜡烛、浴片，以及更多唇部与眉部产品。",
  },
  {
    year: "2024",
    title: "经典升级，形象焕新",
    copy: "Super Fix Brow Gel 完成 2.0 升级，沐浴泡泡与唇部新品陆续加入；包装体系也全面焕新，让品牌形象更加鲜明统一。",
  },
  {
    year: "2025",
    title: "走向更多市场",
    copy: "PÚSY 进入中国与阿联酋等新市场。我们关注全球趋势，也根据不同地区的审美、购物与服务习惯，打造更贴近当地消费者的体验。",
  },
  {
    year: "2026",
    title: "继续拓展美的边界",
    copy: "睫毛膏、闪耀眼影、唇部果冻、丰唇产品与 Lamination 眉胶陆续登场，Base 与 Prime 两条头发护理产品线也进一步完善。",
  },
];

const principles = [
  {
    number: "01",
    title: "认真对待品质",
    copy: "从配方、肤感到包装与使用方式，反复审视每一个真正影响体验的细节。",
  },
  {
    number: "02",
    title: "让使用更简单",
    copy: "减少不必要的复杂步骤，让好效果更容易融入每一天。",
  },
  {
    number: "03",
    title: "尊重每一种表达",
    copy: "产品服务于真实的人，而不是单一标准；妆容与护理都可以有自己的答案。",
  },
  {
    number: "04",
    title: "坚持不进行动物实验",
    copy: "在产品持续进化的同时，始终把对生命与环境的尊重放在长期选择里。",
  },
];

const productWorlds = [
  {
    title: "眉妆",
    eyebrow: "Brow essentials",
    href: "/catalog/brows",
    image: "/assets/about-07.webp",
    width: 960,
    height: 1280,
    alt: "PÚSY 眉妆产品与模特",
  },
  {
    title: "彩妆",
    eyebrow: "Make-up",
    href: "/catalog/makiyazh",
    image: "/assets/about-03.webp",
    width: 627,
    height: 627,
    alt: "手持 PÚSY 彩妆产品",
  },
  {
    title: "面部与身体护理",
    eyebrow: "Face & body",
    href: "/catalog/uhod",
    image: "/assets/about-11.webp",
    width: 960,
    height: 960,
    alt: "PÚSY 面部与身体护理产品组合",
  },
  {
    title: "PÚSY Home",
    eyebrow: "Home rituals",
    href: "/catalog/dlya-doma",
    image: "/assets/about-14.webp",
    width: 960,
    height: 960,
    alt: "PÚSY Home 沐浴护理产品",
  },
  {
    title: "头发护理",
    eyebrow: "Hair care",
    href: "/catalog/hair",
    image: "/assets/about-15.webp",
    width: 960,
    height: 1280,
    alt: "PÚSY 头发护理使用场景",
  },
];

export default function AboutPage() {
  return (
    <PageShell>
      <main className={styles.page}>
        <section className={styles.hero} aria-labelledby="about-title">
          <div className={styles.heroMedia}>
            <picture>
              <source media="(max-width: 700px)" srcSet="/assets/about-hero-mobile-2026.webp" />
              <Image
                src="/assets/about-hero-2026.webp"
                width={2400}
                height={1226}
                sizes="100vw"
                priority
                alt="模特展示 PÚSY 彩色眉妆产品"
              />
            </picture>
            <span className={styles.heroStamp}>Est. 2021</span>
          </div>

          <div className={styles.heroIntro}>
            <p className={styles.eyebrow}>PÚSY 品牌故事</p>
            <h1 id="about-title">
              <span>从第一罐开始，</span>
              <span>让变美更简单</span>
            </h1>
            <div className={styles.heroCopy}>
              <p>
                PÚSY 诞生于 2021 年。从眉妆到彩妆、护理、家居与头发护理，我们始终关注三件事：可靠的品质、鲜明的风格，以及真正好用的日常体验。
              </p>
              <div className={styles.actions}>
                <Link className={styles.primaryAction} href="/catalog/products">
                  探索全部产品
                </Link>
                <Link className={styles.textAction} href="/stores-china">
                  查看中国购买渠道 <span aria-hidden="true">↗</span>
                </Link>
              </div>
            </div>
          </div>

          <dl className={styles.facts} aria-label="PÚSY 品牌里程碑">
            <div>
              <dt>2021</dt>
              <dd>品牌故事开始</dd>
            </div>
            <div>
              <dt>2025</dt>
              <dd>进入中国市场</dd>
            </div>
            <div>
              <dt>2026</dt>
              <dd>持续拓展产品边界</dd>
            </div>
          </dl>
        </section>

        <section className={styles.principles} aria-labelledby="principles-title">
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>我们相信</p>
            <h2 id="principles-title">好的产品，应该让人更自在</h2>
          </div>
          <div className={styles.principleGrid}>
            {principles.map((principle) => (
              <article key={principle.number}>
                <span>{principle.number}</span>
                <h3>{principle.title}</h3>
                <p>{principle.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.history} aria-labelledby="history-title">
          <header className={styles.historyHeader}>
            <p className={styles.eyebrow}>2021—2026</p>
            <h2 id="history-title">六年，不断向前</h2>
          </header>
          <div className={styles.historyGrid}>
            <div className={styles.historyVisual}>
              <Image
                src="/assets/about-history-2026.webp"
                width={1800}
                height={1800}
                sizes="(max-width: 800px) 100vw, 48vw"
                alt="模特与粉色 PÚSY 产品礼盒"
              />
              <span>Our story</span>
            </div>
            <div className={styles.historyList}>
              {chapters.map((chapter, index) => (
                <details key={chapter.year} open={index === 0}>
                  <summary>
                    <span className={styles.year}>{chapter.year}</span>
                    <span className={styles.chapterTitle}>{chapter.title}</span>
                    <span className={styles.toggle} aria-hidden="true" />
                  </summary>
                  <div className={styles.chapterCopy}>
                    <p>{chapter.copy}</p>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        <div className={styles.visualBreak} aria-hidden="true">
          <Image
            src="/assets/about-30.webp"
            width={960}
            height={997}
            sizes="100vw"
            alt=""
          />
          <p>Beauty can be easy</p>
        </div>

        <section className={styles.worlds} aria-labelledby="worlds-title">
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>PÚSY 产品世界</p>
            <h2 id="worlds-title">从一个步骤，到完整的日常</h2>
          </div>
          <div className={styles.worldGrid}>
            {productWorlds.map((world) => (
              <Link href={world.href} className={styles.worldCard} key={world.href}>
                <div className={styles.worldImage}>
                  <Image
                    src={world.image}
                    width={world.width}
                    height={world.height}
                    sizes="(max-width: 760px) 100vw, 40vw"
                    alt={world.alt}
                  />
                </div>
                <div className={styles.worldCopy}>
                  <div>
                    <p>{world.eyebrow}</p>
                    <h3>{world.title}</h3>
                  </div>
                  <span aria-hidden="true">↗</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className={styles.china} aria-labelledby="china-title">
          <p className={styles.chinaYear} aria-hidden="true">2025</p>
          <div className={styles.chinaCopy}>
            <p className={styles.eyebrow}>PÚSY in China</p>
            <h2 id="china-title">PÚSY 来到中国</h2>
            <p>
              中国官网不只是翻译后的商品页。我们围绕人民币结算、本地配送、售后支持与中国消费者熟悉的购物方式，持续完善从了解产品到收到订单的每一步。
            </p>
            <div className={styles.actions}>
              <Link className={styles.darkAction} href="/catalog/products">
                浏览中国官网
              </Link>
              <Link className={styles.textActionDark} href="/delivery">
                了解配送与服务 <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </div>
        </section>

        <section className={styles.mission} aria-labelledby="mission-title">
          <p className={styles.eyebrow}>我们的使命</p>
          <h2 id="mission-title">让每一步，都再简单一点</h2>
          <blockquote>
            好的产品不需要复杂说明。它应该自然地融入日常，让你更轻松地获得想要的效果，也更自在地表达自己。
          </blockquote>
          <Link className={styles.primaryAction} href="/catalog/products">
            找到你的 PÚSY 日常
          </Link>
        </section>

        <div className={styles.closingMedia}>
          <Image
            src="/assets/about-36.webp"
            width={960}
            height={997}
            sizes="100vw"
            alt="PÚSY 护理产品与品牌礼盒"
          />
        </div>
      </main>
    </PageShell>
  );
}
