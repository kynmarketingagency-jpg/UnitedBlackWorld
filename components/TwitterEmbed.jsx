'use client';
import { useEffect } from 'react';
import styles from './TwitterEmbed.module.css';

/**
 * Extract Twitter/X tweet ID or username/status from various URL formats
 * Supports:
 * - https://twitter.com/username/status/1234567890
 * - https://x.com/username/status/1234567890
 * - https://twitter.com/i/spaces/1234567890
 * - https://x.com/i/spaces/1234567890
 */
function getTwitterEmbedUrl(url) {
  if (!url) return null;

  // Clean URL
  const cleanUrl = url.trim();

  // Pattern to match Twitter/X URLs
  const patterns = [
    // Status/tweet URLs: twitter.com/username/status/ID or x.com/username/status/ID
    /(?:twitter\.com|x\.com)\/([^\/]+)\/status\/(\d+)/,
    // Spaces URLs: twitter.com/i/spaces/ID or x.com/i/spaces/ID
    /(?:twitter\.com|x\.com)\/i\/spaces\/([a-zA-Z0-9]+)/,
  ];

  for (const pattern of patterns) {
    const match = cleanUrl.match(pattern);
    if (match) {
      // Return the full URL (Twitter embed script needs the full URL)
      return cleanUrl.split('?')[0]; // Remove query params
    }
  }

  return null;
}

export default function TwitterEmbed({ url, title }) {
  const embedUrl = getTwitterEmbedUrl(url);

  useEffect(() => {
    // Load Twitter widget script if not already loaded
    if (typeof window !== 'undefined' && embedUrl) {
      // Check if script is already loaded
      if (!window.twttr) {
        const script = document.createElement('script');
        script.src = 'https://platform.twitter.com/widgets.js';
        script.async = true;
        script.charset = 'utf-8';
        document.body.appendChild(script);
      } else {
        // If script already loaded, reload widgets
        window.twttr.widgets.load();
      }
    }
  }, [embedUrl]);

  if (!embedUrl) {
    return (
      <div className={styles.error}>
        <p>Invalid Twitter/X URL</p>
        <p className={styles.errorHint}>
          Supported formats: twitter.com/user/status/ID or x.com/user/status/ID
        </p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        {/* Twitter blockquote that will be converted to embedded tweet */}
        <blockquote className="twitter-tweet" data-theme="dark" data-width="550">
          <a href={embedUrl}>{title || 'View on Twitter/X'}</a>
        </blockquote>
      </div>
      {/* Pirate-themed border decoration */}
      <div className={styles.pirateFrame}></div>
    </div>
  );
}
