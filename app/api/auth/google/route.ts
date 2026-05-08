import { NextRequest, NextResponse } from "next/server";
import { hasSupabaseAuth, serverClient } from "@/lib/auth/clients";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!hasSupabaseAuth()) {
    return NextResponse.json({ error: "Supabase auth not configured." }, { status: 503 });
  }
  const supa = await serverClient();
  const { data, error } = await supa.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${req.nextUrl.origin}/auth/callback`,
      scopes: "openid email profile",
    },
  });
  if (error || !data?.url) {
    return NextResponse.json({ error: error?.message ?? "Could not start OAuth" }, { status: 502 });
  }
  return NextResponse.json({ url: data.url });
}
