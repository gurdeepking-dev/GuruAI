
import { createClient } from 'https://esm.sh/@supabase/supabase-js@^2.45.0';

// These variables must be set in your hosting provider's environment settings
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isCloudEnabled = !!supabase;
