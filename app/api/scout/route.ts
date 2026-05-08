import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addVendors, appendApproval, appendChat, readState } from "@/lib/store";
import { scoutShortlist } from "@/lib/agents/scout";
import type { Phase } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Body = z.object({
  category: z.string().min(1).max(120),
});

const PHASE_BY_CATEGORY: Record<string, Phase> = {
  Venue: "foundation",
  Officiant: "foundation",
  Photographer: "discovery",
  Videographer: "discovery",
  Florist: "design",
  Caterer: "logistics",
  Band: "design",
  DJ: "design",
  Stationer: "design",
  Rentals: "logistics",
  Transportation: "logistics",
  "Hair & Makeup": "personal_prep",
  Cake: "logistics",
  Calligrapher: "guest_management",
  Bartending: "logistics",
};

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const state = await readState();
  if (!state.brief?.locked) {
    return NextResponse.json({ error: "Lock the brief before running Scout." }, { status: 412 });
  }
  if (state.paused) {
    return NextResponse.json({ error: "Agents are paused." }, { status: 423 });
  }

  let items;
  try {
    items = await scoutShortlist({
      brief: state.brief,
      category: parsed.data.category,
      count: 5,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown";
    return NextResponse.json({ error: `Scout failed: ${msg}` }, { status: 502 });
  }

  // Persist as Vendor records.
  await addVendors(
    items.map((it) => ({
      name: it.name,
      category: parsed.data.category,
      city: it.city,
      fitScore: it.fitScore,
      priceBracket: it.priceBracket,
      notes: it.notes,
    })),
  );

  const phase = PHASE_BY_CATEGORY[parsed.data.category] ?? "discovery";
  const top = items[0];

  await appendApproval({
    agent: "Scout",
    phase,
    title: `Open outreach to ${top?.name ?? "the top match"} for ${parsed.data.category}?`,
    rationale: `Shortlist of ${items.length} produced against the locked brief. Approving this hands the top match to Outreach for a personalized first email — which itself becomes a separate Approval Card.\n\n${items.map((it, i) => `${i + 1}. ${it.name} — ${it.city} · ${it.priceBracket} · fit ${it.fitScore}/100\n   ${it.notes}`).join("\n\n")}`,
    risk: "low",
    action: {
      kind: "send_email",
      to: `${top?.name ?? "vendor"} (via AISLE alias)`,
      subject: `Inquiry for ${parsed.data.category} — ${state.brief.dateWindow}`,
      body: `Hello ${top?.name ?? ""},\n\nWe're reaching out from ${state.brief.organizerName} & ${state.brief.partnerName}'s wedding planning team. They're looking at ${state.brief.dateWindow} in ${state.brief.region} for roughly ${state.brief.guestCount} guests.\n\nWould you have availability in that window, and could you share rough pricing for an event our size?\n\nThank you,\nAISLE on behalf of ${state.brief.organizerName} & ${state.brief.partnerName}`,
    },
  });

  const after = await appendChat({
    role: "agent",
    agent: "Maestro",
    content: `Scout has a shortlist for ${parsed.data.category}. I've put a card in your queue proposing outreach to the top match. Open Approvals to review.`,
  });

  return NextResponse.json({ state: after, items });
}
