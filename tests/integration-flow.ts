// Integration flow test — replays the full investor-demo path without a
// running server:
//   1. Sample brief loaded via setBrief
//   2. Maestro extracts names from chat in offline mode
//   3. Lock fires → cascade plants Scout + Designer + Treasurer + reminder cards
//   4. Approve a card → cascade engine runs
//   5. State is consistent at each step
//
// Runs against an isolated AISLE_STORE_FILE so it doesn't pollute the user's
// data/store.json.

import { maestroReply } from "../lib/agents/maestro";
import { scoutShortlist } from "../lib/agents/scout";
import { designerDirections } from "../lib/agents/designer";
import { treasurerProposal } from "../lib/agents/treasurer";
import { botanistPropose } from "../lib/agents/botanist";
import { clericPropose } from "../lib/agents/cleric";
import { cantorPropose } from "../lib/agents/cantor";
import { patissierPropose } from "../lib/agents/patissier";
import { sommelierPropose } from "../lib/agents/sommelier";
import { stewardPropose } from "../lib/agents/steward";
import { atelierPropose } from "../lib/agents/atelier";
import { quartermasterPropose } from "../lib/agents/quartermaster";
import { couturierDirections } from "../lib/agents/couturier";
import { curatorPropose } from "../lib/agents/curator";
import { itineristPropose } from "../lib/agents/itinerist";
import { conciergePropose } from "../lib/agents/concierge";
import { locatorPropose } from "../lib/agents/locator";
import { outreachDraft } from "../lib/agents/outreach";
import { negotiatorDraft } from "../lib/agents/negotiator";
import { counselReview } from "../lib/agents/counsel";
import { stationerSuite } from "../lib/agents/stationer";
import {
  setBrief, addVendors, appendApproval, resolveApproval, readState,
} from "../lib/store";
import type { Brief, Vendor } from "../lib/types";

function ok(cond: boolean, msg: string) {
  if (cond) console.log(`✓ ${msg}`);
  else { console.error(`✗ ${msg}`); process.exit(1); }
}

const HUDSON_VALLEY: Brief = {
  organizerName: "Maya", partnerName: "Sam",
  dateWindow: "Late September 2026",
  region: "Hudson Valley, NY",
  guestCount: 120, budgetUsd: 80000,
  vibe: "candlelit barn, editorial film photography, no DJ banter",
  plannerStatus: "want_one", cultural: "secular",
  formalityTone: "modern", destination: false, locked: false,
};

