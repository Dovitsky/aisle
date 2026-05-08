// Dress firewall — gateScope: "dress" on every record produced here.
// PRD §2.3 / build brief §8.2. v0 enforces at the data layer via filterForViewer.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addDesign, mutate, readState, setGates } from "@/lib/store";
import { couturierDirections } from "@/lib/agents/couturier";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Body = z.discriminatedUnion("op", [
  z.object({ op: z.literal("enable_gate") }),
  z.object({ op: z.literal("disable_gate") }),
  z.object({ op: z.literal("propose"), notes: z.string().optional() }),
]);

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  // The gate must be readable to the organizer to enable it. The partner role
  // can never invoke this endpoint successfully.
  const cur = await readState();
  if (cur.viewer === "partner") {
    return NextResponse.json({ error: "I don't have anything to share on that." }, { status: 404 });
  }

  if (parsed.data.op === "enable_gate") {
    const after = await setGates({ dress: true });
    return NextResponse.json({ state: after });
  }
  if (parsed.data.op === "disable_gate") {
    const after = await setGates({ dress: false });
    return NextResponse.json({ state: after });
  }

  if (!cur.brief?.locked) {
    return NextResponse.json({ error: "Lock the brief first." }, { status: 412 });
  }
  const dirs = await couturierDirections(cur.brief, parsed.data.notes);
  let lastState = cur;
  for (const d of dirs) {
    lastState = await addDesign({
      title: d.title,
      kind: "dress_concept",
      description: `${d.silhouette}\nFabrics: ${d.fabrics.join(", ")}\nDesigners to consider: ${d.designerExamples.join(", ")}\n\n${d.rationale}`,
      agent: "Couturier",
      gateScope: "dress",
    });
  }
  // Record an organizer-only ledger entry.
  await mutate((s) => {
    s.ledger.push({
      id: Math.random().toString(36).slice(2, 12),
      at: new Date().toISOString(),
      actor: "agent",
      agent: "Couturier",
      kind: "couturier.proposed",
      summary: `Generated ${dirs.length} dress directions.`,
      gateScope: "dress",
    });
    return s;
  });
  return NextResponse.json({ state: lastState, count: dirs.length });
}
