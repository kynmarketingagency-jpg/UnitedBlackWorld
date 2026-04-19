import { NextResponse } from 'next/server';
import { deleteFromR2 } from '@/lib/r2';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const { keys } = await request.json();
    if (!Array.isArray(keys) || keys.length === 0) {
      return NextResponse.json({ error: 'keys array required' }, { status: 400 });
    }
    await deleteFromR2(keys);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('delete-files error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
