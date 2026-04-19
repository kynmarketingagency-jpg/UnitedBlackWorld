import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import ContinuousPlayer from '@/components/ContinuousPlayer';
import Image from 'next/image';
import Link from 'next/link';
import { getAllResources } from '@/lib/supabase';
import { FaBook, FaVideo, FaMusic } from 'react-icons/fa';
import styles from './page.module.css';

export const revalidate = 300;

function categoryIcon(category) {
  switch (category) {
    case 'books': return <FaBook />;
    case 'video': return <FaVideo />;
    case 'audio': return <FaMusic />;
    default: return <FaBook />;
  }
}

function categoryColor(category) {
  switch (category) {
    case 'books': return '#3b82f6';
    case 'video': return '#ef4444';
    case 'audio': return '#f59e0b';
    default: return '#3b82f6';
  }
}

export default async function Home() {
  let recentResources = [];
  try {
    recentResources = await getAllResources(null, 6);
  } catch (error) {
    console.error('Error fetching recent resources:', error);
  }

  return (
    <main className={styles.main}>
      <Navbar />
      <Hero />

      <div style={{ textAlign: 'center', padding: '1.5rem 1rem 0.75rem' }}>
        <h2 className={styles.sectionTitle} style={{ margin: 0 }}>
          Revolutionary <span className={styles.highlight}>Broadcast</span>
        </h2>
      </div>
      <ContinuousPlayer />

      <section className={styles.section}>
        <div className="container">
          <h2 className={styles.sectionTitle}>
            Recent <span className={styles.highlight}>Additions</span>
          </h2>
          <p className={styles.sectionDescription}>
            Explore our growing collection of revolutionary knowledge, theory, and practice.
          </p>

          {recentResources.length > 0 ? (
            <div className={styles.resourcesGrid}>
              {recentResources.map((resource, idx) => (
                <Link
                  key={resource.id}
                  href="/library"
                  className={styles.resourceCard}
                >
                  {resource.thumbnail_url && (
                    <div className={styles.thumbnail}>
                      <Image
                        src={resource.thumbnail_url}
                        alt={resource.title}
                        width={300}
                        height={400}
                        priority={idx < 3}
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 300px"
                      />
                    </div>
                  )}
                  <div className={styles.resourceContent}>
                    <span
                      className={styles.categoryBadge}
                      style={{ backgroundColor: categoryColor(resource.category) }}
                    >
                      {categoryIcon(resource.category)} {resource.category.toUpperCase()}
                    </span>
                    <h3 className={styles.resourceTitle}>{resource.title}</h3>
                    <p className={styles.resourceAuthor}>by {resource.author}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p style={{ textAlign: 'center', color: '#888', padding: '2rem' }}>No resources yet.</p>
          )}

          <div className={styles.ctaContainer}>
            <Link href="/library" className={styles.ctaButton}>
              View All Resources
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
