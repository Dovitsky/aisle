// POST. pull new vendor-relevant messages from Gmail (or simulated inbox),
// triage each, match to vendors, draft follow-up Approval Cards where useful.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { scanInbox } from "@/lib/gmail/scan";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

const Body = z.object({ max: z.number().int().min(1).max(50).optional() });

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => ({}));
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  try {
    const result = await scanInbox({ max: parsed.data.max ?? 25 });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown";
    return NextResponse.json({ error: `Scan failed: ${msg}` }, { status: 502 });
  }
}
