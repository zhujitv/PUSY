import Image from "next/image";
import { chapters } from "./about-content";
import styles from "./styles/about-history.module.css";

export function AboutHistory() {
  return (
        <section className={styles.history} aria-labelledby="history-title">
          <header className={`${styles.historyHeader} about-section-container`}>
            <p className={`${styles.historyEyebrow} about-eyebrow`}>2021—2026</p>
            <h2 id="history-title">六年，不断向前</h2>
          </header>
          <div className={`${styles.historyGrid} about-section-container`}>
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
  );
}
