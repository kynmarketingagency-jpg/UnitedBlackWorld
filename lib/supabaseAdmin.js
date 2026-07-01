import { createClient } from '@supabase/supabase-js';

// Server-only Supabase client using the service-role key.
// Never import this from client components.
let _admin = null;

export function getSupabaseAdmin() {
  if (_admin) return _admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY in environment variables');
  }
  _admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  return _admin;
}
