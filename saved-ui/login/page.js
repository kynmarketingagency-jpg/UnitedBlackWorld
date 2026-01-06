'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaLock, FaAnchor, FaSkull } from 'react-icons/fa';
import styles from './Login.module.css';

export default function Login() {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');

        try {
            const res = await fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });

            if (res.ok) {
                router.push('/admin');
                router.refresh();
            } else {
                const data = await res.json();
                setError(data.message || 'Incorrect Captain\'s Code');
            }
        } catch (err) {
            setError('Something went wrong. Try again.');
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
                            type="text"
                            placeholder="Captain's Code..."
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoFocus
                        />
                    </div>

                    {error && <div className={styles.error}>{error}</div>}

                    <button type="submit" className={styles.loginBtn}>Unlock Log</button>
                </form>

                <a href="/" className={styles.backLink}><FaAnchor /> Return to Ship</a>
            </div>
        </div>
    );
}
