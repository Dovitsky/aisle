import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  appendApproval, deleteBudgetLine, logAgentEvent, readState,
  upsertBudgetLine, mutate,
} from "@/lib/store";
import { treasurerProposal, assertBudgetInvariant } from "@/lib/agents/treasurer";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Body = z.discriminatedUnion("op", [
  z.object({ op: z.literal("propose") }),
  z.object({ op: z.literal("upsert"), line: z.object({
    id: z.string().optional(),
    category: z.string().min(1),
    planUsd: z.number().min(0),
    committedUsd: z.number().min(0),
    paidUsd: z.number().min(0),
    vendorId: z.string().optional(),
  })}),
  z.object({ op: z.literal("delete"), id: z.string() }),
]);

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  if (parsed.data.op === "propose") {
    const s = await readState();
    if (!s.brief?.locked) return NextResponse.json({ error: "Lock the brief first." }, { status: 412 });
    const proposal = await treasurerProposal(s.brief);
    const after = await mutate((cur) => {
      // Replace any auto-proposed lines (those without a vendorId) with the new proposal.
      const keep = cur.budget.filter((l) => l.vendorId);
      const next = [
        ...keep,
        ...proposal.lines.map((l) => ({
          id: Math.random().toString(36).slice(2, 12),
          category: l.category,
          planUsd: l.planUsd,
          committedUsd: keep.find((k) => k.category === l.category)?.committedUsd ?? 0,
          paidUsd: keep.find((k) => k.category === l.category)?.paidUsd ?? 0,
        })),
      ];
      cur.budget = next;
      return cur;
    });
    await logAgentEvent("Treasurer", "budget.proposed", "Treasurer proposed an allocation.", { lines: proposal.lines.length });
    await appendApproval({
      agent: "Treasurer",
      phase: "discovery",
      title: "Lock this budget allocation as the working plan?",
      rationale: `Treasurer proposed ${proposal.lines.length} lines totaling $${proposal.total.toLocaleString()}. Approve to make this the source of truth; commitments and payments will track variance against it.\n\n${proposal.lines.map((l) => `• ${l.category}. $${l.planUsd.toLocaleString()}: ${l.rationale}`).join("\n")}`,
      risk: "medium",
      action: { kind: "lock_brief", summary: "Lock budget allocation" },
    });
    return NextResponse.json({ state: after, proposal });
  }

  if (parsed.data.op === "upsert") {
    const after = await upsertBudgetLine(parsed.data.line);
    const inv = assertBudgetInvariant(after.budget);
    if (!inv.ok) {
      return NextResponse.json({ error: `Invariant violated: ${inv.violation}`, state: after }, { status: 422 });
    }
    return NextResponse.json({ state: after });
  }
  const after = await deleteBudgetLine(parsed.data.id);
  return NextResponse.json({ state: after });
}
