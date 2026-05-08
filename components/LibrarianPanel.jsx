'use client';
import { useEffect, useState } from 'react';
import { FaBookOpen, FaArrowRight } from 'react-icons/fa';
import { pickGreeting, pickEmpty, pickError } from '@/lib/librarian/persona';
import styles from './LibrarianPanel.module.css';

const MAX_EXCERPT = 380;

export default function LibrarianPanel({ query }) {
    const [state, setState] = useState({ status: 'idle', passages: [] });

    useEffect(() => {
        if (!query || !query.trim()) {
            setState({ status: 'idle', passages: [] });
            return;
        }
        const controller = new AbortController();
        setState({ status: 'loading', passages: [] });

        fetch('/api/librarian/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ q: query }),
            signal: controller.signal,
        })
            .then(async (r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            })
            .then((data) => {
                setState({
                    status: 'ready',
                    passages: data.passages || [],
                });
            })
            .catch((err) => {
                if (err.name === 'AbortError') return;
                setState({ status: 'error', passages: [], error: err.message });
            });

        return () => controller.abort();
    }, [query]);

    if (state.status === 'idle') return null;

    return (
        <section className={styles.panel} aria-label="Librarian results">
            <header className={styles.header}>
                <FaBookOpen className={styles.headerIcon} />
                <span className={styles.headerLabel}>From the Archives</span>
            </header>

            {state.status === 'loading' && (
                <p className={styles.greeting}>
                    <span className={styles.dot} />
                    Reading the archives, comrade…
                </p>
            )}

            {state.status === 'error' && (
                <p className={styles.errorMsg}>{pickError()}</p>
            )}

            {state.status === 'ready' && state.passages.length === 0 && (
                <p className={styles.greeting}>{pickEmpty()}</p>
            )}

            {state.status === 'ready' && state.passages.length > 0 && (
                <>
                    <p className={styles.greeting}>
                        {pickGreeting(state.passages.length)}
                    </p>
                    <div className={styles.passages}>
                        {state.passages.map((p, i) => (
                            <PassageCard
                                key={`${p.resource_id}-${p.page_number}-${i}`}
                                passage={p}
                                index={i + 1}
                            />
                        ))}
                    </div>
                </>
            )}
        </section>
    );
}

function PassageCard({ passage, index }) {
    const link = passage.pdf_url
        ? `${passage.pdf_url}#page=${passage.page_number}`
        : null;

    const excerpt = passage.content.length > MAX_EXCERPT
        ? passage.content.slice(0, MAX_EXCERPT).trim() + '…'
        : passage.content;

    return (
        <article className={styles.passage}>
            <div className={styles.passageIndex}>
                {String(index).padStart(2, '0')}
            </div>
            <div className={styles.passageBody}>
                <div className={styles.passageHead}>
                    <div className={styles.passageMeta}>
                        <h4 className={styles.bookTitle}>{passage.book_title}</h4>
                        {passage.author && <p className={styles.author}>by {passage.author}</p>}
                    </div>
                    <span className={styles.pageBadge}>P. {passage.page_number}</span>
                </div>
                <p className={styles.excerpt}>“{excerpt}”</p>
                {link && (
                    <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.openLink}
                    >
                        Open at this page <FaArrowRight />
                    </a>
                )}
            </div>
        </article>
    );
}
