import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env.local file.');
}

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Upload a file to Cloudflare R2 using a presigned URL.
 *
 * @param {File} file
 * @param {string} folder
 * @param {(pct: number) => void} [onProgress] - Progress callback 0-100
 * @returns {Promise<{url: string, path: string}>}
 */
export async function uploadFileToStorage(file, folder = '', onProgress) {
  const res = await fetch('/api/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type,
      folder,
    }),
  });
  if (!res.ok) throw new Error(`Failed to get upload URL: ${await res.text()}`);
  const { uploadUrl, key, publicUrl } = await res.json();

  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.onabort = () => reject(new Error('Upload aborted'));
    xhr.send(file);
  });

  return { url: publicUrl, path: key };
}

/**
 * Create a new resource in the database
 *
 * @param {Object} resource - Resource data
 * @param {string} resource.title - Title of the resource
 * @param {string} resource.author - Author name
 * @param {string} resource.category - Category (books, video, audio)
 * @param {string} resource.pdf_url - Public URL of the uploaded file (for books only)
 * @param {string} resource.file_path - File path in storage (for deletion, books only)
 * @param {string} resource.thumbnail_url - Thumbnail URL (for books only)
 * @param {string} resource.youtube_url - YouTube URL (for video/audio only)
 * @param {string} resource.twitter_url - Twitter/X URL (for audio only)
 * @param {string} resource.instagram_url - Instagram URL (for audio only)
 * @param {string} resource.tiktok_url - TikTok URL (for audio only)
 * @returns {Promise<Object>} The created resource
 */
export async function createResource({ title, author, category, pdf_url, file_path, thumbnail_url, youtube_url, twitter_url, instagram_url, tiktok_url }) {
  try {
    const resourceData = {
      title,
      author,
      category,
      created_at: new Date().toISOString()
    };

    // Add fields based on category
    if (category === 'books') {
      resourceData.pdf_url = pdf_url;
      resourceData.file_path = file_path;
      resourceData.thumbnail_url = thumbnail_url;
    } else {
      // Video or audio - save all provided URLs
      if (youtube_url) resourceData.youtube_url = youtube_url;
      if (twitter_url) resourceData.twitter_url = twitter_url;
      if (instagram_url) resourceData.instagram_url = instagram_url;
      if (tiktok_url) resourceData.tiktok_url = tiktok_url;
    }

    const { data, error } = await supabase
      .from('resources')
      .insert([resourceData])
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in createResource:', error);
    throw error;
  }
}

/**
 * Fetch all resources from the database
 *
 * @param {string} category - Optional category filter
 * @returns {Promise<Array>} Array of resources
 */
export async function getAllResources(category = null, limit = null) {
  try {
    let query = supabase
      .from('resources')
      .select('*')
      .order('created_at', { ascending: false });

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Fetch error:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getAllResources:', error);
    throw error;
  }
}

/**
 * Delete a resource and its files from storage
 *
 * @param {number} id - Resource ID
 * @param {string} filePath - File path in storage (for books PDF)
 * @param {string} thumbnailPath - Thumbnail path in storage (for books)
 * @returns {Promise<void>}
 */
export async function deleteResource(id, filePath, thumbnailPath) {
  const filesToDelete = [filePath, thumbnailPath].filter(Boolean);

  if (filesToDelete.length > 0) {
    const res = await fetch('/api/delete-files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keys: filesToDelete }),
    });
    if (!res.ok) {
      console.error('File deletion failed:', await res.text());
    }
  }

  const { error: dbError } = await supabase
    .from('resources')
    .delete()
    .eq('id', id);
  if (dbError) throw dbError;
}
