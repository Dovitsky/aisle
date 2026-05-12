// Demo Mode. generate a complete, realistic ProjectState that exercises
// every module of Corsia. Used by /api/settings op:"load-demo" so a single
// button in Settings populates the entire app for an investor demo.
//
// The generated state is internally consistent: vendor statuses match
// approval card resolutions, budget commitments match contracted vendors,
// guests RSVP across the four statuses, dietary conflicts surface, seating
// is solved, ceremony+music+cake are locked, etc.

import type {
  ProjectState, Brief, Vendor, ApprovalCard, BudgetLine, Household, Guest,
  WeddingPartyMember, ChatMessage, Side, RsvpState, Relationship, AllergenEntry,
  DietaryPref, LedgerEvent,
} from "./types";
import { DEFAULT_GATES, EMPTY_SEATING } from "./types";
import { scoutShortlist } from "./agents/scout";
import { designerDirections } from "./agents/designer";
import { treasurerProposal } from "./agents/treasurer";
import { botanistPropose } from "./agents/botanist";
import { clericPropose } from "./agents/cleric";
import { cantorPropose } from "./agents/cantor";
import { patissierPropose } from "./agents/patissier";
import { sommelierPropose } from "./agents/sommelier";
import { stewardPropose } from "./agents/steward";
import { atelierPropose } from "./agents/atelier";
import { quartermasterPropose } from "./agents/quartermaster";
import { couturierDirections } from "./agents/couturier";
import { curatorPropose } from "./agents/curator";
import { itineristPropose } from "./agents/itinerist";
import { conciergePropose } from "./agents/concierge";
import { stationerSuite, suiteItemSvg } from "./agents/stationer";

