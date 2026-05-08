import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addEngagementMilestone, mutate, readState, updateEngagementMilestone } from "@/lib/store";
import { conciergePropose } from "@/lib/agents/concierge";

export const dynamic = "force-dynamic";

const Body = z.discriminatedUnion("op", [
  z.object({ op: z.literal("propose"), context: z.string().min(1).max(2000) }),
  z.object({ op: z.literal("update"), id: z.string(), patch: z.object({
    status: z.enum(["idea", "planned", "done"]).optional(),
    scheduledFor: z.string().optional(),
  })}),
  z.object({ op: z.literal("clear") }),
]);

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  if (parsed.data.op === "propose") {
    const proposal = await conciergePropose({ context: parsed.data.context });
    let last = await readState();
    for (const m of proposal.milestones) {
      last = await addEngagementMilestone(m);
    }
    return NextResponse.json({ state: last, count: proposal.milestones.length });
  }
  if (parsed.data.op === "update") {
    const after = await updateEngagementMilestone(parsed.data.id, parsed.data.patch);
    return NextResponse.json({ state: after });
  }
  const after = await mutate((s) => { s.engagement = []; return s; });
  return NextResponse.json({ state: after });
}
