# Corsia/AISLE — Critical user paths

Target prod: https://aisle-seven.vercel.app
Local: http://localhost:3000 (built from current repo HEAD; this is the post-deploy state once `main` advances)

Note on branding divergence: prod title is `Corsia. The autonomous wedding platform`; local HEAD title is `AISLE — The autonomous wedding platform`. Code references both. The repo internally calls itself AISLE; the most recent shipped marketing branding is Corsia. Test plan uses both names as synonyms.

Brief vs Dossier: The task brief mentioned an "8-stage dossier builder." The repo has a single-page brief intake at `/brief` (`components/BriefForm.tsx`, 12 fields, lock action) — there are no 8 stages. The conversational equivalent lives in the Maestro chat (Landing welcome box). Both are tested.

## Routing map (from `app/`)

Public marketing:
- `/` — Landing (hero welcome box, marketing sections) when no brief; Today/CommandCenter when locked
- `/login` — sign-in view
- `/wed/[slug]` — public wedding website (no chrome)

Brief / intake:
- `/brief` — single-page brief form (12 fields → Save draft / Lock brief)

Approvals & inbox:
- `/approvals` — pending decisions list
- `/inbox` — Gmail (or simulated) inbox + connect wizard

Build rooms:
- `/vendors`, `/vendors/[id]`, `/vendors/portal` — vendors index + detail + portal
- `/budget`, `/guests`, `/dietary`, `/wedding-party`
- `/design`, `/florals`, `/stationery`, `/website`, `/seating`
- `/logistics`, `/rentals`, `/music`, `/cake`, `/bar`
- `/atelier`, `/atelier/dress`, `/atelier/fittings`, `/atelier/veil`

The Day rooms:
- `/day-of`, `/ceremony`, `/beauty`, `/pre-events`, `/memorials`, `/tips`

Plan / Wedding:
- `/mood-board`, `/timeline`, `/discover`, `/discover/vibe/[slug]`, `/discover/editorial/[slug]`

Personal & ops:
- `/engagement`, `/dress`, `/honeymoon`, `/visits`, `/registry`, `/speeches`
- `/license`, `/planner`, `/portal`, `/personal-prep`, `/thanks`, `/pricing`, `/settings`

Auth callbacks:
- `/auth/...`, `/api/gmail/*`

## Critical paths to exercise (Phase 2)

**P1 — Landing → first chat message → Maestro opens**
1. GET `/` (no brief → marketing Landing)
2. Type into hero textbox `"Saturday in October, Hudson Valley, ~120"`
3. Click `Begin` → POST `/api/chat` → chat dock opens with Maestro reply
4. Verify: dock visible, state.brief now exists (partial), Today switches to `ContinuingDraft`

**P2 — Brief form (one-page intake; user's "dossier")**
1. GET `/brief` → form
2. Fill all 12 fields (organizer, partner, dateWindow, weddingDate, region, guestCount, budgetUsd, vibe, cultural, formality, destination, plannerStatus)
3. Click `Save draft` → POST `/api/brief` lock:false
4. Click `Lock brief` → POST `/api/brief` lock:true → redirect `/approvals`
5. Verify: state.brief.locked=true, CommandCenter renders on `/`

**P3 — Demo mode load**
1. GET `/settings` → Demo Mode panel
2. Click `Load example` → POST `/api/settings` `{op:"load_demo"}`
3. Toast notify, router push `/`
4. Verify: CommandCenter populated with Maya & Sam fixture, `demoMode=true` chip

**P4 — Maestro chat & approval cards**
1. Demo loaded → open chat dock
2. Send message `"shortlist photographers"` (should trigger `dispatch_scout` tool)
3. Verify approval card appears in `/approvals`
4. Approve card → cascade fires; verify ledger entry

**P5 — Gmail connect wizard**
1. Navigate `/inbox` → "Connect Gmail" or "Use sample mailbox"
2. Click Use sample mailbox → POST `/api/gmail/connect-sample`
3. Verify: 5 simulated messages appear; "Scan now" works; vendors get inbound thread entries; approval cards drafted

**P6 — Navigation: top-bar primaries + section sidebar**
1. From CommandCenter, hover/tap each PRIMARY_NAV item (Discover, The Wedding, Build, The Day)
2. Visit each Build room from sidebar; each Day room from sidebar
3. Verify: no 500s, no white screens, no infinite loaders

**P7 — Post-lock dashboard lane system**
1. Demo loaded → GET `/` → CommandCenter
2. Verify lanes from `lib/lanes.ts` render with phase chips, vendor cards, approval cards
3. Click into a vendor card → `/vendors/[id]` detail loads

## Adversarial probes per path

For each path above, also exercise:
- Submit empty / blank required fields
- Emoji & RTL/special chars in text inputs (✨🌿, `<script>`, `"` quotes, very long string)
- Double rapid submit (race condition)
- Refresh mid-flow (state persistence)
- Browser back after navigation
- Direct deep-link to gated route without brief locked

Severities:
- P0 = blocks signup / loses data
- P1 = blocks a critical flow
- P2 = UI break, non-blocking
- P3 = polish
