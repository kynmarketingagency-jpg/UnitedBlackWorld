'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaPlus, FaTrash, FaBook, FaVideo, FaMusic, FaSignOutAlt, FaAnchor } from 'react-icons/fa';
import { getAllResources, uploadFileToStorage, createResource, deleteResource } from '@/lib/supabase';
import styles from './Admin.module.css';

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
        file: null
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

    async function handleSubmit(e) {
        e.preventDefault();

        if (!formData.file) {
            alert('Please select a file to upload');
            return;
        }

        try {
            setUploading(true);

            // Step 1: Upload file directly to Supabase Storage (BYPASSES SERVER!)
            console.log('📤 Starting direct browser upload...');
            const { url, path } = await uploadFileToStorage(formData.file, formData.category);
            console.log('✅ File uploaded successfully:', url);
            console.log('📁 File path in storage:', path);

            // Step 2: Save metadata to database (including file_path for deletion)
            console.log('💾 Saving metadata to database...');
            await createResource({
                title: formData.title,
                author: formData.author,
                category: formData.category,
                pdf_url: url,
                file_path: path
            });
            console.log('✅ Resource created successfully');

            // Reset form and refresh list
            setFormData({ title: '', author: '', category: 'books', file: null });
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

    async function handleDelete(id, filePath) {
        if (!confirm('Are you sure you want to delete this resource?')) {
            return;
        }

        try {
            await deleteResource(id, filePath);
            await fetchResources();
            alert('Resource deleted successfully! File removed from storage too.');
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
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    required
                                >
                                    <option value="books">Book (PDF)</option>
                                    <option value="video">Video (MP4)</option>
                                    <option value="audio">Audio (MP3)</option>
                                </select>
                            </div>

                            <div className={styles.formGroup}>
                                <label>File * {formData.file && `(${formData.file.name})`}</label>
                                <input
                                    type="file"
                                    onChange={handleFileChange}
                                    accept=".pdf,.mp4,.mp3"
                                    required
                                />
                                <small style={{ color: '#999', marginTop: '0.5rem', display: 'block' }}>
                                    💡 Large files upload directly to storage - no server timeouts!
                                </small>
                            </div>

                            <div className={styles.actions}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowForm(false);
                                        setFormData({ title: '', author: '', category: 'books', file: null });
                                    }}
                                    className={styles.cancelBtn}
                                    disabled={uploading}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className={styles.saveBtn} disabled={uploading}>
                                    {uploading ? 'Uploading...' : 'Upload Resource'}
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
                                    <div className={styles.cardHeader}>
                                        <span className={styles.type}>{resource.category.toUpperCase()}</span>
                                        <span>{new Date(resource.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <h3>{resource.title}</h3>
                                    <p className={styles.bookAuthor}>by {resource.author}</p>
                                    <div className={styles.cardActions}>
                                        <a href={resource.pdf_url} target="_blank" rel="noopener noreferrer">
                                            <button>View</button>
                                        </a>
                                        <button
                                            onClick={() => handleDelete(resource.id, resource.file_path)}
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
