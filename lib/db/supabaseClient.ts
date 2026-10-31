import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import config from "@/config";

let cachedClient: SupabaseClient | null | undefined;

/**
 * Returns a server-only Supabase client using the service-role key, or
 * `null` if Supabase hasn't been configured (no URL/key env vars set).
 * Callers should treat a `null` return as "fall back to the filesystem".
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient !== undefined) {
    return cachedClient;
  }

  const { url, serviceRoleKey } = config.supabase;

  if (!url || !serviceRoleKey) {
    cachedClient = null;
    return cachedClient;
  }

  cachedClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });

  return cachedClient;
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseClient() !== null;
}
