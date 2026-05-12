import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  appendApproval, appendChat, appendVendorMessage, readState, updateVendor,
} from "@/lib/store";
import { outreachDraft } from "@/lib/agents/outreach";
import { counselReview } from "@/lib/agents/counsel";
import { negotiatorDraft, synthesizeInbound } from "@/lib/agents/negotiator";
import { triageVendorReply } from "@/lib/agents/triage";
import type { Phase } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PHASE_BY_CATEGORY: Record<string, Phase> = {
  Venue: "foundation", Officiant: "foundation",
  Photographer: "discovery", Videographer: "discovery",
  Florist: "design", Caterer: "logistics", Band: "design", DJ: "design",
};

const Body = z.discriminatedUnion("op", [
  z.object({ op: z.literal("draft_outreach"), vendorId: z.string(), note: z.string().optional() }),
  z.object({ op: z.literal("review_contract"), vendorId: z.string() }),
  z.object({ op: z.literal("propose_signing"), vendorId: z.string(), estimate: z.number().min(0) }),
  z.object({ op: z.literal("schedule_payment"), vendorId: z.string(), amountUsd: z.number().min(0), dueDate: z.string() }),
  z.object({ op: z.literal("update"), vendorId: z.string(), patch: z.record(z.unknown()) }),
  z.object({ op: z.literal("simulate_inbound"), vendorId: z.string() }),
  z.object({ op: z.literal("draft_counter"), vendorId: z.string(), goal: z.string().min(1) }),
]);

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const state = await readState();
  if (state.paused) return NextResponse.json({ error: "Agents are paused." }, { status: 423 });

  switch (parsed.data.op) {
    case "draft_outreach": {
      if (!state.brief) return NextResponse.json({ error: "No brief" }, { status: 412 });
      const v = state.vendors.find((x) => x.id === parsed.data.vendorId);
      if (!v) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
      const body = await outreachDraft({ brief: state.brief, vendor: v, noteFromCouple: parsed.data.note });
      const phase = PHASE_BY_CATEGORY[String(v.category)] ?? "discovery";
      const after = await appendApproval({
        agent: "Outreach", phase,
        title: `Send opening email to ${v.name}?`,
        rationale: `Personalized first contact for ${v.category}. Going via the AISLE alias so the couple's personal address is never exposed.${parsed.data.note ? `\n\nCouple's note included: "${parsed.data.note}"` : ""}`,
        risk: "low",
        action: {
          kind: "send_email",
          to: `${v.name} (via AISLE alias)`,
          subject: `Inquiry — ${state.brief.organizerName} & ${state.brief.partnerName}, ${state.brief.dateWindow}`,
          body,
        },
      });
      await appendChat({ role: "agent", agent: "Maestro", content: `Outreach drafted an email to ${v.name}. Card is in your queue.` });
      return NextResponse.json({ state: after });
    }
    case "review_contract": {
      const v = state.vendors.find((x) => x.id === parsed.data.vendorId);
      if (!v) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
      const summary = await counselReview({ vendorName: v.name, category: String(v.category) });
      const phase = PHASE_BY_CATEGORY[String(v.category)] ?? "logistics";
      const after = await appendApproval({
        agent: "Counsel", phase,
        title: `Approve ${summary.concerns.length} contract redlines for ${v.name}?`,
        rationale: `Counsel reviewed the contract; overall risk is ${summary.overallRisk}. Approving sends the redline package to the vendor for counter-signature.\n\n${summary.concerns.map((c, i) => `${i + 1}. ${c.topic}\n   Original: ${c.original}\n   Proposed: ${c.proposed}\n   Why: ${c.rationale}`).join("\n\n")}`,
        risk: summary.overallRisk,
        action: {
          kind: "sign_contract", vendor: v.name,
          redlines: summary.concerns.map((c) => c.topic),
          estimate: v.estimateUsd ?? 0,
        },
      });
      return NextResponse.json({ state: after });
    }
    case "propose_signing": {
      const v = state.vendors.find((x) => x.id === parsed.data.vendorId);
      if (!v) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
      const phase = PHASE_BY_CATEGORY[String(v.category)] ?? "logistics";
      const after = await appendApproval({
        agent: "Counsel", phase,
        title: `Sign contract with ${v.name} at $${parsed.data.estimate.toLocaleString()}?`,
        rationale: `Final signature step. Approving will mark ${v.name} as contracted and add a $${parsed.data.estimate.toLocaleString()} commitment to the budget.`,
        risk: parsed.data.estimate > 5000 ? "high" : "medium",
        action: { kind: "sign_contract", vendor: v.name, redlines: [], estimate: parsed.data.estimate },
      });
      return NextResponse.json({ state: after });
    }
    case "schedule_payment": {
      const v = state.vendors.find((x) => x.id === parsed.data.vendorId);
      if (!v) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
      const phase = PHASE_BY_CATEGORY[String(v.category)] ?? "logistics";
      const risk = parsed.data.amountUsd > 5000 ? "high" : parsed.data.amountUsd > 500 ? "medium" : "low";
      const after = await appendApproval({
        agent: "Treasurer", phase,
        title: `Pay ${v.name} $${parsed.data.amountUsd.toLocaleString()} on ${parsed.data.dueDate}?`,
        rationale: `Vendor: ${v.name}. Amount: $${parsed.data.amountUsd.toLocaleString()}. ${parsed.data.amountUsd > 500 ? "Over the $500 threshold — 2FA will be required at confirm time." : "Under the $500 threshold."}`,
        risk,
        action: { kind: "schedule_payment", vendor: v.name, amountUsd: parsed.data.amountUsd, dueDate: parsed.data.dueDate },
      });
      return NextResponse.json({ state: after });
    }
    case "update": {
      const after = await updateVendor(parsed.data.vendorId, parsed.data.patch);
      return NextResponse.json({ state: after });
    }
    case "simulate_inbound": {
      const v = state.vendors.find((x) => x.id === parsed.data.vendorId);
      if (!v) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
      const inbound = synthesizeInbound(v);
      const triaged = await triageVendorReply(inbound.body);
      inbound.parsedIntent = triaged.intent;
      inbound.quotedUsd = triaged.quotedUsd;
      const after = await appendVendorMessage(v.id, inbound);
      // Auto-update vendor status from triage outcome.
      if (triaged.intent === "available") {
        await updateVendor(v.id, { status: "quoting", estimateUsd: triaged.quotedUsd ?? v.estimateUsd });
      } else if (triaged.intent === "unavailable") {
        await updateVendor(v.id, { status: "passed" });
      }
      const fresh = await readState();
      return NextResponse.json({ state: fresh, triaged });
    }
    case "draft_counter": {
      if (!state.brief) return NextResponse.json({ error: "No brief" }, { status: 412 });
      const v = state.vendors.find((x) => x.id === parsed.data.vendorId);
      if (!v) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
      const body = await negotiatorDraft({ brief: state.brief, vendor: v, goal: parsed.data.goal });
      const phase = PHASE_BY_CATEGORY[String(v.category)] ?? "logistics";
      const after = await appendApproval({
        agent: "Negotiator", phase,
        title: `Send counter-proposal to ${v.name}?`,
        rationale: `Goal: ${parsed.data.goal}. Negotiator wrote a draft you can send as-is or edit.`,
        risk: "medium",
        action: {
          kind: "send_email",
          to: `${v.name} (via AISLE alias)`,
          subject: `Re: Inquiry — ${state.brief.organizerName} & ${state.brief.partnerName}`,
          body,
        },
      });
      return NextResponse.json({ state: after });
    }
  }
}
