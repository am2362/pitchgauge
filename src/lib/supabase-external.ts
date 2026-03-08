import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { supabase as cloudClient } from '@/integrations/supabase/client';

// Use external Supabase if configured, otherwise fall back to Lovable Cloud client
const supabaseUrl = import.meta.env.VITE_EXTERNAL_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_EXTERNAL_SUPABASE_ANON_KEY;

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: localStorage,
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : cloudClient;
