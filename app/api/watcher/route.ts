import { NextResponse } from "next/server";
import { readState } from "@/lib/store";
import { watcherScan, watcherAct } from "@/lib/agents/watcher";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await readState();
  return NextResponse.json({ flags: watcherScan(s) });
}

// POST /api/watcher. Watcher acts on the flags it surfaces:
// queues nudge emails for stale vendors, etc.
export async function POST() {
  const s = await readState();
  if (s.paused) {
    return NextResponse.json(
      { error: "Agents are paused." },
      { status: 423 },
    );
  }
  const result = await watcherAct(s);
  return NextResponse.json(result);
}
