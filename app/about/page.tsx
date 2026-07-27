import { PageShell } from "../components/SiteChrome";

const years = [
  ["2021", "PÚSY 的故事从第一批产品开始。我们不只想做化妆品，更希望创造温和呵护肌肤、支持皮肤健康的创新产品。所有产品都经过严格质量控制，并坚持不进行动物实验。"],
  ["2022", "PÚSY 成为眉毛定型啫喱品类的领先品牌，并推出日常与特别时刻都能轻松使用的 PÚSY Make-Up 彩妆系列。同年，PÚSY Home 家居与沐浴产品线开始研发。"],
  ["2023", "品牌继续深耕面部、身体与家居护理，带来沐浴露、果冻磨砂、香氛蜡烛、浴片、唇部产品以及唇笔和眉笔。"],
  ["2024", "经典 Super Fix Brow Gel 完成 2.0 升级，更多沐浴与唇部新品进入产品矩阵。包装也全面焕新，让 PÚSY 在线上线下都更容易被认出。"],
  ["2025", "PÚSY 走向世界，进入中国与阿联酋市场。我们关注全球趋势，并根据不同市场调整产品与沟通方式，让熟悉的品牌体验跨越地域。"],
  ["2026", "睫毛膏、闪耀眼影、唇部果冻、丰唇笔和 Lamination 眉胶等新品陆续登场；同时推出 Base 与 Prime 两条完整头发护理产品线。"],
];

export default function AboutPage() {
  return <PageShell><main className="about-page"><section className="about-hero"><div><p>关于品牌</p><h1>PÚSY 的故事</h1></div><img src="/assets/30.webp" alt="PÚSY 品牌与神秘礼盒" /></section><section className="timeline">{years.map(([year, copy], index) => <article key={year}><div><span>{year}</span><h2>{index === 0 ? "一切，从第一瓶产品开始" : "继续向前"}</h2><p>{copy}</p></div><img src={`/assets/${[3,7,11,14,15,36][index].toString().padStart(2, "0")}.webp`} alt={`PÚSY ${year}`} /></article>)}</section><blockquote>我们的目标，是让每一件产品都再简化一点你的美丽步骤，让出色效果来得轻松而自然。</blockquote></main></PageShell>;
}
