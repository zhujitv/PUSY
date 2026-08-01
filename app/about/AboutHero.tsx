import Image from "next/image";
import Link from "next/link";
import styles from "./styles/about-hero.module.css";

export function AboutHero() {
  return (
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

          <div className={`${styles.heroIntro} about-section-container`}>
            <p className={`${styles.heroEyebrow} about-eyebrow`}>PÚSY 品牌故事</p>
            <h1 id="about-title">
              <span>从第一罐开始，</span>
              <span>让变美更简单</span>
            </h1>
            <div className={styles.heroCopy}>
              <p>
                PÚSY 诞生于 2021 年。从眉妆到彩妆、护理、家居与头发护理，我们始终关注三件事：可靠的品质、鲜明的风格，以及真正好用的日常体验。
              </p>
              <div className="about-actions">
                <Link className="about-primary-action" href="/catalog/products">
                  探索全部产品
                </Link>
                <Link className="about-text-action" href="/stores-china">
                  查看中国购买渠道 <span aria-hidden="true">↗</span>
                </Link>
              </div>
            </div>
          </div>

          <dl className={`${styles.facts} about-section-container`} aria-label="PÚSY 品牌里程碑">
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
  );
}
