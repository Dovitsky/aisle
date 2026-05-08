// OAuth callback. Exchanges the code for a session, then ensures the user has a project.

import { NextRequest, NextResponse } from "next/server";
import { hasSupabaseAuth, serverClient } from "@/lib/auth/clients";
import { ensureUserHasProject } from "@/lib/auth/project";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!hasSupabaseAuth()) {
    return NextResponse.redirect(new URL("/login?err=no_supabase", req.url));
  }
  const code = req.nextUrl.searchParams.get("code");
  const errorParam = req.nextUrl.searchParams.get("error");
  if (errorParam) {
    return NextResponse.redirect(new URL(`/login?err=${encodeURIComponent(errorParam)}`, req.url));
  }
  if (!code) {
    return NextResponse.redirect(new URL("/login?err=no_code", req.url));
  }
  const supa = await serverClient();
  const { error } = await supa.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL(`/login?err=${encodeURIComponent(error.message)}`, req.url));
  }
  const { data: { user } } = await supa.auth.getUser();
  if (user) {
    try {
      await ensureUserHasProject(user.id, user.user_metadata?.name ?? user.email ?? null);
    } catch (e) {
      // If project bootstrap fails the user can still navigate; log and continue.
      console.error("Project bootstrap failed:", e);
    }
  }
  return NextResponse.redirect(new URL("/", req.url));
}
