import Navbar from '@/components/Navbar';
import ContinuousPlayer from '@/components/ContinuousPlayer';

export const metadata = { title: 'Player Preview · UBW' };

export default function PlayerPreview() {
  return (
    <main style={{ minHeight: '100vh', background: 'var(--cl-gray, #0a0a0a)' }}>
      <Navbar />

      <section style={{ padding: '2.5rem 0' }}>
        <div style={{ textAlign: 'center', padding: '0 1rem', marginBottom: '2rem' }}>
          <p style={{
            color: '#f59e0b',
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.2em',
            margin: '0 0 0.5rem',
          }}>
            PREVIEW · NOT LIVE
          </p>
          <h1 style={{
            color: 'white',
            fontSize: 'clamp(1.5rem, 4vw, 2.25rem)',
            margin: 0,
            lineHeight: 1.2,
          }}>
            Revolutionary <span style={{ color: '#ef4444' }}>Broadcast</span>
          </h1>
        </div>

        <ContinuousPlayer />

        <div style={{
          maxWidth: '900px',
          margin: '2.5rem auto 0',
          padding: '1.25rem',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px dashed rgba(255, 255, 255, 0.15)',
          borderRadius: '8px',
          color: '#bbb',
          fontSize: '0.85rem',
          lineHeight: 1.6,
        }}>
          <strong style={{ color: '#f59e0b' }}>Testing checklist:</strong>
          <ul style={{ margin: '0.5rem 0 0 1.2rem', padding: 0 }}>
            <li>Video starts muted — click 🔇 to unmute</li>
            <li>Let a video finish — next one auto-plays</li>
            <li>Refresh page — should resume where you left off</li>
            <li>Use ⏭ / ⏮ / 🔀 to skip or shuffle</li>
            <li>Click "Up Next" items to jump to them</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
