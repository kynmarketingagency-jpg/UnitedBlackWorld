'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { getAllResources } from '@/lib/supabase';
import YouTubeEmbed from '@/components/YouTubeEmbed';
import { FaBook, FaVideo, FaMusic, FaDownload, FaExternalLinkAlt } from 'react-icons/fa';
import styles from './library.module.css';

function LibraryContent() {
    const [resources, setResources] = useState([]);
    const [filteredResources, setFilteredResources] = useState([]);
    const [activeFilter, setActiveFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const searchParams = useSearchParams();
    const searchQuery = searchParams.get('q');

    useEffect(() => {
        fetchResources();
    }, []);

    useEffect(() => {
        filterResources();
    }, [activeFilter, resources, searchQuery]);

    async function fetchResources() {
        try {
            setLoading(true);
            const data = await getAllResources();
            setResources(data);
            setError(null);
        } catch (err) {
            console.error('Error fetching resources:', err);
            setError('Failed to load resources. Please try again later.');
        } finally {
            setLoading(false);
        }
    }

    function filterResources() {
        let filtered = resources;

        // Filter by category
        if (activeFilter !== 'all') {
            filtered = filtered.filter(r => r.category === activeFilter);
        }

        // Filter by search query
        if (searchQuery) {
            filtered = filtered.filter(r =>
                r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                r.author.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        setFilteredResources(filtered);
    }

    function getCategoryIcon(category) {
        switch (category) {
            case 'books':
                return <FaBook />;
            case 'video':
                return <FaVideo />;
            case 'audio':
                return <FaMusic />;
            default:
                return <FaBook />;
        }
    }

    function getCategoryColor(category) {
        switch (category) {
            case 'books':
                return 'var(--cl-blue)';
            case 'video':
                return 'var(--cl-red)';
            case 'audio':
                return 'var(--cl-yellow)';
            default:
                return 'var(--cl-blue)';
        }
    }

    function getPlatformName(resource) {
        if (resource.youtube_url) return 'YOUTUBE';
        if (resource.twitter_url) return 'TWITTER/X';
        if (resource.instagram_url) return 'INSTAGRAM';
        if (resource.tiktok_url) return 'TIKTOK';
        return resource.category.toUpperCase();
    }

    return (
        <main className={styles.main}>
            <Navbar />

            <section className={styles.librarySection}>
                <div className="container">
                    <div className={styles.header}>
                        <h1 className={styles.title}>
                            The <span className={styles.highlight}>Library</span>
                        </h1>
                        {searchQuery && (
                            <p className={styles.searchInfo}>
                                Search results for: "{searchQuery}"
                            </p>
                        )}
                    </div>

                    {/* Filter Tabs */}
                    <div className={styles.filterTabs}>
                        <button
                            className={`${styles.tab} ${activeFilter === 'all' ? styles.active : ''}`}
                            onClick={() => setActiveFilter('all')}
                        >
                            All
                        </button>
                        <button
                            className={`${styles.tab} ${activeFilter === 'books' ? styles.active : ''}`}
                            onClick={() => setActiveFilter('books')}
                        >
                            Books
                        </button>
                        <button
                            className={`${styles.tab} ${activeFilter === 'video' ? styles.active : ''}`}
                            onClick={() => setActiveFilter('video')}
                        >
                            Video
                        </button>
                        <button
                            className={`${styles.tab} ${activeFilter === 'audio' ? styles.active : ''}`}
                            onClick={() => setActiveFilter('audio')}
                        >
                            Audio
                        </button>
                    </div>

                    {/* Loading State */}
                    {loading && (
                        <div className={styles.loadingContainer}>
                            <div className={styles.spinner}></div>
                            <p>Loading resources...</p>
                        </div>
                    )}

                    {/* Error State */}
                    {error && (
                        <div className={styles.errorContainer}>
                            <p>{error}</p>
                        </div>
                    )}

                    {/* Resources Grid */}
                    {!loading && !error && (
                        <>
                            {filteredResources.length === 0 ? (
                                <div className={styles.emptyState}>
                                    <p>No resources found. Check back soon!</p>
                                </div>
                            ) : (
                                <div className={styles.grid}>
                                    {filteredResources.map((resource) => (
                                        <div key={resource.id} className={styles.card}>
                                            {/* Books: Show thumbnail and PDF actions */}
                                            {resource.category === 'books' ? (
                                                <>
                                                    {/* Thumbnail */}
                                                    {resource.thumbnail_url && (
                                                        <img
                                                            src={resource.thumbnail_url}
                                                            alt={resource.title}
                                                            className={styles.thumbnail}
                                                        />
                                                    )}

                                                    <div className={styles.cardContent}>
                                                        <span
                                                            className={styles.category}
                                                            style={{ backgroundColor: getCategoryColor(resource.category) }}
                                                        >
                                                            <FaBook /> {resource.category.toUpperCase()}
                                                        </span>
                                                        <h3 className={styles.cardTitle}>{resource.title}</h3>
                                                        <p className={styles.author}>by {resource.author}</p>

                                                        <div className={styles.cardActions}>
                                                            <a
                                                                href={resource.pdf_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className={styles.actionBtn}
                                                            >
                                                                <FaExternalLinkAlt /> View PDF
                                                            </a>
                                                            <a
                                                                href={resource.pdf_url}
                                                                download
                                                                className={`${styles.actionBtn} ${styles.downloadBtn}`}
                                                            >
                                                                <FaDownload /> Download
                                                            </a>
                                                        </div>
                                                    </div>
                                                </>
                                            ) : (
                                                /* Video/Audio: Show platform badge and embed/link */
                                                <>
                                                    <div className={styles.cardContent}>
                                                        <span
                                                            className={styles.category}
                                                            style={{ backgroundColor: getCategoryColor(resource.category) }}
                                                        >
                                                            {getCategoryIcon(resource.category)} {getPlatformName(resource)}
                                                        </span>
                                                        <h3 className={styles.cardTitle}>{resource.title}</h3>
                                                        <p className={styles.author}>by {resource.author}</p>
                                                    </div>

                                                    {/* YouTube Embed with pirate theme */}
                                                    {resource.youtube_url && (
                                                        <YouTubeEmbed
                                                            url={resource.youtube_url}
                                                            title={resource.title}
                                                            type={resource.category}
                                                        />
                                                    )}

                                                    {/* Social Media Platform Buttons */}
                                                    {(resource.twitter_url || resource.instagram_url || resource.tiktok_url) && (
                                                        <div className={styles.platformButtons}>
                                                            {resource.twitter_url && (
                                                                <a
                                                                    href={resource.twitter_url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className={styles.twitterBtn}
                                                                >
                                                                    <FaExternalLinkAlt /> View on Twitter/X
                                                                </a>
                                                            )}

                                                            {resource.instagram_url && (
                                                                <a
                                                                    href={resource.instagram_url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className={styles.instagramBtn}
                                                                >
                                                                    <FaExternalLinkAlt /> View on Instagram
                                                                </a>
                                                            )}

                                                            {resource.tiktok_url && (
                                                                <a
                                                                    href={resource.tiktok_url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className={styles.tiktokBtn}
                                                                >
                                                                    <FaExternalLinkAlt /> View on TikTok
                                                                </a>
                                                            )}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </section>
        </main>
    );
}

export default function Library() {
    return (
        <Suspense fallback={
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '50px',
                        height: '50px',
                        border: '4px solid #f5f5f7',
                        borderTop: '4px solid #FF3B30',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 1rem'
                    }}></div>
                    <p style={{ color: '#8E8E93' }}>Loading library...</p>
                </div>
            </div>
        }>
            <LibraryContent />
        </Suspense>
    );
}
