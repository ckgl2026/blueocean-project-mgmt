// Supabase client - direct database access for multi-device data sharing
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aeniecryzrcqazfhdtgr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFlbmllY3J5enJjcWF6ZmhkdGdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MTAxMjgsImV4cCI6MjA5NjM4NjEyOH0.Q0RnPHtQsBnBW3B_azxFOv9pBDkQroTLVT1guhx0i5I';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

export const isSupabaseConfigured = () => {
  return supabaseUrl.length > 0 && supabaseKey.length > 0;
};
