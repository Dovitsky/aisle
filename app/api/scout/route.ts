import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addVendors, appendApproval, appendChat, readState } from "@/lib/store";
import { scoutShortlist } from "@/lib/agents/scout";
import type { Phase } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Body = z.object({
  category: z.string().min(1).max(120),
  count: z.number().int().min(1).max(40).optional(),
  /** When the couple names a specific person ("Karen the NYT photographer"),
   *  Maestro passes the verbatim description here so Scout switches to a
   *  targeted open-web hunt instead of producing a generic regional list. */
  targetDescription: z.string().min(3).max(500).optional(),
});

// How many options to return per category. Venue searches get a long list
// because couples want to feel like they've seen everything; smaller-stakes
// categories stay tighter so the page doesn't drown.
const DEFAULT_COUNT_BY_CATEGORY: Record<string, number> = {
  Venue: 15,
  Photographer: 10,
  Videographer: 8,
  Florist: 8,
  Caterer: 8,
  Band: 8,
  DJ: 8,
  Officiant: 6,
};
const FALLBACK_COUNT = 8;

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

  const targeted = !!parsed.data.targetDescription?.trim();

  const count = targeted
    ? 3 // targeted runs return at most a handful; the model decides
    : parsed.data.count
      ?? DEFAULT_COUNT_BY_CATEGORY[parsed.data.category]
      ?? FALLBACK_COUNT;

  let items;
  try {
    items = await scoutShortlist({
      brief: state.brief,
      category: parsed.data.category,
      count,
      targetDescription: parsed.data.targetDescription,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown";
    return NextResponse.json({ error: `Scout failed: ${msg}` }, { status: 502 });
  }

  // Persist as Vendor records. same shape whether marketplace or web.
  // The provenance / sourceUrl / contactPath fields ride along so the UI
  // can render the small "via web" tag in the source line.
  await addVendors(
    items.map((it) => ({
      name: it.name,
      category: parsed.data.category,
      city: it.city,
      fitScore: it.fitScore,
      priceBracket: it.priceBracket,
      notes: it.notes,
      discoveryMethod: targeted ? "open_web" : "marketplace",
      sourceProvenance: targeted
        ? "Found via open web at the couple's request"
        : undefined,
      sourceUrl: it.sourceUrl,
      contactPath: it.contactPath,
      signaturePortfolioNote: it.signaturePortfolioNote,
      unverified: it.unverified,
    })),
  );

  const phase = PHASE_BY_CATEGORY[parsed.data.category] ?? "discovery";
  const top = items[0];

  // For targeted hunts, draft a personalized email anchored on the
  // signaturePortfolioNote so it doesn't read like form mail. For broad
  // shortlists, keep the existing generic "would you have availability"
  // copy. Outreach polishes that later.
  if (top) {
    const subject = targeted
      ? `${state.brief.organizerName} & ${state.brief.partnerName}. ${parsed.data.category} for ${state.brief.dateWindow}`
      : `Inquiry for ${parsed.data.category}. ${state.brief.dateWindow}`;
    const body = targeted
      ? buildTargetedOutreach({
          vendorName: top.name,
          organizerName: state.brief.organizerName,
          partnerName: state.brief.partnerName,
          region: state.brief.region,
          dateWindow: state.brief.dateWindow,
          guestCount: state.brief.guestCount,
          vibe: state.brief.vibe,
          portfolioNote: top.signaturePortfolioNote,
          contactPath: top.contactPath,
        })
      : `Hello ${top.name},\n\nWe're reaching out from ${state.brief.organizerName} & ${state.brief.partnerName}'s wedding planning team. They're looking at ${state.brief.dateWindow} in ${state.brief.region} for roughly ${state.brief.guestCount} guests.\n\nWould you have availability in that window, and could you share rough pricing for an event our size?\n\nThank you,\nCorsia on behalf of ${state.brief.organizerName} & ${state.brief.partnerName}`;

    const rationaleHead = targeted
      ? `${top.name}. found via open-web search at the couple's request.${top.sourceUrl ? `\nSource: ${top.sourceUrl}` : ""}${top.contactPath ? `\nContact path: ${top.contactPath}` : ""}${top.unverified && top.unverified.length > 0 ? `\nUnverified: ${top.unverified.join("; ")}` : ""}`
      : `Shortlist of ${items.length} produced against the locked brief. Approving this hands the top match to Outreach for a personalized first email. which itself becomes a separate Approval Card.`;

    await appendApproval({
      agent: "Scout",
      phase,
      title: targeted
        ? `Open outreach to ${top.name} (you asked Scout to find them)?`
        : `Open outreach to ${top.name} for ${parsed.data.category}?`,
      rationale: `${rationaleHead}\n\n${items.map((it, i) => `${i + 1}. ${it.name}. ${it.city} · ${it.priceBracket} · fit ${it.fitScore}/100\n   ${it.notes}`).join("\n\n")}`,
      risk: "low",
      action: {
        kind: "send_email",
        to: top.contactPath
          ? `${top.name} (${top.contactPath})`
          : `${top.name} (via Corsia alias)`,
        subject,
        body,
      },
    });
  }

  const chatLine = targeted
    ? top
      ? buildTargetedChatReply(top, parsed.data.category, items.length)
      : `I couldn't find a verifiable match for "${parsed.data.targetDescription}". Want to share a website or IG handle so I can pick up from there?`
    : `Scout has a shortlist for ${parsed.data.category}. I've put a card in your queue proposing outreach to the top match. Open Approvals to review.`;

  const after = await appendChat({
    role: "agent",
    agent: "Maestro",
    content: chatLine,
  });

  return NextResponse.json({ state: after, items });
}

// --------------------------------------------------------- outreach prose

function buildTargetedOutreach(args: {
  vendorName: string;
  organizerName: string;
  partnerName: string;
  region: string;
  dateWindow: string;
  guestCount: number;
  vibe: string;
  portfolioNote?: string;
  contactPath?: string;
}): string {
  const opener = args.portfolioNote
    ? `We've been looking at your work. ${args.portfolioNote} stopped us. The light, the feel, the way you held the room.`
    : `Your work has been on our shortlist for a while. the way you handle light and editorial pacing especially.`;
  return [
    `Hello ${args.vendorName.split(" ")[0] ?? args.vendorName},`,
    "",
    opener,
    "",
    `We're ${args.organizerName} & ${args.partnerName}, getting married ${args.dateWindow} in ${args.region}. ${args.guestCount} guests, ${args.vibe.trim() || "an editorial"} feel.`,
    "",
    "We'd love to know if you have the date open, what a wedding with you typically looks like at our size, and rough pricing so we can plan honestly.",
    "",
    `Either way. thank you. Big admirer of the work.`,
    "",
    `${args.organizerName} & ${args.partnerName}`,
  ].join("\n");
}

// ----------------------------------------------------- chat reply prose

function buildTargetedChatReply(
  top: import("@/lib/types").VendorShortlistItem,
  category: string,
  total: number,
): string {
  const first = top.name.split(" ")[0] ?? top.name;
  const press = top.notes ? ` ${top.notes}` : "";
  const lines: string[] = [];
  lines.push(`Found ${first}. ${top.name}. ${top.city} ${category.toLowerCase()}.${press}`);
  const checks: string[] = [];
  if (top.sourceUrl) checks.push(`Verified site: ${top.sourceUrl}`);
  if (top.contactPath && top.contactPath !== top.sourceUrl)
    checks.push(`Contact path: ${top.contactPath}`);
  checks.push(`Pricing: ${top.priceBracket}`);
  checks.push(`Fit: ${top.fitScore}/100`);
  if (top.unverified && top.unverified.length > 0)
    checks.push(`Unverified: ${top.unverified.join("; ")}`);
  lines.push(`,  ${checks.join("\n,  ")}`);
  if (total > 1) {
    lines.push(`On your shortlist now, alongside ${total - 1} other close match${total - 1 === 1 ? "" : "es"} Scout flagged.`);
  } else {
    lines.push(`On your shortlist now. Same row as marketplace vendors. a small "via web" tag carries the provenance.`);
  }
  lines.push(
    `I've drafted a first-contact email. in your Approval Cards. References ${top.signaturePortfolioNote ?? "their portfolio specifically"}.`,
  );
  return lines.join("\n\n");
}
