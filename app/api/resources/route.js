import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { deleteFromR2 } from '@/lib/r2';
import { isAuthorized, requestMeta } from '@/lib/adminAuth';

export const runtime = 'nodejs';

const ALLOWED_FIELDS = [
  'title',
  'author',
  'category',
  'pdf_url',
  'file_path',
  'thumbnail_url',
  'youtube_url',
  'twitter_url',
  'instagram_url',
  'tiktok_url',
  'created_at',
];

export async function POST(request) {
  const { ip, ua } = requestMeta(request);
  if (!(await isAuthorized(request))) {
    console.warn(`[resources] DENIED create ip=${ip} ua="${ua}"`);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const resource = {};
    for (const field of ALLOWED_FIELDS) {
      if (body[field] !== undefined) resource[field] = body[field];
    }
    if (!resource.title || !resource.category) {
      return NextResponse.json({ error: 'title and category required' }, { status: 400 });
    }

    const { data, error } = await getSupabaseAdmin()
      .from('resources')
      .insert([resource])
      .select()
      .single();
    if (error) throw error;

    console.log(`[resources] ip=${ip} created id=${data.id} "${data.title}"`);
    return NextResponse.json(data);
  } catch (err) {
    console.error('resources create error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  const { ip, ua } = requestMeta(request);
  let body = null;
  try {
    body = await request.json();
  } catch {
    // fall through — logged below either way
  }

  if (!(await isAuthorized(request))) {
    console.warn(`[resources] DENIED delete ip=${ip} ua="${ua}" body=${JSON.stringify(body)}`);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id, keys } = body || {};
    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    const fileKeys = Array.isArray(keys) ? keys.filter(Boolean) : [];
    if (fileKeys.length > 0) {
      await deleteFromR2(fileKeys);
    }

    const { error } = await getSupabaseAdmin()
      .from('resources')
      .delete()
      .eq('id', id);
    if (error) throw error;

    console.log(`[resources] ip=${ip} deleted resource id=${id} keys=${JSON.stringify(fileKeys)}`);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('resources delete error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
