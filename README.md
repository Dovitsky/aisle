# Corsia

The autonomous wedding platform. Built against `AISLE_PRD.docx` and `AISLE_BUILD_BRIEF.docx`.

Mobile-first responsive. sidebar nav on desktop, bottom tabs on mobile.

## Quick start

```sh
npm install
cp .env.example .env.local      # add your keys (see below)
npm run dev
open http://localhost:3000
```

```sh
npm test                        # property + firewall + budget tests
```

Without any keys, the app runs in **full offline / demo mode**: every agent returns labeled stubs, the inbox runs against a 5-message simulated fixture, the store is a JSON file at `data/store.json`. Add real keys to flip individual integrations live.

## Environment variables

| Key | Required? | What it unlocks |
|---|---|---|
| `ANTHROPIC_API_KEY` | for live agent output | Real Maestro / Scout / Cleric / etc. (otherwise stubs) |
| `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | optional | Switches store from JSON → Postgres + RLS (real dress firewall) |
| `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` + `GOOGLE_REDIRECT_URI` | optional | Real Gmail OAuth instead of simulated inbox |

## Setting up Supabase

1. Create a project at supabase.com.
2. In SQL editor, paste and run [`supabase/migrations/0001_initial.sql`](supabase/migrations/0001_initial.sql).
3. Copy URL + anon key + service role key from project settings → API.
4. Paste into `.env.local`. Restart dev. Settings → Integrations panel will flip to "✓ Postgres".

The schema enforces the dress firewall via Row-Level Security: a `partner`-role user literally cannot SELECT rows tagged `gate_scope = 'dress'` when `projects.gate_dress = true`. The append-only ledger is enforced by triggers. Realtime publication is enabled for chat / approvals / vendors / inbox so partner devices update live.

## Setting up Gmail

1. Console → Cloud → APIs & Services → Credentials → Create OAuth client (Web).
2. Authorized redirect URI: `http://localhost:3000/api/gmail/callback`
3. Add scopes: `gmail.readonly`, `gmail.send`, `gmail.modify`, `userinfo.email`
4. Paste client ID + secret into `.env.local`. Restart dev.
5. Open `/inbox`, click "Connect Gmail". Approve the consent screen.
6. Click "Scan now". Corsia pulls vendor replies, runs Triage, matches to vendors, drafts follow-ups via Negotiator as Approval Cards.

Until you do that, `/inbox` runs against a 5-message simulated fixture so the entire scan → triage → match → auto-draft → Approval Card flow is testable.

## How the Inbox flow works

```
  Gmail (or simulated fixture)
            ↓
   list messages matching filter ("in:inbox newer_than:30d -from:me")
            ↓
   for each new message:
     ├─ Triage parses intent + extracts quoted price
     ├─ matcher binds to vendor by:
     │     1. previously-bound email address
     │     2. domain ↔ vendor name slug overlap
     │     3. fuzzy display-name token overlap
     ├─ if matched:
     │     • append to vendor.thread (inbound)
     │     • update vendor.status from intent (available → quoting, etc.)
     │     • bind sender email to vendor for future scans
     │     • Negotiator drafts a follow-up → Approval Card
     ├─ if unmatched (and not noise):
     │     • surface in /inbox for manual association
     └─ persist record to inbox_messages with provenance
```

Verified end-to-end: scan of 5 simulated messages →
- 3 matched (Hudson Barn, Foxglove Estate, Atelier Maison via fuzzy name match)
- 1 filtered as out-of-office noise
- 1 filtered as marketing
- 2 follow-up Approval Cards drafted by Negotiator

## Module catalog

51 routes. 18+ specialist agents. 30+ entity types.

**Plan:** Today, Timeline (9 phases), Approvals queue, **Inbox** (Gmail), Engagement studio, Tastings & visits, Marriage license
**Build:** Vendors (master/detail + threaded messages), Budget, Guests + RSVPs, Wedding party, Design (mood boards), Florals, Stationery suite (with SVG mockups), Wedding website, Seating chart, Logistics (hotels + shuttles + welcome bag), Rentals
**Day:** Ceremony script (14 traditions, 62-ritual library), Music (setlist), Cake, Bar program, Hair & makeup, Pre-wedding events, Memorials
**Personal:** Vows + speeches (per-author firewall), Dress (gated), Honeymoon (gated), Registry
**Operate:** Day-of console + contingency bands + Maestro Jr. mode, Tip envelopes, Thank-you studio, Planner CRM, Vendor portal, Pricing, Settings (Pull-the-plug + gates + ledger + Gmail + DB status)

## Specialist agents

