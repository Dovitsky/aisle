# AISLE — Nightly build log

One line per shipped feature. Cron runs nightly at 23:17 local; each session ships
one focused thing end-to-end (types + route + UI + verify), then logs here.

## Already in:

- 2026-05-07 — Locator agent (vibe → location suggestions via web_search), wired as `dispatch_locator` Maestro tool that returns a choice card during onboarding before a region is picked.
- 2026-05-07 — Auto-lock + auto-Scout-fire when brief becomes complete in one turn; Scout runs in the background and the chat returns immediately, client polls `/api/state` for incoming approval cards.
- 2026-05-07 — Brief is editable post-lock — material pivots (region / date / guest count) auto-trigger Scout re-fire and soft-archive old non-contracted vendors.
- 2026-05-07 — Smart fallback when update_brief leaves the brief incomplete — prose always asks for the single next missing field instead of "Got it.".
- 2026-05-07 — `/vendors` redesigned: left category rail + status-grouped pipeline (Our pick / Shortlist / Outreach drafted / Awaiting reply / Quoting / Negotiating / Booked / Passed).
- 2026-05-07 — `Today` polish: PhaseStrip (sage-gradient timeline of 8 planning phases), StatGrid (Days / Vendors / Decisions / Committed with progress bars), BotanicalAccent SVG behind hero.
- 2026-05-07 — Six STARTER_BRIEFS templates (Amalfi / Hudson Valley / Tuscany / Joshua Tree / Charleston / City Hall) with `/api/starter-brief` endpoint and welcome-screen card grid.
- 2026-05-07 — All offline fixture data stripped from agents — failures surface as empty rather than masking with stale fictional vendors.
- 2026-05-07 — Conversational UI tools: ask_choice, ask_confirm, show_summary, quick_replies render as chat-attached cards with click-to-reply.
- 2026-05-07 — Top bar + Cmd/K full-screen menu overlay; sidebar removed in favor of editorial table-of-contents.

## Backlog candidates (cron picks one per night):

- `/approvals` queue page polish to match `/vendors` aesthetic.
- `/budget` page — treemap or stacked bars showing committed/paid against the envelope.
- `/seating` — better solver visualization, drag-and-drop is rough.
- `/day-of` console — Maestro Jr. mode UX, contingency bands, live timeline.
- `/design` — mood board grid; needs OpenAI image gen wiring (lib/imagegen.ts deferred).
- `/timeline` — phase detail view; PRD §3.2.
- Watcher actions beyond stale-vendor nudges: budget over-envelope, RSVP cadence, missing foundation entities.
- Inbox UX — vendor replies parsed by Triage need a queue with quick actions.
- Real Gmail OAuth + send (currently log-only fallback in lib/email/send.ts).
- Stripe deposit/balance flow on schedule_payment approvals.
- Tests for the chat→update_brief→auto-lock→scout pipeline.
- Welcome bag designer page — Quartermaster output rendered.
- Dietary brief delivery — Larder dispatch_larder_brief lands as approval; UI for the resolution workflow.
- Engagement studio (Concierge) — currently dispatchable but the page may not be polished.
- Honeymoon (Itinerist) — gated content, segment cards.
2026-05-07 — /timeline rebuilt as 12-month auto-checklist (lib/checklist.ts + TimelineView). 30 items grouped by months-out (12 → -1), each auto-marks done from real state signals (vendor contracted, approval approved, license filed). Current window highlighted sage; overdue items flagged amber. Hero shows X/30 done with sage progress bar.

## Standing mandate (read every iteration)

Goal: AISLE has every feature a couple needs to plan a wedding, all working as simple AI-guided flows, behind a UI that feels elegant and luxurious.

Each night iteration must:
1. **Test the app for real** — start dev, exercise core AI flows end-to-end (chat onboarding → auto-lock → Scout fires → cards land → approve → cascade). If any flow is broken, fix it before building anything new.
2. **Research the web** for one high-value feature pattern not yet in the app. Vary the angle each night — month-by-month checklists, smart RSVPs, receipt ingestion, AI venue visualizers, cultural ceremony customization, AR seating, etc.
3. **Build the highest-leverage thing** end-to-end — fully wired, AI-powered if relevant, no fixture data, no skeletons.
4. **Polish for elegance** — Cormorant 300 italic display, sage on cream, mono caps eyebrows, no emojis, generous whitespace, animated entrances, gradient hairlines on cards. Match /vendors and /timeline as the bar.
5. **Verify** — `npx tsc --noEmit` clean, `npm test` green, route smoke tested with curl, AI flow exercised with a real chat POST.
6. **Log** — append one line to BUILD_LOG.md.

Coverage to drive toward: every page in components/*View.tsx polished to /vendors level. Every Maestro tool exercised by an organic onboarding flow. Watcher acting on every flag type. Real Stripe wiring on schedule_payment. Real Gmail send. Image gen for mood boards / dress / stationery proofs. Smart RSVP form on the wedding website. Receipt + email + screenshot ingestion. Cultural ceremony library expansion.
2026-05-07 22:45 — /approvals rebuilt: pending grouped by risk (Big call / Worth a look / Easy) with sage-mono hints, history bucketed Today / This week / Earlier as a quiet trail. Clear-state when empty with editorial copy. Sage-italic count in header.
2026-05-07 22:58 — /budget rebuilt: hero with 'Allocation, in proportion' + envelope CountUp; full-width segmented master bar (paid/committed/planned/remaining in sage shades); per-category rows with proportional mini-bars sized to largest line; hover-edit with inline editor; over-envelope alert in oxblood.
2026-05-07 23:26 — /guests rebuilt: hero with 'X on the list' + confirmed count, segmented RSVP bar (sage shades for yes/maybe/no/awaiting), 6-filter pill row (all/yes/maybe/no/awaiting/dietary), household cards with side-mono caps, member rows with relationship + plus-one + dietary chip (red 'Critical' for anaphylactic) + ♪ song-request indicator + active-state RSVP buttons, polished add-household editor, link-outs to /dietary and /music.
2026-05-07 23:36 — /website rebuilt with Smart RSVP custom-questions editor. New RsvpQuestion type + 3 default questions seeded on init (meal choice → Larder, dietary needs → Larder, song request → Cantor). Polished view: editorial hero w/ 'Preview live →' link, 3 large section toggles (Schedule/RSVP/Registry) with Live/Off mono badges, Smart RSVP card list with kind + required + attending-only + routes-to indicators, inline edit/remove + add-question form. tsc + tests + smoke green.
