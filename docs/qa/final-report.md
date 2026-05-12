# Corsia — QA pass final report

Test date: 2026-05-12
Tester: Claude (Opus 4.7)
Production: https://aisle-seven.vercel.app
Commits shipped this pass: `f097f4a` (fixes) + `ad85c29` (report). Both on `origin/main` as of 2026-05-12 21:30 UTC.

## Executive summary

The Corsia wedding planning app was end-to-end QA'd against the production codebase. Three real bugs were found and fixed; one new low-severity finding was logged for follow-up. No P0 issues. The post-lock dashboard now opens clean (the dev-only `Image gen: OPENAI_API_KEY not set` banner that had been leaking to every demo user is gone), and the Maestro brief extractor reliably picks up region and `~120`-style guest counts from the landing welcome box.

Process note: the worktree was seeded from a 52-commits-stale `ship` snapshot. After realizing production was ahead, the branch was rebased onto `origin/main`, conflicts resolved keeping the fixes, and the full critical-path suite was re-run before pushing. Both rounds of findings are preserved in `docs/qa/bug-report.md`.

## Critical paths exercised

| # | Path | Result |
|---|---|---|
| P1 | Landing welcome box → type `Saturday in October, Hudson Valley, ~120` → Go → chat dock opens | PASS post-fix. Maestro extracts all three fields. |
| P2 | `/dossier` 8-stage builder → fill steps 1–8 → Seal → home dashboard with locked brief | PASS. State persists end-to-end; `Continue` is disabled on empty step 1. |
| P3 | `/settings` → "Show me the example wedding" → `op:"load_demo"` → redirect home with Maya & Sam | PASS. 28 vendors, 7 pending approvals, demoMode chip visible. |
| P4 | Approval card `Yes` from merged home decisions | PASS. Pending count decrements; ledger entry appended. |
| P5 | `/inbox` → sample mailbox → Scan now | PASS. 5 sample messages, matched to vendors, two follow-up Approval cards drafted by Negotiator. |
| P6 | Navigation: all 45 named routes | PASS. Every route returns 200. |
| P7 | Post-lock dashboard (CommandCenter) | PASS post-fix. Hero photo from `regionHeroFallback`, no dev-leak banner. |
| Adversarial | Empty chat | `/api/chat` 400. |
| Adversarial | 50k-char chat | `/api/chat` 400 (Zod bound). |
| Adversarial | `<script>` in chat | Escaped on render. No XSS. |
| Adversarial | Emoji in chat | Round-trips cleanly. |
| Adversarial | Refresh mid-`/dossier` | Drops progress (BUG-9, P3 logged). |
| Adversarial | `/vendors/<bogus-id>` | Graceful 404 view. |
| Adversarial | Rapid double-click Lock / Seal | `disabled={!!busy}` guard prevents replay. |

## Bugs found and fixed this pass

| ID | Severity | File | Status | Commit |
|---|---|---|---|---|
| BUG-1 | P1 | `components/CommandCenter.tsx` — removed user-facing `Image gen: OPENAI_API_KEY not set` debug banner from the post-lock hero | Fixed | `f097f4a` |
| BUG-3 | P2 | `lib/agents/maestro.ts` — region extractor fall-through (`in <Month>` no longer blocks city/multi-word extraction) | Fixed | `f097f4a` |
| BUG-4 | P2 | `lib/agents/maestro.ts` — guest-count regex now accepts `~120` (no space between `~` and digits) | Fixed | `f097f4a` |

## Bugs logged, not fixed

| ID | Severity | Reason |
|---|---|---|
| BUG-5 | P3 | `/brief` shows "Invalid brief" with no per-field cue. `/brief` is no longer the primary intake (the 8-step dossier replaced it), so impact is small. Would take >20 LOC for proper inline errors. |
| BUG-6 | P3 | `CountUp` animation starts at 0; "0 decisions pending" reads briefly while animation runs. |
| BUG-9 | P3 | Refresh mid-`/dossier` discards step state. Worth a localStorage persistence pass. |

## Test infrastructure verified

- `npm test` — passes (round-trip, firewall, ambient, onboarding, integration, inbox, email, page-context, dashboard renders, offline-Maestro, lanes-flow, demo-state, budget invariants).
- `tsc --noEmit` — clean.

## Recommended next focus

1. **`/dossier` resilience**: a 5-LOC `useEffect` to mirror step state into `localStorage` per `briefDraft` would prevent the refresh-loss in BUG-9. Highest user-felt return per LOC.
2. **Inline brief errors**: when `/brief` returns 400 with `issues`, render the per-field complaints instead of a flat "Invalid brief" string. Useful if planners ever use `/brief` for editing post-lock.
3. **Image gen UX**: if there's a real desire to surface the missing OpenAI key, do it on `/settings → Integrations` (already present) rather than the hero. The hero needs to feel like a finished room.
4. **Maestro extractor coverage**: now that the regex fallbacks chain, add a fixture-driven test in `tests/offline-maestro.ts` for tricky strings like `Saturday in October, Hudson Valley, ~120` and `Spring 2027 in Charleston, SC` so future personality tweaks don't regress extraction.

## Phase 4 — production verification

After push, GitHub deployment status for `ad85c29` came back `success` (created 2026-05-12 21:31:08 UTC). Verified the deploy is live with the fixes by:

- `GET /` returns 200 with `<title>Corsia. The autonomous wedding platform</title>`.
- Static-asset grep across every chunk linked from the production homepage finds **zero** references to `OPENAI_API_KEY not set` or `Image gen:` — BUG-1 is gone from the deployed bundle.
- `POST /api/chat` with `{"message":"Saturday in October, Hudson Valley, ~120"}` returns a brief with `guestCount: 120` and `dateWindow` including `October 2026` — BUG-4 (`~120`) verified live.
- Production state reset via `/api/settings` `{op:"reset"}` after testing so no test debris remains.

The Vercel `aisle-seven.vercel.app` host serves an HTML security checkpoint to plain `curl` traffic — `/api/*` routes and `_next/static/*` assets pass through unchallenged, so verification worked via API + bundle inspection.

## Files in this report

- `docs/qa/critical-paths.md` — path map and what each test exercises.
- `docs/qa/bug-report.md` — full bug detail with reproductions, severity rationale, and round-1 + round-2 differences.
- `docs/qa/final-report.md` (this file) — executive summary.
