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
 * Upload a file directly to Supabase Storage from the browser
 * This bypasses the server, preventing timeouts on large files
 *
 * @param {File} file - The file to upload
 * @param {string} folder - Optional folder path in the bucket
 * @returns {Promise<{url: string, path: string}>} The public URL and file path
 */
export async function uploadFileToStorage(file, folder = '') {
  try {
    // Generate unique filename
    const timestamp = Date.now();
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = folder ? `${folder}/${timestamp}_${cleanFileName}` : `${timestamp}_${cleanFileName}`;

    // Upload directly to Supabase Storage
    const { data, error } = await supabase.storage
      .from('archives')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Upload error:', error);
      throw error;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('archives')
      .getPublicUrl(filePath);

    return {
      url: publicUrl,
      path: filePath
    };
  } catch (error) {
    console.error('Error in uploadFileToStorage:', error);
    throw error;
  }
}

/**
 * Create a new resource in the database
 *
 * @param {Object} resource - Resource data
 * @param {string} resource.title - Title of the resource
 * @param {string} resource.author - Author name
 * @param {string} resource.category - Category (book, video, audio)
 * @param {string} resource.pdf_url - Public URL of the uploaded file
 * @param {string} resource.file_path - File path in storage (for deletion)
 * @returns {Promise<Object>} The created resource
 */
export async function createResource({ title, author, category, pdf_url, file_path }) {
  try {
    const { data, error } = await supabase
      .from('resources')
      .insert([
        {
          title,
          author,
          category,
          pdf_url,
          file_path,
          created_at: new Date().toISOString()
        }
      ])
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
export async function getAllResources(category = null) {
  try {
    let query = supabase
      .from('resources')
      .select('*')
      .order('created_at', { ascending: false });

    if (category && category !== 'all') {
      query = query.eq('category', category);
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
 * Delete a resource and its file from storage
 *
 * @param {number} id - Resource ID
 * @param {string} filePath - File path in storage
 * @returns {Promise<void>}
 */
export async function deleteResource(id, filePath) {
  try {
    // Delete from storage first
    if (filePath) {
      console.log('🗑️ Deleting file from storage:', filePath);
      const { error: storageError } = await supabase.storage
        .from('archives')
        .remove([filePath]);

      if (storageError) {
        console.error('Storage deletion error:', storageError);
        // Continue anyway - we still want to delete from database
      } else {
        console.log('✅ File deleted from storage');
      }
    }

    // Delete from database
    console.log('🗑️ Deleting record from database:', id);
    const { error: dbError } = await supabase
      .from('resources')
      .delete()
      .eq('id', id);

    if (dbError) {
      console.error('Database deletion error:', dbError);
      throw dbError;
    }

    console.log('✅ Record deleted from database');
  } catch (error) {
    console.error('Error in deleteResource:', error);
    throw error;
  }
}
