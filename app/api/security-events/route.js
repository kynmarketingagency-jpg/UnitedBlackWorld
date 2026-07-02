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

    // A table that doesn't exist yet surfaces as Postgres 42P01 or, via
    // PostgREST's schema cache, PGRST205 / a "Could not find the table" message.
    const missingTable = (err) =>
      !!err &&
      (err.code === '42P01' ||
        err.code === 'PGRST205' ||
        /Could not find the table/i.test(err.message || ''));

    return NextResponse.json({
      events: events.data || [],
      deletions: deletions.data || [],
      setupNeeded: missingTable(events.error) || missingTable(deletions.error),
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
