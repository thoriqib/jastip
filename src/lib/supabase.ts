import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const BUCKET = "jastip";

let client: SupabaseClient | null = null;

/**
 * Klien Supabase dengan secret/service_role key. Hanya dipakai di server
 * (server component, server action, route handler) — tidak pernah dikirim ke browser.
 */
export function db(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY belum diisi. Lihat .env.example dan README.",
    );
  }
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}
