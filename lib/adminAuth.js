/**
 * Server-side admin session auth.
 *
 * On successful login, /api/auth sets an httpOnly cookie whose value is
 * HMAC-SHA256(ADMIN_PASSWORD, fixed message). Admin-only API routes and the
 * /admin middleware verify it with isAuthorized(). Rotating ADMIN_PASSWORD
 * invalidates all sessions.
 *
 * Uses Web Crypto so the same code runs in Node route handlers and the
 * edge middleware runtime.
 */

export const ADMIN_COOKIE = 'ubw_admin_session';

function getSecret() {
  const secret = process.env.ADMIN_PASSWORD;
  // Refuse to mint/verify tokens with a missing or default password —
  // better to lock admin out than leave the door open.
  if (!secret || secret === 'changeme') return null;
  return secret;
}

export async function sessionToken() {
  const secret = getSecret();
  if (!secret) return null;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode('ubw-admin-session-v1'));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function getCookie(request, name) {
  const header = request.headers.get('cookie') || '';
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return rest.join('=');
  }
  return null;
}

export async function isAuthorized(request) {
  const token = getCookie(request, ADMIN_COOKIE);
  if (!token) return false;
  const expected = await sessionToken();
  if (!expected || token.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

/** Client IP + user agent for audit logging (shows up in Vercel logs). */
export function requestMeta(request) {
  return {
    ip: (request.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim(),
    ua: request.headers.get('user-agent') || 'unknown',
  };
}
