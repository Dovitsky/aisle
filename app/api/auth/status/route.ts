import { NextResponse } from "next/server";
import { hasSupabaseAuth, getSessionUser } from "@/lib/auth/clients";

export const dynamic = "force-dynamic";

export async function GET() {
  const supa = hasSupabaseAuth();
  const user = supa ? await getSessionUser() : null;
  return NextResponse.json({
    supabase: supa,
    signedIn: !!user,
    email: user?.email ?? null,
    userId: user?.id ?? null,
  });
}
