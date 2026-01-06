'use client';
import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { FaCompass } from 'react-icons/fa';
import styles from './Hero.module.css';

export default function Hero() {
    const contentRef = useRef(null);
    const compassRef = useRef(null);

    useEffect(() => {
        gsap.fromTo(contentRef.current,
            { y: 30, opacity: 0 },
            { y: 0, opacity: 1, duration: 1, ease: 'power3.out' }
        );

        gsap.to(compassRef.current, {
            rotation: 360,
            duration: 120,
            repeat: -1,
            ease: 'linear'
        });
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
                    "I believe that we are stronger together. This is my personal collection of thoughts, evidence, and dreams for a United Black World.
                    Here I document the path forward."
                </p>
            </div>
        </div>
    );
}
