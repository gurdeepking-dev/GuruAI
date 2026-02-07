
import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = process.env.SUPABASE_URL || 'https://ghdwufjkpjuidyfsgkde.supabase.co';
export const supabaseKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_XPmEBwW1eU5DEhLLlzB1-Q_aH5ktzr-';

export const supabase = createClient(supabaseUrl, supabaseKey);

export const initSupabase = () => !!supabaseUrl && !!supabaseKey;
export const isCloudEnabled = () => !!supabaseUrl && !!supabaseKey;
