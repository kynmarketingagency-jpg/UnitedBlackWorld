import { FaCompass } from 'react-icons/fa';
import styles from './Hero.module.css';

export default function Hero() {
    return (
        <div className={styles.hero}>
            <div className={styles.overlay}>
                <div className={styles.compassContainer}>
                    <FaCompass className={styles.bgCompass} />
                </div>
            </div>

            <div className={styles.content}>
                <h1 className={styles.title}>
                    Every Man Has Two <span className={styles.highlight}>Educators</span>
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
