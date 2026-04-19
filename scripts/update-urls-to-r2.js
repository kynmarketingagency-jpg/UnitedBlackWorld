/**
 * Update all database records to point to R2 URLs instead of Supabase.
 *
 * Run after file migration is complete:
 *   node scripts/update-urls-to-r2.js
 *
 * Add --dry-run to preview changes without writing.
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ankanowfwxpeuovwnjai.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const R2_PUBLIC_URL = 'https://pub-a686c541783847b9ab052f08c5f39208.r2.dev';
const SUPABASE_STORAGE_PREFIX = `${SUPABASE_URL}/storage/v1/object/public/archives/`;

if (!SUPABASE_KEY) {
  console.error('Set SUPABASE_SERVICE_ROLE_KEY first.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const DRY_RUN = process.argv.includes('--dry-run');

function toR2Url(url) {
  if (!url) return url;
  if (url.startsWith(SUPABASE_STORAGE_PREFIX)) {
    return `${R2_PUBLIC_URL}/${url.slice(SUPABASE_STORAGE_PREFIX.length)}`;
  }
  return url;
}

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== LIVE RUN ===');

  const { data: resources, error } = await supabase
    .from('resources')
    .select('id, title, pdf_url, thumbnail_url')
    .eq('category', 'books');
  if (error) throw error;

  console.log(`Found ${resources.length} book records`);

  let updated = 0;
  for (const r of resources) {
    const newPdf = toR2Url(r.pdf_url);
    const newThumb = toR2Url(r.thumbnail_url);

    if (newPdf === r.pdf_url && newThumb === r.thumbnail_url) continue;

    updated++;
    console.log(`[${r.id}] ${r.title}`);
    if (newPdf !== r.pdf_url) console.log(`  pdf_url -> ${newPdf}`);
    if (newThumb !== r.thumbnail_url) console.log(`  thumbnail_url -> ${newThumb}`);

    if (!DRY_RUN) {
      const { error: upErr } = await supabase
        .from('resources')
        .update({ pdf_url: newPdf, thumbnail_url: newThumb })
        .eq('id', r.id);
      if (upErr) {
        console.error(`  ERROR: ${upErr.message}`);
      }
    }
  }

  console.log(`\nTotal records ${DRY_RUN ? 'to update' : 'updated'}: ${updated}`);
}

main().catch(console.error);
