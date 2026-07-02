import { NextResponse } from 'next/server';
import { deleteFromR2 } from '@/lib/r2';
import { isAuthorized, requestMeta } from '@/lib/adminAuth';
import { logSecurityEvent } from '@/lib/securityLog';

export const runtime = 'nodejs';

export async function POST(request) {
  const { ip, ua } = requestMeta(request);
  let keys = null;
  try {
    ({ keys } = await request.json());
  } catch {
    // fall through — logged below either way
  }

  if (!(await isAuthorized(request))) {
    console.warn(`[delete-files] DENIED ip=${ip} ua="${ua}" keys=${JSON.stringify(keys)}`);
    await logSecurityEvent('delete_files_denied', request, `keys=${JSON.stringify(keys)}`);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    if (!Array.isArray(keys) || keys.length === 0) {
      return NextResponse.json({ error: 'keys array required' }, { status: 400 });
    }
    await deleteFromR2(keys);
    console.log(`[delete-files] ip=${ip} deleted ${keys.length} file(s): ${JSON.stringify(keys)}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('delete-files error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
