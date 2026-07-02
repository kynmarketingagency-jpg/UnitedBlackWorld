'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaPlus, FaTrash, FaBook, FaVideo, FaMusic, FaSignOutAlt, FaAnchor } from 'react-icons/fa';
import { getAllResources, uploadFileToStorage, createResource, deleteResource } from '@/lib/supabase';
import styles from './Admin.module.css';

// Prevent static generation for this page
export const dynamic = 'force-dynamic';

const ADMIN_PAGE_SIZE = 30;

export default function AdminDashboard() {
    const [resources, setResources] = useState([]);
    const [activeTab, setActiveTab] = useState('all');
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadStage, setUploadStage] = useState('');
    const [uploadProgress, setUploadProgress] = useState(0);
    const [visibleCount, setVisibleCount] = useState(ADMIN_PAGE_SIZE);
    const router = useRouter();

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        author: '',
        category: 'books',
        file: null,          // For PDF (books only)
        youtubeUrl: '',      // For video/audio (YouTube)
        twitterUrl: '',      // For video/audio (Twitter/X)
        instagramUrl: '',    // For video/audio (Instagram)
        tiktokUrl: ''        // For video/audio (TikTok)
    });

    useEffect(() => {
        // Check authentication
        const isAuth = localStorage.getItem('adminAuth');
        if (!isAuth) {
            router.push('/login');
            return;
        }

        fetchResources();
    }, []);

    async function fetchResources() {
        try {
            setLoading(true);
            const data = await getAllResources();
            setResources(data);
        } catch (error) {
            console.error('Error fetching resources:', error);
            alert('Failed to load resources');
        } finally {
            setLoading(false);
        }
    }

    async function handleLogout() {
        localStorage.removeItem('adminAuth');
        await fetch('/api/auth', { method: 'DELETE' }).catch(() => {});
        router.push('/');
    }

    function handleFileChange(e) {
        const file = e.target.files[0];
        if (file) {
            setFormData({ ...formData, file });
        }
    }

    function handleCategoryChange(e) {
        const newCategory = e.target.value;
        setFormData({
            ...formData,
            category: newCategory,
            file: null,
            youtubeUrl: '',
            twitterUrl: '',
            instagramUrl: '',
            tiktokUrl: ''
        });
    }

    async function handleSubmit(e) {
        e.preventDefault();

        try {
            setUploading(true);
            setUploadProgress(0);

            if (formData.category === 'books') {
                if (!formData.file) {
                    alert('Please select a PDF file');
                    return;
                }

                setUploadStage(`Uploading PDF (${(formData.file.size / 1024 / 1024).toFixed(1)} MB)...`);
                const { url: pdfUrl, path: pdfPath } = await uploadFileToStorage(
                    formData.file,
                    'books',
                    (pct) => setUploadProgress(pct)
                );

                setUploadStage('Generating thumbnail...');
                setUploadProgress(0);
                const { generateThumbnailFile } = await import('@/lib/pdfThumbnail');
                const thumbnailFile = await generateThumbnailFile(formData.file);

                setUploadStage('Uploading thumbnail...');
                const { url: thumbnailUrl } = await uploadFileToStorage(
                    thumbnailFile,
                    'thumbnails',
                    (pct) => setUploadProgress(pct)
                );

                setUploadStage('Saving to database...');
                setUploadProgress(100);
                await createResource({
                    title: formData.title,
                    author: formData.author,
                    category: formData.category,
                    pdf_url: pdfUrl,
                    file_path: pdfPath,
                    thumbnail_url: thumbnailUrl
                });

            } else {
                // Video/Audio: Save YouTube, Twitter, Instagram, or TikTok URL
                if (!formData.youtubeUrl && !formData.twitterUrl && !formData.instagramUrl && !formData.tiktokUrl) {
                    alert('Please enter at least one URL (YouTube, Twitter/X, Instagram, or TikTok)');
                    return;
                }

                console.log(`🎬 Processing ${formData.category} upload...`);

                // Save URL to database
                await createResource({
                    title: formData.title,
                    author: formData.author,
                    category: formData.category,
                    youtube_url: formData.youtubeUrl || null,
                    twitter_url: formData.twitterUrl || null,
                    instagram_url: formData.instagramUrl || null,
                    tiktok_url: formData.tiktokUrl || null
                });
                console.log('✅ URL saved successfully!');
            }

            // Reset form and refresh list
            setFormData({ title: '', author: '', category: 'books', file: null, youtubeUrl: '', twitterUrl: '', instagramUrl: '', tiktokUrl: '' });
            setShowForm(false);
            await fetchResources();
            alert('Resource uploaded successfully! 🎉');

        } catch (error) {
            console.error('Upload error:', error);
            alert('Upload failed: ' + error.message);
        } finally {
            setUploading(false);
            setUploadStage('');
            setUploadProgress(0);
        }
    }

    async function handleDelete(resource) {
        if (!confirm('Are you sure you want to delete this resource?')) {
            return;
        }

        try {
            let thumbnailPath = null;
            if (resource.thumbnail_url) {
                const match = resource.thumbnail_url.match(/\/(thumbnails\/[^?]+)/);
                if (match) thumbnailPath = match[1];
            }

            await deleteResource(resource.id, resource.file_path, thumbnailPath);
            await fetchResources();
            alert('Resource deleted successfully!');
        } catch (error) {
            console.error('Delete error:', error);
            alert('Failed to delete resource');
        }
    }

    const filteredResources = activeTab === 'all'
        ? resources
        : resources.filter(r => r.category === activeTab);

    useEffect(() => {
        setVisibleCount(ADMIN_PAGE_SIZE);
    }, [activeTab]);

    const visibleResources = filteredResources.slice(0, visibleCount);

    return (
        <div className={styles.adminContainer}>
            {/* Header */}
            <header className={styles.header}>
                <div className={styles.brand}>
                    <FaAnchor className={styles.icon} />
                    <h1>Captain's Quarters</h1>
                </div>

                <div className={styles.headerActions}>
                    <a href="/admin/security" className={styles.backLink}>
                        🛡️ Security
                    </a>
                    <a href="/" className={styles.backLink}>
                        Return to Ship
                    </a>
                    <button onClick={handleLogout} className={styles.logoutBtn}>
                        <FaSignOutAlt /> Logout
                    </button>
                </div>
            </header>

            {/* Tabs */}
            <div className={styles.tabs}>
                <button
                    className={`${styles.tab} ${activeTab === 'all' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('all')}
                >
                    All Resources
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'books' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('books')}
                >
                    <FaBook /> Books
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'video' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('video')}
                >
                    <FaVideo /> Videos
                </button>
                <button
                    className={`${styles.tab} ${activeTab === 'audio' ? styles.activeTab : ''}`}
                    onClick={() => setActiveTab('audio')}
                >
                    <FaMusic /> Audio
                </button>
            </div>

            {/* Main Content */}
            <main className={styles.main}>
                {!showForm && (
                    <button onClick={() => setShowForm(true)} className={styles.newBtn}>
                        <FaPlus /> Upload New Resource
                    </button>
                )}

                {/* Upload Form */}
                {showForm && (
                    <div className={styles.editor}>
                        <h2>Upload New Resource</h2>
                        <form onSubmit={handleSubmit}>
                            <div className={styles.formGroup}>
                                <label>Title *</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    required
                                    placeholder="Enter resource title"
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label>Author *</label>
                                <input
                                    type="text"
                                    value={formData.author}
                                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                                    required
                                    placeholder="Enter author name"
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label>Category *</label>
                                <select
                                    value={formData.category}
                                    onChange={handleCategoryChange}
                                    required
                                >
                                    <option value="books">Book (PDF + Auto Thumbnail)</option>
                                    <option value="video">Video (YouTube Embed)</option>
                                    <option value="audio">Audio (Twitter/X, Instagram, TikTok, YouTube Links)</option>
                                </select>
                            </div>

                            {/* Conditional input based on category */}
                            {formData.category === 'books' ? (
                                <div className={styles.formGroup}>
                                    <label>PDF File * {formData.file && `(${formData.file.name})`}</label>
                                    <input
                                        type="file"
                                        onChange={handleFileChange}
                                        accept=".pdf"
                                        required
                                    />
                                    <small style={{ color: '#999', marginTop: '0.5rem', display: 'block' }}>
                                        📚 Thumbnail will be auto-generated from the first page
                                    </small>
                                </div>
                            ) : (
                                <>
                                    <div className={styles.formGroup}>
                                        <label>YouTube URL</label>
                                        <input
                                            type="url"
                                            value={formData.youtubeUrl}
                                            onChange={(e) => setFormData({ ...formData, youtubeUrl: e.target.value })}
                                            placeholder="https://www.youtube.com/watch?v=..."
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Twitter/X URL</label>
                                        <input
                                            type="url"
                                            value={formData.twitterUrl}
                                            onChange={(e) => setFormData({ ...formData, twitterUrl: e.target.value })}
                                            placeholder="https://x.com/username/status/..."
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>Instagram URL</label>
                                        <input
                                            type="url"
                                            value={formData.instagramUrl}
                                            onChange={(e) => setFormData({ ...formData, instagramUrl: e.target.value })}
                                            placeholder="https://www.instagram.com/p/..."
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label>TikTok URL</label>
                                        <input
                                            type="url"
                                            value={formData.tiktokUrl}
                                            onChange={(e) => setFormData({ ...formData, tiktokUrl: e.target.value })}
                                            placeholder="https://www.tiktok.com/@username/video/..."
                                        />
                                        <small style={{ display: 'block', marginTop: '4px', color: '#888' }}>
                                            📱 Enter at least one URL (YouTube, Twitter/X, Instagram, or TikTok)
                                        </small>
                                    </div>
                                </>
                            )}

                            {uploading && (
                                <div style={{
                                    margin: '1rem 0',
                                    padding: '1rem',
                                    background: 'rgba(239, 68, 68, 0.08)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    borderRadius: '8px',
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        marginBottom: '0.5rem',
                                        fontSize: '0.85rem',
                                        color: '#f5f5f7',
                                    }}>
                                        <span>{uploadStage || 'Processing...'}</span>
                                        <span style={{ color: '#f59e0b', fontWeight: 600 }}>{uploadProgress}%</span>
                                    </div>
                                    <div style={{
                                        height: '8px',
                                        background: 'rgba(255, 255, 255, 0.1)',
                                        borderRadius: '4px',
                                        overflow: 'hidden',
                                    }}>
                                        <div style={{
                                            height: '100%',
                                            width: `${uploadProgress}%`,
                                            background: 'linear-gradient(90deg, #ef4444, #f59e0b)',
                                            borderRadius: '4px',
                                            transition: 'width 0.2s ease',
                                        }}></div>
                                    </div>
                                </div>
                            )}

                            <div className={styles.actions}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowForm(false);
                                        setFormData({ title: '', author: '', category: 'books', file: null, youtubeUrl: '', twitterUrl: '', instagramUrl: '', tiktokUrl: '' });
                                    }}
                                    className={styles.cancelBtn}
                                    disabled={uploading}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className={styles.saveBtn} disabled={uploading}>
                                    {uploading ? (uploadStage || 'Processing...') : 'Upload Resource'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Resources Grid */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>Loading resources...</div>
                ) : (
                    <div className={styles.grid}>
                        {filteredResources.length === 0 ? (
                            <div className={styles.emptyMessage}>No resources found</div>
                        ) : (
                            visibleResources.map((resource) => (
                                <div key={resource.id} className={styles.card}>
                                    {/* Show thumbnail for books */}
                                    {resource.category === 'books' && resource.thumbnail_url && (
                                        <img
                                            src={resource.thumbnail_url}
                                            alt={resource.title}
                                            loading="lazy"
                                            className={styles.thumbnail}
                                        />
                                    )}

                                    <div className={styles.cardHeader}>
                                        <span className={styles.type}>{resource.category.toUpperCase()}</span>
                                        <span>{new Date(resource.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <h3>{resource.title}</h3>
                                    <p className={styles.bookAuthor}>by {resource.author}</p>
                                    <div className={styles.cardActions}>
                                        {resource.category === 'books' ? (
                                            <a href={resource.pdf_url} target="_blank" rel="noopener noreferrer">
                                                <button>View PDF</button>
                                            </a>
                                        ) : resource.twitter_url ? (
                                            <a href={resource.twitter_url} target="_blank" rel="noopener noreferrer">
                                                <button>View on Twitter/X</button>
                                            </a>
                                        ) : resource.instagram_url ? (
                                            <a href={resource.instagram_url} target="_blank" rel="noopener noreferrer">
                                                <button>View on Instagram</button>
                                            </a>
                                        ) : resource.tiktok_url ? (
                                            <a href={resource.tiktok_url} target="_blank" rel="noopener noreferrer">
                                                <button>View on TikTok</button>
                                            </a>
                                        ) : resource.youtube_url ? (
                                            <a href={resource.youtube_url} target="_blank" rel="noopener noreferrer">
                                                <button>View on YouTube</button>
                                            </a>
                                        ) : null}
                                        <button
                                            onClick={() => handleDelete(resource)}
                                            className={styles.deleteBtn}
                                        >
                                            <FaTrash /> Delete
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
                {!loading && filteredResources.length > visibleCount && (
                    <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                        <button
                            onClick={() => setVisibleCount((n) => n + ADMIN_PAGE_SIZE)}
                            className={styles.newBtn}
                        >
                            Load More ({filteredResources.length - visibleCount} remaining)
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
}
