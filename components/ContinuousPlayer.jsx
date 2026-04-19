'use client';
import { useEffect, useRef, useState } from 'react';
import { FaPlay, FaPause, FaStepBackward, FaStepForward, FaRandom, FaVolumeMute, FaVolumeUp } from 'react-icons/fa';
import { getAllResources } from '@/lib/supabase';
import { buildPlaylist, getYouTubeID, loadState, saveState, shuffle } from '@/lib/playerState';
import styles from './ContinuousPlayer.module.css';

let ytApiPromise = null;
function loadYTApi() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve(window.YT);
      return;
    }
    const prevCb = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prevCb === 'function') prevCb();
      resolve(window.YT);
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    document.body.appendChild(script);
  });
  return ytApiPromise;
}

export default function ContinuousPlayer() {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const saveIntervalRef = useRef(null);
  const initializedRef = useRef(false);

  const [videos, setVideos] = useState([]);
  const [playlistOrder, setPlaylistOrder] = useState([]);
  const [currentResourceId, setCurrentResourceId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [shuffled, setShuffled] = useState(true);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchVideos() {
      try {
        const rows = await getAllResources('video');
        const withYt = rows
          .map((r) => ({ ...r, ytId: getYouTubeID(r.youtube_url) }))
          .filter((r) => r.ytId);
        setVideos(withYt);
      } catch (err) {
        console.error('Failed to load videos:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchVideos();
  }, []);

  useEffect(() => {
    if (videos.length === 0) return;
    const state = loadState();
    const order = buildPlaylist(videos, {
      shuffled: state.shuffled,
      previousOrder: state.playlistOrder,
    });
    setPlaylistOrder(order);
    setShuffled(state.shuffled);
    setIsMuted(state.muted);

    const byYtId = state.currentYtId
      ? videos.find((v) => v.ytId === state.currentYtId)
      : null;
    const startResourceId = byYtId?.id || order[0] || null;
    setCurrentResourceId(startResourceId);
  }, [videos]);

  useEffect(() => {
    if (initializedRef.current) return;
    if (videos.length === 0 || !currentResourceId) return;
    initializedRef.current = true;

    const current = videos.find((v) => v.id === currentResourceId);
    if (!current) return;

    const state = loadState();
    const startPos = state.currentYtId === current.ytId ? state.currentPosition : 0;

    loadYTApi().then((YT) => {
      if (!containerRef.current) return;
      playerRef.current = new YT.Player(containerRef.current, {
        videoId: current.ytId,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 1,
          mute: state.muted ? 1 : 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          controls: 1,
        },
        events: {
          onReady: (e) => {
            setReady(true);
            if (startPos > 0) {
              try { e.target.seekTo(startPos, true); } catch {}
            }
            try {
              state.muted ? e.target.mute() : e.target.unMute();
            } catch {}
          },
          onStateChange: (e) => {
            const s = e.data;
            if (s === YT.PlayerState.PLAYING) {
              setIsPlaying(true);
              startSaveInterval();
            } else if (s === YT.PlayerState.PAUSED) {
              setIsPlaying(false);
              stopSaveInterval();
              persistCurrent();
            } else if (s === YT.PlayerState.ENDED) {
              setIsPlaying(false);
              stopSaveInterval();
              handleEnded();
            }
          },
        },
      });
    });

    return () => {
      stopSaveInterval();
      persistCurrent();
      try { playerRef.current?.destroy?.(); } catch {}
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videos, currentResourceId]);

  function startSaveInterval() {
    stopSaveInterval();
    saveIntervalRef.current = setInterval(persistCurrent, 5000);
  }

  function stopSaveInterval() {
    if (saveIntervalRef.current) {
      clearInterval(saveIntervalRef.current);
      saveIntervalRef.current = null;
    }
  }

  function persistCurrent() {
    try {
      const p = playerRef.current;
      if (!p || typeof p.getCurrentTime !== 'function') return;
      const ytId = p.getVideoData?.()?.video_id;
      if (!ytId) return;
      saveState({
        currentYtId: ytId,
        currentPosition: Math.floor(p.getCurrentTime()),
      });
    } catch {}
  }

  function handleEnded() {
    const current = videos.find((v) => v.id === currentResourceId);
    if (current) {
      const state = loadState();
      const watched = new Set(state.watchedResourceIds);
      watched.add(current.id);
      saveState({ watchedResourceIds: [...watched] });
    }
    advanceToNext();
  }

  function advanceToNext() {
    const idx = playlistOrder.indexOf(currentResourceId);
    let nextOrder = playlistOrder;
    let nextIdx = idx + 1;
    if (nextIdx >= playlistOrder.length) {
      nextOrder = shuffled ? shuffle(playlistOrder) : playlistOrder;
      nextIdx = 0;
      setPlaylistOrder(nextOrder);
    }
    playVideoById(nextOrder[nextIdx]);
  }

  function advanceToPrev() {
    const idx = playlistOrder.indexOf(currentResourceId);
    const prevIdx = idx <= 0 ? playlistOrder.length - 1 : idx - 1;
    playVideoById(playlistOrder[prevIdx]);
  }

  function playVideoById(resourceId) {
    const next = videos.find((v) => v.id === resourceId);
    if (!next || !playerRef.current) return;
    setCurrentResourceId(resourceId);
    try {
      playerRef.current.loadVideoById(next.ytId);
      saveState({ currentYtId: next.ytId, currentPosition: 0, playlistOrder });
    } catch (err) {
      console.error('loadVideoById failed:', err);
    }
  }

  function togglePlay() {
    const p = playerRef.current;
    if (!p) return;
    if (isPlaying) p.pauseVideo(); else p.playVideo();
  }

  function toggleMute() {
    const p = playerRef.current;
    if (!p) return;
    if (isMuted) { p.unMute(); setIsMuted(false); saveState({ muted: false }); }
    else { p.mute(); setIsMuted(true); saveState({ muted: true }); }
  }

  function toggleShuffle() {
    const newShuffled = !shuffled;
    setShuffled(newShuffled);
    const newOrder = newShuffled ? shuffle(videos.map(v => v.id)) : videos.map(v => v.id);
    setPlaylistOrder(newOrder);
    saveState({ shuffled: newShuffled, playlistOrder: newOrder });
  }

  const currentVideo = videos.find((v) => v.id === currentResourceId);
  const currentIdx = playlistOrder.indexOf(currentResourceId);
  const upNext = [];
  const lookahead = Math.min(20, Math.max(playlistOrder.length - 1, 0));
  for (let i = 1; i <= lookahead; i++) {
    const id = playlistOrder[(currentIdx + i) % Math.max(playlistOrder.length, 1)];
    const v = videos.find((x) => x.id === id);
    if (v && v.id !== currentResourceId) upNext.push(v);
  }

  if (loading) {
    return <div className={styles.loading}>Tuning in to the broadcast…</div>;
  }
  if (videos.length === 0) {
    return <div className={styles.empty}>No videos in the archive yet.</div>;
  }

  return (
    <div className={styles.player}>
      <div className={styles.broadcastBadge}>
        <span className={styles.liveDot}></span> NOW BROADCASTING
      </div>

      <div className={styles.stage}>
        <div className={styles.videoWrap}>
          <div ref={containerRef} className={styles.iframe}></div>
          {!ready && <div className={styles.videoOverlay}>Loading...</div>}
        </div>

        <div className={styles.sidebar}>
          {currentVideo && (
            <div className={styles.meta}>
              <p className={styles.nowPlayingLabel}>NOW PLAYING</p>
              <h3 className={styles.title}>{currentVideo.title}</h3>
              <p className={styles.author}>by {currentVideo.author}</p>
            </div>
          )}

          <div className={styles.controls}>
            <button onClick={advanceToPrev} className={styles.btn} aria-label="Previous" disabled={!ready}>
              <FaStepBackward />
            </button>
            <button onClick={togglePlay} className={`${styles.btn} ${styles.playBtn}`} aria-label={isPlaying ? 'Pause' : 'Play'} disabled={!ready}>
              {isPlaying ? <FaPause /> : <FaPlay />}
            </button>
            <button onClick={advanceToNext} className={styles.btn} aria-label="Next" disabled={!ready}>
              <FaStepForward />
            </button>
            <button onClick={toggleShuffle} className={`${styles.btn} ${shuffled ? styles.active : ''}`} aria-label="Shuffle">
              <FaRandom />
            </button>
            <button onClick={toggleMute} className={styles.btn} aria-label={isMuted ? 'Unmute' : 'Mute'} disabled={!ready}>
              {isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
            </button>
          </div>

          {upNext.length > 0 && (
            <div className={styles.upNext}>
              <p className={styles.upNextLabel}>UP NEXT</p>
              <ul>
                {upNext.map((v) => (
                  <li key={v.id} className={styles.upNextItem} onClick={() => playVideoById(v.id)}>
                    <span className={styles.upNextTitle}>{v.title}</span>
                    <span className={styles.upNextAuthor}>by {v.author}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
