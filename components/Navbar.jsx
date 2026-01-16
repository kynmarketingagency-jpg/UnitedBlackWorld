'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaAnchor, FaSearch, FaSkull, FaBars, FaTimes } from 'react-icons/fa';
import Link from 'next/link';
import styles from './Navbar.module.css';

export default function Navbar() {
    const [query, setQuery] = useState('');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const router = useRouter();

    function handleSearch(e) {
        e.preventDefault();
        if (query.trim()) {
            router.push(`/library?q=${encodeURIComponent(query.trim())}`);
            setMobileMenuOpen(false);
        }
    }

    function handleLinkClick() {
        setMobileMenuOpen(false);
    }

    return (
        <nav className={styles.navbar}>
            <div className={styles.leftSection}>
                <Link href="/" className={styles.logoBox}>
                    <FaAnchor />
                </Link>
                <div className={styles.brandName}>
                    <span className={styles.brandTitle}>United Black World</span>
                    <span className={styles.brandSubtitle}>The Journal</span>
                </div>
            </div>

            <button
                className={styles.hamburger}
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle menu"
            >
                {mobileMenuOpen ? <FaTimes /> : <FaBars />}
            </button>

            <div className={`${styles.rightSection} ${mobileMenuOpen ? styles.mobileOpen : ''}`}>
                <div className={styles.links}>
                    <Link href="/" onClick={handleLinkClick}>Home</Link>
                    <Link href="/library" onClick={handleLinkClick}>The Library</Link>
                    <a href="#manifesto" onClick={handleLinkClick}>My Manifesto</a>
                    <a href="#struggle" onClick={handleLinkClick}>The Struggle</a>
                    <a href="#sounds" onClick={handleLinkClick}>Sounds</a>
                    <a href="#visions" onClick={handleLinkClick}>Visions</a>
                </div>

                <form onSubmit={handleSearch} className={styles.searchContainer}>
                    <FaSearch className={styles.searchIcon} />
                    <input
                        type="text"
                        placeholder="Scout Our World..."
                        className={styles.searchInput}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                </form>

                <Link href="/login" className={styles.profileIcon} title="Captain's Quarters" onClick={handleLinkClick}>
                    <FaSkull />
                </Link>
            </div>
        </nav>
    );
}
