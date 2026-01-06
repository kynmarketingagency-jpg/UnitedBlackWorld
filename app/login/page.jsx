'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaLock, FaAnchor, FaSkull } from 'react-icons/fa';
import styles from './Login.module.css';

export default function Login() {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });

            const data = await res.json();

            if (res.ok) {
                // Store auth token in localStorage
                localStorage.setItem('adminAuth', 'true');
                router.push('/admin');
                router.refresh();
            } else {
                setError(data.message || 'Incorrect Captain\'s Code');
            }
        } catch (err) {
            console.error('Login error:', err);
            setError('Something went wrong. Try again.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.icon}>
                    <FaSkull />
                </div>
                <h1>Captain's Quarters</h1>
                <p>Speak the code to enter.</p>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.inputGroup}>
                        <FaLock className={styles.inputIcon} />
                        <input
                            type="password"
                            placeholder="Captain's Code..."
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoFocus
                            required
                        />
                    </div>

                    {error && <div className={styles.error}>{error}</div>}

                    <button type="submit" className={styles.loginBtn} disabled={loading}>
                        {loading ? 'Unlocking...' : 'Unlock Log'}
                    </button>
                </form>

                <a href="/" className={styles.backLink}>
                    <FaAnchor /> Return to Ship
                </a>
            </div>
        </div>
    );
}
