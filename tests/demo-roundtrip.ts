// Demo round-trip — simulates EXACTLY what /api/settings load_demo does:
//   buildDemoState → writeState → invalidateCache → readState → filterForViewer
//
// If anything gets lost in JSON serialize/parse, this catches it before the
// user does. This is the critical path: if this test passes, the dashboard
// should render with all data after Demo Mode is loaded.

import { buildDemoState } from "../lib/demo";
import { writeState, readState, invalidateCache, filterForViewer } from "../lib/store";

function ok(cond: boolean, msg: string) {
  if (cond) console.log(`✓ ${msg}`);
  else { console.error(`✗ ${msg}`); process.exit(1); }
}

async function main() {
  // 1. Build the demo state
  const demo = await buildDemoState();
  ok(!!demo, "Build: demo state returns truthy");

  // 2. writeState — JSON-serialized to file
  await writeState(demo);
  ok(true, "Write: completed");

  // 3. invalidateCache — simulate a fresh request that has to reload from disk
  invalidateCache();

  // 4. readState — now reads from JSON, merges with EMPTY defaults
  const roundtripped = await readState();
  ok(!!roundtripped, "Read: returns truthy");

  // 5. Verify every critical field survived
  ok(roundtripped.brief !== null, "Round-trip: brief is non-null");
  ok(roundtripped.brief?.locked === true, "Round-trip: brief.locked === true");
  ok(roundtripped.brief?.organizerName === "Maya", "Round-trip: organizerName preserved");
  ok(roundtripped.brief?.partnerName === "Sam", "Round-trip: partnerName preserved");
  ok(roundtripped.demoMode === true, "Round-trip: demoMode flag preserved");

  ok(roundtripped.vendors.length >= 25, `Round-trip: ${roundtripped.vendors.length} vendors preserved`);
  ok(roundtripped.approvals.length >= 5, `Round-trip: ${roundtripped.approvals.length} approvals preserved`);
  ok(roundtripped.budget.length >= 10, `Round-trip: ${roundtripped.budget.length} budget lines preserved`);
  ok(roundtripped.guests.length >= 25, `Round-trip: ${roundtripped.guests.length} guests preserved`);
  ok(roundtripped.households.length >= 10, `Round-trip: ${roundtripped.households.length} households preserved`);
  ok(roundtripped.designs.length >= 4, `Round-trip: ${roundtripped.designs.length} designs preserved`);
  ok(roundtripped.weddingParty.length >= 8, `Round-trip: ${roundtripped.weddingParty.length} wedding party preserved`);
  ok(roundtripped.florals.length >= 8, `Round-trip: ${roundtripped.florals.length} florals preserved`);
  ok(roundtripped.ceremony.length >= 3, `Round-trip: ${roundtripped.ceremony.length} ceremony sections preserved`);
  ok(roundtripped.music.length >= 12, `Round-trip: ${roundtripped.music.length} music cues preserved`);
  ok(!!roundtripped.cake, "Round-trip: cake spec preserved");
  ok(!!roundtripped.bar, "Round-trip: bar program preserved");
  ok(roundtripped.rentals.length >= 15, `Round-trip: ${roundtripped.rentals.length} rentals preserved`);
  ok(roundtripped.beauty.length >= 8, `Round-trip: ${roundtripped.beauty.length} beauty preserved`);
  ok(roundtripped.welcomeBag.length >= 8, `Round-trip: ${roundtripped.welcomeBag.length} welcome bag preserved`);
  ok(roundtripped.registry.length >= 12, `Round-trip: ${roundtripped.registry.length} registry preserved`);
  ok(roundtripped.honeymoon.length >= 2, `Round-trip: ${roundtripped.honeymoon.length} honeymoon preserved`);
  ok(roundtripped.engagement.length >= 4, `Round-trip: ${roundtripped.engagement.length} engagement preserved`);
  ok(roundtripped.dayOf.length >= 10, `Round-trip: ${roundtripped.dayOf.length} day-of preserved`);
  ok(roundtripped.contingencies.length >= 3, `Round-trip: ${roundtripped.contingencies.length} contingencies preserved`);
  ok(roundtripped.tips.length >= 6, `Round-trip: ${roundtripped.tips.length} tips preserved`);
  ok(roundtripped.preEvents.length >= 2, `Round-trip: ${roundtripped.preEvents.length} pre-events preserved`);
  ok(roundtripped.memorials.length >= 1, `Round-trip: ${roundtripped.memorials.length} memorials preserved`);
  ok(roundtripped.thanks.length >= 2, `Round-trip: ${roundtripped.thanks.length} thanks preserved`);
  ok(roundtripped.hotelBlocks.length >= 1, `Round-trip: ${roundtripped.hotelBlocks.length} hotel blocks preserved`);
  ok(roundtripped.shuttles.length >= 1, `Round-trip: ${roundtripped.shuttles.length} shuttles preserved`);
  ok(roundtripped.vows.length === 2, "Round-trip: 2 vows drafts preserved");
  ok(roundtripped.speeches.length >= 2, `Round-trip: ${roundtripped.speeches.length} speeches preserved`);
  ok(!!roundtripped.license, "Round-trip: license preserved");
  ok(!!roundtripped.site, "Round-trip: site preserved");
  ok(roundtripped.menu.length >= 3, `Round-trip: ${roundtripped.menu.length} menu items preserved`);
  ok(roundtripped.stationery.length >= 1, `Round-trip: ${roundtripped.stationery.length} stationery suite preserved`);
  ok(roundtripped.ledger.length >= 4, `Round-trip: ${roundtripped.ledger.length} ledger events preserved`);
  ok(roundtripped.chat.length >= 5, `Round-trip: ${roundtripped.chat.length} chat messages preserved`);

  // 6. filterForViewer (organizer) — should pass everything through unchanged
  const filtered = filterForViewer(roundtripped);
  ok(filtered.vendors.length === roundtripped.vendors.length, "Filter (organizer): vendors not stripped");
  ok(filtered.approvals.length === roundtripped.approvals.length, "Filter (organizer): approvals not stripped");
  ok(filtered.designs.length === roundtripped.designs.length, "Filter (organizer): designs not stripped");

  // 7. filterForViewer (partner with dress gate ON) — should hide gated rows
  const partnerView: typeof roundtripped = {
    ...roundtripped,
    viewer: "partner",
    gates: { ...roundtripped.gates, dress: true },
  };
  const partnerFiltered = filterForViewer(partnerView);
  const dressDesigns = roundtripped.designs.filter((d) => d.gateScope === "dress");
  ok(dressDesigns.length > 0, "Demo state has dress-gated designs to test against");
  ok(partnerFiltered.designs.length === roundtripped.designs.length - dressDesigns.length,
    `Filter (partner): ${dressDesigns.length} dress designs stripped`);

  // 8. Internal consistency on the round-tripped state (the important runtime invariants)
  ok(roundtripped.budget.every((l) => l.paidUsd <= l.committedUsd), "Round-trip: budget invariant paid ≤ committed");
  ok(roundtripped.budget.every((l) => l.committedUsd <= l.planUsd), "Round-trip: budget invariant committed ≤ plan");
  ok(roundtripped.guests.every((g) => roundtripped.households.some((h) => h.id === g.householdId)),
    "Round-trip: every guest's household exists");

  // 9. Critical UI access patterns — these are the things the dashboard reads
  const pending = roundtripped.approvals.filter((a) => a.status === "pending");
  ok(pending.length >= 1, "Dashboard read: pending approvals");
  const recent = roundtripped.approvals.filter((a) => a.status !== "pending").slice(-5);
  ok(recent.length >= 1, "Dashboard read: recent (resolved) approvals");
  const venue = roundtripped.vendors.find((v) => v.category === "Venue" && (v.status === "contracted" || v.status === "paid"));
  ok(!!venue, "Dashboard read: contracted venue exists for hero");

  console.log("\nDemo round-trip complete. Every field survived JSON serialize/parse.");
}

main().catch((e) => { console.error("FAIL:", e); process.exit(1); });
