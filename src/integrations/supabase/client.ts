
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://jbmgujpkyyqqphlzflfj.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpibWd1anBreXlxcXBobHpmbGZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYwNjQ4NzYsImV4cCI6MjA2MTY0MDg3Nn0.sai2CCwqzSUhm_gc3B_r2mim5Qvv9vIMIxg0LWzmfOk";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
