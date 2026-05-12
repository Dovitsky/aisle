// Chat → Maestro → tool dispatch.
//
// Maestro (the orchestrator agent) replies in plain English AND can emit
// tool_use blocks asking for a specialist to be dispatched. This route
// runs each tool, persists the specialist's output to the project state,
// queues an Approval Card where the action is consequential, and surfaces
// a one-line summary back into the chat reply.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  addDesign, addEngagementMilestone, addHoneymoonSegment, addRegistryItem,
  addStationerySuite, addVendor, addVendors, appendApproval, appendChat, mutate, readState,
  upsertBudgetLine,
  setBar, setBeauty, setBrief, setCake, setCeremony, setCeremonyTradition, setFlorals,
  setMusic, setRentals, setWelcomeBag, upsertVow,
} from "@/lib/store";
import { maestroReply } from "@/lib/agents/maestro";
import { scoutShortlist } from "@/lib/agents/scout";
import { designerDirections } from "@/lib/agents/designer";
import { treasurerProposal } from "@/lib/agents/treasurer";
import { outreachDraft, outreachQuestion } from "@/lib/agents/outreach";
import { negotiatorDraft } from "@/lib/agents/negotiator";
import { counselReview } from "@/lib/agents/counsel";
import { stationerSuite, suiteItemSvg } from "@/lib/agents/stationer";
import { botanistPropose } from "@/lib/agents/botanist";
import { clericPropose } from "@/lib/agents/cleric";
import { cantorPropose } from "@/lib/agents/cantor";
import { patissierPropose } from "@/lib/agents/patissier";
import { sommelierPropose } from "@/lib/agents/sommelier";
import { stewardPropose } from "@/lib/agents/steward";
import { atelierPropose } from "@/lib/agents/atelier";
import { quartermasterPropose } from "@/lib/agents/quartermaster";
import { couturierDirections } from "@/lib/agents/couturier";
import { voiceVows } from "@/lib/agents/voice";
import { curatorPropose } from "@/lib/agents/curator";
import { itineristPropose } from "@/lib/agents/itinerist";
import { conciergePropose } from "@/lib/agents/concierge";
import { larderParse, catererBrief } from "@/lib/agents/larder";
import { locatorPropose } from "@/lib/agents/locator";
import { quillParse } from "@/lib/agents/quill";
import { scanInbox } from "@/lib/gmail/scan";
import type {
  Brief, Phase, ProjectState, CeremonyTradition, CeremonySection,
} from "@/lib/types";

// --- helpers used by the brief-tool dispatchers ---
function pickStr(input: unknown, existing: string | undefined, fallback: string): string {
  if (typeof input === "string" && input.trim()) return input.trim();
  if (typeof existing === "string" && existing) return existing;
  return fallback;
}
// Detect whether two briefs differ in fields that would invalidate existing
// vendor shortlists. Region, date window, and guest count materially change
// what Scout would propose; budget and vibe alone don't.
function detectMaterialPivot(prev: Brief, next: Brief): string[] {
  const pivots: string[] = [];
  if (prev.region.trim().toLowerCase() !== next.region.trim().toLowerCase()) {
    pivots.push(`region → ${next.region}`);
  }
  if (prev.dateWindow.trim().toLowerCase() !== next.dateWindow.trim().toLowerCase()) {
    pivots.push(`date window → ${next.dateWindow}`);
  }
  if (prev.guestCount && next.guestCount && Math.abs(prev.guestCount - next.guestCount) / prev.guestCount >= 0.2) {
    pivots.push(`guest count → ${next.guestCount}`);
  }
  return pivots;
}

// ---------------------------------------------------------------------
// Cascade pacing — channeling the best wedding planner in the world.
//
// A world-class planner never dumps the music setlist, the cake spec, and
// the seating chart on a couple 12 months out — they pace the work in
// waves keyed off two signals:
//
//   1. monthsOut from the wedding date — calendar-driven phases.
//      Foundation work (venue, photographer, budget) goes first; music,
//      cake, rentals come 4-6 months later; license, seating, dietary,
//      day-of timeline come in the final weeks.
//
//   2. state-based unlocks — some decisions only make sense after others.
//      Caterer hunt is more useful AFTER venue is contracted (some venues
//      have exclusive caterers). Stationer waits for a design direction
//      to be locked. Patissier waits for caterer (often in-house desserts).
//
// The couple can still jump to any module manually — /music, /cake, etc.
// remain navigable. This pacing only governs what Corsia pushes UP into
// the decisions queue automatically.
// ---------------------------------------------------------------------

function monthsUntilWedding(brief: Brief): number {
  const m = brief.dateWindow.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!m) {
    // Fall back to extracting a year from the dateWindow string.
    const y = brief.dateWindow.match(/20(\d{2})/);
    if (!y) return 12; // safe default
    const guess = new Date(`20${y[1]}-06-15T00:00:00`);
    return Math.max(0, Math.round((guess.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)));
  }
  const t = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00`).getTime();
  return Math.max(0, Math.round((t - Date.now()) / (1000 * 60 * 60 * 24 * 30)));
}

interface CascadeWave {
  /** Human label for the wave — surfaces in the lock-message prose. */
  label: string;
  /** When this wave should kick in, expressed as months remaining. */
  fireWhenMonthsOutAtMost: number;
  /** Run() — the actual fire-and-forget side effects. */
  run: (b: Brief) => Promise<void> | void;
}

async function lockAndIgnite(): Promise<string> {
  const fresh = await readState();
  const cur = fresh.brief;
  if (!cur) return "No brief on file to lock yet.";
  if (cur.locked) return "Brief is already locked.";

  const missing = briefMissing(cur);
  if (missing.length) {
    return `Can't lock yet — still need: ${missing.join(", ")}.`;
  }

  const locked: Brief = { ...cur, locked: true, lockedAt: new Date().toISOString() };
  await setBrief(locked);
  const monthsOut = monthsUntilWedding(locked);

  // The full cascade plan — every wave a great planner thinks through.
  // Filtered by monthsOut so we only fire what's appropriate NOW.
  const allWaves: CascadeWave[] = [
    // ===== Wave 1 — Foundation. Always fires on first lock. =====
    // The bones only: venue, photographer, design direction, budget.
    // Nothing that depends on a contracted venue (website, save-the-dates,
    // rentals, transport) belongs here — those fire later, gated by a
    // venue contract approval (see triggerVenueDependentReminders).
    {
      label: "Foundation",
      fireWhenMonthsOutAtMost: 999, // always
      run: (b) => {
        void backgroundFireScout(b, ["Venue", "Photographer"], "lock");
        void backgroundDesignerCascade(b);
        void backgroundTreasurerCascade(b);
        // Render the dashboard hero image. Background, fire-and-forget;
        // the dashboard polls /api/state and will fade the image in
        // once it's stored on brief.heroImage.
        void backgroundHeroImage(b);
      },
    },

    // ===== Wave 2 — Big bookings. 9-12 months out. =====
    // Caterer (some venues are exclusive — gets priority once venue is on shortlist),
    // Florist (palette informed by design direction).
    {
      label: "Big bookings",
      fireWhenMonthsOutAtMost: 12,
      run: (b) => {
        void backgroundFireScout(b, ["Caterer", "Florist", "Officiant"], "lock");
      },
    },

    // ===== Wave 3 — Design + save-the-dates. 6-9 months out. =====
    {
      label: "Design + save-the-dates",
      fireWhenMonthsOutAtMost: 9,
      run: (b) => {
        void backgroundFireScout(b, ["Stationer"], "lock");
        void backgroundSaveTheDateReminder(b);
      },
    },

    // ===== Wave 4 — Music + cake + rentals + HMU. 6 months out. =====
    {
      label: "Music, cake, rentals",
      fireWhenMonthsOutAtMost: 6,
      run: (b) => {
        void backgroundFireScout(b, ["Band", "DJ", "Hair & Makeup", "Rentals"], "lock");
        void backgroundCantorCascade(b);
        void backgroundPatissierCascade(b);
        void backgroundStewardCascade(b);
        void backgroundSommelierCascade(b);
        void backgroundBotanistCascade(b);
        void backgroundRehearsalDinnerReminder(b);
      },
    },

    // ===== Wave 5 — Ceremony + invitations + registry. 4 months out. =====
    {
      label: "Ceremony + invitations",
      fireWhenMonthsOutAtMost: 4,
      run: (b) => {
        void backgroundClericCascade(b);
        void backgroundCuratorCascade(b);
        void backgroundInvitationsReminder(b);
      },
    },

    // ===== Wave 6 — License + welcome bag + vows. 2-3 months out. =====
    {
      label: "License + welcome bag",
      fireWhenMonthsOutAtMost: 3,
      run: (b) => {
        void backgroundQuartermasterCascade(b);
        void backgroundLicenseReminder(b);
        void backgroundVowsReminder(b);
      },
    },

    // ===== Wave 7 — Day-of details. Last 4-6 weeks. =====
    {
      label: "Day-of details",
      fireWhenMonthsOutAtMost: 1,
      run: (b) => {
        void backgroundContingencyReminder(b);
        void backgroundSeatingReminder(b);
        void backgroundDietaryReminder(b);
      },
    },
  ];

  // PACING: a great planner gives the couple a small, focused first set of
  // decisions — not the full cascade fanned out across every category. We
  // only fire WAVE 1 (Foundation) on lock, even if the wedding is closer.
  // Subsequent waves trigger on signal events (venue contracted unlocks
  // Caterer/Florist hunt; design direction locked unlocks Stationer; etc.)
  // rather than on a calendar threshold. This keeps the queue under five
  // pending cards in the first hour, which is a deliberate UX choice.
  const wavesToFire = allWaves.slice(0, 1);
  for (const w of wavesToFire) await Promise.resolve(w.run(locked));

  // Compose a planner-voice message describing what we're doing AND what's
  // intentionally being deferred — so the couple feels guided, not
  // overwhelmed.
  return composeLockMessage(locked, monthsOut, wavesToFire, allWaves);
}

