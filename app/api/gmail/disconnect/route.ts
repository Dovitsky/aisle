import { NextResponse } from "next/server";
import { clearConnection } from "@/lib/gmail/store";
import { logAgentEvent } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST() {
  await clearConnection();
  await logAgentEvent("Triage", "gmail.disconnected", "Gmail connection removed.");
  return NextResponse.json({ ok: true });
}