const id = (prefix: string) =>
  `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

export async function buildDemoState(): Promise<ProjectState> {
  const brief: Brief = {
    organizerName: "Maya",
    partnerName: "Sam",
    dateWindow: "2026-09-19",
    region: "Hudson Valley, NY",
    guestCount: 120,
    budgetUsd: 110_000,
    vibe:
      "Candlelit barn, editorial film photography, wildflower-and-sage palette, no DJ banter, long farmhouse tables, dancing past midnight.",
    plannerStatus: "want_one",
    cultural: "secular",
    formalityTone: "modern",
    destination: false,
    weddingDate: "2026-09-19",
    locked: true,
    lockedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  };

  // ---- Vendors across every category, mixed statuses ---------------------
  const vendors: Vendor[] = [];
  const venueShort = await scoutShortlist({ brief, category: "Venue", count: 5 });
  const photogShort = await scoutShortlist({ brief, category: "Photographer", count: 5 });
  const floristShort = await scoutShortlist({ brief, category: "Florist", count: 4 });
  const catererShort = await scoutShortlist({ brief, category: "Caterer", count: 4 });
  const bandShort = await scoutShortlist({ brief, category: "Band", count: 3 });
  const hmuShort = await scoutShortlist({ brief, category: "Hair & Makeup", count: 3 });
  const stationerShort = await scoutShortlist({ brief, category: "Stationer", count: 2 });
  const rentalShort = await scoutShortlist({ brief, category: "Rentals", count: 2 });

  // Helper to push vendors with assigned statuses + estimateUsd ladder.
  const push = (it: { name: string; city: string; fitScore: number; priceBracket: Vendor["priceBracket"]; notes: string }, cat: string, status: Vendor["status"], estimateUsd?: number) => {
    vendors.push({
      id: id("v"),
      name: it.name,
      category: cat,
      city: it.city,
      fitScore: it.fitScore,
      priceBracket: it.priceBracket,
      notes: it.notes,
      status,
      estimateUsd,
      lastTouchAt: status === "passed" ? undefined : new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      thread: [],
    });
  };

  // Venues: 1 contracted, 1 quoting, 1 negotiating, 1 shortlisted, 1 passed
  push(venueShort[0], "Venue", "contracted", 18_500);
  push(venueShort[1], "Venue", "quoting", 22_000);
  push(venueShort[2], "Venue", "negotiating", 16_900);
  push(venueShort[3], "Venue", "shortlisted");
  push(venueShort[4], "Venue", "passed");

  // Photographers
  push(photogShort[0], "Photographer", "contracted", 7_500);
  push(photogShort[1], "Photographer", "quoting", 9_800);
  push(photogShort[2], "Photographer", "shortlisted");
  push(photogShort[3], "Photographer", "passed");
  push(photogShort[4], "Photographer", "shortlisted");

  // Florists
  push(floristShort[0], "Florist", "contracted", 8_400);
  push(floristShort[1], "Florist", "quoting", 11_200);
  push(floristShort[2], "Florist", "shortlisted");
  push(floristShort[3], "Florist", "shortlisted");

  // Caterers
  push(catererShort[0], "Caterer", "contracted", 24_500);
  push(catererShort[1], "Caterer", "quoting", 28_100);
  push(catererShort[2], "Caterer", "passed");
  push(catererShort[3], "Caterer", "shortlisted");

  // Bands / DJ
  push(bandShort[0], "Band", "contracted", 6_800);
  push(bandShort[1], "DJ", "shortlisted");
  push(bandShort[2], "Band", "passed");

  // HMU
  push(hmuShort[0], "Hair & Makeup", "contracted", 2_400);
  push(hmuShort[1], "Hair & Makeup", "quoting", 2_900);
  push(hmuShort[2], "Hair & Makeup", "shortlisted");

  // Stationer + Rentals
  push(stationerShort[0], "Stationer", "contracted", 3_600);
  push(stationerShort[1], "Stationer", "passed");
  push(rentalShort[0], "Rentals", "contracted", 12_400);
  push(rentalShort[1], "Rentals", "shortlisted");

  // ---- Designs (mood directions) ----------------------------------------
  const designerOut = await designerDirections(brief);
  const designs = designerOut.map((d, i) => ({
    id: id("design"),
    title: d.title,
    kind: "moodboard" as const,
    description: d.description,
    swatches: d.palette,
    refs: d.refs,
    agent: "Designer" as const,
    locked: i === 0,
    createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
  }));

  // ---- Budget allocation -------------------------------------------------
  const proposal = await treasurerProposal(brief);
  const contractedByCategoryMap: Record<string, number> = {};
  for (const v of vendors.filter((x) => x.status === "contracted" && x.estimateUsd)) {
    const cat = mapCategoryToBudget(String(v.category));
    contractedByCategoryMap[cat] = (contractedByCategoryMap[cat] ?? 0) + (v.estimateUsd ?? 0);
  }
  const budget: BudgetLine[] = proposal.lines.map((l) => {
    const committed = contractedByCategoryMap[l.category] ?? 0;
    // Budget invariant: committed ≤ plan. If contracted vendors push past the
    // planned line, expand the plan to cover with a small headroom buffer.
    const plan = Math.max(l.planUsd, Math.round(committed * 1.05));
    const paid = committed > 0 ? Math.round(committed * 0.5) : 0; // 50% deposits paid
    return {
      id: id("bl"),
      category: l.category,
      planUsd: plan,
      committedUsd: committed,
      paidUsd: paid,
    };
  });

  // ---- Guests ------------------------------------------------------------
  const households: Household[] = SAMPLE_HOUSEHOLDS.map((h) => ({
    id: id("h"),
    label: h.label,
    side: h.side,
    invitedTo: ["wedding"],
  }));
  const guests: Guest[] = [];
  for (const h of SAMPLE_HOUSEHOLDS) {
    const houseId = households.find((x) => x.label === h.label)!.id;
    for (const m of h.members) {
      guests.push({
        id: id("g"),
        householdId: houseId,
        fullName: m.name,
        side: h.side,
        relationship: m.rel,
        plusOnePolicy: m.plusOne ?? "none",
        rsvp: m.rsvp,
        dietaryNotes: m.dietary,
        allergens: m.allergens,
        dietaryPreferences: m.prefs,
        songRequest: m.song,
      });
    }
  }

  // ---- Wedding party -----------------------------------------------------
  const weddingParty: WeddingPartyMember[] = [
    { id: id("wp"), name: "Priya Patel",   role: "maid_of_honor", side: "organizer", email: "priya@example.com" },
    { id: id("wp"), name: "Jamie Rivera",  role: "bridesmaid",    side: "organizer" },
    { id: id("wp"), name: "Avery Chen",    role: "bridesmaid",    side: "organizer" },
    { id: id("wp"), name: "Hannah Goss",   role: "bridesmaid",    side: "organizer" },
    { id: id("wp"), name: "Michael Park",  role: "best_man",      side: "partner", email: "michael@example.com" },
    { id: id("wp"), name: "Daniel Howard", role: "groomsman",     side: "partner" },
    { id: id("wp"), name: "Tom Ortega",    role: "groomsman",     side: "partner" },
    { id: id("wp"), name: "Levi Brand",    role: "groomsman",     side: "partner" },
    { id: id("wp"), name: "Ben Patel",     role: "ring_bearer",   side: "organizer" },
    { id: id("wp"), name: "Iris Goss",     role: "flower_kid",    side: "organizer" },
  ];

  // ---- Specialist programs (florals, ceremony, music, cake, bar, etc) ----
  const florals = (await botanistPropose({ brief })).map((a) => ({ ...a, id: id("flr") }));
  const ceremony = (await clericPropose({ brief, tradition: "humanist" })).map((s, i) => ({
    ...s,
    id: id("cs"),
    position: i,
  }));
  const music = (await cantorPropose({ brief })).map((c) => ({ ...c, id: id("mc") }));
  const cakeSpec = await patissierPropose({ brief });
  const cake = { ...cakeSpec, id: id("cake"), approved: true };
  const bar = await sommelierPropose({ brief });
  const rentals = (await stewardPropose({ brief })).map((r) => ({ ...r, id: id("rnt") }));
  const beauty = (await atelierPropose({
    brief,
    weddingDate: brief.dateWindow,
    ceremonyTime: "16:00",
    party: weddingParty,
  })).map((a) => ({ ...a, id: id("ba") }));
  const welcomeBag = await quartermasterPropose(brief);
  const dressDirs = await couturierDirections(brief);
  const dressDesigns = dressDirs.map((d) => ({
    id: id("dd"),
    title: d.title,
    kind: "dress_concept" as const,
    description: `${d.silhouette} · ${d.fabrics.join(", ")}\n\nDesigners: ${d.designerExamples.join(", ")}\n\n${d.rationale}`,
    swatches: [],
    refs: [],
    agent: "Couturier" as const,
    gateScope: "dress" as const,
    locked: false,
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  }));
  const allDesigns = [...designs, ...dressDesigns];

  const registry = (await curatorPropose(brief)).map((r) => ({ ...r, id: id("reg") }));
  const honeymoon = (await itineristPropose({
    brief,
    weddingDate: brief.dateWindow,
  })).map((s) => ({ ...s, id: id("hm") }));

  const engagement = (await conciergePropose({
    context: `${brief.organizerName} & ${brief.partnerName}, engaged 6 weeks ago, planning to announce`,
  })).milestones.map((m) => ({ ...m, id: id("eng"), createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString() }));

  // ---- Stationery suite (with SVG mockups) ------------------------------
  const suiteItems = await stationerSuite({ brief, direction: designs[0]?.title ?? "Heirloom Garden" });
  const suiteWithSvg = suiteItems.map((it) => ({
    ...it,
    id: id("si"),
    mockSvg: suiteItemSvg({
      copy: it.copy,
      palette: designs[0]?.swatches ?? ["#FAF7EE", "#7C5E3A", "#1A1814"],
      piece: it.piece,
      font: "Cormorant Garamond",
    }),
  }));
  const stationery = [
    {
      id: id("sui"),
      direction: designs[0]?.title ?? "Heirloom Garden",
      palette: designs[0]?.swatches ?? ["#FAF7EE", "#7C5E3A", "#1A1814"],
      font: "Cormorant Garamond",
      format: "hybrid" as const,
      items: suiteWithSvg,
      locked: false,
      createdAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  // ---- Approval cards organized by planning lane -------------------------
  // The demo state is meant to feel like a couple who's mid-journey:
  // Lanes 1-3 (Foundation, Food & Drink, Capture) are SEALED behind them.
  // Lane 4 (Aesthetics) is the active one with 2-3 pending decisions.
  // Lanes 5-8 are queued. Maestro will surface them when 4 wraps.
  //
  // This mirrors the paced concierge experience the user lives in: one
  // small set of choices at a time, breathing room between phases.

  const approvals: ApprovalCard[] = [
    // ===== ACTIVE LANE. Aesthetics (Lane 4) =====
    // 2-3 cards visible on the dashboard. Designer's mood-direction lock,
    // Botanist's florist counter, Couturier dress reveal.
    {
      id: id("ap"),
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      agent: "Designer",
      phase: "design",
      title: `Lock "${designs[0]?.title}" as the design direction?`,
      rationale: `Designer drafted ${designs.length} mood directions. Heirloom Garden is the strongest fit. palette of cream and sage, beeswax tapers, garden-style florals. Locking it lets Stationer start the suite and Botanist refine the floral spec.`,
      risk: "low",
      status: "pending",
      action: { kind: "publish_design", assetId: designs[0]?.id ?? "", title: designs[0]?.title ?? "" },
    },
    {
      id: id("ap"),
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      agent: "Negotiator",
      phase: "design",
      title: `Send counter-proposal to ${vendors.find((v) => v.category === "Florist" && v.status === "quoting")?.name ?? "the florist"}?`,
      rationale: `${vendors.find((v) => v.category === "Florist" && v.status === "quoting")?.name ?? "Florist"} quoted $11,200. That's above the allocated $9,000. Negotiator drafted a polite counter asking for foam-free centerpieces in exchange for the asking price.`,
      risk: "medium",
      status: "pending",
      action: {
        kind: "send_email",
        to: `${vendors.find((v) => v.category === "Florist" && v.status === "quoting")?.name ?? "Florist"} (via Corsia alias)`,
        subject: `Re: Quote. Florals`,
        body: `Hi,\n\nThank you for the proposal. Maya & Sam loved your portfolio. They wanted to come back with one small ask: would you be open to honoring the $9,000 line if we agree on foam-free centerpieces and a single cascading arch instead of two?\n\nLooking forward.\n\nWarmly,\nCorsia on behalf of Maya & Sam`,
      },
    },
    {
      id: id("ap"),
      createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      agent: "Couturier",
      phase: "personal_prep",
      title: "Pick a dress direction (6 drafted)?",
      rationale: `Couturier drafted six dress directions inside the gate. Slip + Cathedral Veil leads on fit-score; Vintage Tea Length is the wildcard. Once you pick one, your tailor gets a brief that respects the design palette.`,
      risk: "low",
      status: "pending",
      gateScope: "dress",
      action: { kind: "publish_design", assetId: dressDesigns[0]?.id ?? "", title: dressDesigns[0]?.title ?? "" },
    },

    // ===== QUEUED. Lane 5 Music & Entertainment =====
    {
      id: id("ap"),
      createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      agent: "Cantor",
      phase: "design",
      title: "Lock the music setlist?",
      rationale: `Cantor proposed ${music.length} cues across processional, ceremony, recessional, cocktail, intro, first dance, parent dance, dinner, open dancing, and last dance.`,
      risk: "low",
      status: "pending",
      action: { kind: "lock_setlist", cueCount: music.length },
    },

    // ===== QUEUED. Lane 7 Stationery =====
    {
      id: id("ap"),
      createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      agent: "Stationer",
      phase: "guest_management",
      title: "Send save-the-dates?",
      rationale: `Stationer drafted the save-the-date suite in the Heirloom Garden direction. ${guests.length} addresses pulled from the guest list (90 with email, 30 paper-only). Hybrid format: digital first, paper to opted-in addresses.`,
      risk: "medium",
      status: "pending",
      action: { kind: "send_save_the_date", suiteId: stationery[0].id, recipients: guests.length, format: "hybrid" },
    },

    // ===== QUEUED. Lane 8 Day-of =====
    {
      id: id("ap"),
      createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      agent: "Cleric",
      phase: "logistics",
      title: "Lock the humanist ceremony script?",
      rationale: `Cleric drafted ${ceremony.length} sections from the ritual library. Includes a personalized welcome, Mary Oliver's "Wild Geese" reading, intentions, and a humanist pronouncement.`,
      risk: "low",
      status: "pending",
      action: { kind: "lock_ceremony", sectionCount: ceremony.length },
    },
    {
      id: id("ap"),
      createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      agent: "Clerk",
      phase: "logistics",
      title: "File the marriage license for Dutchess County?",
      rationale: `Marriage licenses are state-specific. NY requires both partners to appear in person at the County Clerk 24 hours to 60 days before the wedding. $40 fee, photo ID, and proof of dissolution if previously married. Filing window for the September 19 wedding: between July 19 and September 18.`,
      risk: "low",
      status: "pending",
      action: { kind: "file_marriage_license", state: "NY", county: "Dutchess" },
    },

    // ===== SEALED. Lane 1 Foundation =====
    {
      id: id("ap"),
      createdAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
      resolvedAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(),
      agent: "Scout", phase: "foundation",
      title: `Open outreach to ${vendors[0]?.name} for Venue?`,
      rationale: "Top-fit venue from the Hudson Valley shortlist.",
      risk: "low", status: "approved",
      action: { kind: "send_email", to: vendors[0]?.name ?? "", subject: "Inquiry. Venue", body: "..." },
    },
    {
      id: id("ap"),
      createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      resolvedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(),
      agent: "Counsel", phase: "foundation",
      title: `Counter-redline ${vendors[0]?.name}'s contract?`,
      rationale: "Counsel reviewed the standard Venue contract. 5 concerns counter-proposed.",
      risk: "high", status: "approved",
      action: { kind: "sign_contract", vendor: vendors[0]?.name ?? "", redlines: ["Cancellation", "Image rights", "Overtime", "Force majeure", "Liability cap"], estimate: vendors[0]?.estimateUsd ?? 0 },
    },
    {
      id: id("ap"),
      createdAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
      resolvedAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
      agent: "Treasurer", phase: "foundation",
      title: `Schedule 50% deposit to ${vendors[0]?.name}?`,
      rationale: "Standard 50% deposit on the venue contract.",
      risk: "high", status: "approved",
      action: { kind: "schedule_payment", vendor: vendors[0]?.name ?? "", amountUsd: Math.round((vendors[0]?.estimateUsd ?? 0) * 0.5), dueDate: priorDayISO(brief.dateWindow, 200) },
    },

    // ===== SEALED. Lane 2 Food & Drink =====
    {
      id: id("ap"),
      createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      resolvedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
      agent: "Scout", phase: "logistics",
      title: `Open outreach to ${vendors.find((v) => v.category === "Caterer" && v.status === "contracted")?.name ?? "the caterer"}?`,
      rationale: "Top-fit caterer from the shortlist.",
      risk: "low", status: "approved",
      action: { kind: "send_email", to: vendors.find((v) => v.category === "Caterer" && v.status === "contracted")?.name ?? "", subject: "Inquiry. Catering", body: "..." },
    },
    {
      id: id("ap"),
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      resolvedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
      agent: "Counsel", phase: "logistics",
      title: `Sign caterer contract?`,
      rationale: "Family-style menu, allergen accommodations, contracted at $145/pp.",
      risk: "medium", status: "approved",
      action: { kind: "sign_contract", vendor: vendors.find((v) => v.category === "Caterer" && v.status === "contracted")?.name ?? "", redlines: ["Service window", "Allergen protocol", "Cancellation"], estimate: vendors.find((v) => v.category === "Caterer" && v.status === "contracted")?.estimateUsd ?? 0 },
    },

    // ===== SEALED. Lane 3 Capture =====
    {
      id: id("ap"),
      createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
      resolvedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
      agent: "Outreach", phase: "discovery",
      title: `Send first-contact email to ${vendors[5]?.name ?? "Iris & Oak Studio"}?`,
      rationale: "Personalized first-contact draft.",
      risk: "low", status: "approved",
      action: { kind: "send_email", to: vendors[5]?.name ?? "Iris & Oak Studio", subject: "Inquiry. Photographer", body: "..." },
    },
    {
      id: id("ap"),
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      resolvedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000).toISOString(),
      agent: "Counsel", phase: "discovery",
      title: `Sign photographer contract?`,
      rationale: "Two-photographer team, full day, ~600 edited photos, image rights restored to couple.",
      risk: "high", status: "approved",
      action: { kind: "sign_contract", vendor: vendors[5]?.name ?? "Iris & Oak Studio", redlines: ["Image rights", "Overtime", "Cancellation"], estimate: 7500 },
    },

    // ===== Recently rejected. for activity feed signal =====
    {
      id: id("ap"),
      createdAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
      resolvedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
      agent: "Scout", phase: "logistics",
      title: "Open outreach to The Cake Loft for Cake?",
      rationale: "Recommended pick for a 4-tier cake at the contracted scale.",
      risk: "low", status: "rejected",
      rejectionNote: "Going with Patissier's spec through the caterer instead.",
      action: { kind: "send_email", to: "The Cake Loft", subject: "Inquiry. Cake", body: "..." },
    },
  ];

  // ---- Sample chat history -----------------------------------------------
  const lockedAtISO = brief.lockedAt ?? new Date().toISOString();
  const chat: ChatMessage[] = [
    {
      id: id("chat"),
      role: "user",
      content: "We're getting married! We're thinking late September 2026 in the Hudson Valley.",
      createdAt: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: id("chat"),
      role: "agent",
      agent: "Maestro",
      content: "Wonderful. congratulations Maya and Sam. Hudson Valley is right at the peak of foliage that weekend; we'll lean into that. What's your guest count looking like, roughly?",
      createdAt: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000 + 20_000).toISOString(),
    },
    {
      id: id("chat"),
      role: "user",
      content: "Around 120 guests. Budget envelope is $110k. The vibe we keep coming back to is candlelit barn. editorial film photography, no DJ banter, loose wildflowers.",
      createdAt: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000 + 60_000).toISOString(),
    },
    {
      id: id("chat"),
      role: "agent",
      agent: "Maestro",
      content: "Got it. That's a brief I can work with. I have everything I need: Maya & Sam, September 19, 2026, Hudson Valley, NY, 120 guests, $110k envelope, candlelit barn vibe with film photography. Say 'lock it' and I'll release the team. Scout will start on venues + photographers in the next minute, Designer will draft three direction directions, Treasurer will allocate the envelope.",
      createdAt: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000 + 90_000).toISOString(),
    },
    {
      id: id("chat"),
      role: "user",
      content: "Lock it.",
      createdAt: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000 + 110_000).toISOString(),
    },
    {
      id: id("chat"),
      role: "agent",
      agent: "Maestro",
      content: "Locking it. Welcome.",
      createdAt: lockedAtISO,
    },
  ];

  // ---- Day-of timeline ---------------------------------------------------
  const dayOf = [
    { id: id("d"), time: "08:00", title: "Coffee + breakfast. bridal suite",       owner: "Maya + party",       status: "pending" as const },
    { id: id("d"), time: "09:00", title: "Hair + makeup begin",                     owner: "Atelier team",       status: "pending" as const },
    { id: id("d"), time: "12:30", title: "Maya gets dressed",                       owner: "MOH + photographer", status: "pending" as const },
    { id: id("d"), time: "13:00", title: "First look + couple portraits",           owner: "Iris & Oak Studio",  status: "pending" as const },
    { id: id("d"), time: "13:45", title: "Family + wedding party portraits",        owner: "All",                status: "pending" as const },
    { id: id("d"), time: "15:00", title: "Guests arrive. pre-ceremony bar",        owner: "Bartending team",    status: "pending" as const },
    { id: id("d"), time: "16:00", title: "Ceremony. humanist",                     owner: "Officiant + couple", status: "pending" as const, critical: true, toleranceMinutes: 5 },
    { id: id("d"), time: "16:30", title: "Cocktail hour. venue terrace",           owner: "Velvet Hour Trio",   status: "pending" as const },
    { id: id("d"), time: "17:30", title: "Dinner seating + welcome toast",          owner: "Couple + Caterer",   status: "pending" as const },
    { id: id("d"), time: "19:00", title: "Toasts. MOH, Best Man, parents",         owner: "Wedding party",      status: "pending" as const },
    { id: id("d"), time: "19:30", title: "First dance + parent dances",             owner: "Couple",             status: "pending" as const, critical: true },
    { id: id("d"), time: "19:50", title: "Open dancing + cake cutting",             owner: "All + Cantor",       status: "pending" as const },
    { id: id("d"), time: "23:00", title: "Last dance + sparkler exit",              owner: "All",                status: "pending" as const },
  ];

  // ---- Contingencies (rain plan + general bands) -------------------------
  const contingencies = [
    { id: id("ct"), topic: "weather" as const,        preApproved: "Move ceremony into the barn under the cathedral beams. Add 8 patio heaters at the cocktail tent. Reroute portrait sessions to the covered porch.",                                    escalation: "planner" as const },
    { id: id("ct"), topic: "timeline_slip" as const,  preApproved: "If hair & makeup runs > 20 min late, compress portrait window from 60 to 35 min and shift first-look forward.",                                                                       escalation: "planner" as const },
    { id: id("ct"), topic: "vendor_no_show" as const, preApproved: "Day-of coordinator activates backup vendor list (HMU on retainer, officiant via network, cake replacement guarantee). Sam approved all backups in advance.",                          escalation: "planner" as const },
    { id: id("ct"), topic: "guest_medical" as const,  preApproved: "EMS contact at venue. Mark Wong (anaphylactic peanut). epi-pen with Maestro Jr. + nearest hospital is Hudson Memorial 8 min away. Notify caterer to flag every plate.",              escalation: "couple" as const },
    { id: id("ct"), topic: "intoxication" as const,   preApproved: "Bartending team trained in pour-cap. Last call 30 min before scheduled exit. Shuttles run every 45 min back to the hotel block.",                                                     escalation: "planner" as const },
  ];

  // ---- Tip envelopes -----------------------------------------------------
  const tips = [
    { id: id("tip"), recipient: "Photographer team",          amountUsd: 250, cashDelivered: false, handedToOnDay: "Best Man" },
    { id: id("tip"), recipient: "Catering captain",           amountUsd: 200, cashDelivered: false, handedToOnDay: "Day-of coordinator" },
    { id: id("tip"), recipient: "Bartending team (3)",        amountUsd: 300, cashDelivered: false, handedToOnDay: "Day-of coordinator" },
    { id: id("tip"), recipient: "Atelier (HMU lead)",         amountUsd: 150, cashDelivered: false, handedToOnDay: "MOH" },
    { id: id("tip"), recipient: "Velvet Hour Trio (band)",    amountUsd: 400, cashDelivered: false, handedToOnDay: "Day-of coordinator" },
    { id: id("tip"), recipient: "Officiant",                  amountUsd: 100, cashDelivered: false, handedToOnDay: "Father of bride" },
    { id: id("tip"), recipient: "Day-of coordinator",         amountUsd: 250, cashDelivered: false, handedToOnDay: "Couple. direct" },
    { id: id("tip"), recipient: "Florist (delivery + setup)", amountUsd: 100, cashDelivered: false, handedToOnDay: "Day-of coordinator" },
  ];

  // ---- Marriage license --------------------------------------------------
  const license = {
    id: id("lic"),
    state: "NY",
    county: "Dutchess",
    requirements: [
      "Both partners appear in person at the Dutchess County Clerk (Poughkeepsie)",
      "Photo ID for both partners",
      "$40 fee (cash or check)",
      "Proof of dissolution if previously married",
      "24-hour waiting period after issue",
      "License valid 60 days from issue",
    ],
  };

  // ---- Wedding website ---------------------------------------------------
  const site = {
    slug: "maya-and-sam",
    hero: "Maya & Sam · September 2026",
    story: "We met at a friend's birthday in Brooklyn in 2022. Maya brought olive bread; Sam brought too much wine. We've been together ever since.",
    schedulePublished: false,
    rsvpEnabled: true,
    registryLinked: true,
    travelGuide: "Closest airports: ALB (Albany) or HVN (Hudson Valley). Hotel block at The Inn at Hudson, code MAYA-SAM, $189/night. Shuttles run from the hotel block to the venue starting at 3:30pm; return shuttles every 45 min until 12:15am.",
    faqs: [
      { q: "What's the dress code?", a: "Cocktail attire. Garden party meets candlelit barn. long dresses encouraged but not required. Comfortable shoes for the grass." },
      { q: "Are kids invited?", a: "We love your kids. Per RSVP. please indicate on the response card. We'll have a small kids' room with snacks + activities during the reception." },
      { q: "Dietary restrictions?", a: "Yes. please tell us on the RSVP form. Our caterer accommodates allergens and dietary preferences. Please flag anything anaphylactic in the notes." },
      { q: "Parking?", a: "Free on-site. We strongly recommend the shuttle from the hotel block. fewer cars and you can stay later." },
      { q: "Can we bring a plus-one?", a: "Plus-ones are listed on your envelope. If your invitation says 'and guest,' you're welcome to bring one." },
    ],
  };

  // ---- Hotel blocks + shuttles -------------------------------------------
  const hotelBlocks = [
    { id: id("ht"), hotel: "The Inn at Hudson", city: "Hudson, NY",   roomsBlocked: 30, roomsBooked: 18, nightlyRateUsd: 189, releaseDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), notes: "Block code MAYA-SAM" },
    { id: id("ht"), hotel: "Rivertown Lodge",   city: "Hudson, NY",   roomsBlocked: 12, roomsBooked: 4,  nightlyRateUsd: 220, releaseDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), notes: "Block code MAYA-SAM-2. limited inventory" },
  ];
  const shuttles = [
    { id: id("sh"), route: "The Inn at Hudson → Hudson Valley Barn",   pickupTime: "15:30", capacity: 56, reservedSeats: 38 },
    { id: id("sh"), route: "Hudson Valley Barn → The Inn at Hudson",   pickupTime: "23:30", capacity: 56, reservedSeats: 42 },
    { id: id("sh"), route: "Hudson Valley Barn → Rivertown Lodge",     pickupTime: "00:15", capacity: 56, reservedSeats: 12 },
  ];

  // ---- Pre-events --------------------------------------------------------
  const preEvents = [
    { id: id("pe"), kind: "rehearsal_dinner" as const, date: priorDayISO(brief.dateWindow, 1), location: "Hudson Stationhouse",         hostNames: ["Won Park", "Rachel Park"], invitedCount: 36, budgetUsd: 4500 },
    { id: id("pe"), kind: "welcome_drinks"   as const, date: priorDayISO(brief.dateWindow, 1), location: "Inn at Hudson lounge",        hostNames: ["Maya", "Sam"],             invitedCount: 80, budgetUsd: 2800 },
    { id: id("pe"), kind: "next_day_brunch"  as const, date: nextDayISO(brief.dateWindow, 1),  location: "The Inn at Hudson dining room", hostNames: ["David Patel", "Anjali Patel"], invitedCount: 80, budgetUsd: 3200 },
  ];

  // ---- Vows + speeches ---------------------------------------------------
  const vows = [
    { id: id("vw"), whose: "organizer" as const, draft: "Standing here, in front of everyone we love, I want to say what I should have said a hundred mornings ago. I love how seriously you take small kindnesses... [full draft, 4 paragraphs]", wordCount: 287, locked: false },
    { id: id("vw"), whose: "partner"   as const, draft: "Maya, when I think of who I want to be, I think of who I am with you... [full draft, 4 paragraphs]", wordCount: 264, locked: false },
  ];
  const speeches = [
    { id: id("sp"), speaker: "Priya Patel. Maid of Honor",   draft: "Good evening. I'm Priya, Maya's MOH. I have stories I won't tell tonight, and a couple I will... [5 minutes]", wordCount: 720, approved: true },
    { id: id("sp"), speaker: "Michael Park. Best Man",        draft: "Hi everyone. I'm Michael, and I have known Sam for fourteen years... [5 minutes]", wordCount: 680, approved: true },
    { id: id("sp"), speaker: "David Patel. Father of bride", draft: "[outline] gratitude → memory of Maya at 6 → toast",  wordCount: 0, approved: false },
    { id: id("sp"), speaker: "Rachel Park. Mother of groom",  draft: "", wordCount: 0, approved: false },
  ];

  // ---- Memorials ---------------------------------------------------------
  const memorials = [
    { id: id("mem"), name: "Grandfather Patel", relationship: "Maya's grandfather", side: "organizer" as const, treatment: "reserved_seat" as const,    notes: "Reserved seat in the front row with his pocket watch on it. Mentioned by name during the welcome." },
    { id: id("mem"), name: "Aunt Catherine",    relationship: "Sam's aunt",         side: "partner"   as const, treatment: "ceremony_mention" as const, notes: "Her favorite hymn played as a quiet instrumental during cocktail hour." },
  ];

  // ---- Thanks ------------------------------------------------------------
  const findGuestByName = (name: string) => guests.find((g) => g.fullName.startsWith(name));
  const thanks = [
    { id: id("tk"), guestId: findGuestByName("Linda Wong")?.id ?? "", guestName: "Linda Wong + Mark Wong",      giftDescription: "Le Creuset 5.5qt",     status: "drafting" as const },
    { id: id("tk"), guestId: findGuestByName("Priya")?.id ?? "",      guestName: "Priya Patel",                  giftDescription: "Coyuchi towel set",     status: "ready"    as const, draftBody: "Priya. thank you for the Coyuchi towels. We've been using them every morning. We love them, and we love you.. Maya & Sam" },
    { id: id("tk"), guestId: "",                                       guestName: "The Wong family (joint gift)", giftDescription: "Cash gift. $300",      status: "drafting" as const },
  ];

  // ---- Ledger ------------------------------------------------------------
  const ledger: LedgerEvent[] = [
    { id: id("le"), at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), actor: "user",  kind: "brief_locked",      summary: "Brief locked. Specialists released." },
    { id: id("le"), at: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(), actor: "user",  kind: "design_locked",     summary: `Heirloom Garden locked as the design direction.` },
    { id: id("le"), at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(), actor: "user",  kind: "vendor_contracted", summary: `${vendors[0]?.name} contracted (Venue, $${vendors[0]?.estimateUsd?.toLocaleString()})` },
    { id: id("le"), at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),  actor: "user",  kind: "vendor_contracted", summary: `${vendors[5]?.name ?? "Iris & Oak Studio"} contracted (Photographer)` },
    { id: id("le"), at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),  actor: "agent", agent: "Treasurer", kind: "deposit_paid", summary: `50% deposit paid to ${vendors[0]?.name}.` },
  ];

  return {
    brief,
    chat,
    approvals,
    ledger,
    paused: false,
    vendors,
    budget,
    households,
    guests,
    designs: allDesigns,
    seating: EMPTY_SEATING,
    dayOf,
    thanks,
    gates: DEFAULT_GATES,
    viewer: "organizer",
    stationery,
    hotelBlocks,
    shuttles,
    welcomeBag,
    contingencies,
    engagement,
    vows,
    speeches,
    registry,
    honeymoon,
    cake,
    bar,
    rentals,
    beauty,
    license,
    site,
    weddingParty,
    preEvents,
    tips,
    memorials,
    music,
    ceremony,
    ceremonyTradition: "humanist",
    plan: "couple_plus",
    maestroName: undefined,
    dayOfMode: false,
    approvedTokens: [],
    visits: [
      { id: id("vt"), kind: "venue_tour" as const, vendorId: vendors[0]?.id, vendorName: vendors[0]?.name ?? "Hudson Valley Barn", date: priorDayISO(brief.dateWindow, 60), time: "11:00", location: vendors[0]?.city ?? "Hudson, NY",     attendees: ["Maya", "Sam"], notes: "Toured the barn + grounds. Photographed sun position at 4pm.", done: true },
      { id: id("vt"), kind: "tasting"    as const, vendorId: vendors.find((v) => v.category === "Caterer" && v.status === "contracted")?.id, vendorName: "Hudson Valley Table Co.", date: priorDayISO(brief.dateWindow, 30), time: "13:00", location: "Caterer kitchen", attendees: ["Maya", "Sam"], notes: "Tasting menu. picked the lamb + the gnocchi.", done: true },
    ],
    menu: [
      { id: id("mn"), course: "appetizer", name: "Heirloom tomato salad", description: "Burrata, basil oil, smoked salt", containsAllergens: ["dairy"] },
      { id: id("mn"), course: "main",      name: "Pan-seared local fish",  description: "Lemon-caper butter", containsAllergens: ["fish", "dairy"] },
      { id: id("mn"), course: "main",      name: "Braised short rib",     description: "Polenta, crispy shallot", containsAllergens: ["dairy", "gluten"] },
      { id: id("mn"), course: "main",      name: "Herbed mushroom risotto", description: "Vegan option, no dairy", containsAllergens: [], isVegan: true, isVegetarian: true, isGlutenFree: true },
      { id: id("mn"), course: "dessert",   name: "Olive oil cake",         description: "Stone fruit + crème fraîche", containsAllergens: ["dairy", "egg", "gluten"] },
    ],
    dietaryResolutions: {},
    florals,
    demoMode: true,
  } as ProjectState;
}