function composeLockMessage(
  b: Brief,
  monthsOut: number,
  fired: CascadeWave[],
  all: CascadeWave[],
): string {
  const horizon = monthsOut <= 1
    ? "We're in the final stretch."
    : monthsOut <= 3
    ? "We're a few months out — focused on the home stretch."
    : monthsOut <= 6
    ? "We're about half a year out — ramping into the heavy work."
    : monthsOut <= 9
    ? "We're more than half a year out — focused on the big bookings."
    : monthsOut <= 12
    ? "We're a year out — focused on the foundation."
    : `We have ~${monthsOut} months — plenty of time.`;

  // We only fire one wave on lock to keep the queue small. The rest unlock
  // as you make decisions (book the venue → caterer hunt opens; pick a
  // design direction → stationer drafts the suite; etc.).
  const next = all[1]?.label ?? "the next wave";
  return `Brief locked. Welcome aboard, ${b.organizerName}. ${horizon} I'm starting with the foundation only — venue, photographer, the design directions, your envelope, and the wedding website. ${next} comes when these are settled. You can always jump to any module from the menu if you want to look ahead.`;
}

// Same fire-and-forget pattern for post-lock pivots.
async function refireScout(b: Brief): Promise<string> {
  // Soft-archive non-contracted vendors so the new shortlist isn't drowned out.
  await mutate((s) => {
    for (const v of s.vendors) {
      if ((v.category === "Venue" || v.category === "Photographer") &&
          v.status !== "contracted" && v.status !== "paid") {
        v.status = "passed";
      }
    }
    return s;
  });
  void backgroundFireScout(b, ["Venue", "Photographer"], "refire");
  return "Scout's re-shortlisting against the new brief. Fresh outreach cards will appear in your queue shortly.";
}

// Designer cascade — drops mood-board directions into Designs immediately, so
// the /design page is non-empty when the user navigates there post-lock.
async function backgroundDesignerCascade(b: Brief) {
  try {
    const dirs = await designerDirections(b);
    for (const d of dirs) {
      await addDesign({
        title: d.title, kind: "moodboard", description: d.description,
        swatches: d.palette, refs: d.refs, agent: "Designer",
      });
    }
    if (dirs.length) {
      await appendApproval({
        agent: "Designer", phase: "design",
        title: `Pick a design direction (${dirs.length} drafted)?`,
        rationale: `Designer drafted ${dirs.length} mood directions:\n\n${dirs.map((d, i) => `${i + 1}. ${d.title} — ${d.description.slice(0, 80)}`).join("\n")}`,
        risk: "low",
        action: { kind: "publish_design", assetId: dirs[0].title.toLowerCase().replace(/\s+/g, "-"), title: dirs[0].title },
      });
    }
  } catch (e) {
    console.error("Designer (background) failed:", e);
  }
}

// Treasurer cascade — proposes a starting budget allocation right after lock
// so the /budget page is populated and the envelope is visualized.
async function backgroundTreasurerCascade(b: Brief) {
  try {
    const proposal = await treasurerProposal(b);
    await mutate((cur) => {
      const keep = cur.budget.filter((l) => l.vendorId);
      cur.budget = [
        ...keep,
        ...proposal.lines.map((l) => ({
          id: Math.random().toString(36).slice(2, 12),
          category: l.category, planUsd: l.planUsd,
          committedUsd: keep.find((k) => k.category === l.category)?.committedUsd ?? 0,
          paidUsd: keep.find((k) => k.category === l.category)?.paidUsd ?? 0,
        })),
      ];
      return cur;
    });
    await appendApproval({
      agent: "Treasurer", phase: "discovery",
      title: "Lock this budget allocation as the working plan?",
      rationale: `Treasurer proposed an allocation across ${proposal.lines.length} categories totaling $${proposal.total.toLocaleString()}. Top lines: ${proposal.lines.slice(0, 4).map(l => `${l.category} $${(l.planUsd/1000).toFixed(0)}k`).join(", ")}.`,
      risk: "medium",
      action: { kind: "lock_brief", summary: "Lock budget allocation" },
    });
  } catch (e) {
    console.error("Treasurer (background) failed:", e);
  }
}

// Botanist cascade — pre-stages the floral program so /florals isn't empty.
async function backgroundBotanistCascade(b: Brief) {
  try {
    const arrs = await botanistPropose({ brief: b });
    if (arrs.length) {
      await setFlorals(arrs.map((a) => ({ ...a, id: rid() })));
      await appendApproval({
        agent: "Botanist", phase: "design",
        title: "Lock the floral program?",
        rationale: `Botanist drafted ${arrs.length} arrangements: arch, aisle, centerpieces, bouquets, boutonnières, corsages, cake florals, head table garland, welcome arrangement, petals. Real-stem-named, vibe-shaded.`,
        risk: "low",
        action: { kind: "lock_brief", summary: "Lock floral program" },
      });
    }
  } catch (e) { console.error("Botanist (background) failed:", e); }
}

// Cleric cascade — drops a ceremony script into state.ceremony immediately.
async function backgroundClericCascade(b: Brief) {
  try {
    const tradition = (b.cultural ?? "secular") === "secular" ? "humanist" : (b.cultural === "interfaith" ? "interfaith" : "humanist");
    const sections = await clericPropose({ brief: b, tradition });
    if (sections.length) {
      await setCeremonyTradition(tradition);
      await setCeremony(sections.map((s, i) => ({ ...s, id: rid(), position: i })));
      await appendApproval({
        agent: "Cleric", phase: "logistics",
        title: `Lock the ${tradition} ceremony script?`,
        rationale: `Cleric drafted ${sections.length} sections from the ritual library. Edit any section in /ceremony before locking.`,
        risk: "low",
        action: { kind: "lock_ceremony", sectionCount: sections.length },
      });
    }
  } catch (e) { console.error("Cleric (background) failed:", e); }
}

// Cantor cascade — drops the music setlist into state.music.
async function backgroundCantorCascade(b: Brief) {
  try {
    const cues = await cantorPropose({ brief: b });
    if (cues.length) {
      await setMusic(cues.map((c) => ({ ...c, id: rid() })));
      await appendApproval({
        agent: "Cantor", phase: "design",
        title: "Lock the music setlist?",
        rationale: `Cantor proposed ${cues.length} cues across processional, ceremony, recessional, cocktail, intro, first dance, parent dance, dinner, open dancing, and last dance.`,
        risk: "low",
        action: { kind: "lock_setlist", cueCount: cues.length },
      });
    }
  } catch (e) { console.error("Cantor (background) failed:", e); }
}

// Patissier cascade — drops the cake spec into state.cake.
async function backgroundPatissierCascade(b: Brief) {
  try {
    const spec = await patissierPropose({ brief: b });
    if (spec.tiers > 0) {
      await setCake({ ...spec, id: rid(), approved: false });
      await appendApproval({
        agent: "Patissier", phase: "logistics",
        title: "Lock the cake spec?",
        rationale: `Patissier designed a ${spec.tiers}-tier cake. Flavors: ${(spec.flavors ?? []).slice(0, 3).join(" / ")}. Servings: ${spec.servings}. Allergens flagged: ${(spec.allergens ?? []).join(", ")}.`,
        risk: "low",
        action: { kind: "lock_cake", tiers: spec.tiers, servings: spec.servings ?? b.guestCount },
      });
    }
  } catch (e) { console.error("Patissier (background) failed:", e); }
}

