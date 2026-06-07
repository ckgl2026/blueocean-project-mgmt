// Supabase client configuration
// To enable cloud data sharing:
// 1. Register at https://supabase.com (free tier)
// 2. Create a new project
// 3. Copy Project URL and anon public key
// 4. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Check if Supabase is configured
export const isSupabaseConfigured = () => {
  return supabaseUrl.length > 0 && supabaseKey.length > 0;
};
