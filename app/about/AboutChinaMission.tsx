import Image from "next/image";
import Link from "next/link";
import styles from "./styles/about-china-mission.module.css";

export function AboutChinaMission() {
  return (
    <>
        <section className={styles.china} aria-labelledby="china-title">
          <p className={styles.chinaYear} aria-hidden="true">2025</p>
          <div className={styles.chinaCopy}>
            <p className="about-eyebrow">PÚSY in China</p>
            <h2 id="china-title">PÚSY 来到中国</h2>
            <p className={styles.chinaBody}>
              中国官网不只是翻译后的商品页。我们围绕人民币结算、本地配送、售后支持与中国消费者熟悉的购物方式，持续完善从了解产品到收到订单的每一步。
            </p>
            <div className="about-actions">
              <Link className="about-dark-action" href="/catalog/products">
                浏览中国官网
              </Link>
              <Link className="about-text-action-dark" href="/delivery">
                了解配送与服务 <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </div>
        </section>

        <section className={`${styles.mission} about-section-container`} aria-labelledby="mission-title">
          <p className="about-eyebrow">我们的使命</p>
          <h2 id="mission-title">让每一步，都再简单一点</h2>
          <blockquote>
            好的产品不需要复杂说明。它应该自然地融入日常，让你更轻松地获得想要的效果，也更自在地表达自己。
          </blockquote>
          <Link className="about-primary-action" href="/catalog/products">
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
    </>
  );
}
