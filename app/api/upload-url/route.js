import { NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getR2Client, R2_BUCKET, publicUrlForKey } from '@/lib/r2';
import { isAuthorized, requestMeta } from '@/lib/adminAuth';

export const runtime = 'nodejs';

export async function POST(request) {
  const { ip, ua } = requestMeta(request);
  if (!(await isAuthorized(request))) {
    console.warn(`[upload-url] DENIED ip=${ip} ua="${ua}"`);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { fileName, contentType, folder } = await request.json();

    if (!fileName) {
      return NextResponse.json({ error: 'fileName required' }, { status: 400 });
    }

    const timestamp = Date.now();
    const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = folder ? `${folder}/${timestamp}_${safeName}` : `${timestamp}_${safeName}`;

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      ContentType: contentType || 'application/octet-stream',
    });

    const uploadUrl = await getSignedUrl(getR2Client(), command, { expiresIn: 3600 });

    return NextResponse.json({
      uploadUrl,
      key,
      publicUrl: publicUrlForKey(key),
    });
  } catch (err) {
    console.error('upload-url error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