// Sommelier cascade — drops the bar program into state.bar.
async function backgroundSommelierCascade(b: Brief) {
  try {
    const program = await sommelierPropose({ brief: b });
    if (program.itemMenu.length) {
      await setBar(program);
    }
  } catch (e) { console.error("Sommelier (background) failed:", e); }
}

// Steward cascade — drops rentals into state.rentals.
async function backgroundStewardCascade(b: Brief) {
  try {
    const tableCount = Math.ceil(b.guestCount / 8);
    const items = await stewardPropose({ brief: b, tableCount });
    if (items.length) {
      await setRentals(items.map((it) => ({ ...it, id: rid() })));
    }
  } catch (e) { console.error("Steward (background) failed:", e); }
}

// Quartermaster cascade — drops welcome bag into state.welcomeBag.
async function backgroundQuartermasterCascade(b: Brief) {
  try {
    const items = await quartermasterPropose(b);
    if (items.length) {
      await setWelcomeBag(items);
    }
  } catch (e) { console.error("Quartermaster (background) failed:", e); }
}

// Curator cascade — drops registry items into state.registry.
async function backgroundCuratorCascade(b: Brief) {
  try {
    const items = await curatorPropose(b);
    for (const it of items) await addRegistryItem(it);
  } catch (e) { console.error("Curator (background) failed:", e); }
}

// Phase-aware proactive reminders. Each fires at its appropriate wave
// rather than all at once — no overwhelming the couple with marriage
// license details a year out.

// Wave 1 (always) — wedding website. Foundational because save-the-dates
// and RSVP forms link to it.
// Personalised outreach for a Scout open-web find. Anchors on the
// portfolioNote so it reads like a real email, not form mail.
function buildTargetedScoutEmail(args: {
  vendorName: string;
  organizerName: string;
  partnerName: string;
  region: string;
  dateWindow: string;
  guestCount: number;
  vibe: string;
  portfolioNote?: string;
}): string {
  const opener = args.portfolioNote
    ? `We've been looking at your work — ${args.portfolioNote} stopped us. The light, the feel, the way you held the room.`
    : `Your work has been on our shortlist for a while — the way you handle light and editorial pacing especially.`;
  return [
    `Hello ${args.vendorName.split(" ")[0] ?? args.vendorName},`,
    "",
    opener,
    "",
    `We're ${args.organizerName} & ${args.partnerName}, getting married ${args.dateWindow} in ${args.region}. ${args.guestCount} guests, ${args.vibe.trim() || "an editorial"} feel.`,
    "",
    "We'd love to know if you have the date open, what a wedding with you typically looks like at our size, and rough pricing so we can plan honestly.",
    "",
    `Either way — thank you. Big admirer of the work.`,
    "",
    `${args.organizerName} & ${args.partnerName}`,
  ].join("\n");
}

// Note: the website reminder used to fire here at lock time, but a
// website without a venue/date is illogical. It now fires from
// store.ts when the Venue contract is signed — see the sign_contract
// branch of resolveApproval. The handler below is kept off the
// cascade so nothing in Wave 1 nags about it.

// Render a custom hero image keyed to the brief's vibe + region + season.
// Stored on brief.heroImage; the dashboard polls /api/state and fades it
// in as a moody backdrop. Falls back to a sage placeholder when no
// OpenAI key is configured.
async function backgroundHeroImage(b: Brief) {
  try {
    const { generateMoodBoardImage, buildFullPrompt } = await import("@/lib/imagegen");
    const { setBrief, readState } = await import("@/lib/store");

    const season = ((): string => {
      const m = b.dateWindow.match(/(\d{4})-(\d{2})/);
      if (m) {
        const month = parseInt(m[2], 10);
        if (month >= 3 && month <= 5) return "spring";
        if (month >= 6 && month <= 8) return "summer";
        if (month >= 9 && month <= 11) return "autumn";
        return "winter";
      }
      const lower = b.dateWindow.toLowerCase();
      if (lower.includes("summer")) return "summer";
      if (lower.includes("spring")) return "spring";
      if (lower.includes("fall") || lower.includes("autumn")) return "autumn";
      if (lower.includes("winter")) return "winter";
      return "the soft hours";
    })();

    const guestScale =
      b.guestCount >= 200 ? "a grand celebration" :
      b.guestCount >= 80  ? "a full reception" :
                            "an intimate gathering";

    const prompt = [
      `An establishing wide shot of ${guestScale} in ${b.region}`,
      `during ${season}.`,
      b.vibe ? `Vibe: ${b.vibe}.` : "",
      `Tone: ${b.formalityTone ?? "modern"}, luxury wedding editorial.`,
      `Composition shows the venue and table setting at golden hour, candles lit, no people in frame.`,
      `Mood: cinematic, atmospheric, soft warm light, shallow depth of field.`,
    ].filter(Boolean).join(" ");

    const result = await generateMoodBoardImage({
      fullPrompt: buildFullPrompt(prompt),
    });

    // Re-read state in case other waves wrote to the brief mid-render.
    const fresh = await readState();
    if (!fresh.brief) return;
    await setBrief({
      ...fresh.brief,
      heroImage: result.url,
      heroPrompt: prompt,
      heroRenderedAt: new Date().toISOString(),
      heroError: result.mode === "placeholder" ? result.error : undefined,
      heroModel: result.mode === "live" ? result.model : undefined,
    });
  } catch (e) {
    console.error("Hero image render failed:", e);
  }
}

// Wave 3 (~9 months out) — save-the-dates.
async function backgroundSaveTheDateReminder(b: Brief) {
  try {
    await appendApproval({
      agent: "Stationer", phase: "guest_management",
      title: "Send save-the-dates?",
      rationale: `Save-the-dates typically go out 6-8 months before the wedding so guests can hold the date and book travel. We're at the right window now — Stationer drafts the suite once you pick a design direction.`,
      risk: "medium",
      action: { kind: "send_save_the_date", suiteId: "draft", recipients: b.guestCount, format: "hybrid" },
    });
  } catch (e) { console.error("Save-the-date reminder failed:", e); }
}

// Wave 4 (~6 months out) — rehearsal dinner.
async function backgroundRehearsalDinnerReminder(b: Brief) {
  try {
    await appendApproval({
      agent: "Concierge", phase: "logistics",
      title: "Add rehearsal dinner planning to the timeline?",
      rationale: `Most weddings include a rehearsal dinner the night before — typically 20-40 people (immediate family + wedding party + out-of-town guests). Booking a venue near the ceremony 4-6 months out keeps options open.`,
      risk: "low",
      action: { kind: "lock_brief", summary: "Add rehearsal dinner" },
    });
  } catch (e) { console.error("Rehearsal dinner reminder failed:", e); }
}

// Wave 5 (~4 months out) — invitations + registry are part of this wave.
async function backgroundInvitationsReminder(b: Brief) {
  try {
    await appendApproval({
      agent: "Stationer", phase: "guest_management",
      title: "Send invitations?",
      rationale: `Invitations go out 8-10 weeks before the wedding. RSVPs come back 4-6 weeks before — that timing locks the seating chart and the dietary brief. Stationer drafts the suite once you've picked a design direction.`,
      risk: "medium",
      action: { kind: "send_invitations", recipients: b.guestCount, format: "hybrid" },
    });
  } catch (e) { console.error("Invitations reminder failed:", e); }
}

// Wave 6 (~3 months out) — marriage license.
async function backgroundLicenseReminder(b: Brief) {
  try {
    await appendApproval({
      agent: "Maestro", phase: "logistics",
      title: "Research marriage license requirements for your county?",
      rationale: `Marriage licenses are state-specific. Most states require both partners to appear in person 24-90 days before the wedding. Some require waiting periods, blood tests, or witnesses. Your wedding is in ${b.region}; let me pull the exact filing window and required documents so we don't miss the deadline.`,
      risk: "low",
      action: { kind: "lock_brief", summary: `License lookup — ${b.region}` },
    });
  } catch (e) { console.error("License reminder failed:", e); }
}

// Wave 6 (~2-3 months out) — vows nudge.
async function backgroundVowsReminder(b: Brief) {
  try {
    await appendApproval({
      agent: "Voice", phase: "personal_prep",
      title: "Start drafting vows?",
      rationale: `Vows take time. Voice can give you a private workspace, a scaffold based on a few prompts, and gentle revision suggestions. Most couples wish they'd started 6-8 weeks before; we're right at that window.`,
      risk: "low",
      action: { kind: "lock_brief", summary: "Open vows workspace" },
    });
  } catch (e) { console.error("Vows reminder failed:", e); }
}

