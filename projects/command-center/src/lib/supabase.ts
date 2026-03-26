import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export function createBrowserSupabase() {
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}

export function createServerSupabase() {
  return createClient<Database>(supabaseUrl, supabaseAnonKey);
}
