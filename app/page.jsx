import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import Link from 'next/link';
import styles from './page.module.css';

export default function Home() {
  return (
    <main className={styles.main}>
      <Navbar />
      <Hero />

      <section className={styles.section}>
        <div className="container">
          <h2 className={styles.sectionTitle}>
            Recent <span className={styles.highlight}>Additions</span>
          </h2>
          <p className={styles.sectionDescription}>
            Explore our growing collection of revolutionary knowledge, theory, and practice.
          </p>

          <div className={styles.ctaContainer}>
            <Link href="/library" className={styles.ctaButton}>
              Enter The Library
            </Link>
          </div>
        </div>
      </section>

      <section className={styles.aboutSection}>
        <div className="container">
          <div className={styles.aboutGrid}>
            <div className={styles.aboutCard}>
              <h3>📚 The Library</h3>
              <p>Access revolutionary texts, theory, and historical documents that have been censored or hidden from the masses.</p>
            </div>
            <div className={styles.aboutCard}>
              <h3>🎥 Visions</h3>
              <p>Video content, documentaries, and visual media that tell the untold stories of our struggle.</p>
            </div>
            <div className={styles.aboutCard}>
              <h3>🎵 Sounds</h3>
              <p>Revolutionary music, speeches, and audio that inspires action and preserves our cultural heritage.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
