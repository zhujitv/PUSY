import Image from "next/image";
import { PageShell } from "../components/SiteChrome";

const years = [
  ["2021", "PÚSY 的故事从第一批产品开始。我们不只想做化妆品，更希望创造温和呵护肌肤、支持皮肤健康的创新产品。所有产品都经过严格质量控制，并坚持不进行动物实验。"],
  ["2022", "PÚSY 成为眉毛定型啫喱品类的领先品牌，并推出日常与特别时刻都能轻松使用的 PÚSY Make-Up 彩妆系列。同年，PÚSY Home 家居与沐浴产品线开始研发。"],
  ["2023", "品牌继续深耕面部、身体与家居护理，带来沐浴露、果冻磨砂、香氛蜡烛、浴片、唇部产品以及唇笔和眉笔。"],
  ["2024", "经典 Super Fix Brow Gel 完成 2.0 升级，更多沐浴与唇部新品进入产品矩阵。包装也全面焕新，让 PÚSY 在线上线下都更容易被认出。"],
  ["2025", "PÚSY 继续拓展国际市场，并为中国建立本地化商城体验。我们关注全球趋势，同时根据中国消费者的购物、支付、配送与服务习惯调整产品沟通。"],
  ["2026", "睫毛膏、闪耀眼影、唇部果冻、丰唇笔和 Lamination 眉胶等新品陆续登场；同时推出 Base 与 Prime 两条完整头发护理产品线。"],
];

const timelineImages = [
  { src: "/assets/about-03.webp", width: 627, height: 627 },
  { src: "/assets/about-07.webp", width: 960, height: 1280 },
  { src: "/assets/about-11.webp", width: 960, height: 960 },
  { src: "/assets/about-14.webp", width: 960, height: 960 },
  { src: "/assets/about-15.webp", width: 960, height: 1280 },
  { src: "/assets/about-36.webp", width: 960, height: 997 },
];

export default function AboutPage() {
  return <PageShell><main className="about-page"><section className="about-hero"><div><p>关于品牌</p><h1>PÚSY 的故事</h1></div><Image src="/assets/about-30.webp" width={960} height={997} sizes="(max-width: 760px) 100vw, 58vw" priority unoptimized alt="PÚSY 品牌与神秘礼盒" /></section><section className="timeline">{years.map(([year, copy], index) => { const image = timelineImages[index]; return <article key={year}><div><span>{year}</span><h2>{index === 0 ? "一切，从第一瓶产品开始" : "继续向前"}</h2><p>{copy}</p></div><Image src={image.src} width={image.width} height={image.height} sizes="(max-width: 760px) 100vw, 50vw" loading="eager" unoptimized alt={`PÚSY ${year}`} /></article>; })}</section><blockquote>我们的目标，是让每一件产品都再简化一点你的美丽步骤，让出色效果来得轻松而自然。</blockquote></main></PageShell>;
}
