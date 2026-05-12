# BACKLOG

Format: `- [P{n}] {description} (effort: S|M|L)`
Sorted by priority, then impact-per-effort. The top item is what the next session picks up.

## P0. Blocking

- [P0] Cron sandbox cannot complete git operations. `.git/HEAD.lock` and `.git/refs/heads/loop/iter-N` cannot be `unlink`ed inside the bwrap sandbox even when owned by the running user. Iteration 1 hit this. Investigate: run cron outside bwrap, host-side git wrapper, or use a non-git change journal (JSONL append) the host then commits. (effort: M)
- [P0] No CI / pre-commit hooks. gitleaks, prettier, eslint, type-check, vitest are all listed as deferred in BUILD_LOG. At minimum add a Husky pre-commit running `npx tsc --noEmit` + `npm test`. (effort: M)
- [P0] After iteration 1, two test artifacts cannot be removed by the sandbox (`data/store.backup.1778211965.json`, `tests/.tmp.store.json`). The host can rm them; until then they shouldn't be committed. Add `.gitignore` rules for `data/store.backup.*.json` and `tests/.tmp.store.json`. (effort: S)

## P1. Important (PRD-specified, hero features below acceptance)

- [P1] `/design` mood-board grid with real image generation. Currently `lib/imagegen.ts` deferred per BUILD_LOG; Designer agent renders text-only. Wire Anthropic-friendly image gen (prefer the user's existing API surface or a hosted mock for offline) so palettes produce visual mood boards. (effort: L)
- [P1] `/seating` solver UX overhaul. drag-and-drop is rough per BUILD_LOG. Make Cartographer's annealed solution editable: drag guests between tables, keep invariant scoring live in the gutter. (effort: L)
- [P1] `/day-of` console: Maestro Jr. mode UX, contingency bands, live timeline. PRD §3.4. The page exists; treat it as a skeleton until Big-Day surface meets /vendors-level polish. (effort: L)
- [P1] `/timeline` phase detail view (PRD §3.2). Today's TimelineView is a 30-item checklist; per-phase drill-down is missing. (effort: M)
- [P1] Watcher actions beyond stale-vendor: budget over-envelope nudge, RSVP cadence escalation, missing foundation-entity P0 surfacing. Each should land as an Approval Card via the Negotiator/Treasurer/Concierge it routes to. (effort: M)
- [P1] Inbox UX queue with quick actions (per BUILD_LOG). `/inbox` shows scanned messages but has no archive / re-match / mark-noise affordances per row. (effort: M)
- [P1] Real Gmail OAuth send path. currently `lib/email/send.ts` is log-only fallback. Approval cascade for `send_email` should actually send when keys are present. (effort: M)
- [P1] Stripe deposit/balance flow on `schedule_payment` approvals (test mode only. never real keys). Wire a stub Stripe client that records intent + receipt URL into the ledger. (effort: M)
- [P1] Welcome-bag designer page. Quartermaster output rendered to a polished view. (effort: M)
- [P1] Dietary brief delivery. Larder `dispatch_larder_brief` lands as approval; UI for resolution workflow on caterer side. (effort: M)
- [P1] Engagement studio (Concierge). page exists at 102 lines, polish to /vendors level. (effort: M)
- [P1] Honeymoon (Itinerist). gated content, segment cards. 89 lines today, behind dress/honeymoon firewall. Polish + verify firewall holds. (effort: M)
- [P1] Vendor portal magic-link auth. the `/portal` route exists but has no auth gate. Build the magic-link issue + verify before marking the surface usable. (effort: M)

## P0 (added by iter-2)

- [P0] Push iter-1 + iter-2 work to git on the host machine. Sandbox cannot
  unlink `.git/HEAD.lock`. but the iter-1 + iter-2 diffs are intact in the
  working tree and tested green. Before iter-3 fires, the user's host needs
  to apply: `git checkout -b loop/iter-2 && git add -A && git commit -m "loop(iter-2): offline maestro + agent fixtures + lock cascade + gmail fixture"`. (effort: S. one host-side commit.)

## Resolved by iter-2 (no longer pending)

- ~~[P1] Tests for the chat → update_brief → auto-lock → Scout pipeline.~~ →
  `tests/integration-flow.ts` covers it (48 assertions across all specialists).

## Resolved by iter-13

- ~~[P2] Ambient ledger activity ticker on the dashboard.~~ →
  `components/AmbientTicker.tsx` + `lib/ambient.ts` + 14 selector tests.
  Mounted between editorial hero and phase strip in `Today.tsx`.
- ~~[P1-grade UX] Toast on lock cascade in chat flow.~~ → ChatDock now
  emits a sage "Foundation in flight" toast on lock transition, an
  Outreach toast when `dispatch_email_vendor` fires, and a Scout toast
  on material-pivot refire. All click-route to the relevant page.
- ~~[P2] BeautyView polish.~~ → 94 → 230 lines, hero stat row, tracks
  grouping (hair / makeup / both), trials secondary panel, propose toast.
- ~~[P2] BarView polish.~~ → 102 → 235 lines, hero stat row, bar policy
  chips with humanized labels, signatures panel highlighted in sage,
  propose + style-change toasts.

## Resolved by iter-3

- ~~[P1] Watcher actions beyond stale-vendor (partial).~~ → 4 proactive
  reminders fire on lock (license, rehearsal dinner, weather contingency,
  wedding website). True Watcher cron-style sweep over time still pending.
- ~~[NEW] Demo Mode (one-click fully populated state).~~ → `lib/demo.ts` +
  `/api/settings` op:"load_demo". 51 assertions verify completeness.
- ~~[NEW] Google Maps integration on /vendors.~~ → `components/VendorMap.tsx`
  using free iframe embed; category-aware query + city focus + chip legend.
- ~~[NEW] Full agent cascade on lock.~~ → 10 specialists fire on lock now,
  populating florals + ceremony + music + cake + bar + rentals + welcome
  bag + registry in addition to the original Scout + Designer + Treasurer.
- ~~[NEW] Triage offline classifier.~~ → 5 intent classes + USD parsing.
  Inbox flow (5 fixture messages → matched + classified + Negotiator
  follow-up cascade) now exercised by `tests/inbox-flow.ts`.

## P2. Polish (design-system drift, voice/tone, coverage)

- [P2] Polish thin views to /vendors level (each ~M effort, all separate items):
  - ~~[P2] /pricing (69 lines)~~ → polished in iter-12
  - ~~[P2] /florals (83 lines)~~ → polished in iter-12
  - ~~[P2] /beauty (94 lines)~~ → polished in iter-13 (94 → 230 lines)
  - ~~[P2] /bar (102 lines)~~ → polished in iter-13 (102 → 235 lines)
  - [P2] /planner (85 lines)
  - [P2] /license (87 lines)
  - [P2] /memorials (87 lines)
  - [P2] /pre-events (88 lines)
  - [P2] /tips (95 lines)
  - [P2] /rentals (97 lines)
  - [P2] /registry (99 lines)
  - [P2] /visits (99 lines)
  - [P2] /speeches (101 lines)
  - [P2] /engagement (102 lines)
  - [P2] /thanks (107 lines)
  - [P2] /dress (107 lines)
- [P2] Extend AmbientTicker to preview in-flight cascade waves before the
  first ledger entry lands (currently the strip is silent for the first
  second of a fresh cascade). Consider an in-memory in-flight queue keyed
  off the wave that fired in `lockAndIgnite`. (effort: M)
- [P2] Smart RSVP form on the wedding website (BUILD_LOG mandate research angle). (effort: M)
- [P2] Receipt + email + screenshot ingestion (BUILD_LOG mandate). (effort: L)
- [P2] Cultural ceremony library expansion beyond the 14/62 ritual baseline. (effort: M)
- [P2] Anthropic prompt caching + streaming chat (README "Still deferred"). (effort: M)
- [P2] Inngest cron for Watcher (currently manual scan). (effort: M)
- [P2] Native iOS app exploration spike. out of scope for v1 per README, leave as P2 stub. (effort: L)

## Notes from this audit

- Repo is substantially built: 51 routes, 26 specialist agents in `lib/agents/`, 51 components, ~1000 lines of types covering the full PRD §6 surface, JSON-store + Supabase parity for store, dress firewall implemented at three layers, cascade engine, Watcher continuous risk scan, 5-message simulated Gmail fixture. The hero AI flow (chat → update_brief → auto-lock → Scout → Approval Card) is wired and exercised by `tests/smoke-onboarding.ts`.
- Tests today: `tests/run.ts` (318 lines, property + firewall + budget) + `tests/smoke-onboarding.ts` (52 lines). Coverage of Maestro tools and cascade is uneven.
- The bar for "polish" is set by `/vendors` (521 lines), `/today`, `/timeline`, `/budget`, `/guests` (per BUILD_LOG entries).
- No `/docs/AISLE_PRD_v3.docx` or `/docs/AISLE_BUILD_BRIEF.docx` are committed yet. Loop reads `README.md` and `BUILD_LOG.md` as the operative contract until those land.
