import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { isAuthorized } from '@/lib/adminAuth';

export const runtime = 'nodejs';

export async function GET(request) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const admin = getSupabaseAdmin();
    const [events, deletions] = await Promise.all([
      admin
        .from('security_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200),
      admin
        .from('resource_audit')
        .select('*')
        .order('happened_at', { ascending: false })
        .limit(200),
    ]);

    return NextResponse.json({
      events: events.data || [],
      deletions: deletions.data || [],
      // Surface a friendly hint if the tables aren't created yet.
      setupNeeded:
        (events.error && events.error.code === '42P01') ||
        (deletions.error && deletions.error.code === '42P01') ||
        false,
      errors: {
        events: events.error?.message || null,
        deletions: deletions.error?.message || null,
      },
    });
  } catch (err) {
    console.error('security-events error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
