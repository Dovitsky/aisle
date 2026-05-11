// Pure selector for the ambient activity ticker — extracted from the React
// component so it can be unit-tested without pulling in the React tree.

import type { LedgerEvent } from "./types";

/**
 * Pick the most recent agent ledger entries for the ambient ticker.
 *
 * Rules:
 *   • Only `actor === "agent"` entries (user actions live in the activity
 *     feed, not the ambient channel).
 *   • Most recent first.
 *   • Deduplicate on summary so consecutive identical "Scout shortlisted"
 *     rows don't read like loop spam.
 *   • Skip empty summaries.
 *
 * Returns at most `limit` entries.
 */
export function pickAmbient(ledger: LedgerEvent[], limit = 5): LedgerEvent[] {
  const onlyAgent = ledger.filter((e) => e.actor === "agent" && !!e.summary?.trim());
  const seen = new Set<string>();
  const dedup: LedgerEvent[] = [];
  for (let i = onlyAgent.length - 1; i >= 0; i--) {
    const e = onlyAgent[i];
    const key = e.summary.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    dedup.push(e);
    if (dedup.length >= limit) break;
  }
  return dedup;
}
