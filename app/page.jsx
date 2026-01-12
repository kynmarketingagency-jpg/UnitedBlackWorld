'use client';
import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import Link from 'next/link';
import { getAllResources } from '@/lib/supabase';
import { FaBook, FaVideo, FaMusic } from 'react-icons/fa';
import styles from './page.module.css';

export default function Home() {
  const [recentResources, setRecentResources] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecentResources() {
      try {
        const resources = await getAllResources();
        // Get the 6 most recent resources
        const recent = resources.slice(0, 6);
        setRecentResources(recent);
      } catch (error) {
        console.error('Error fetching recent resources:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchRecentResources();
  }, []);

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'books': return <FaBook />;
      case 'video': return <FaVideo />;
      case 'audio': return <FaMusic />;
      default: return <FaBook />;
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'books': return '#3b82f6'; // Blue
      case 'video': return '#ef4444'; // Red
      case 'audio': return '#f59e0b'; // Yellow/Orange
      default: return '#3b82f6';
    }
  };

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

          {loading ? (
            <p style={{ textAlign: 'center', color: '#888', padding: '2rem' }}>Loading recent additions...</p>
          ) : recentResources.length > 0 ? (
            <div className={styles.resourcesGrid}>
              {recentResources.map((resource) => (
                <div key={resource.id} className={styles.resourceCard}>
                  {resource.thumbnail_url && (
                    <div className={styles.thumbnail}>
                      <img src={resource.thumbnail_url} alt={resource.title} />
                    </div>
                  )}
                  <div className={styles.resourceContent}>
                    <span
                      className={styles.categoryBadge}
                      style={{ backgroundColor: getCategoryColor(resource.category) }}
                    >
                      {getCategoryIcon(resource.category)} {resource.category.toUpperCase()}
                    </span>
                    <h3 className={styles.resourceTitle}>{resource.title}</h3>
                    <p className={styles.resourceAuthor}>by {resource.author}</p>
                  </div>
                </div>
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
