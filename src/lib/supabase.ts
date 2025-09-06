import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Fallback values for development
const defaultUrl = supabaseUrl || 'https://placeholder.supabase.co';
const defaultKey = supabaseKey || 'placeholder-key';

export const supabase = createClient(defaultUrl, defaultKey);

export const isSupabaseConfigured = !!(supabaseUrl && supabaseKey);