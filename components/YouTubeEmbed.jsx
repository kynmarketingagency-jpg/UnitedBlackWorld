'use client';
import styles from './YouTubeEmbed.module.css';

/**
 * Extract YouTube video ID from various URL formats
 */
function getYouTubeID(url) {
  if (!url) return null;

  // Already just an ID
  if (url.length === 11 && !url.includes('/') && !url.includes('.')) {
    return url;
  }

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\?\/]+)/,
    /youtube\.com\/.*[?&]v=([^&]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

export default function YouTubeEmbed({ url, title, type = 'video' }) {
  const videoId = getYouTubeID(url);

  if (!videoId) {
    return (
      <div className={styles.error}>
        <p>Invalid YouTube URL</p>
      </div>
    );
  }

  // YouTube embed URL with pirate-themed parameters
  const embedUrl = `https://www.youtube.com/embed/${videoId}?color=white&modestbranding=1&rel=0`;

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <iframe
          className={styles.iframe}
          src={embedUrl}
          title={title || `YouTube ${type}`}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>
      {/* Pirate-themed border decoration */}
      <div className={styles.pirateFrame}></div>
    </div>
  );
}
