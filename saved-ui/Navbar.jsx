'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaAnchor, FaSearch, FaSkull } from 'react-icons/fa';
import Link from 'next/link';
import styles from './Navbar.module.css';

export default function Navbar() {
    const [query, setQuery] = useState('');
    const router = useRouter();

    function handleSearch(e) {
        e.preventDefault();
        if (query.trim()) {
            router.push(`/search?q=${encodeURIComponent(query.trim())}`);
        }
    }

    return (
        <nav className={styles.navbar}>
            <div className={styles.leftSection}>
                <div className={styles.logoBox}>
                    <FaAnchor />
                </div>
                <div className={styles.brandName}>
                    <span className={styles.brandTitle}>United Black World</span>
                    <span className={styles.brandSubtitle}>The Journal</span>
                </div>
            </div>

            <div className={styles.rightSection}>
                <div className={styles.links}>
                    <a href="/manifesto">My Manifesto</a>
                    <a href="/struggle">The Struggle</a>
                    <a href="/library">The Library</a>
                    <a href="/sounds">Sounds</a>
                    <a href="/visions">Visions</a>
                    <a href="/resources">Resources</a>
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

                <Link href="/admin" className={styles.profileIcon} title="Captain's Quarters">
                    <FaSkull />
                </Link>
            </div>
        </nav>
    );
}
