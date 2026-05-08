import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  addHoneymoonSegment, mutate, readState, setGates, updateHoneymoonSegment,
} from "@/lib/store";
import { itineristPropose } from "@/lib/agents/itinerist";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Body = z.discriminatedUnion("op", [
  z.object({ op: z.literal("enable_gate") }),
  z.object({ op: z.literal("disable_gate") }),
  z.object({ op: z.literal("propose"), weddingDate: z.string() }),
  z.object({ op: z.literal("update"), id: z.string(), patch: z.record(z.unknown()) }),
  z.object({ op: z.literal("clear") }),
]);

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const state = await readState();
  // Partner viewer is refused if honeymoon gate is enabled and any surprise segments exist.
  if (state.viewer === "partner" && state.gates.honeymoon) {
    return NextResponse.json({ error: "I don't have anything to share on that." }, { status: 404 });
  }

  if (parsed.data.op === "enable_gate") {
    const after = await setGates({ honeymoon: true });
    return NextResponse.json({ state: after });
  }
  if (parsed.data.op === "disable_gate") {
    const after = await setGates({ honeymoon: false });
    return NextResponse.json({ state: after });
  }
  if (parsed.data.op === "propose") {
    if (!state.brief?.locked) return NextResponse.json({ error: "Lock the brief first." }, { status: 412 });
    const segs = await itineristPropose({ brief: state.brief, weddingDate: parsed.data.weddingDate });
    let last = state;
    for (const s of segs) last = await addHoneymoonSegment(s);
    return NextResponse.json({ state: last, count: segs.length });
  }
  if (parsed.data.op === "update") {
    const after = await updateHoneymoonSegment(parsed.data.id, parsed.data.patch);
    return NextResponse.json({ state: after });
  }
  const after = await mutate((s) => { s.honeymoon = []; return s; });
  return NextResponse.json({ state: after });
}
