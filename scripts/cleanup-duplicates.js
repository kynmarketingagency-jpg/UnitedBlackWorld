/**
 * Cleanup duplicate files from Supabase Storage and Database
 *
 * For each set of duplicates (same eTag/content):
 * 1. Finds which copy is referenced in the database (keeps that one)
 * 2. Deletes the unreferenced copies from storage
 * 3. Deletes orphan database records pointing to non-existent files
 *
 * Run: node scripts/cleanup-duplicates.js
 * Add --dry-run to preview without deleting
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ankanowfwxpeuovwnjai.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('Set SUPABASE_SERVICE_ROLE_KEY environment variable first.');
  console.error('Run: export SUPABASE_SERVICE_ROLE_KEY="your-key-here"');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const DRY_RUN = process.argv.includes('--dry-run');

async function listAllFiles(folder) {
  const files = [];
  let offset = 0;
  const limit = 1000;
  while (true) {
    const { data, error } = await supabase.storage
      .from('archives')
      .list(folder, { limit, offset });
    if (error) throw error;
    if (!data || data.length === 0) break;
    files.push(...data.filter(f => f.metadata && f.metadata.size > 0));
    if (data.length < limit) break;
    offset += limit;
  }
  return files;
}

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN (no deletions) ===' : '=== LIVE RUN ===');
  console.log('');

  // 1. Get all book files from storage
  console.log('Fetching files from storage...');
  const bookFiles = await listAllFiles('books');
  const thumbFiles = await listAllFiles('thumbnails');
  console.log(`Found ${bookFiles.length} books, ${thumbFiles.length} thumbnails in storage`);

  // 2. Get all resources from database
  const { data: resources, error: dbError } = await supabase
    .from('resources')
    .select('id, title, file_path, thumbnail_url')
    .eq('category', 'books');
  if (dbError) throw dbError;
  console.log(`Found ${resources.length} book records in database`);

  // Build set of file_paths referenced in DB
  const dbFilePaths = new Set(resources.map(r => r.file_path).filter(Boolean));
  const dbThumbnailPaths = new Set();
  for (const r of resources) {
    if (r.thumbnail_url) {
      // Extract path from full URL: .../archives/thumbnails/filename.png
      const match = r.thumbnail_url.match(/archives\/(.+)$/);
      if (match) dbThumbnailPaths.add(match[1]);
    }
  }

  // 3. Group books by eTag (identical content)
  const byEtag = {};
  for (const f of bookFiles) {
    const etag = f.metadata.eTag;
    if (!byEtag[etag]) byEtag[etag] = [];
    byEtag[etag].push({
      name: f.name,
      path: `books/${f.name}`,
      size: f.metadata.size,
    });
  }

  // 4. Find duplicates and decide what to delete
  const storageToDelete = [];
  const thumbsToDelete = [];
  const dbToDelete = [];
  let savedBytes = 0;

  for (const [etag, files] of Object.entries(byEtag)) {
    if (files.length <= 1) continue;

    // Find which file(s) are referenced in the DB
    const referenced = files.filter(f => dbFilePaths.has(f.path));
    const unreferenced = files.filter(f => !dbFilePaths.has(f.path));

    // Keep the first referenced file; if none referenced, keep the oldest (first by name/timestamp)
    let keep;
    if (referenced.length > 0) {
      keep = referenced[0];
      // Extra referenced copies -> delete from DB too
      for (let i = 1; i < referenced.length; i++) {
        const dupResource = resources.find(r => r.file_path === referenced[i].path);
        if (dupResource) {
          dbToDelete.push(dupResource);
          storageToDelete.push(referenced[i].path);
          savedBytes += referenced[i].size;
        }
      }
    } else {
      keep = files[0];
    }

    // Delete all unreferenced copies from storage
    for (const f of unreferenced) {
      if (f.path !== keep.path) {
        storageToDelete.push(f.path);
        savedBytes += f.size;
      }
    }

    const sizeMB = (files[0].size / (1024 * 1024)).toFixed(1);
    console.log(`\n[${files.length} copies, ${sizeMB} MB each] Keeping: ${keep.name}`);
    const toRemove = files.filter(f => f.path !== keep.path);
    for (const f of toRemove) {
      console.log(`  DELETE: ${f.name}`);
    }
  }

  // 5. Find orphan thumbnails for deleted books
  for (const bookPath of storageToDelete) {
    const bookName = bookPath.replace('books/', '');
    // Thumbnail naming pattern: timestamp_bookfilename_thumbnail.png
    const matchingThumb = thumbFiles.find(t => {
      // Extract the book filename part from the thumbnail name
      return t.name.includes(bookName.replace(/^\d+_/, '').replace('.pdf', ''));
    });
    if (matchingThumb) {
      const thumbPath = `thumbnails/${matchingThumb.name}`;
      if (!thumbsToDelete.includes(thumbPath)) {
        thumbsToDelete.push(thumbPath);
        savedBytes += matchingThumb.metadata.size;
      }
    }
  }

  // Summary
  console.log('\n========== SUMMARY ==========');
  console.log(`Book files to delete:      ${storageToDelete.length}`);
  console.log(`Thumbnail files to delete: ${thumbsToDelete.length}`);
  console.log(`DB records to delete:      ${dbToDelete.length}`);
  console.log(`Space to free:             ${(savedBytes / (1024 * 1024)).toFixed(1)} MB`);

  if (DRY_RUN) {
    console.log('\nDry run complete. Run without --dry-run to execute deletions.');
    return;
  }

  // 6. Execute deletions
  // Delete from storage in batches of 20
  const allStorageDeletes = [...storageToDelete, ...thumbsToDelete];
  for (let i = 0; i < allStorageDeletes.length; i += 20) {
    const batch = allStorageDeletes.slice(i, i + 20);
    const { error } = await supabase.storage.from('archives').remove(batch);
    if (error) {
      console.error(`Storage delete error (batch ${i}):`, error);
    } else {
      console.log(`Deleted storage batch ${i / 20 + 1}/${Math.ceil(allStorageDeletes.length / 20)}`);
    }
  }

  // Delete duplicate DB records
  for (const rec of dbToDelete) {
    const { error } = await supabase.from('resources').delete().eq('id', rec.id);
    if (error) {
      console.error(`DB delete error (id ${rec.id}, "${rec.title}"):`, error);
    } else {
      console.log(`Deleted DB record: id=${rec.id} "${rec.title}"`);
    }
  }

  console.log('\nCleanup complete!');
}

main().catch(console.error);
