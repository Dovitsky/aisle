import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { appendApproval, appendChat, setBrief } from "@/lib/store";

export const dynamic = "force-dynamic";

const BriefSchema = z.object({
  organizerName: z.string().min(1),
  partnerName: z.string().min(1),
  dateWindow: z.string().min(1),
  region: z.string().min(1),
  guestCount: z.number().int().min(2).max(2000),
  budgetUsd: z.number().int().min(1000).max(10_000_000),
  vibe: z.string().min(1).max(2000),
  plannerStatus: z.enum(["none", "want_one", "have_one"]),
  cultural: z.enum(["secular", "catholic", "jewish", "hindu", "muslim", "interfaith", "civil", "other"]).optional(),
  formalityTone: z.enum(["formal", "modern", "warm", "casual"]).optional(),
  destination: z.boolean().optional(),
  weddingDate: z.string().optional(),
  lock: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = BriefSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid brief", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const lock = Boolean(data.lock);

  const after = await setBrief({
    organizerName: data.organizerName,
    partnerName: data.partnerName,
    dateWindow: data.dateWindow,
    region: data.region,
    guestCount: data.guestCount,
    budgetUsd: data.budgetUsd,
    vibe: data.vibe,
    plannerStatus: data.plannerStatus,
    cultural: data.cultural ?? "secular",
    formalityTone: data.formalityTone ?? "modern",
    destination: data.destination ?? false,
    weddingDate: data.weddingDate,
    locked: lock,
    lockedAt: lock ? new Date().toISOString() : undefined,
  });

  if (lock) {
    await appendApproval({
      agent: "Maestro", phase: "discovery",
      title: "Approve this brief and let me start working on Phase 3?",
      rationale: `Brief locked: ${data.organizerName} & ${data.partnerName}, ~${data.guestCount} guests, ${data.region}, ${data.dateWindow}, $${data.budgetUsd.toLocaleString()} envelope. Cultural: ${data.cultural ?? "secular"}. Formality: ${data.formalityTone ?? "modern"}.${data.destination ? " Destination wedding." : ""} On approval, Scout begins venue discovery and a first shortlist will appear within 2 hours.`,
      risk: "low",
      action: { kind: "lock_brief", summary: `Brief locked for ${data.organizerName} & ${data.partnerName}` },
    });
    await appendChat({
      role: "agent", agent: "Maestro",
      content: `Brief locked. I've put a card in your queue to greenlight Phase 2 work. Once you approve, Scout will begin venue discovery in the background.`,
    });
  }

  return NextResponse.json({ state: after });
}
