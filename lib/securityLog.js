import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * Record a blocked/failed access attempt to the security_events table.
 *
 * Fail-safe: never throws and never blocks the caller's real response.
 * If the table doesn't exist yet (SQL not run) or the insert fails, it
 * just logs to the server console and moves on.
 *
 * @param {string} eventType - e.g. 'login_failed', 'delete_files_denied'
 * @param {Request} request  - the incoming request (for IP + user agent)
 * @param {string} [detail]  - optional short context (e.g. attempted keys)
 */
export async function logSecurityEvent(eventType, request, detail = '') {
  try {
    const ip = (request.headers.get('x-forwarded-for') || 'unknown')
      .split(',')[0]
      .trim();
    const ua = request.headers.get('user-agent') || 'unknown';
    await getSupabaseAdmin()
      .from('security_events')
      .insert({
        event_type: eventType,
        ip,
        user_agent: ua,
        detail: detail ? String(detail).slice(0, 500) : null,
      });
  } catch (e) {
    console.error('[securityLog] could not record event:', e.message);
  }
}
