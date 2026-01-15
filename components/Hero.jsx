'use client';
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { FaCompass } from 'react-icons/fa';
import styles from './Hero.module.css';

export default function Hero() {
    const contentRef = useRef(null);
    const compassRef = useRef(null);

    useEffect(() => {
        if (contentRef.current) {
            gsap.fromTo(contentRef.current,
                { y: 30, opacity: 0 },
                { y: 0, opacity: 1, duration: 1, ease: 'power3.out' }
            );
        }

        if (compassRef.current) {
            gsap.to(compassRef.current, {
                rotation: 360,
                duration: 120,
                repeat: -1,
                ease: 'linear'
            });
        }
    }, []);

    return (
        <div className={styles.hero}>
            <div className={styles.overlay}>
                <div className={styles.compassContainer} ref={compassRef}>
                    <FaCompass className={styles.bgCompass} />
                </div>
            </div>

            <div className={styles.content} ref={contentRef}>
                <h1 className={styles.title}>
                    My Journey to <span className={styles.highlight}>Unity</span>
                </h1>
                <p className={styles.subtitle}>
                    "Every man has two educators: that which is given to him, and the other that which he gives himself. Of the two kinds the latter is by far the more desirable. Indeed all that is most worthy in man he must work out and conquer for himself. It is that which constitutes our real and best nourishment. What we are merely taught seldom nourishes the mind like that which we teach ourselves."
                </p>
                <p className={styles.attribution}>
                    — Carter G. Woodson, <em>The Mis-Education of the Negro</em>
                </p>
            </div>
        </div>
    );
}
