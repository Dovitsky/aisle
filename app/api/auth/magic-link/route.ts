// Send the user a magic-link email. Supabase Auth handles the email send (it
// has a built-in SMTP relay, or you can configure your own SMTP / Resend).

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hasSupabaseAuth, serverClient } from "@/lib/auth/clients";

export const dynamic = "force-dynamic";

const Body = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  if (!hasSupabaseAuth()) {
    return NextResponse.json({ error: "Supabase auth not configured." }, { status: 503 });
  }
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid email" }, { status: 400 });

  const supa = await serverClient();
  const origin = req.nextUrl.origin;
  const { error } = await supa.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      shouldCreateUser: true,
    },
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json({ ok: true });
}
