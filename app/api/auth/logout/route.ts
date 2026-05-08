import { NextResponse } from "next/server";
import { hasSupabaseAuth, serverClient } from "@/lib/auth/clients";

export const dynamic = "force-dynamic";

export async function POST() {
  if (!hasSupabaseAuth()) return NextResponse.json({ ok: true });
  const supa = await serverClient();
  await supa.auth.signOut();
  return NextResponse.json({ ok: true });
}
