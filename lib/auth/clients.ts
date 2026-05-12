// Supabase browser + server clients for the SSR auth flow.
// Reference: https://supabase.com/docs/guides/auth/server-side/nextjs

import { createBrowserClient, createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { CookieOptions } from "@supabase/ssr";

export function hasSupabaseAuth(): boolean {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
}

// Client-side (browser). used by the login page + any client component that needs the session.
export function browserClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

// Server-side. used in route handlers and Server Components.
// Reads cookies via Next.js cookies() so we get the user's session.
export async function serverClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Server Component context. cookies are read-only.
            // Auth refresh happens in middleware instead.
          }
        },
      },
    },
  );
}

// Convenience: returns the current session user or null.
export async function getSessionUser() {
  if (!hasSupabaseAuth()) return null;
  const supa = await serverClient();
  const { data: { user } } = await supa.auth.getUser();
  return user;
}