// Wave 7 (~1 month out) — contingency plan.
async function backgroundContingencyReminder(b: Brief) {
  try {
    await appendApproval({
      agent: "Maestro Jr.", phase: "week_of",
      title: "Build a rain / weather contingency plan?",
      rationale: `For outdoor or partially-outdoor venues, standard practice is to identify a backup site by 96 hours out, pre-stage rentals, and pre-script the call. Maestro Jr. builds this against your contracted venue.`,
      risk: "medium",
      action: { kind: "lock_brief", summary: "Weather contingency plan" },
    });
  } catch (e) { console.error("Contingency reminder failed:", e); }
}

// Wave 7 (~1 month out) — seating chart.
async function backgroundSeatingReminder(b: Brief) {
  try {
    await appendApproval({
      agent: "Cartographer", phase: "week_of",
      title: "Build the seating chart?",
      rationale: `RSVPs are mostly in. Cartographer's annealing solver respects family politics, ex-couples, kids' tables, accessibility needs, and dietary clusters. Drafts an arrangement; you tweak via drag-and-drop.`,
      risk: "medium",
      action: { kind: "lock_seating", tableCount: Math.ceil(b.guestCount / 8), guestCount: b.guestCount },
    });
  } catch (e) { console.error("Seating reminder failed:", e); }
}

// Wave 7 (~1 month out) — dietary brief to caterer.
async function backgroundDietaryReminder(b: Brief) {
  try {
    await appendApproval({
      agent: "Larder", phase: "week_of",
      title: "Send dietary brief to your caterer?",
      rationale: `Cross-checks every guest's dietary entry against the menu. Flags anaphylactic allergens with extra emphasis. Caterer needs this 2-4 weeks before to brief the line and stock substitutions.`,
      risk: "high",
      action: { kind: "send_caterer_brief", vendor: "Caterer", guestCount: b.guestCount, allergenCount: 0 },
    });
  } catch (e) { console.error("Dietary reminder failed:", e); }
}

// Long-running Scout work. Errors are logged, never thrown — this runs after
// the route has already responded to the client.
async function backgroundFireScout(
  b: Brief,
  cats: string[],
  source: "lock" | "refire",
) {
  // Parallelize across categories. Each scoutShortlist makes its own
  // Anthropic call (5-15s in live mode); the per-category writes after
  // each call (addVendors → appendApproval) still serialize within a
  // category, but across categories they fan out.
  await Promise.all(
    cats.map(async (cat) => {
      try {
        const items = await scoutShortlist({ brief: b, category: cat, count: 5 });
        if (!items.length) return;
        await addVendors(items.map((it) => ({
          name: it.name, category: cat, city: it.city,
          fitScore: it.fitScore, priceBracket: it.priceBracket, notes: it.notes,
        })));
        const top = items[0];
        const titlePrefix = source === "refire" ? "New: " : "";
        await appendApproval({
          agent: "Scout",
          phase: cat === "Venue" ? "foundation" : "discovery",
          title: `${titlePrefix}Open outreach to ${top.name} for ${cat}?`,
          rationale: `${source === "refire" ? "Brief pivoted — " : ""}Scout shortlisted ${items.length} ${cat.toLowerCase()}s for ${b.region}, ${b.dateWindow}, ${b.guestCount} guests.\n\n${items.map((it, i) => `${i + 1}. ${it.name} — ${it.city} · ${it.priceBracket} · fit ${it.fitScore}/100`).join("\n")}`,
          risk: "low",
          action: {
            kind: "send_email",
            to: `${top.name} (via Corsia alias)`,
            subject: `Inquiry for ${cat} — ${b.dateWindow}`,
            body: `Hello ${top.name},\n\nWe're reaching out from ${b.organizerName} & ${b.partnerName}'s wedding planning team. They're looking at ${b.dateWindow} in ${b.region} for roughly ${b.guestCount} guests.\n\nWould you have availability in that window?\n\nThank you,\nCorsia on behalf of ${b.organizerName} & ${b.partnerName}`,
          },
        });
      } catch (e) {
        console.error(`Scout ${cat} (background) failed:`, e);
      }
    }),
  );
}

// Friendly, specific question for the next-missing brief field.
function nextFieldPrompt(field: keyof Brief): string {
  switch (field) {
    case "organizerName": return "What's your first name?";
    case "partnerName":   return "And your partner's first name?";
    case "dateWindow":    return "When are you thinking? Even a season works.";
    case "region":        return "Where? A city or region is plenty.";
    case "guestCount":    return "Roughly how many guests?";
    case "budgetUsd":     return "What's the budget envelope, ballpark?";
    case "vibe":          return "Tell me the feel — one or two sentences on the look and the room.";
    default:              return "What else should I know?";
  }
}

// Required brief fields. "Missing" = empty string, undefined, or numeric zero.
function briefMissing(b: Brief): (keyof Brief)[] {
  const required: (keyof Brief)[] = [
    "organizerName", "partnerName", "dateWindow", "region",
    "guestCount", "budgetUsd", "vibe",
  ];
  return required.filter((k) => {
    const v = b[k];
    return v === undefined || v === null || v === "" || v === 0;
  });
}

// Some model outputs serialize array fields as JSON-stringified strings even
// when the schema says array. Be forgiving — accept both shapes.
function coerceArray(v: unknown): unknown[] {
  if (Array.isArray(v)) return v;
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed)) return parsed;
    } catch { /* fall through */ }
  }
  return [];
}

function pickInt(input: unknown, existing: number | undefined, fallback: number): number {
  if (typeof input === "number" && Number.isFinite(input)) return Math.round(input);
  if (typeof input === "string" && input.trim()) {
    const n = Number(input.replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(n)) return Math.round(n);
  }
  if (typeof existing === "number" && Number.isFinite(existing)) return existing;
  return fallback;
}

export const dynamic = "force-dynamic";
export const maxDuration = 90;

const Body = z.object({
  message: z.string().min(1).max(4000),
  // Page context — what surface the message originated from. Lets short
  // imperatives ("find cheaper ones") resolve against the active vendor
  // category / topic.
  pageContext: z.object({
    route: z.string().min(1).max(120),
    label: z.string().min(1).max(80),
    vendorCategory: z.string().max(40).optional(),
    topic: z.string().max(200),
    active: z.object({
      kind: z.literal("vendor_category"),
      category: z.string().max(40),
    }).optional(),
  }).optional(),
});

const PHASE_BY_CATEGORY: Record<string, Phase> = {
  Venue: "foundation", Officiant: "foundation",
  Photographer: "discovery", Videographer: "discovery",
  Florist: "design", Caterer: "logistics", Band: "design", DJ: "design",
  "Hair & Makeup": "logistics", Cake: "logistics", Bartending: "logistics",
  Stationer: "design", Calligrapher: "design", Rentals: "logistics",
  Transportation: "logistics",
};

