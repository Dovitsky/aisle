// Planning lanes. verify the demo state lands on Lane 4 (Aesthetics) as
// the active lane with 2-3 pending cards, lanes 1-3 sealed, lanes 5-8
// queued. Mirrors what the dashboard's DecisionsBlock will render.

import { buildDemoState } from "../lib/demo";
import { laneProgress, laneFor, LANES } from "../lib/lanes";

function ok(cond: boolean, msg: string) {
  if (cond) console.log(`✓ ${msg}`);
  else { console.error(`✗ ${msg}`); process.exit(1); }
}

async function main() {
  const state = await buildDemoState();
  const p = laneProgress(state, 3);

  // Sanity
  ok(p.total === 8, `Lanes total = 8 (got ${p.total})`);
  ok(LANES.length === 8, "LANES list has 8 entries");
  ok(LANES.every((l, i) => l.order === i + 1), "Lanes ordered 1..8");

  // Demo-specific expectations
  ok(p.completed.length === 3, `3 lanes sealed (got ${p.completed.length}. ${p.completed.map((l) => l.label).join(", ")})`);
  ok(p.completed[0].id === "foundation", "Lane 1 (Foundation) is sealed");
  ok(p.completed[1].id === "food_and_drink", "Lane 2 (Food & Drink) is sealed");
  ok(p.completed[2].id === "capture", "Lane 3 (Capture) is sealed");
  ok(p.current.id === "aesthetics", `Active lane = Aesthetics (got ${p.current.id})`);
  ok(p.currentIndex === 3, `currentIndex = 3 (got ${p.currentIndex})`);

  // Active lane has 2-3 cards visible
  ok(p.currentCards.length >= 2 && p.currentCards.length <= 3,
    `Active lane shows 2-3 cards (got ${p.currentCards.length})`);
  ok(p.currentCards.every((c) => laneFor(c) === "aesthetics"),
    "All visible cards belong to the Aesthetics lane");

  // Cards beyond the current lane exist (queued backlog)
  ok(p.upcomingCards.length >= 3, `Queued cards in upcoming lanes (got ${p.upcomingCards.length})`);

  // Resolved cards exist for the activity feed
  ok(p.resolvedCards.length >= 5, `Resolved cards available (got ${p.resolvedCards.length})`);

  // Future lanes
  ok(p.upcoming.map((l) => l.id).includes("music"), "Music lane queued");
  ok(p.upcoming.map((l) => l.id).includes("stationery"), "Stationery lane queued");
  ok(p.upcoming.map((l) => l.id).includes("day_of"), "Day-of lane queued");

  // Lane mapping sanity. feed any pending card and verify mapping is sensible
  const pending = state.approvals.filter((a) => a.status === "pending");
  for (const c of pending) {
    const id = laneFor(c);
    ok(LANES.some((l) => l.id === id), `Card "${c.title.slice(0, 40)}" maps to a known lane (${id})`);
  }

  // Transition line should be sensible
  ok(p.current.transitionLine.length > 5, "Active lane has a transition line");

  console.log("\nLanes flow: demo lands on Aesthetics with 2-3 visible, 3 lanes sealed behind, 4+ queued ahead.");
}

main().catch((e) => { console.error("FAIL:", e); process.exit(1); });
