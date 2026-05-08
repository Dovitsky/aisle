# BACKLOG

Format: `- [P{n}] {description} (effort: S|M|L)`
Sorted by priority, then impact-per-effort. The top item is what the next session picks up.

## P0 — Blocking

- [P0] No git repo initialized — the loop expects `git status`, `git log`, branch commits per iteration. Initialize, set `main` branch, add `.gitignore` already present, make initial commit. (effort: S)
- [P0] `npm test` fails in non-darwin envs because esbuild's platform package is pinned to darwin-arm64 in `node_modules`. Switch tsx to a wasm fallback or add `optionalDependencies` for cross-platform esbuild so cron-driven CI can run tests. (effort: S)
- [P0] No CI / pre-commit hooks — gitleaks, prettier, eslint, type-check, vitest are all listed as deferred in BUILD_LOG. At minimum add a Husky pre-commit running `npx tsc --noEmit` + a tests trip. (effort: M)

## P1 — Important (PRD-specified, hero features below acceptance)

- [P1] `/design` mood-board grid with real image generation. Currently `lib/imagegen.ts` deferred per BUILD_LOG; Designer agent renders text-only. Wire Anthropic-friendly image gen (prefer the user's existing API surface or a hosted mock for offline) so palettes produce visual mood boards. (effort: L)
- [P1] `/seating` solver UX overhaul — drag-and-drop is rough per BUILD_LOG. Make Cartographer's annealed solution editable: drag guests between tables, keep invariant scoring live in the gutter. (effort: L)
- [P1] `/day-of` console: Maestro Jr. mode UX, contingency bands, live timeline. PRD §3.4. The page exists; treat it as a skeleton until Big-Day surface meets /vendors-level polish. (effort: L)
- [P1] `/timeline` phase detail view (PRD §3.2). Today's TimelineView is a 30-item checklist; per-phase drill-down is missing. (effort: M)
- [P1] Watcher actions beyond stale-vendor: budget over-envelope nudge, RSVP cadence escalation, missing foundation-entity P0 surfacing. Each should land as an Approval Card via the Negotiator/Treasurer/Concierge it routes to. (effort: M)
- [P1] Inbox UX queue with quick actions (per BUILD_LOG). `/inbox` shows scanned messages but has no archive / re-match / mark-noise affordances per row. (effort: M)
- [P1] Real Gmail OAuth send path — currently `lib/email/send.ts` is log-only fallback. Approval cascade for `send_email` should actually send when keys are present. (effort: M)
- [P1] Stripe deposit/balance flow on `schedule_payment` approvals (test mode only — never real keys). Wire a stub Stripe client that records intent + receipt URL into the ledger. (effort: M)
- [P1] Welcome-bag designer page — Quartermaster output rendered to a polished view. (effort: M)
- [P1] Dietary brief delivery — Larder `dispatch_larder_brief` lands as approval; UI for resolution workflow on caterer side. (effort: M)
- [P1] Engagement studio (Concierge) — page exists at 102 lines, polish to /vendors level. (effort: M)
- [P1] Honeymoon (Itinerist) — gated content, segment cards. 89 lines today, behind dress/honeymoon firewall. Polish + verify firewall holds. (effort: M)
- [P1] Tests for the chat → update_brief → auto-lock → Scout pipeline. The hero AI flow has no integration coverage. (effort: M)
- [P1] Vendor portal magic-link auth — the `/portal` route exists but has no auth gate. Build the magic-link issue + verify before marking the surface usable. (effort: M)

## P2 — Polish (design-system drift, voice/tone, coverage)

- [P2] Polish thin views to /vendors level (each ~M effort, all separate items):
  - [P2] /pricing (69 lines)
  - [P2] /florals (83 lines)
  - [P2] /planner (85 lines)
  - [P2] /license (87 lines)
  - [P2] /memorials (87 lines)
  - [P2] /pre-events (88 lines)
  - [P2] /beauty (94 lines)
  - [P2] /tips (95 lines)
  - [P2] /rentals (97 lines)
  - [P2] /registry (99 lines)
  - [P2] /visits (99 lines)
  - [P2] /speeches (101 lines)
  - [P2] /bar (102 lines)
  - [P2] /thanks (107 lines)
  - [P2] /dress (107 lines)
- [P2] Smart RSVP form on the wedding website (BUILD_LOG mandate research angle). (effort: M)
- [P2] Receipt + email + screenshot ingestion (BUILD_LOG mandate). (effort: L)
- [P2] Cultural ceremony library expansion beyond the 14/62 ritual baseline. (effort: M)
- [P2] Anthropic prompt caching + streaming chat (README "Still deferred"). (effort: M)
- [P2] Inngest cron for Watcher (currently manual scan). (effort: M)
- [P2] Native iOS app exploration spike — out of scope for v1 per README, leave as P2 stub. (effort: L)

## Notes from this audit

- Repo is substantially built: 51 routes, 26 specialist agents in `lib/agents/`, 51 components, ~1000 lines of types covering the full PRD §6 surface, JSON-store + Supabase parity for store, dress firewall implemented at three layers, cascade engine, Watcher continuous risk scan, 5-message simulated Gmail fixture. The hero AI flow (chat → update_brief → auto-lock → Scout → Approval Card) is wired and exercised by `tests/smoke-onboarding.ts`.
- Tests today: `tests/run.ts` (318 lines, property + firewall + budget) + `tests/smoke-onboarding.ts` (52 lines). Coverage of Maestro tools and cascade is uneven.
- The bar for "polish" is set by `/vendors` (521 lines), `/today`, `/timeline`, `/budget`, `/guests` (per BUILD_LOG entries).
- No `/docs/AISLE_PRD_v3.docx` or `/docs/AISLE_BUILD_BRIEF.docx` are committed yet. Loop reads `README.md` and `BUILD_LOG.md` as the operative contract until those land.
