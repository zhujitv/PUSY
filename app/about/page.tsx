import type { Metadata } from "next";
import { PageShell } from "../components/SiteChrome";
import "./styles/about-shared.css";
import styles from "./styles/about-page.module.css";
import { AboutChinaMission } from "./AboutChinaMission";
import { AboutHero } from "./AboutHero";
import { AboutHistory } from "./AboutHistory";
import { AboutPrinciples } from "./AboutPrinciples";
import { AboutProductWorlds } from "./AboutProductWorlds";

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

export default function AboutPage() {
  return (
    <PageShell>
      <main className={styles.page}>
        <AboutHero />
        <AboutPrinciples />
        <AboutHistory />
        <AboutProductWorlds />
        <AboutChinaMission />
      </main>
    </PageShell>
  );
}
