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
  addStationerySuite, addVendors, appendApproval, appendChat, mutate, readState,
  setBar, setBeauty, setBrief, setCake, setCeremony, setCeremonyTradition, setFlorals,
  setMusic, setRentals, setWelcomeBag, upsertVow,
} from "@/lib/store";
import { maestroReply } from "@/lib/agents/maestro";
import { scoutShortlist } from "@/lib/agents/scout";
import { designerDirections } from "@/lib/agents/designer";
import { treasurerProposal } from "@/lib/agents/treasurer";
import { outreachDraft } from "@/lib/agents/outreach";
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

// Lock the brief synchronously, then fire Scout in the BACKGROUND so the
// chat response returns immediately. The client polls /api/state to pick up
// shortlists + outreach cards as they arrive.
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

  // Fire-and-forget. The route returns to the user; Scout keeps running.
  void backgroundFireScout(locked, ["Venue", "Photographer"], "lock");

  return "Brief locked — releasing the team. Scout's already searching; venue and photographer cards will land in your queue in the next minute.";
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

// Long-running Scout work. Errors are logged, never thrown — this runs after
// the route has already responded to the client.
async function backgroundFireScout(
  b: Brief,
  cats: ("Venue" | "Photographer")[],
  source: "lock" | "refire",
) {
  for (const cat of cats) {
    try {
      const items = await scoutShortlist({ brief: b, category: cat, count: 5 });
      if (!items.length) continue;
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
          to: `${top.name} (via AISLE alias)`,
          subject: `Inquiry for ${cat} — ${b.dateWindow}`,
          body: `Hello ${top.name},\n\nWe're reaching out from ${b.organizerName} & ${b.partnerName}'s wedding planning team. They're looking at ${b.dateWindow} in ${b.region} for roughly ${b.guestCount} guests.\n\nWould you have availability in that window?\n\nThank you,\nAISLE on behalf of ${b.organizerName} & ${b.partnerName}`,
        },
      });
    } catch (e) {
      console.error(`Scout ${cat} (background) failed:`, e);
    }
  }
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

const Body = z.object({ message: z.string().min(1).max(4000) });

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
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    result = { text: `Maestro hit an error reaching the model: ${msg}`, toolUses: [] };
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
      if (!category) return "";
      const items = await scoutShortlist({ brief, category, count: 5 });
      await addVendors(items.map((it) => ({
        name: it.name, category, city: it.city, fitScore: it.fitScore,
        priceBracket: it.priceBracket, notes: it.notes,
      })));
      const top = items[0];
      const phase = PHASE_BY_CATEGORY[category] ?? "discovery";
      if (top) {
        await appendApproval({
          agent: "Scout", phase,
          title: `Open outreach to ${top.name} for ${category}?`,
          rationale: `Maestro dispatched Scout from chat. Shortlist of ${items.length} produced.\n\n${items.map((it, i) => `${i + 1}. ${it.name} — ${it.city} · ${it.priceBracket} · fit ${it.fitScore}/100`).join("\n")}`,
          risk: "low",
          action: {
            kind: "send_email",
            to: `${top.name} (via AISLE alias)`,
            subject: `Inquiry for ${category} — ${brief.dateWindow}`,
            body: `Hello ${top.name},\n\nWe're reaching out from ${brief.organizerName} & ${brief.partnerName}'s wedding planning team. They're looking at ${brief.dateWindow} in ${brief.region} for roughly ${brief.guestCount} guests.\n\nWould you have availability in that window?\n\nThank you,\nAISLE on behalf of ${brief.organizerName} & ${brief.partnerName}`,
          },
        });
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
      await appendApproval({
        agent: "Outreach", phase: PHASE_BY_CATEGORY[v.category] ?? "discovery",
        title: `Send first-contact email to ${v.name}?`,
        rationale: `Maestro dispatched Outreach. Personalized first contact drafted${note ? ` with note: "${note}"` : ""}.`,
        risk: "low",
        action: {
          kind: "send_email",
          to: `${v.name} (via AISLE alias)`,
          subject: `Inquiry — ${v.category} for ${brief.dateWindow}`,
          body,
        },
      });
      return `Outreach drafted first-contact email to ${v.name}.`;
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
          to: `${v.name} (via AISLE alias)`,
          subject: `Re: Quote — ${v.category}`,
          body,
        },
      });
      return `Negotiator drafted a counter-proposal to ${v.name}.`;
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
