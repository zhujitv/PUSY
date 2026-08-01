import Image from "next/image";
import Link from "next/link";
import { productWorlds } from "./about-content";
import styles from "./styles/about-product-worlds.module.css";

export function AboutProductWorlds() {
  return (
    <>
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

        <section className={`${styles.worlds} about-section-container`} aria-labelledby="worlds-title">
          <div className="about-section-heading">
            <p className="about-eyebrow">PÚSY 产品世界</p>
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
    </>
  );
}