`Maestro` (orchestrator, tool-use), `Maestro Jr.` (day-of), `Scout` (vendor shortlists), `Outreach`, `Triage` (Haiku. email parsing), `Negotiator` (counter-proposals), `Counsel` (contract redlines), `Treasurer` (budget allocation + invariant), `Designer`, `Stationer`, `Couturier`, `Cartographer` (annealing solver), `Watcher` (continuous risk scan + stale-vendor cadence), `Concierge` (engagement), `Voice` (vows + speeches), `Curator` (registry), `Itinerist` (honeymoon), `Quartermaster` (welcome bags), `Cantor` (music), `Cleric` (ceremony), `Patissier` (cake), `Sommelier` (bar), `Botanist` (florals), `Steward` (rentals), `Atelier` (hair & makeup), `Clerk` (marriage license).

## The dress firewall. for real

PRD §2.3 / build brief §8.2. Implemented at three layers:

1. **`gateScope` column** on every gateable table (approvals, chat, vendors, budget, designs, ledger, vows). When the project's matching gate is enabled and the viewer is `partner`, the row is invisible.
2. **JSON-store mode**: `filterForViewer` strips matching rows from API responses.
3. **Supabase mode**: `row_visible(project_id, scope)` SQL function combined with RLS policies enforces it at the database level. the partner literally can't SELECT it.

Verified by `npm test` exfiltration test: with the gate on, the partner viewer's full state JSON contains zero references to dress-scoped vendor names, design titles, or `dress_concept` kind labels.

## Approval Card primitive

Every consequential action. send email, sign contract, schedule payment, lock seating, send invitations, file marriage license, publish website, lock vows. routes through the same card primitive. Same anatomy: agent + phase eyebrow, risk dot + risk pill, one-line title, expandable full content (action-typed preview), expandable rationale, three primary actions (Reject / Edit / Approve). Approving issues an `approval_token` atomically; side-effecting agent calls require a valid token (build brief §8.3).

## Agent network. how the cascade chains

Maestro is the only agent that talks to the couple in chat. Specialists are dispatched
through Maestro's tool-use; their outputs land as Approval Cards. When a card is
approved, the cascade engine (`lib/cascade.ts`) decides what fires next.

```
chat (couple)
   │
   ▼
Maestro ──── tool_use ────► Specialist ────► Approval Card  ┐
                                                            │
                                              couple approves│
                                                            ▼
                                                   resolveApproval
                                                            │
                                                            ▼
                                                   ┌── cascade ──┐
                                                   │             │
   send_email           ──► Gmail / Resend / log ──┴─► vendor.thread
   sign_contract        ──► auto-queue 50% deposit (Treasurer)
   schedule_payment     ──► ledger entry
   lock_brief           ──► Scout fires for Venue + Photographer
   publish_design       ──► Stationer drafts the suite
   lock_seating         ──► thank-you records rebuilt + dietary recheck
   lock_cake            ──► Larder re-runs allergen cross-check
   send_caterer_brief   ──► dietary brief sent to caterer
```

Maestro's tools (21):
`dispatch_scout`, `dispatch_outreach`, `dispatch_negotiator`, `dispatch_counsel`,
`dispatch_treasurer`, `dispatch_designer`, `dispatch_stationer`, `dispatch_botanist`,
`dispatch_cleric`, `dispatch_cantor`, `dispatch_patissier`, `dispatch_sommelier`,
`dispatch_steward`, `dispatch_atelier`, `dispatch_quartermaster`, `dispatch_couturier`,
`dispatch_voice_vows`, `dispatch_curator`, `dispatch_itinerist`, `dispatch_concierge`,
`dispatch_larder_parse`, `dispatch_larder_brief`, `dispatch_inbox_scan`.

Watcher runs the continuous risk scan (`GET /api/watcher`) and *acts* on what it
sees (`POST /api/watcher`): stale vendors → Negotiator drafts a polite nudge →
Approval Card. The cadence is 7-21 days since last touch; Watcher won't double-queue
a nudge that's already pending.

## Stack

- Next.js 15 App Router + React 19
- TypeScript strict
- Tailwind CSS 3.4. paper-cream + ink palette, Cormorant Garamond display + Inter body
- `@anthropic-ai/sdk` 0.32 with tool use
- `@supabase/supabase-js` 2.x
- `googleapis` for Gmail OAuth + API
- Zod for request validation
- `tsx` for tests

## Still deferred

- Real Stripe / Resend
- Anthropic prompt caching + streaming chat
- Inngest cron (manual scan button for now; Watcher's stale-vendor flags are computed on read)
- Image generation for mood boards / dress concepts
- Vendor portal magic-link auth
- Pre-commit gitleaks hooks
- Native iOS app (the responsive web app is the target for v1)
