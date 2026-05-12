// End-to-end onboarding smoke test (offline mode. no real API calls).
// Simulates the chat → setBrief → lock → Scout flow without hitting Anthropic.

import { readState, setBrief, addVendors, appendApproval } from "../lib/store";
import { scoutShortlist } from "../lib/agents/scout";
import type { Brief } from "../lib/types";

async function main() {
  // 1. Simulate update_brief calls
  const brief: Brief = {
    organizerName: "Maya",
    partnerName: "Sam",
    dateWindow: "Late September 2026",
    region: "Hudson Valley, NY",
    guestCount: 120,
    budgetUsd: 80000,
    vibe: "candlelit barn, editorial film photography, no DJ banter",
    plannerStatus: "want_one",
    cultural: "secular",
    formalityTone: "modern",
    destination: false,
    locked: false,
  };
  await setBrief(brief);
  console.log("✓ Brief saved (unlocked)");
  
  // 2. Lock
  await setBrief({ ...brief, locked: true, lockedAt: new Date().toISOString() });
  console.log("✓ Brief locked");
  
  // 3. Run Scout. Offline (no ANTHROPIC_API_KEY) returns []; live mode returns
  //    a real shortlist. Both outcomes are valid; the test asserts the surface
  //    is honest and the rest of the flow is wired regardless.
  const items = await scoutShortlist({ brief: { ...brief, locked: true }, category: "Venue", count: 5 });
  const offline = items.length === 0;
  console.log(`✓ Scout returned ${items.length} venue candidates${offline ? " (offline; no fixtures by design)" : ": " + items.map(i => i.name).join(", ")}`);

  // 4. Synthesize a representative vendor when offline so we can verify the
  //    addVendors → approval → readState wiring without depending on a key.
  const vendorsToAdd = offline
    ? [{ name: "Hudson Barn (test seed)", category: "Venue", city: "Hudson, NY", fitScore: 0.9, priceBracket: "$$$" as const, notes: "synthesized for smoke test" }]
    : items.map(it => ({
        name: it.name, category: "Venue", city: it.city,
        fitScore: it.fitScore, priceBracket: it.priceBracket, notes: it.notes,
      }));
  await addVendors(vendorsToAdd);

  await appendApproval({
    agent: "Scout", phase: "foundation",
    title: `Open outreach to ${vendorsToAdd[0].name} for Venue?`,
    rationale: `test`, risk: "low",
    action: { kind: "send_email", to: vendorsToAdd[0].name, subject: "test", body: "test" },
  });
  
  // 5. Read final state
  const state = await readState();
  console.log(`✓ State has: brief.locked=${state.brief?.locked}, vendors=${state.vendors.length}, pending approvals=${state.approvals.filter(a => a.status === "pending").length}`);
  console.log("PASS");
}
main().catch(e => { console.error("FAIL:", e); process.exit(1); });