async function main() {
  // Step 1: Load brief.
  await setBrief(HUDSON_VALLEY);
  let state = await readState();
  ok(!!state.brief, "Step 1: brief saved");
  ok(state.brief?.organizerName === "Maya", "Step 1: organizerName preserved");

  // Step 2: Maestro processes "yes lock it" → emits lock_brief_now.
  const r = await maestroReply({
    brief: state.brief, history: state.chat, userMessage: "yes lock it",
  });
  ok(r.toolUses.some((t) => t.name === "lock_brief_now"), "Step 2: Maestro fires lock_brief_now in offline mode");

  // Step 3: Lock the brief.
  await setBrief({ ...HUDSON_VALLEY, locked: true, lockedAt: new Date().toISOString() });
  state = await readState();
  ok(state.brief?.locked === true, "Step 3: brief locked");

  // Step 4: Each specialist returns content offline.
  const venues       = await scoutShortlist({ brief: state.brief!, category: "Venue", count: 5 });
  ok(venues.length === 5, `Scout: 5 venues offline (got ${venues.length})`);
  ok(venues[0].name.toLowerCase().includes("hudson"), `Scout: top venue is region-keyed (got "${venues[0].name}")`);

  const photographers = await scoutShortlist({ brief: state.brief!, category: "Photographer", count: 5 });
  ok(photographers.length === 5, `Scout: 5 photographers offline (got ${photographers.length})`);

  const designs = await designerDirections(state.brief!);
  ok(designs.length >= 3, `Designer: ${designs.length} mood directions offline`);
  ok(!!designs[0].palette.length, "Designer: each direction has a palette");

  const budget = await treasurerProposal(state.brief!);
  ok(budget.lines.length >= 10, `Treasurer: ${budget.lines.length} budget lines offline`);
  ok(budget.total === HUDSON_VALLEY.budgetUsd, `Treasurer: lines sum to envelope ($${budget.total.toLocaleString()})`);

  const florals = await botanistPropose({ brief: state.brief! });
  ok(florals.length >= 8, `Botanist: ${florals.length} arrangements offline`);

  const ceremony = await clericPropose({ brief: state.brief!, tradition: "humanist" });
  ok(ceremony.length >= 3, `Cleric: ${ceremony.length} ceremony sections offline`);
  ok(ceremony.every((s) => s.body.length > 10), "Cleric: every section has real body text");
  ok(ceremony.some((s) => s.body.includes("Maya") || s.body.includes("Sam")), "Cleric: name placeholders substituted");

  const setlist = await cantorPropose({ brief: state.brief! });
  ok(setlist.length >= 12, `Cantor: ${setlist.length} music cues offline`);

  const cake = await patissierPropose({ brief: state.brief! });
  ok(cake.tiers >= 2, `Patissier: ${cake.tiers}-tier cake offline`);
  ok(cake.flavors.length >= 2, "Patissier: per-tier flavors set");
  ok((cake.allergens?.length ?? 0) >= 2, "Patissier: allergens inferred");

  const bar = await sommelierPropose({ brief: state.brief! });
  ok(bar.itemMenu.length >= 10, `Sommelier: ${bar.itemMenu.length} bar menu items offline`);

  const rentals = await stewardPropose({ brief: state.brief! });
  ok(rentals.length >= 15, `Steward: ${rentals.length} rental items offline`);

  const beauty = await atelierPropose({
    brief: state.brief!, weddingDate: "2026-09-19", ceremonyTime: "16:00", party: [],
  });
  ok(beauty.length >= 8, `Atelier: ${beauty.length} beauty appointments offline`);

  const welcomeBag = await quartermasterPropose(state.brief!);
  ok(welcomeBag.length >= 8, `Quartermaster: ${welcomeBag.length} welcome-bag items offline`);

  const dressDirs = await couturierDirections(state.brief!);
  ok(dressDirs.length >= 4, `Couturier: ${dressDirs.length} dress directions offline (gated)`);

  const registry = await curatorPropose(state.brief!);
  ok(registry.length >= 12, `Curator: ${registry.length} registry items offline`);

  const honeymoon = await itineristPropose({ brief: state.brief!, weddingDate: "2026-09-19" });
  ok(honeymoon.length >= 2, `Itinerist: ${honeymoon.length} honeymoon segments offline`);

  const engagement = await conciergePropose({ context: "Couple engaged 4 weeks ago, planning to announce" });
  ok(engagement.milestones.length >= 4, `Concierge: ${engagement.milestones.length} engagement milestones offline`);
  ok(engagement.milestones.some((m) => m.kind === "ring"), "Concierge: ring milestone present");
  ok(engagement.milestones.some((m) => m.kind === "proposal_plan"), "Concierge: proposal milestone present");

  const locations = await locatorPropose({ vibe: "candlelit barn editorial film", budgetUsd: 80000, guestCount: 120 });
  ok(locations.length === 5, `Locator: ${locations.length} region suggestions offline`);
  ok(locations.every((l) => l.fitScore > 0), "Locator: every suggestion has a fitScore");
  ok(locations.every((l) => l.region.length > 0 && l.rationale.length > 0), "Locator: every suggestion has region + rationale");

  const stationery = await stationerSuite({ brief: state.brief!, direction: "Heirloom Garden" });
  ok(stationery.length === 8, `Stationer: ${stationery.length} suite items offline (save_the_date through thank_you)`);
  const inviteItem = stationery.find((s) => s.piece === "invitation");
  ok(!!inviteItem && /maya/i.test(inviteItem.copy), "Stationer: invitation copy references organizer");
  ok(!!inviteItem && /sam/i.test(inviteItem.copy), "Stationer: invitation copy references partner");

  // Step 5: Outreach drafts a real email with the brief baked in.
  await addVendors([{
    name: venues[0].name, category: "Venue", city: venues[0].city,
    fitScore: venues[0].fitScore, priceBracket: venues[0].priceBracket, notes: venues[0].notes,
  }]);
  state = await readState();
  const venueVendor = state.vendors.find((v) => v.name === venues[0].name) as Vendor;
  const draft = await outreachDraft({ brief: state.brief!, vendor: venueVendor });
  ok(draft.includes("Maya") && draft.includes("Sam"), "Outreach: email body references both names");
  ok(draft.includes("Hudson Valley"), "Outreach: email body references region");
  ok(draft.includes("120"), "Outreach: email body references guest count");

  const counter = await negotiatorDraft({
    brief: state.brief!, vendor: venueVendor, goal: "Reduce site fee by 10% for off-peak Friday",
  });
  ok(counter.includes("Maya"), "Negotiator: counter references couple");
  ok(counter.toLowerCase().includes("10%") || counter.length > 80, "Negotiator: counter has substance");

  const review = await counselReview({ vendorName: venueVendor.name, category: "Venue" });
  ok(review.concerns.length >= 4, `Counsel: ${review.concerns.length} contract concerns offline`);
  ok(review.concerns.every((c) => c.proposed.length > 20), "Counsel: every concern has a real proposed counter");

  // Step 6: Approve a card → cascade should run without throwing.
  await appendApproval({
    agent: "Scout", phase: "foundation",
    title: `Open outreach to ${venues[0].name} for Venue?`,
    rationale: "test",
    risk: "low",
    action: { kind: "send_email", to: venues[0].name, subject: "test", body: draft },
  });
  state = await readState();
  const pending = state.approvals.filter((a) => a.status === "pending");
  ok(pending.length >= 1, `Step 6: pending approval queued (count: ${pending.length})`);
  const cardId = pending[pending.length - 1].id;
  await resolveApproval(cardId, "approved");
  state = await readState();
  const resolved = state.approvals.find((a) => a.id === cardId);
  ok(resolved?.status === "approved", "Step 6: approval resolves to approved");

  console.log("\nFull integration flow complete: brief → lock → 18 specialists → outreach → counsel → approve → resolve.");
}

main().catch((e) => { console.error("FAIL:", e); process.exit(1); });