type ToolUse = { name: string; input: Record<string, unknown> };

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const before = await readState();
  if (before.paused) {
    return NextResponse.json(
      { error: "Agents are paused. Resume from Settings." },
      { status: 423 },
    );
  }
  if (before.dayOfMode) {
    return NextResponse.json(
      { error: "Day-of mode engaged — chat is read-only. Maestro Jr. handles in-band decisions." },
      { status: 423 },
    );
  }

  await appendChat({ role: "user", content: parsed.data.message });

  let result;
  try {
    result = await maestroReply({
      brief: before.brief,
      history: before.chat,
      userMessage: parsed.data.message,
      displayName: before.maestroName,
      pageContext: parsed.data.pageContext,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    result = { text: `Apologies — something on my end glitched. Mind asking again? (${msg})`, toolUses: [] };
  }

  const dispatchSummaries: string[] = [];
  let pendingUI: import("@/lib/types").ChatUI | undefined;
  let calledUpdateBrief = false;
  let calledLockNow = false;
  for (const tool of result.toolUses) {
    if (tool.name === "update_brief") calledUpdateBrief = true;
    if (tool.name === "lock_brief_now") calledLockNow = true;
    try {
      const out = await runTool(tool, before);
      if (typeof out === "string") {
        if (out) dispatchSummaries.push(out);
      } else {
        if (out.summary) dispatchSummaries.push(out.summary);
        if (out.ui) pendingUI = out.ui;   // last one wins
      }
    } catch (e) {
      console.error(`Tool ${tool.name} failed:`, e);
      dispatchSummaries.push(`(${tool.name} failed — ${e instanceof Error ? e.message : "unknown"})`);
    }
  }

  let replyText = result.text;

  // --- Empty/stub fallback: never leave the user staring at a stale stub.
  const STUB = /^i'?ll come back to you on that shortly\.?$/i;
  if (!replyText.trim() || STUB.test(replyText.trim())) {
    if (calledLockNow) replyText = "Locking it. Welcome.";
    else if (calledUpdateBrief) replyText = "Got it.";
    else replyText = "On it.";
  }

  // --- Continuation guard: if update_brief fired and the brief is still
  // incomplete BUT Maestro's reply doesn't actually ask anything, append the
  // next-field prompt so the conversation keeps moving forward.
  if (calledUpdateBrief && !calledLockNow) {
    const fresh = await readState();
    const b = fresh.brief;
    if (b && !b.locked) {
      const missing = briefMissing(b);
      const asksAQuestion = /\?/.test(replyText);
      const isShort = replyText.trim().split(/\s+/).length < 8;
      if (missing.length > 0 && (!asksAQuestion || isShort)) {
        const prompt = nextFieldPrompt(missing[0]);
        // Avoid double-asking if the prompt is already substantively present.
        if (!replyText.toLowerCase().includes(prompt.toLowerCase().slice(0, 18))) {
          replyText = replyText.trim().replace(/[.!]+$/, "") + ". " + prompt;
        }
      }
    }
  }

  if (dispatchSummaries.length) {
    const queueable = dispatchSummaries.filter((s) => /Card$|approval|queued|outreach|in your queue/i.test(s) || /shortlisted/i.test(s));
    if (queueable.length) {
      replyText += `\n\n— ${dispatchSummaries.join(" ")}`;
    }
    // Otherwise the summaries are silent acknowledgements (Saved: …) — don't pollute prose.
  }

  // --- After update_brief, two paths:
  //  A) Brief was incomplete and is now complete → AUTO-LOCK + ignite Scout.
  //  B) Brief was already locked → if a material field changed (region,
  //     dateWindow, guestCount), AUTO-REFIRE Scout against the new brief so
  //     Venue/Photographer shortlists rebuild.
  if (calledUpdateBrief && !calledLockNow) {
    const fresh = await readState();
    const b = fresh.brief;
    if (b) {
      const wasIncompleteBefore = !before.brief || briefMissing(before.brief).length > 0;
      const isCompleteNow = briefMissing(b).length === 0 && !b.locked;

      if (wasIncompleteBefore && isCompleteNow) {
        // A) First lock.
        const lockSummary = await lockAndIgnite();
        replyText = `${b.organizerName} & ${b.partnerName} — locking it in. Welcome aboard.\n\n— ${lockSummary}`;
        pendingUI = undefined;
      } else if (before.brief?.locked && b.locked) {
        // B) Material pivot post-lock?
        const pivots = detectMaterialPivot(before.brief, b);
        if (pivots.length) {
          const refireSummary = await refireScout(b);
          const pivotPhrase = pivots.join(", ");
          replyText = `Updated: ${pivotPhrase}. ${refireSummary}`;
          pendingUI = undefined;
        }
      }
    }
  }

  const after = await appendChat({
    role: "agent",
    agent: "Maestro",
    content: replyText,
    ui: pendingUI,
  });

  return NextResponse.json({
    state: after,
    dispatched: result.toolUses.map((t) => t.name),
  });
}

// --------------------------------------------------------------------
// Tool dispatcher
// --------------------------------------------------------------------

type ToolResult = string | { summary?: string; ui?: import("@/lib/types").ChatUI };

async function runTool(tool: ToolUse, before: ProjectState): Promise<ToolResult> {
  // Brief tools work pre-lock. Concierge + inbox-scan don't need a locked brief
  // (Concierge runs in pre-engagement). Everything else does.
  const briefFreeTools = new Set([
    "update_brief", "lock_brief_now", "dispatch_locator",
    "ask_choice", "ask_confirm", "show_summary", "quick_replies",
    "dispatch_concierge", "dispatch_inbox_scan",
    "parse_estimate",
  ]);
  if (!briefFreeTools.has(tool.name) && !before.brief?.locked) {
    return `${tool.name} needs the brief locked first.`;
  }
  const brief = before.brief;

  switch (tool.name) {
    // ----- Onboarding -----
    case "update_brief": {
      const input = tool.input as Record<string, unknown>;
      const merged: Brief = {
        organizerName: pickStr(input.organizerName, brief?.organizerName, ""),
        partnerName:   pickStr(input.partnerName,   brief?.partnerName,   ""),
        dateWindow:    pickStr(input.dateWindow,    brief?.dateWindow,    ""),
        region:        pickStr(input.region,        brief?.region,        ""),
        guestCount:    pickInt(input.guestCount,    brief?.guestCount,    0),
        budgetUsd:     pickInt(input.budgetUsd,     brief?.budgetUsd,     0),
        vibe:          pickStr(input.vibe,          brief?.vibe,          ""),
        plannerStatus: (pickStr(input.plannerStatus, brief?.plannerStatus, "want_one")) as Brief["plannerStatus"],
        cultural:      (input.cultural ?? brief?.cultural ?? "secular") as Brief["cultural"],
        formalityTone: (input.formalityTone ?? brief?.formalityTone ?? "modern") as Brief["formalityTone"],
        destination:   typeof input.destination === "boolean" ? input.destination : (brief?.destination ?? false),
        weddingDate:   pickStr(input.weddingDate,    brief?.weddingDate,   "") || undefined,
        locked:        brief?.locked ?? false,
        lockedAt:      brief?.lockedAt,
      };
      await setBrief(merged);
      const heard = Object.keys(input).filter((k) => input[k] !== undefined && input[k] !== "");
      return heard.length ? `Saved: ${heard.join(", ")}.` : "";
    }

    case "lock_brief_now": {
      return await lockAndIgnite();
    }

    case "dispatch_locator": {
      const input = tool.input as Record<string, unknown>;
      const vibe = String(input.vibe ?? "").trim() || (brief?.vibe ?? "");
      if (!vibe) return "Locator needs a vibe to work from.";
      const suggestions = await locatorPropose({
        vibe,
        seasonHint: input.seasonHint ? String(input.seasonHint) : undefined,
        budgetUsd:
          typeof input.budgetUsd === "number"
            ? input.budgetUsd
            : (brief?.budgetUsd && brief.budgetUsd > 0 ? brief.budgetUsd : undefined),
        guestCount:
          typeof input.guestCount === "number"
            ? input.guestCount
            : (brief?.guestCount && brief.guestCount > 0 ? brief.guestCount : undefined),
      });
      if (!suggestions.length) {
        return "Locator couldn't pull suggestions just now. Try giving me a region directly.";
      }
      return {
        ui: {
          kind: "choice",
          question: "Where does this take you?",
          options: suggestions.map((s) => ({
            id: s.region,
            label: s.region,
            description: [
              s.hub,
              s.rationale,
              s.bestSeason ? `Best: ${s.bestSeason}` : null,
            ].filter(Boolean).join(" · "),
          })),
          allowOther: true,
        },
      };
    }

    // ----- Quill: parse pasted text → estimate, log to budget + vendors -----
    case "parse_estimate": {
      const input = tool.input as Record<string, unknown>;
      const text = String(input.text ?? "").trim();
      if (!text) return "Quill needs the text to parse.";

      const parsed = await quillParse(text);
      if (!parsed) {
        return "Quill couldn't pull a vendor + price out of that. Try pasting the full email or quote.";
      }

      // Log the line into Budget under the inferred category (or "Other").
      const category = parsed.category || "Other";
      await upsertBudgetLine({
        category,
        planUsd: parsed.totalUsd,
        committedUsd: parsed.totalUsd,    // a real estimate is a real commitment
        paidUsd: 0,
      });

      // Match-or-create the vendor record. Match is case-insensitive name + category.
      const cur = await readState();
      const existing = cur.vendors.find((v) =>
        v.name.toLowerCase().trim() === parsed.vendorName.toLowerCase().trim() &&
        String(v.category).toLowerCase() === category.toLowerCase()
      );
      if (existing) {
        // Bump status toward "quoting" if it was earlier in the pipeline.
        const advance = ["shortlisted", "contacted"].includes(existing.status);
        await mutate((s) => {
          const v = s.vendors.find((x) => x.id === existing.id);
          if (!v) return s;
          if (advance) v.status = "quoting";
          v.estimateUsd = parsed.totalUsd;
          v.lastTouchAt = new Date().toISOString();
          return s;
        });
      } else {
        await addVendor({
          name: parsed.vendorName,
          category,
          city: cur.brief?.region ?? "",
          fitScore: 80,
          priceBracket:
            parsed.totalUsd >= 50000 ? "$$$$" :
            parsed.totalUsd >= 15000 ? "$$$" :
            parsed.totalUsd >= 4000  ? "$$"  : "$",
          notes: parsed.notes ?? "Imported from a parsed estimate.",
          status: "quoting",
          estimateUsd: parsed.totalUsd,
        });
      }

      // Render a confirmation summary in chat.
      const rows: { label: string; value: string }[] = [
        { label: "Vendor", value: parsed.vendorName },
        ...(parsed.category ? [{ label: "Category", value: parsed.category }] : []),
        { label: "Total",  value: `$${parsed.totalUsd.toLocaleString()}` },
        ...parsed.lineItems.slice(0, 6).map((li) => ({
          label: li.label.length > 28 ? li.label.slice(0, 26) + "…" : li.label,
          value: `$${li.amountUsd.toLocaleString()}`,
        })),
        ...(parsed.contact?.email ? [{ label: "Email",  value: parsed.contact.email }] : []),
        ...(parsed.contact?.phone ? [{ label: "Phone",  value: parsed.contact.phone }] : []),
        ...(parsed.contact?.person ? [{ label: "Contact", value: parsed.contact.person }] : []),
        { label: "Confidence", value: parsed.confidence },
      ];
      const summaryUI: import("@/lib/types").ChatUI = {
        kind: "summary",
        title: `${existing ? "Updated" : "Logged"} — ${parsed.vendorName}`,
        rows,
      };
      return {
        summary: existing
          ? `Updated ${parsed.vendorName} with the new $${parsed.totalUsd.toLocaleString()} estimate.`
          : `Added ${parsed.vendorName} to vendors and ${category} to budget — $${parsed.totalUsd.toLocaleString()}.`,
        ui: summaryUI,
      };
    }

    // ----- Conversational UI (chat-attached) -----
    case "ask_choice": {
      const input = tool.input as Record<string, unknown>;
      const rawOptions = coerceArray(input.options);
      const options = rawOptions.slice(0, 5).map((o: unknown, i: number) => {
        const r = (o ?? {}) as Record<string, unknown>;
        const label = String(r.label ?? r.id ?? `Option ${i + 1}`).trim();
        return {
          id: String(r.id ?? label).slice(0, 60),
          label,
          description: r.description ? String(r.description) : undefined,
        };
      }).filter((o) => o.label);
      if (!options.length) return "";
      return {
        ui: {
          kind: "choice",
          question: input.question ? String(input.question) : undefined,
          options,
          allowOther: Boolean(input.allowOther),
        },
      };
    }
    case "ask_confirm": {
      const input = tool.input as Record<string, unknown>;
      return {
        ui: {
          kind: "confirm",
          question: input.question ? String(input.question) : undefined,
          yes: input.yes ? String(input.yes) : undefined,
          no:  input.no  ? String(input.no)  : undefined,
        },
      };
    }
    case "show_summary": {
      const input = tool.input as Record<string, unknown>;
      const rawRows = coerceArray(input.rows);
      const rows = rawRows.slice(0, 12).map((r: unknown) => {
        const x = (r ?? {}) as Record<string, unknown>;
        return {
          label: String(x.label ?? "").trim(),
          value: String(x.value ?? "").trim(),
        };
      }).filter((r) => r.label);
      if (!rows.length) return "";
      return {
        ui: {
          kind: "summary",
          title: String(input.title ?? "Summary"),
          rows,
        },
      };
    }
    case "quick_replies": {
      const input = tool.input as Record<string, unknown>;
      const replies = coerceArray(input.replies)
        .slice(0, 4)
        .map((r: unknown) => String(r).trim())
        .filter(Boolean);
      if (!replies.length) return "";
      return { ui: { kind: "quick_replies", replies } };
    }

    // ----- Vendor + outreach -----
    case "dispatch_scout": {
      if (!brief) return "";
      const category = String(tool.input.category ?? "").trim();
      const targetDescription = tool.input.targetDescription
        ? String(tool.input.targetDescription).trim()
        : undefined;
      if (!category) return "";
      const targeted = !!targetDescription;
      const items = await scoutShortlist({
        brief,
        category,
        count: targeted ? 3 : 5,
        targetDescription,
      });
      await addVendors(items.map((it) => ({
        name: it.name, category, city: it.city, fitScore: it.fitScore,
        priceBracket: it.priceBracket, notes: it.notes,
        discoveryMethod: targeted ? "open_web" : "marketplace",
        sourceProvenance: targeted
          ? "Found via open web at the couple's request"
          : undefined,
        sourceUrl: it.sourceUrl,
        contactPath: it.contactPath,
        signaturePortfolioNote: it.signaturePortfolioNote,
        unverified: it.unverified,
      })));
      const top = items[0];
      const phase = PHASE_BY_CATEGORY[category] ?? "discovery";
      if (top) {
        const subject = targeted
          ? `${brief.organizerName} & ${brief.partnerName} — ${category} for ${brief.dateWindow}`
          : `Inquiry for ${category} — ${brief.dateWindow}`;
        const body = targeted
          ? buildTargetedScoutEmail({
              vendorName: top.name,
              organizerName: brief.organizerName,
              partnerName: brief.partnerName,
              region: brief.region,
              dateWindow: brief.dateWindow,
              guestCount: brief.guestCount,
              vibe: brief.vibe,
              portfolioNote: top.signaturePortfolioNote,
            })
          : `Hello ${top.name},\n\nWe're reaching out from ${brief.organizerName} & ${brief.partnerName}'s wedding planning team. They're looking at ${brief.dateWindow} in ${brief.region} for roughly ${brief.guestCount} guests.\n\nWould you have availability in that window?\n\nThank you,\nCorsia on behalf of ${brief.organizerName} & ${brief.partnerName}`;
        const rationaleHead = targeted
          ? `${top.name} — found via open-web search at the couple's request.${top.sourceUrl ? `\nSource: ${top.sourceUrl}` : ""}${top.contactPath ? `\nContact path: ${top.contactPath}` : ""}${top.unverified && top.unverified.length > 0 ? `\nUnverified: ${top.unverified.join("; ")}` : ""}`
          : `Maestro dispatched Scout from chat. Shortlist of ${items.length} produced.`;
        await appendApproval({
          agent: "Scout", phase,
          title: targeted
            ? `Open outreach to ${top.name} (you asked Scout to find them)?`
            : `Open outreach to ${top.name} for ${category}?`,
          rationale: `${rationaleHead}\n\n${items.map((it, i) => `${i + 1}. ${it.name} — ${it.city} · ${it.priceBracket} · fit ${it.fitScore}/100`).join("\n")}`,
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
      if (targeted) {
        if (!top) {
          return `Scout couldn't find a verifiable match for "${targetDescription}". Share a site or IG handle and I'll pick up from there.`;
        }
        const firstName = top.name.split(" ")[0] ?? top.name;
        const checks: string[] = [];
        if (top.sourceUrl) checks.push(`verified at ${top.sourceUrl}`);
        if (top.contactPath && top.contactPath !== top.sourceUrl)
          checks.push(`contact path: ${top.contactPath}`);
        checks.push(`pricing ${top.priceBracket}`);
        checks.push(`fit ${top.fitScore}/100`);
        if (top.unverified && top.unverified.length > 0)
          checks.push(`unverified: ${top.unverified.join("; ")}`);
        return `Found ${firstName}. ${top.name} — ${top.city}. ${checks.join(" · ")}. On the shortlist now with a "via web" tag. A first-contact email is in your Approval Cards — references ${top.signaturePortfolioNote ?? "their portfolio specifically"}.`;
      }
      return `Scout shortlisted ${items.length} ${category}.`;
    }

    case "dispatch_outreach": {
      if (!brief) return "";
      const vendorName = String(tool.input.vendorName ?? "").trim();
      const note = tool.input.note ? String(tool.input.note) : undefined;
      const v = before.vendors.find((x) => x.name.toLowerCase() === vendorName.toLowerCase());
      if (!v) return `Outreach: no vendor named "${vendorName}" in the marketplace.`;
      const body = await outreachDraft({ brief, vendor: v, noteFromCouple: note });
      const subject = `Inquiry — ${v.category} for ${brief.dateWindow}`;
      await appendApproval({
        agent: "Outreach", phase: PHASE_BY_CATEGORY[v.category] ?? "discovery",
        title: `Send first-contact email to ${v.name}?`,
        rationale: `Maestro dispatched Outreach. Personalized first contact drafted${note ? ` with note: "${note}"` : ""}.`,
        risk: "low",
        action: {
          kind: "send_email",
          to: `${v.name} (via Corsia alias)`,
          subject,
          body,
        },
      });
      // Surface the actual draft inline in the chat so the couple sees it
      // before approving. Plus a clear link to Decisions for the send step.
      return [
        `Drafted a first-contact email to ${v.name}.`,
        ``,
        `## Subject`,
        subject,
        ``,
        `## Body`,
        body,
        ``,
        `Open **Decisions** to approve, edit, or pass. We won't send anything until you tap.`,
      ].join("\n");
    }

    case "dispatch_negotiator": {
      if (!brief) return "";
      const vendorName = String(tool.input.vendorName ?? "").trim();
      const goal = String(tool.input.goal ?? "").trim();
      const v = before.vendors.find((x) => x.name.toLowerCase() === vendorName.toLowerCase());
      if (!v) return `Negotiator: no vendor named "${vendorName}".`;
      const body = await negotiatorDraft({ brief, vendor: v, goal });
      await appendApproval({
        agent: "Negotiator", phase: PHASE_BY_CATEGORY[v.category] ?? "discovery",
        title: `Send counter-proposal to ${v.name}?`,
        rationale: `Maestro dispatched Negotiator. Goal: ${goal}.`,
        risk: "medium",
        action: {
          kind: "send_email",
          to: `${v.name} (via Corsia alias)`,
          subject: `Re: Quote — ${v.category}`,
          body,
        },
      });
      return `Negotiator drafted a counter-proposal to ${v.name}.`;
    }

    case "dispatch_email_vendor": {
      if (!brief) return "";
      const vendorRef = String(tool.input.vendorRef ?? "").trim();
      const topic = String(tool.input.topic ?? "").trim();
      const note = tool.input.note ? String(tool.input.note) : undefined;
      if (!vendorRef || !topic) return "Need a vendor and a topic.";
      const v = resolveVendor(before.vendors, vendorRef);
      if (!v) return `I couldn't find a vendor matching "${vendorRef}" — pull up /vendors and tell me which one.`;
      const body = await outreachQuestion({ brief, vendor: v, topic, note });
      const subject = `Re: ${v.category} — ${topic.length > 50 ? topic.slice(0, 50) + "…" : topic}`;
      await appendApproval({
        agent: "Outreach",
        phase: PHASE_BY_CATEGORY[v.category] ?? "logistics",
        title: `Email ${v.name}: ${topic}?`,
        rationale: `You asked Maestro to email ${v.name} about ${topic}. Outreach drafted the body. Approve to send via your connected Gmail; the reply will land in your inbox and update ${v.name}'s thread automatically.`,
        risk: "low",
        action: { kind: "send_email", to: `${v.name} (via Corsia alias)`, subject, body },
      });
      return `Drafted: emailing ${v.name} about ${topic}.`;
    }

    case "dispatch_counsel": {
      const vendorName = String(tool.input.vendorName ?? "").trim();
      const v = before.vendors.find((x) => x.name.toLowerCase() === vendorName.toLowerCase());
      if (!v) return `Counsel: no vendor named "${vendorName}".`;
      const review = await counselReview({ vendorName: v.name, category: v.category });
      await appendApproval({
        agent: "Counsel", phase: "logistics",
        title: `Counter-redline ${v.name}'s contract?`,
        rationale: `Counsel reviewed the standard ${v.category} contract template.\n\nOverall risk: ${review.overallRisk.toUpperCase()}\n\n${review.concerns.map((c, i) => `${i + 1}. ${c.topic} — ${c.rationale}`).join("\n")}`,
        risk: review.overallRisk,
        action: {
          kind: "sign_contract",
          vendor: v.name,
          estimate: v.estimateUsd ?? 0,
          redlines: review.concerns.map((c) => c.topic),
        },
      });
      return `Counsel flagged ${review.concerns.length} concerns on ${v.name}.`;
    }

    // ----- Money -----
    case "dispatch_treasurer": {
      if (!brief) return "";
      const proposal = await treasurerProposal(brief);
      await mutate((cur) => {
        const keep = cur.budget.filter((l) => l.vendorId);
        cur.budget = [
          ...keep,
          ...proposal.lines.map((l) => ({
            id: Math.random().toString(36).slice(2, 12),
            category: l.category, planUsd: l.planUsd,
            committedUsd: keep.find((k) => k.category === l.category)?.committedUsd ?? 0,
            paidUsd: keep.find((k) => k.category === l.category)?.paidUsd ?? 0,
          })),
        ];
        return cur;
      });
      await appendApproval({
        agent: "Treasurer", phase: "discovery",
        title: "Lock this budget allocation as the working plan?",
        rationale: `Maestro dispatched Treasurer. ${proposal.lines.length} lines totaling $${proposal.total.toLocaleString()}.`,
        risk: "medium",
        action: { kind: "lock_brief", summary: "Lock budget allocation" },
      });
      return "Treasurer proposed an allocation.";
    }

    // ----- Design + stationery + florals -----
    case "dispatch_designer": {
      if (!brief) return "";
      const dirs = await designerDirections(brief);
      for (const d of dirs) {
        await addDesign({
          title: d.title, kind: "moodboard", description: d.description,
          swatches: d.palette, refs: d.refs, agent: "Designer",
        });
      }
      return `Designer proposed ${dirs.length} mood-board directions.`;
    }

    case "dispatch_stationer": {
      if (!brief) return "";
      const direction = String(tool.input.direction ?? "").trim();
      if (!direction) return "Stationer: no direction title supplied.";
      const items = await stationerSuite({ brief, direction, menu: before.menu });
      const dir = before.designs.find((d) => d.title.toLowerCase() === direction.toLowerCase());
      const palette = dir?.swatches ?? ["#FBF8F1", "#7C5E3A", "#1A1814"];
      const font = "Cormorant Garamond";
      const itemsWithSvg = items.map((it) => ({
        ...it,
        mockSvg: suiteItemSvg({ copy: it.copy, palette, piece: it.piece, font }),
      }));
      await addStationerySuite({
        direction, palette, font, format: "hybrid", items: itemsWithSvg,
      });
      return `Stationer drafted a ${items.length}-piece suite for "${direction}".`;
    }

    case "dispatch_botanist": {
      if (!brief) return "";
      const arrs = await botanistPropose({ brief });
      await setFlorals(arrs.map((a) => ({ ...a, id: rid() })));
      await appendApproval({
        agent: "Botanist", phase: "design",
        title: "Lock the floral program?",
        rationale: `Botanist drafted ${arrs.length} arrangements (arch, aisle, centerpieces, bouquets).`,
        risk: "low",
        action: { kind: "lock_brief", summary: "Lock floral program" },
      });
      return `Botanist proposed ${arrs.length} floral arrangements.`;
    }

    // ----- Day modules -----
    case "dispatch_cleric": {
      if (!brief) return "";
      const tradition = (String(tool.input.tradition ?? before.ceremonyTradition ?? "humanist")) as CeremonyTradition;
      const notes = tool.input.notes ? String(tool.input.notes) : undefined;
      const sections = await clericPropose({ brief, tradition, notes });
      await setCeremonyTradition(tradition);
      const withIds: CeremonySection[] = sections.map((s, i) => ({
        ...s, id: rid(), position: i,
      }));
      await setCeremony(withIds);
      await appendApproval({
        agent: "Cleric", phase: "logistics",
        title: `Lock the ${tradition} ceremony script?`,
        rationale: `Cleric drafted ${sections.length} sections${notes ? ` with notes: "${notes}"` : ""}.`,
        risk: "low",
        action: { kind: "lock_ceremony", sectionCount: sections.length },
      });
      return `Cleric drafted ${sections.length} ${tradition} ceremony sections.`;
    }

    case "dispatch_cantor": {
      if (!brief) return "";
      const cues = await cantorPropose({ brief });
      await setMusic(cues.map((c) => ({ ...c, id: rid() })));
      await appendApproval({
        agent: "Cantor", phase: "design",
        title: "Lock the music setlist?",
        rationale: `Cantor proposed ${cues.length} cues across processional, ceremony, cocktail, and reception.`,
        risk: "low",
        action: { kind: "lock_setlist", cueCount: cues.length },
      });
      return `Cantor proposed a ${cues.length}-cue setlist.`;
    }

    case "dispatch_patissier": {
      if (!brief) return "";
      const spec = await patissierPropose({ brief });
      await setCake({ ...spec, id: rid(), approved: false });
      await appendApproval({
        agent: "Patissier", phase: "logistics",
        title: "Lock the cake spec?",
        rationale: `Patissier designed a ${spec.tiers}-tier cake. ${spec.flavors?.join(" / ") ?? ""}`,
        risk: "low",
        action: {
          kind: "lock_cake",
          tiers: spec.tiers,
          servings: spec.servings ?? brief.guestCount,
        },
      });
      return `Patissier designed the cake.`;
    }

    case "dispatch_sommelier": {
      if (!brief) return "";
      const program = await sommelierPropose({ brief });
      await setBar(program);
      return `Sommelier designed the bar program.`;
    }

    case "dispatch_steward": {
      if (!brief) return "";
      const tableCount = Math.ceil(brief.guestCount / 10);
      const items = await stewardPropose({ brief, tableCount });
      await setRentals(items.map((it) => ({ ...it, id: rid() })));
      return `Steward computed ${items.length} rental line items.`;
    }

    case "dispatch_atelier": {
      if (!brief) return "";
      const ceremonyTime = String(tool.input.ceremonyTime ?? "16:00");
      const dateMatch = brief.dateWindow.match(/\d{4}-\d{2}-\d{2}/);
      const weddingDate = dateMatch?.[0] ?? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const appts = await atelierPropose({
        brief, weddingDate, ceremonyTime, party: before.weddingParty,
      });
      await setBeauty(appts.map((a) => ({ ...a, id: rid() })));
      return `Atelier scheduled ${appts.length} hair & makeup slots.`;
    }

    case "dispatch_quartermaster": {
      if (!brief) return "";
      const items = await quartermasterPropose(brief);
      await setWelcomeBag(items);
      return `Quartermaster composed a ${items.length}-item welcome bag.`;
    }

    // ----- Personal + post-event -----
    case "dispatch_couturier": {
      if (!brief) return "";
      const notes = tool.input.notes ? String(tool.input.notes) : undefined;
      const dirs = await couturierDirections(brief, notes);
      // Couturier output is dress-gated. Surface as design assets with gateScope.
      for (const d of dirs) {
        await addDesign({
          title: d.title, kind: "dress_concept",
          description: `${d.silhouette} · ${d.fabrics.join(", ")}\n\nDesigners: ${d.designerExamples.join(", ")}\n\n${d.rationale}`,
          swatches: [],
          refs: [],
          agent: "Couturier",
          gateScope: "dress",
        });
      }
      return `Couturier proposed ${dirs.length} dress directions (gated).`;
    }

    case "dispatch_voice_vows": {
      const whose = (String(tool.input.whose ?? "organizer")) as "organizer" | "partner";
      const prompts = String(tool.input.prompts ?? "").trim();
      if (!prompts) return "Voice: needs prompts to draft from.";
      const out = await voiceVows({ whose, prompts });
      await upsertVow(whose, { draft: out.draft, wordCount: out.draft.split(/\s+/).length });
      return `Voice drafted vows for the ${whose}.`;
    }

    case "dispatch_curator": {
      if (!brief) return "";
      const items = await curatorPropose(brief);
      for (const it of items) await addRegistryItem(it);
      return `Curator proposed a ${items.length}-item registry.`;
    }

    case "dispatch_itinerist": {
      if (!brief) return "";
      const weddingDate = String(tool.input.weddingDate ?? "").trim();
      if (!weddingDate) return "Itinerist: needs weddingDate (YYYY-MM-DD).";
      const segs = await itineristPropose({ brief, weddingDate });
      for (const s of segs) await addHoneymoonSegment(s);
      return `Itinerist proposed a ${segs.length}-segment honeymoon.`;
    }

    case "dispatch_concierge": {
      const context = String(tool.input.context ?? "").trim();
      if (!context) return "Concierge: needs context to propose milestones.";
      const proposal = await conciergePropose({ context });
      for (const m of proposal.milestones) await addEngagementMilestone(m);
      return `Concierge proposed ${proposal.milestones.length} engagement milestones.`;
    }

    // ----- Larder -----
    case "dispatch_larder_parse": {
      let parsed = 0;
      for (const g of before.guests) {
        const text = (g.dietaryNotes ?? "").trim();
        if (!text) continue;
        try {
          const out = await larderParse(text);
          await mutate((s) => {
            const target = s.guests.find((x) => x.id === g.id);
            if (target) {
              target.allergens = out.allergens;
              target.dietaryPreferences = out.preferences;
              if (out.notes) target.dietaryNotes = out.notes;
            }
            return s;
          });
          parsed += 1;
        } catch {
          // Skip individual parse failures.
        }
      }
      return `Larder parsed dietary entries for ${parsed} guest${parsed === 1 ? "" : "s"}.`;
    }

    case "dispatch_larder_brief": {
      const caterer = before.vendors.find((v) =>
        v.category === "Caterer" && (v.status === "contracted" || v.status === "paid"),
      );
      if (!caterer) return "Larder: no contracted caterer to brief yet.";
      const cb = catererBrief(before);
      await appendApproval({
        agent: "Larder", phase: "logistics",
        title: `Send dietary brief to ${caterer.name}?`,
        rationale: `${cb.guestCount} guests · ${cb.criticalGuests.length} critical · ${cb.allergenSummary.length} allergen categories. Cross-contamination protocol asked.`,
        risk: cb.criticalGuests.length > 0 ? "high" : "medium",
        action: {
          kind: "send_caterer_brief",
          vendor: caterer.name,
          guestCount: cb.guestCount,
          allergenCount: cb.allergenSummary.length,
        },
      });
      return `Larder drafted the dietary brief for ${caterer.name}.`;
    }

    // ----- Inbox -----
    case "dispatch_inbox_scan": {
      const r = await scanInbox({ max: 25 });
      return `Triage scanned the inbox: ${r.scanned} messages, ${r.matched} matched, ${r.approvalsQueued} approval${r.approvalsQueued === 1 ? "" : "s"} queued.`;
    }

    default:
      return `Unknown tool: ${tool.name}.`;
  }
}

function rid(): string {
  return Math.random().toString(36).slice(2, 12);
}

// Resolve a vendor from natural-language input — couples say "the venue",
// "our photographer", "Hudson Valley Barn". We accept:
//   1. Exact / case-insensitive name match.
//   2. Substring name match.
//   3. Role reference: "the venue" → contracted Venue, fall back to leading
//      Venue (highest fitScore among shortlisted/quoting/negotiating).
function resolveVendor(vendors: ProjectState["vendors"], ref: string): ProjectState["vendors"][number] | null {
  const r = ref.trim().toLowerCase();
  if (!r) return null;
  // 1. Name exact / substring
  const byName = vendors.find((v) => v.name.toLowerCase() === r)
    ?? vendors.find((v) => v.name.toLowerCase().includes(r))
    ?? vendors.find((v) => r.includes(v.name.toLowerCase()));
  if (byName) return byName;

  // 2. Role reference
  const ROLE_TO_CATEGORY: Record<string, string> = {
    "venue": "Venue",
    "photographer": "Photographer", "photog": "Photographer",
    "videographer": "Videographer", "video": "Videographer",
    "florist": "Florist", "floral": "Florist", "florals": "Florist",
    "caterer": "Caterer", "catering": "Caterer", "food": "Caterer",
    "officiant": "Officiant", "celebrant": "Officiant",
    "band": "Band", "music": "Band",
    "dj": "DJ",
    "stationer": "Stationer", "stationery": "Stationer", "invitations": "Stationer",
    "calligrapher": "Calligrapher",
    "rentals": "Rentals", "rental": "Rentals",
    "transportation": "Transportation", "shuttle": "Transportation", "transport": "Transportation",
    "hair and makeup": "Hair & Makeup", "hair & makeup": "Hair & Makeup", "hmu": "Hair & Makeup",
    "hair": "Hair & Makeup", "makeup": "Hair & Makeup", "beauty": "Hair & Makeup",
    "cake": "Cake", "baker": "Cake",
    "bartender": "Bartending", "bar": "Bartending", "bartending": "Bartending",
  };
  // Strip "the/our/my" articles + "vendor" suffix.
  const cleaned = r.replace(/^(the|our|my|a|an)\s+/, "").replace(/\s+vendor$/, "");
  const cat = ROLE_TO_CATEGORY[cleaned];
  if (!cat) return null;
  const inCat = vendors.filter((v) => v.category === cat);
  if (!inCat.length) return null;
  // Prefer contracted, then paid, then negotiating, then quoting, then shortlisted.
  const STATUS_RANK: Record<string, number> = {
    contracted: 0, paid: 1, negotiating: 2, quoting: 3, contacted: 4, shortlisted: 5, passed: 99,
  };
  inCat.sort((a, b) => {
    const sa = STATUS_RANK[a.status as string] ?? 50;
    const sb = STATUS_RANK[b.status as string] ?? 50;
    if (sa !== sb) return sa - sb;
    return (b.fitScore ?? 0) - (a.fitScore ?? 0);
  });
  return inCat[0];
}