// ---- Helpers + sample data --------------------------------------------------

function nextWeek(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}
function priorDayISO(window: string, days: number): string {
  const m = window.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return "";
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T12:00:00`);
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}
function nextDayISO(window: string, days: number): string {
  const m = window.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return "";
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function mapCategoryToBudget(cat: string): string {
  switch (cat) {
    case "Venue":          return "Venue";
    case "Photographer":
    case "Videographer":   return "Photography";
    case "Florist":        return "Florals";
    case "Caterer":
    case "Bartending":     return "Catering";
    case "Band":
    case "DJ":             return "Music";
    case "Cake":           return "Cake";
    case "Hair & Makeup":  return "Hair & Makeup";
    case "Stationer":
    case "Calligrapher":   return "Stationery";
    case "Rentals":        return "Rentals";
    case "Transportation": return "Transportation";
    default:               return "Misc";
  }
}

interface SampleMember {
  name: string;
  rel: Relationship;
  rsvp: RsvpState;
  plusOne?: "none" | "named" | "open";
  song?: string;
  dietary?: string;
  allergens?: AllergenEntry[];
  prefs?: DietaryPref[];
}
interface SampleHousehold { label: string; side: Side; members: SampleMember[] }

const SAMPLE_HOUSEHOLDS: SampleHousehold[] = [
  // Maya's side
  { label: "Patel parents",                   side: "organizer" as const, members: [
    { name: "David Patel",  rel: "immediate_family" as const,           rsvp: "yes" as const,    plusOne: "named" as const,  song: "Stand By Me. Ben E. King" },
    { name: "Anjali Patel", rel: "immediate_family" as const,           rsvp: "yes" as const,    plusOne: "named" as const,  dietary: "Vegetarian", prefs: ["vegetarian" as const] },
  ]},
  { label: "Patel grandparents",              side: "organizer" as const, members: [
    { name: "Vikram Patel",  rel: "extended_family" as const, rsvp: "yes" as const, dietary: "Diabetic. sugar-free dessert please", prefs: ["diabetic" as const] },
    { name: "Sushila Patel", rel: "extended_family" as const, rsvp: "yes" as const },
  ]},
  { label: "Wong family",                     side: "organizer" as const, members: [
    { name: "Linda Wong",     rel: "extended_family" as const, rsvp: "yes" as const, plusOne: "named" as const },
    { name: "Mark Wong",      rel: "extended_family" as const, rsvp: "yes" as const, plusOne: "named" as const, dietary: "Severe peanut allergy. anaphylactic. Carries epi-pen.", allergens: [{ code: "peanut" as const, severity: "anaphylactic" as const }] },
    { name: "Sophia Wong",    rel: "child" as const,             rsvp: "yes" as const },
  ]},
  { label: "Priya Patel",                     side: "organizer" as const, members: [
    { name: "Priya Patel",  rel: "college_friend" as const, rsvp: "yes" as const, plusOne: "named" as const, song: "Levitating. Dua Lipa" },
  ]},
  { label: "College friends. Boston",        side: "organizer" as const, members: [
    { name: "Avery Chen",   rel: "college_friend" as const, rsvp: "yes" as const, plusOne: "named" as const },
    { name: "Jamie Rivera", rel: "college_friend" as const, rsvp: "yes" as const, plusOne: "named" as const, dietary: "Gluten-free, lactose-intolerant", prefs: ["gluten_free" as const, "dairy_free" as const] },
  ]},
  { label: "Hannah Goss household",           side: "organizer" as const, members: [
    { name: "Hannah Goss", rel: "college_friend" as const, rsvp: "maybe" as const, plusOne: "named" as const },
    { name: "Iris Goss",   rel: "child" as const,    rsvp: "maybe" as const },
  ]},

  // Sam's side
  { label: "Park parents",                    side: "partner" as const, members: [
    { name: "Rachel Park",  rel: "immediate_family" as const, rsvp: "yes" as const, plusOne: "named" as const, song: "Unforgettable. Nat King Cole" },
    { name: "Won Park",     rel: "immediate_family" as const, rsvp: "yes" as const, plusOne: "named" as const },
  ]},
  { label: "Park siblings",                   side: "partner" as const, members: [
    { name: "Jenny Park",   rel: "immediate_family" as const, rsvp: "yes" as const, plusOne: "named" as const },
    { name: "Connor Park",  rel: "immediate_family" as const, rsvp: "yes" as const, plusOne: "open" as const },
  ]},
  { label: "Best man + bridal party-side",    side: "partner" as const, members: [
    { name: "Michael Park", rel: "college_friend" as const, rsvp: "yes" as const, plusOne: "named" as const },
    { name: "Daniel Howard", rel: "college_friend" as const, rsvp: "yes" as const, plusOne: "named" as const },
    { name: "Tom Ortega",   rel: "college_friend" as const, rsvp: "no" as const, plusOne: "named" as const, dietary: "Tree nut allergy", allergens: [{ code: "tree_nut" as const, severity: "severe" as const }] },
    { name: "Levi Brand",   rel: "college_friend" as const, rsvp: "no_response" as const },
  ]},
  { label: "Sam's grad school cohort",         side: "partner" as const, members: [
    { name: "Sarah Kim",     rel: "college_friend" as const, rsvp: "yes" as const, plusOne: "named" as const },
    { name: "Eli Goldstein", rel: "college_friend" as const, rsvp: "no_response" as const, dietary: "Kosher (no shellfish, no pork, no dairy with meat)", prefs: ["kosher" as const] },
  ]},
  { label: "Sam's work. engineering team",   side: "partner" as const, members: [
    { name: "Andrei Volkov",  rel: "work" as const, rsvp: "yes" as const, plusOne: "open" as const, song: "Mr. Brightside. The Killers" },
    { name: "Maria Rossi",    rel: "work" as const, rsvp: "yes" as const, plusOne: "named" as const },
    { name: "Kai Tanaka",     rel: "work" as const, rsvp: "no" as const, plusOne: "open" as const },
  ]},

  // Both
  { label: "Couple's joint friends",          side: "both" as const, members: [
    { name: "Lara Adams",    rel: "college_friend" as const, rsvp: "yes" as const, plusOne: "named" as const },
    { name: "Theo Adams",    rel: "college_friend" as const, rsvp: "yes" as const, plusOne: "named" as const, dietary: "Vegan", prefs: ["vegan" as const] },
    { name: "Maya Robinson", rel: "college_friend" as const, rsvp: "no_response" as const },
    { name: "Charlotte Lee", rel: "college_friend" as const, rsvp: "yes" as const, plusOne: "named" as const, song: "September. EWF" },
  ]},
];
