'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaPlus, FaTrash, FaBook, FaVideo, FaMusic, FaSignOutAlt, FaAnchor } from 'react-icons/fa';
import { getAllResources, uploadFileToStorage, createResource, deleteResource } from '@/lib/supabase';
import styles from './Admin.module.css';

// Prevent static generation for this page
export const dynamic = 'force-dynamic';

export default function AdminDashboard() {
    const [resources, setResources] = useState([]);
    const [activeTab, setActiveTab] = useState('all');
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const router = useRouter();

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        author: '',
        category: 'books',
        file: null,          // For PDF (books only)
        youtubeUrl: ''       // For video/audio
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

    function handleLogout() {
        localStorage.removeItem('adminAuth');
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
            youtubeUrl: ''
        });
    }

    async function handleSubmit(e) {
        e.preventDefault();

        try {
            setUploading(true);

            if (formData.category === 'books') {
                // Books: Upload PDF + auto-generate thumbnail
                if (!formData.file) {
                    alert('Please select a PDF file');
                    return;
                }

                console.log('📚 Processing book upload...');

                // Step 1: Upload PDF to storage
                console.log('📤 Uploading PDF...');
                const { url: pdfUrl, path: pdfPath } = await uploadFileToStorage(
                    formData.file,
                    'books'
                );
                console.log('✅ PDF uploaded:', pdfUrl);

                // Step 2: Generate thumbnail from PDF first page (dynamic import)
                console.log('🖼️ Generating thumbnail from PDF...');
                const { generateThumbnailFile } = await import('@/lib/pdfThumbnail');
                const thumbnailFile = await generateThumbnailFile(formData.file);
                console.log('✅ Thumbnail generated');

                // Step 3: Upload thumbnail to storage
                console.log('📤 Uploading thumbnail...');
                const { url: thumbnailUrl, path: thumbnailPath } = await uploadFileToStorage(
                    thumbnailFile,
                    'thumbnails'
                );
                console.log('✅ Thumbnail uploaded:', thumbnailUrl);

                // Step 4: Save metadata to database
                console.log('💾 Saving to database...');
                await createResource({
                    title: formData.title,
                    author: formData.author,
                    category: formData.category,
                    pdf_url: pdfUrl,
                    file_path: pdfPath,
                    thumbnail_url: thumbnailUrl
                });
                console.log('✅ Book uploaded successfully!');

            } else {
                // Video/Audio: Just save YouTube URL
                if (!formData.youtubeUrl) {
                    alert('Please enter a YouTube URL');
                    return;
                }

                console.log(`🎬 Processing ${formData.category} upload...`);

                // Save YouTube URL to database
                await createResource({
                    title: formData.title,
                    author: formData.author,
                    category: formData.category,
                    youtube_url: formData.youtubeUrl
                });
                console.log('✅ YouTube URL saved successfully!');
            }

            // Reset form and refresh list
            setFormData({ title: '', author: '', category: 'books', file: null, youtubeUrl: '' });
            setShowForm(false);
            await fetchResources();
            alert('Resource uploaded successfully! 🎉');

        } catch (error) {
            console.error('Upload error:', error);
            alert('Upload failed: ' + error.message);
        } finally {
            setUploading(false);
        }
    }

    async function handleDelete(resource) {
        if (!confirm('Are you sure you want to delete this resource?')) {
            return;
        }

        try {
            // Extract thumbnail path from thumbnail_url if it exists
            let thumbnailPath = null;
            if (resource.thumbnail_url && resource.thumbnail_url.includes('/thumbnails/')) {
                const parts = resource.thumbnail_url.split('/thumbnails/');
                if (parts[1]) {
                    thumbnailPath = 'thumbnails/' + parts[1];
                }
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

    return (
        <div className={styles.adminContainer}>
            {/* Header */}
            <header className={styles.header}>
                <div className={styles.brand}>
                    <FaAnchor className={styles.icon} />
                    <h1>Captain's Quarters</h1>
                </div>

                <div className={styles.headerActions}>
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
                                    <option value="video">Video (YouTube)</option>
                                    <option value="audio">Audio (YouTube)</option>
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
                                <div className={styles.formGroup}>
                                    <label>YouTube URL *</label>
                                    <input
                                        type="url"
                                        value={formData.youtubeUrl}
                                        onChange={(e) => setFormData({ ...formData, youtubeUrl: e.target.value })}
                                        required
                                        placeholder="https://www.youtube.com/watch?v=..."
                                    />
                                    <small style={{ color: '#999', marginTop: '0.5rem', display: 'block' }}>
                                        🎬 Video will be embedded with custom pirate theme
                                    </small>
                                </div>
                            )}

                            <div className={styles.actions}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowForm(false);
                                        setFormData({ title: '', author: '', category: 'books', file: null, youtubeUrl: '' });
                                    }}
                                    className={styles.cancelBtn}
                                    disabled={uploading}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className={styles.saveBtn} disabled={uploading}>
                                    {uploading ? 'Processing...' : 'Upload Resource'}
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
                            filteredResources.map((resource) => (
                                <div key={resource.id} className={styles.card}>
                                    {/* Show thumbnail for books */}
                                    {resource.category === 'books' && resource.thumbnail_url && (
                                        <img
                                            src={resource.thumbnail_url}
                                            alt={resource.title}
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
                                        ) : (
                                            <a href={resource.youtube_url} target="_blank" rel="noopener noreferrer">
                                                <button>View on YouTube</button>
                                            </a>
                                        )}
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
            </main>
        </div>
    );
}
