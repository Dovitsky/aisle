import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addDesign, appendApproval, readState } from "@/lib/store";
import { designerDirections } from "@/lib/agents/designer";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Body = z.discriminatedUnion("op", [
  z.object({ op: z.literal("propose") }),
  z.object({ op: z.literal("publish"), assetId: z.string(), title: z.string() }),
]);

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  if (parsed.data.op === "propose") {
    const s = await readState();
    if (!s.brief?.locked) return NextResponse.json({ error: "Lock the brief first." }, { status: 412 });
    const dirs = await designerDirections(s.brief);
    let lastState = s;
    for (const d of dirs) {
      lastState = await addDesign({
        title: d.title,
        kind: "moodboard",
        description: d.description,
        swatches: d.palette,
        refs: d.refs,
        agent: "Designer",
      });
    }
    return NextResponse.json({ state: lastState, count: dirs.length });
  }

  // publish
  const after = await appendApproval({
    agent: "Designer",
    phase: "design",
    title: `Publish "${parsed.data.title}" as the locked design direction?`,
    rationale: `Locking this direction will be used by Stationer (invitation suite), Florist (color targets), Quartermaster (welcome bag), and Designer's signage pipeline. You can amend specific pieces later but the system color and tone will be locked.`,
    risk: "medium",
    action: { kind: "publish_design", assetId: parsed.data.assetId, title: parsed.data.title },
  });
  return NextResponse.json({ state: after });
}
