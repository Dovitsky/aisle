// Supabase clients. Two flavors:
//   - admin (service role) for server-only mutations that need to bypass RLS
//   - anon for SSR/client where the user's session is the auth context
//
// When SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY aren't set, the app stays in
// JSON-store mode. `hasSupabase()` is the gate for every code path that
// considers using Postgres.

import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _admin: SupabaseClient | null = null;

export function hasSupabase(): boolean {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function adminClient(): SupabaseClient {
  if (!hasSupabase()) {
    throw new Error("Supabase not configured. Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local.");
  }
  if (_admin) return _admin;
  _admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _admin;
}

export function anonClient(accessToken?: string): SupabaseClient {
  if (!hasSupabase()) {
    throw new Error("Supabase not configured.");
  }
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {},
  });
}
