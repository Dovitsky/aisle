// Demo-state test. verifies buildDemoState produces a fully populated
// ProjectState that exercises every module. Without this, "Load demo state"
// in Settings could ship a half-populated state and break the demo.

import { buildDemoState } from "../lib/demo";

function ok(cond: boolean, msg: string) {
  if (cond) console.log(`✓ ${msg}`);
  else { console.error(`✗ ${msg}`); process.exit(1); }
}

async function main() {
  const s = await buildDemoState();

  // Brief
  ok(!!s.brief && s.brief.locked, "Brief: present and locked");
  ok(s.brief?.organizerName === "Maya", "Brief: organizer = Maya");
  ok(s.brief?.partnerName === "Sam", "Brief: partner = Sam");
  ok(s.demoMode === true, "demoMode: flag is set");

  // Vendors. every status represented
  const statuses = new Set(s.vendors.map((v) => v.status));
  ok(s.vendors.length >= 25, `Vendors: ${s.vendors.length} total (≥25)`);
  ok(statuses.has("contracted"), "Vendors: at least one contracted");
  ok(statuses.has("quoting"), "Vendors: at least one quoting");
  ok(statuses.has("negotiating"), "Vendors: at least one negotiating");
  ok(statuses.has("shortlisted"), "Vendors: at least one shortlisted");
  ok(statuses.has("passed"), "Vendors: at least one passed");

  const cats = new Set(s.vendors.map((v) => v.category));
  ok(cats.has("Venue"), "Vendors: Venue category");
  ok(cats.has("Photographer"), "Vendors: Photographer category");
  ok(cats.has("Florist"), "Vendors: Florist category");
  ok(cats.has("Caterer"), "Vendors: Caterer category");
  ok(cats.has("Hair & Makeup"), "Vendors: Hair & Makeup category");

  // Approvals. mixed states
  const apStatuses = new Set(s.approvals.map((a) => a.status));
  ok(s.approvals.length >= 8, `Approvals: ${s.approvals.length} total`);
  ok(apStatuses.has("pending"), "Approvals: at least one pending");
  ok(apStatuses.has("approved"), "Approvals: at least one approved");
  ok(apStatuses.has("rejected"), "Approvals: at least one rejected");

  // Programs
  ok(s.designs.length >= 4, `Designs: ${s.designs.length} (mood + dress)`);
  ok(s.budget.length >= 10, `Budget: ${s.budget.length} lines`);
  ok(s.budget.some((l) => l.committedUsd > 0), "Budget: has committed deposits");
  ok(s.guests.length >= 25, `Guests: ${s.guests.length}`);
  ok(s.households.length >= 10, `Households: ${s.households.length}`);
  ok(s.weddingParty.length >= 8, `Wedding party: ${s.weddingParty.length}`);
  ok(s.florals.length >= 8, `Florals: ${s.florals.length}`);
  ok(s.ceremony.length >= 3, `Ceremony: ${s.ceremony.length} sections`);
  ok(s.music.length >= 12, `Music: ${s.music.length} cues`);
  ok((s.cake?.tiers ?? 0) >= 2, `Cake: ${s.cake?.tiers}-tier`);
  ok((s.bar?.itemMenu.length ?? 0) >= 10, `Bar: ${s.bar?.itemMenu.length} menu items`);
  ok(s.rentals.length >= 15, `Rentals: ${s.rentals.length} items`);
  ok(s.beauty.length >= 8, `Beauty: ${s.beauty.length} appointments`);
  ok(s.welcomeBag.length >= 8, `Welcome bag: ${s.welcomeBag.length} items`);
  ok(s.registry.length >= 12, `Registry: ${s.registry.length} items`);
  ok(s.honeymoon.length >= 2, `Honeymoon: ${s.honeymoon.length} segments`);
  ok(s.engagement.length >= 4, `Engagement: ${s.engagement.length} milestones`);
  ok(s.dayOf.length >= 10, `Day-of: ${s.dayOf.length} timeline items`);
  ok(s.contingencies.length >= 3, `Contingencies: ${s.contingencies.length} bands`);
  ok(s.tips.length >= 6, `Tips: ${s.tips.length} envelopes`);
  ok(s.preEvents.length >= 2, `Pre-events: ${s.preEvents.length}`);
  ok(s.memorials.length >= 1, `Memorials: ${s.memorials.length}`);
  ok(s.thanks.length >= 2, `Thanks: ${s.thanks.length}`);
  ok(s.hotelBlocks.length >= 1, `Hotel blocks: ${s.hotelBlocks.length}`);
  ok(s.shuttles.length >= 1, `Shuttles: ${s.shuttles.length}`);
  ok(s.vows.length === 2, "Vows: organizer + partner drafts");
  ok(s.speeches.length >= 2, `Speeches: ${s.speeches.length} drafts`);
  ok(!!s.license, "License: state populated");
  ok(!!s.site, "Site: hero + story populated");
  ok(s.menu.length >= 3, `Menu: ${s.menu.length} courses`);
  ok(s.stationery.length >= 1, `Stationery: ${s.stationery.length} suite`);
  ok(s.ledger.length >= 4, `Ledger: ${s.ledger.length} events`);
  ok(s.chat.length >= 5, `Chat: ${s.chat.length} messages`);

  // Internal consistency
  ok(s.budget.every((l) => l.paidUsd <= l.committedUsd), "Budget: invariant. paid ≤ committed");
  ok(s.budget.every((l) => l.committedUsd <= l.planUsd), "Budget: invariant. committed ≤ plan");
  ok(s.guests.every((g) => s.households.some((h) => h.id === g.householdId)), "Guests: every guest's household exists");

  console.log("\nDemo state: all modules populated, internally consistent.");
}

main().catch((e) => { console.error("FAIL:", e); process.exit(1); });
