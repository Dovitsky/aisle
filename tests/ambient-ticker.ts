// Ambient ticker selector tests. The ticker on the dashboard reads
// state.ledger and surfaces the most recent agent activity in a
// continuously-rotating strip. The selection logic is what determines
// whether the surface feels alive vs. spammy, so it gets its own
// targeted coverage.

import { pickAmbient } from "../lib/ambient";
import type { LedgerEvent } from "../lib/types";

let pass = 0;
function ok(cond: boolean, msg: string) {
  if (cond) { console.log(`✓ ${msg}`); pass++; }
  else { console.error(`✗ ${msg}`); process.exit(1); }
}

function L(opts: Partial<LedgerEvent> & { id: string; at: string; summary: string }): LedgerEvent {
  return {
    actor: "agent",
    kind: "approval.created",
    ...opts,
  } as LedgerEvent;
}

// 1) Empty ledger → empty result.
{
  ok(pickAmbient([]).length === 0, "Empty ledger returns empty result");
}

// 2) Only-user-events ledger → empty (ambient channel is agent-only).
{
  const led: LedgerEvent[] = [
    L({ id: "1", at: "2026-05-09T10:00:00Z", actor: "user", summary: "approved — Tre Posti deposit", kind: "approval.approved" }),
    L({ id: "2", at: "2026-05-09T10:01:00Z", actor: "user", summary: "rejected — second band", kind: "approval.rejected" }),
  ];
  ok(pickAmbient(led).length === 0, "User-only ledger filters down to nothing");
}

// 3) Most-recent-first sort.
{
  const led: LedgerEvent[] = [
    L({ id: "1", at: "2026-05-09T10:00:00Z", agent: "Scout",     summary: "Scout shortlisted 5 venues" }),
    L({ id: "2", at: "2026-05-09T10:05:00Z", agent: "Designer",  summary: "Designer drafted 3 mood directions" }),
    L({ id: "3", at: "2026-05-09T10:10:00Z", agent: "Treasurer", summary: "Treasurer allocated the envelope" }),
  ];
  const got = pickAmbient(led);
  ok(got.length === 3, "Three agent entries surface");
  ok(got[0].id === "3", "Most recent first");
  ok(got[2].id === "1", "Oldest last");
}

// 4) Deduplication on summary (keep most recent).
{
  const led: LedgerEvent[] = [
    L({ id: "1", at: "2026-05-09T10:00:00Z", agent: "Scout", summary: "Scout shortlisted 5 venues" }),
    L({ id: "2", at: "2026-05-09T10:05:00Z", agent: "Scout", summary: "Scout shortlisted 5 venues" }),
    L({ id: "3", at: "2026-05-09T10:10:00Z", agent: "Designer", summary: "Designer drafted 3 mood directions" }),
  ];
  const got = pickAmbient(led);
  ok(got.length === 2, "Duplicate summaries collapse");
  ok(got[0].id === "3", "Most recent unique entry first");
  ok(got[1].id === "2", "Most recent of the duplicate set kept (id 2 not id 1)");
}

// 5) Limit honored.
{
  const led: LedgerEvent[] = Array.from({ length: 10 }).map((_, i) =>
    L({ id: `id-${i}`, at: `2026-05-09T10:${String(i).padStart(2, "0")}:00Z`, agent: "Scout", summary: `Scout shortlisted batch ${i}` }),
  );
  const got = pickAmbient(led, 3);
  ok(got.length === 3, "limit=3 honored");
  ok(got[0].summary.endsWith("batch 9"), "limit returns the most recent batch");
}

// 6) Empty/whitespace summaries are skipped.
{
  const led: LedgerEvent[] = [
    L({ id: "1", at: "2026-05-09T10:00:00Z", agent: "Scout", summary: "" }),
    L({ id: "2", at: "2026-05-09T10:01:00Z", agent: "Scout", summary: "   " }),
    L({ id: "3", at: "2026-05-09T10:02:00Z", agent: "Designer", summary: "Designer drafted 3 mood directions" }),
  ];
  const got = pickAmbient(led);
  ok(got.length === 1, "Empty/whitespace summaries filtered out");
  ok(got[0].id === "3", "Real entry surfaces");
}

// 7) Mixed user+agent — user entries strip out, agent ordering preserved.
{
  const led: LedgerEvent[] = [
    L({ id: "1", at: "2026-05-09T10:00:00Z", agent: "Scout", summary: "Scout shortlisted 5 venues" }),
    L({ id: "2", at: "2026-05-09T10:01:00Z", actor: "user", summary: "approved — Scout pick", kind: "approval.approved" }),
    L({ id: "3", at: "2026-05-09T10:02:00Z", agent: "Treasurer", summary: "Treasurer allocated the envelope" }),
    L({ id: "4", at: "2026-05-09T10:03:00Z", actor: "user", summary: "edited — budget envelope", kind: "approval.edited" }),
  ];
  const got = pickAmbient(led);
  ok(got.length === 2, "User entries stripped from ambient channel");
  ok(got[0].id === "3" && got[1].id === "1", "Agent entries kept in recency order");
}

console.log(`\nAmbient ticker selector — ${pass} assertions green.`);
