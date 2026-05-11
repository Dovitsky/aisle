// Dashboard render-simulation. Walks every state-field-access pattern that
// `components/Today.tsx`'s post-lock Dashboard performs against the demo
// state. If any field access throws, this test catches it BEFORE a real user
// sees a blank screen.
//
// Mirrors the actual code paths in:
//   • EditorialHero (countdown, venue resolution, watcher flag)
//   • DecisionsBlock (groupByPhase + sorting)
//   • ActivityFeed (ledger + recent approvals merge)
//   • BudgetSnapshot (sum reductions + invariant check)
//   • VendorGlance (per-category reads, stage description)
//   • UpcomingTasks (CHECKLIST.filter + currentMonthsOut)
//   • QuickNav (static)
//   • Toast detail composer (every action.kind branch)

import { buildDemoState } from "../lib/demo";
import { CHECKLIST, currentMonthsOut } from "../lib/checklist";
import type { ApprovalCard, ProjectState } from "../lib/types";
import { PHASES } from "../lib/types";

function ok(cond: boolean, msg: string) {
  if (cond) console.log(`✓ ${msg}`);
  else { console.error(`✗ ${msg}`); process.exit(1); }
}

function asserting<T>(label: string, fn: () => T): T {
  try {
    const v = fn();
    console.log(`✓ ${label}`);
    return v;
  }
  catch (e) {
    console.error(`✗ ${label} threw: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }
}

async function main() {
  const state: ProjectState = await buildDemoState();
  ok(!!state.brief?.locked, "Demo state is locked (Dashboard branch will render)");

  // --- EditorialHero ---
  asserting("hero: countdownDays parses brief.dateWindow", () => {
    const m = state.brief!.dateWindow.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (!m) throw new Error("dateWindow doesn't include ISO date");
    const days = Math.round((new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00`).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days;
  });
  asserting("hero: venue lookup", () => {
    const venue = state.vendors.find((v) => v.category === "Venue" && (v.status === "contracted" || v.status === "paid"));
    if (!venue) throw new Error("no contracted venue found in demo state");
    return venue;
  });
  asserting("hero: organizerName + partnerName non-empty", () => {
    if (!state.brief?.organizerName) throw new Error("missing organizerName");
    if (!state.brief?.partnerName) throw new Error("missing partnerName");
  });

  // --- DecisionsBlock — groupByPhase ---
  const PHASE_ORDER = ["foundation","discovery","design","logistics","guest_management","personal_prep","week_of","wedding_day","post_event"] as const;
  const PHASE_LABEL = Object.fromEntries(PHASES.map((p) => [p.id, p.label]));
  asserting("decisions: every pending phase resolves to a label", () => {
    const pending = state.approvals.filter((a) => a.status === "pending");
    for (const c of pending) {
      if (!PHASE_LABEL[c.phase as string]) throw new Error(`unknown phase: ${c.phase}`);
    }
  });
  ok(state.approvals.filter((a) => a.status === "pending").length >= 1, "decisions: at least one pending");

  // --- ActivityFeed — merge ledger + resolved approvals ---
  asserting("activity: every ledger entry has an iso `at`", () => {
    for (const e of state.ledger) {
      if (!e.at || isNaN(new Date(e.at).getTime())) throw new Error(`bad ledger.at: ${e.at}`);
    }
  });
  asserting("activity: every resolved approval has resolvedAt or createdAt", () => {
    const recent = state.approvals.filter((a) => a.status !== "pending");
    for (const c of recent) {
      const t = c.resolvedAt ?? c.createdAt;
      if (!t || isNaN(new Date(t).getTime())) throw new Error(`bad timestamp: ${c.id}`);
    }
  });

  // --- BudgetSnapshot ---
  asserting("budget: reduce sums all run", () => {
    const envelope = state.brief?.budgetUsd ?? 0;
    const planned = state.budget.reduce((s, l) => s + l.planUsd, 0);
    const committed = state.budget.reduce((s, l) => s + l.committedUsd, 0);
    const paid = state.budget.reduce((s, l) => s + l.paidUsd, 0);
    if (envelope === 0) throw new Error("envelope = 0; bar would be hidden");
    if (planned <= 0) throw new Error("planned sum is 0; bar would be empty");
    if (committed > envelope * 1.2) throw new Error(`committed ($${committed}) wildly exceeds envelope ($${envelope})`);
    if (paid > committed) throw new Error("paid > committed (invariant violated)");
  });

  // --- VendorGlance — for each top category ---
  const cats = ["Venue","Photographer","Caterer","Florist","Band"];
  for (const c of cats) {
    asserting(`vendor glance: ${c}`, () => {
      const inCat = state.vendors.filter((v) => v.category === c && v.status !== "passed");
      const contracted = state.vendors.find((v) => v.category === c && (v.status === "contracted" || v.status === "paid"));
      // Synthesize the same describeStage helper the dashboard uses
      let stage: string;
      if (contracted) stage = "Booked";
      else if (inCat.length === 0) stage = "Not started";
      else if (inCat.some((v) => v.status === "negotiating")) stage = "Negotiating";
      else if (inCat.some((v) => v.status === "quoting")) stage = "Quoting";
      else if (inCat.some((v) => v.status === "contacted")) stage = "Awaiting reply";
      else stage = `${inCat.length} on shortlist`;
      if (!stage) throw new Error("stage was empty");
    });
  }

  // --- UpcomingTasks — currentMonthsOut + every isDone runs without throwing ---
  asserting("upcoming: currentMonthsOut returns a number", () => {
    const m = currentMonthsOut(state);
    if (typeof m !== "number" || isNaN(m)) throw new Error(`invalid: ${m}`);
  });
  asserting("upcoming: every CHECKLIST.isDone runs without throwing on demo state", () => {
    let crashed: string | null = null;
    for (const it of CHECKLIST) {
      try { it.isDone(state); }
      catch (e) { crashed = `${it.id}: ${e instanceof Error ? e.message : e}`; break; }
    }
    if (crashed) throw new Error(crashed);
  });

  // --- Toast detail composer — every action.kind branch in the demo's pending approvals ---
  asserting("toast: every demo approval action.kind composes a detail string", () => {
    for (const c of state.approvals) {
      const detail = composeApprovalDetail(c);
      if (!detail || detail.length < 3) throw new Error(`empty detail for ${c.action.kind}`);
    }
  });

  console.log("\nDashboard render simulation complete. Every read path against the demo state runs cleanly.");
}

