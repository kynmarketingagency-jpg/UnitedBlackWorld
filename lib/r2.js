import { S3Client, DeleteObjectsCommand } from '@aws-sdk/client-s3';

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

export const R2_BUCKET = process.env.R2_BUCKET || 'ubw-archives';
export const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;

let _client = null;

export function getR2Client() {
  if (_client) return _client;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('Missing R2 credentials in environment variables');
  }
  _client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return _client;
}

export function publicUrlForKey(key) {
  return `${R2_PUBLIC_URL}/${key}`;
}

export async function deleteFromR2(keys) {
  if (!keys || keys.length === 0) return;
  const client = getR2Client();
  await client.send(
    new DeleteObjectsCommand({
      Bucket: R2_BUCKET,
      Delete: { Objects: keys.map((Key) => ({ Key })) },
    })
  );
}
