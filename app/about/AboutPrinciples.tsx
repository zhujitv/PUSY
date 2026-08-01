import { principles } from "./about-content";
import styles from "./styles/about-principles.module.css";

export function AboutPrinciples() {
  return (
        <section className={`${styles.principles} about-section-container`} aria-labelledby="principles-title">
          <div className="about-section-heading">
            <p className="about-eyebrow">我们相信</p>
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
  );
}