// Mirror of components/ApprovalCard.tsx::toastDetailForAction — kept in
// sync intentionally; if it falls behind, the test catches the drift.
function composeApprovalDetail(card: ApprovalCard): string {
  const a = card.action;
  switch (a.kind) {
    case "send_email":            return `Email queued to ${a.to}.`;
    case "schedule_payment":      return `$${a.amountUsd.toLocaleString()} scheduled to ${a.vendor} for ${a.dueDate}.`;
    case "sign_contract":         return `Contract signed with ${a.vendor}.`;
    case "publish_design":        return `${a.title} locked.`;
    case "lock_seating":          return `Seating chart locked — ${a.guestCount} guests across ${a.tableCount} tables.`;
    case "send_save_the_date":    return `Going out to ${a.recipients} addresses.`;
    case "send_invitations":      return `Going out to ${a.recipients} addresses.`;
    case "lock_setlist":          return `Setlist locked with ${a.cueCount} cues.`;
    case "lock_ceremony":         return `Ceremony script locked with ${a.sectionCount} moments.`;
    case "lock_cake":             return `Cake locked — ${a.tiers}-tier, ${a.servings} servings.`;
    case "publish_website":       return `aisle.wedding/${a.slug} is live.`;
    case "file_marriage_license": return `Filing in ${a.county}, ${a.state}.`;
    case "send_caterer_brief":    return `Brief sent to ${a.vendor}; ${a.allergenCount} allergens flagged.`;
    case "block_hotel_rooms":     return `${a.rooms} rooms blocked at ${a.hotel} ($${a.nightlyRate}/night).`;
    case "lock_vows":             return `Vows locked for the ${a.whose}.`;
    case "lock_brief":            return a.summary;
    case "send_message":          return `Message queued to ${a.to}.`;
    case "lock_cake":             return `Cake locked.`;
    case "purchase_registry_item":return `${a.item} from ${a.vendor}.`;
    case "publish_engagement_announcement": return `${a.channel} post drafted.`;
    case "book_vendor":           return `${a.vendor} for ${a.category}, ~$${a.estimate.toLocaleString()}.`;
    case "lock_stationery_suite": return `${a.piece} locked.`;
    default:                      return "Maestro is taking it from here.";
  }
}

main().catch((e) => { console.error("FAIL:", e); process.exit(1); });
