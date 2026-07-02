'use client';
import { useEffect, useState } from 'react';

export const dynamic = 'force-dynamic';

const EVENT_LABELS = {
  login_failed: '🔑 Failed admin login',
  delete_files_denied: '🗑️ Blocked file-delete attempt',
  upload_denied: '📤 Blocked upload attempt',
  resource_create_denied: '➕ Blocked create attempt',
  resource_delete_denied: '❌ Blocked delete attempt',
};

function timeAgo(iso) {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const s = Math.max(0, Math.round((now - then) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export default function SecurityDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/security-events', { cache: 'no-store' });
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      if (!res.ok) throw new Error(await res.text());
      setData(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 30000); // auto-refresh every 30s
    return () => clearInterval(t);
  }, []);

  const wrap = { maxWidth: 1000, margin: '0 auto', padding: '2rem 1.5rem', color: '#e8e8e8', fontFamily: 'system-ui, sans-serif' };
  const card = { background: '#1a1a1a', border: '1px solid #333', borderRadius: 10, padding: '1rem 1.25rem', marginBottom: '1.5rem' };
  const th = { textAlign: 'left', padding: '8px 10px', borderBottom: '2px solid #333', fontSize: 13, color: '#9aa', whiteSpace: 'nowrap' };
  const td = { padding: '8px 10px', borderBottom: '1px solid #262626', fontSize: 13, verticalAlign: 'top' };
  const ipStyle = { fontFamily: 'monospace', color: '#ffb454' };

  const events = data?.events || [];
  const deletions = data?.deletions || [];

  // Count attempts per IP to surface repeat offenders.
  const byIp = {};
  for (const e of events) byIp[e.ip] = (byIp[e.ip] || 0) + 1;
  const topIps = Object.entries(byIp).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div style={{ background: '#0e0e0e', minHeight: '100vh' }}>
      <div style={wrap}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ margin: 0, fontSize: 24 }}>🛡️ Security Log</h1>
          <div>
            <a href="/admin" style={{ color: '#7ab8ff', marginRight: 16, textDecoration: 'none' }}>← Back to admin</a>
            <button onClick={load} style={{ background: '#2a2a2a', color: '#e8e8e8', border: '1px solid #444', borderRadius: 6, padding: '6px 12px', cursor: 'pointer' }}>
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>

        <p style={{ color: '#888', fontSize: 13, marginTop: -8 }}>
          Blocked attempts and deletions, newest first. Auto-refreshes every 30s.
        </p>

        {error && (
          <div style={{ ...card, borderColor: '#a33', color: '#f99' }}>Error loading log: {error}</div>
        )}

        {data?.setupNeeded && (
          <div style={{ ...card, borderColor: '#a80', color: '#fc9' }}>
            The security tables aren’t created yet. Run <code>scripts/security-events.sql</code> and{' '}
            <code>scripts/lockdown-rls.sql</code> in the Supabase SQL Editor, then refresh.
          </div>
        )}

        {topIps.length > 0 && (
          <div style={card}>
            <h3 style={{ margin: '0 0 10px', fontSize: 15 }}>Most active IPs</h3>
            {topIps.map(([ip, n]) => (
              <div key={ip} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                <span style={ipStyle}>{ip}</span>
                <span style={{ color: n >= 5 ? '#ff6b6b' : '#aaa' }}>{n} attempt{n === 1 ? '' : 's'}</span>
              </div>
            ))}
          </div>
        )}

        <div style={card}>
          <h3 style={{ margin: '0 0 10px', fontSize: 15 }}>Blocked attempts ({events.length})</h3>
          {events.length === 0 ? (
            <p style={{ color: '#7a7', fontSize: 13 }}>✓ No blocked attempts recorded. All quiet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr><th style={th}>When</th><th style={th}>What</th><th style={th}>IP</th><th style={th}>Browser</th></tr>
                </thead>
                <tbody>
                  {events.map((e) => (
                    <tr key={e.id}>
                      <td style={td} title={e.created_at}>{timeAgo(e.created_at)}</td>
                      <td style={td}>{EVENT_LABELS[e.event_type] || e.event_type}</td>
                      <td style={{ ...td, ...ipStyle }}>{e.ip}</td>
                      <td style={{ ...td, color: '#888', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={e.user_agent}>{e.user_agent}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={card}>
          <h3 style={{ margin: '0 0 10px', fontSize: 15 }}>Deletions ({deletions.length})</h3>
          {deletions.length === 0 ? (
            <p style={{ color: '#7a7', fontSize: 13 }}>✓ No deletions recorded since the audit log was installed.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr><th style={th}>When</th><th style={th}>Action</th><th style={th}>Title</th><th style={th}>Category</th></tr>
                </thead>
                <tbody>
                  {deletions.map((d) => (
                    <tr key={d.id}>
                      <td style={td} title={d.happened_at}>{timeAgo(d.happened_at)}</td>
                      <td style={td}>{d.action}</td>
                      <td style={td}>{d.title || `#${d.resource_id}`}</td>
                      <td style={{ ...td, color: '#888' }}>{d.category || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
