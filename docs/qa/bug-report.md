# Corsia/AISLE — QA Bug Report

Test target: localhost:3000 (built from current HEAD; this is the build that will deploy after `main` advances)
Spot probes: https://aisle-seven.vercel.app
Tester: Claude (Opus 4.7)
Test date: 2026-05-12

## Severity legend

- **P0** — blocks signup or causes data loss
- **P1** — blocks core flow OR exposes dev/debug content to users
- **P2** — UI break, non-blocking
- **P3** — polish / wording

## What works (regression baseline)

- 41 named routes return 200 (P6).
- `/api/chat` accepts user messages, persists, returns a Maestro reply. Empty (`message:""`) and `>50k` chars correctly 400.
- Brief form happy path (`/brief`): fills 5 required fields → Save draft → Lock → redirect `/approvals` → state.brief.locked=true.
- Demo mode load (`/settings` → "Show me the example wedding"): populates a project (28 vendors, brief locked, demoMode=true) and routes to `/`.
- Approve action on `/approvals`: clicking "Yes" decrements pending count and moves the card to history.
- Gmail sample mailbox: connect-sample + scan returns 5 simulated messages; matches drafts to vendors.
- Vendor 404 (`/vendors/<bogus>`): renders a graceful "That vendor isn't on your list." view, not a stack trace.
- React escapes user content rendered in chat: `<script>alert(1)</script>` in a chat message is shown as text, no script element created.

## Bugs

### BUG-1 · P1 · Dashboard hero leaks dev message "Image gen: OPENAI_API_KEY not set"

**Path / step:** Demo mode loaded (or any project without `OPENAI_API_KEY` set) → `/` → CommandCenter hero header
**Expected:** No dev/debug strings on the user-facing dashboard. Failed image render falls back silently to the sage-pale placeholder gradient.
**Actual:** A red-tinted banner reads `IMAGE GEN: OPENAI_API_KEY not set` directly under the couple's names. Visible to every demo user and to every prod user that hasn't wired OpenAI.
**Where:** `components/CommandCenter.tsx:731-747` — `renderError && isPlaceholder` branch unconditionally renders the error string.
**Severity rationale:** This is the FIRST thing a user sees after locking the brief or loading the demo. It looks broken and unprofessional. Treating as P1 because it materially undermines the post-lock experience.

### BUG-2 · P1 · `/api/chat` route is missing input-length and shape validation in one branch

Investigated: the route uses Zod with `z.string().min(1).max(50_000)` so `huge`/`empty` reject correctly. Removed — false alarm. (Kept entry as a record of the check.)

### BUG-3 · P2 · Maestro region extractor falls through when "in <Month>" is matched first

**Path / step:** Landing welcome box → type `Saturday in October, Hudson Valley, ~120` → Begin
**Expected:** Brief updates with `dateWindow="October 2026"`, `region="Hudson Valley"`, `guestCount=120`.
**Actual:** Only `dateWindow` is set. `region` and `guestCount` stay empty / 0.
**Root cause:** `lib/agents/maestro.ts:761-785` — the `inAt` regex (`(?:in|at|near|around)\s+([A-Z][\w' .-]{2,40}(?:,\s*[A-Z]{2,})?)`) matches "in October" first. `isLikelyName` then correctly rejects "October" as a name-shaped token, but the `else` branch that would try `cityState` ("Hudson Valley, NY") never runs because the outer `if (inAt)` already matched. The region extraction silently no-ops.
**Severity rationale:** First-impression extraction quality. Demo path still works because the demo seed fills region directly. P2.

### BUG-4 · P2 · Maestro guest-count regex misses `~120` (no space between `~` and number)

**Path / step:** Same landing message: `Saturday in October, Hudson Valley, ~120`
**Expected:** `guestCount=120`.
**Actual:** Not extracted.
**Root cause:** `lib/agents/maestro.ts:690` regex `\b(?:roughly|around|about|~|circa)\s+(\d{2,4})\b` requires `\s+` between the qualifier and the digits. `~120` has no whitespace.
**Severity rationale:** Pure regex fix, common natural-language pattern. P2.

### BUG-5 · P2 · Brief form shows generic "Invalid brief" with no field-level hint on empty submit

**Path / step:** `/brief` → leave fields empty → click "Lock brief"
**Expected:** Field-level cue (which field is missing) or a humanized message listing missing fields.
**Actual:** A single red line `Invalid brief` under the form. No indication which fields failed. The Zod issues are sent back in the response body (`issues`) but the UI throws them away.
**Where:** `components/BriefForm.tsx:64-67` discards `j.issues`. `app/api/brief/route.ts:27-30` includes the issues; UI just doesn't surface them.
**Severity rationale:** Real users won't be able to self-correct without trial-and-error. P2.

### BUG-6 · P3 · `CountUp` shows literal "0" during initial animation — momentarily reads "0 decisions pending"

**Path / step:** `/approvals` with pending > 1 → page first paints with `<CountUp />` starting from 0 → for ~1100ms the header reads "0 decisions pending."
**Expected:** Either start from the final value, OR mask the surrounding text until animation begins.
**Actual:** Initial frame reads "0 decisions pending." which contradicts the next-line `PENDING N` chip and the actual list.
**Where:** `components/Atmosphere.tsx:64-107` — animates `from = 0` with `setShown(0)` initial state. Combined with `components/ApprovalsList.tsx:122` rendering "[N] decisions pending" while N is still 0.
**Severity rationale:** Resolves on its own in ~1s. P3.

### BUG-7 · P3 · Production HTML title says "Corsia. The autonomous wedding platform" but repo HEAD says "AISLE — The autonomous wedding platform"

**Path / step:** GET https://aisle-seven.vercel.app/ → `<title>Corsia. The autonomous wedding platform</title>` vs local `<title>AISLE — The autonomous wedding platform</title>`.
**Expected:** Branding consistent post-deploy. Either the repo defines "Corsia" or the production catches up.
**Actual:** Production is on an older commit. Pushing this branch's HEAD to `main` will fix it.
**Where:** `app/layout.tsx:5-9` — metadata is `AISLE`. Most references inside the app already say `aisle` lower-case. Inconsistent: README/BUILD_LOG/most components use AISLE; prod-deployed bundle still uses Corsia.
**Severity rationale:** Cosmetic + SEO. P3. Resolves on next deploy.

### BUG-8 · P3 · `preview_fill` + native click on landing hero doesn't kick the React submit, but real user keystrokes do

**Path / step:** Testing-only finding. Setting `input.value` via DOM and dispatching `click` on the Begin button doesn't trigger send(); only `form.requestSubmit()` (or a real user typing) does. Verified working for real users via the dev server in plain Chrome.
**Severity rationale:** Test harness quirk, not a product bug. Logged so future agents don't re-investigate.

## Adversarial probes — results

| Probe | Result |
|---|---|
| Empty chat message | `/api/chat` returns 400. |
| 50,000-char chat message | `/api/chat` returns 400. |
| `<script>alert(1)</script>` in chat | Persisted as text. React escapes on render. No XSS. |
| Emoji `✨🌿💕` in chat | Persisted + reflected. No mojibake. |
| Empty brief lock submit | Server returns 400 `Invalid brief`. UI displays the message. (See BUG-5 for severity.) |
| `/vendors/nonexistent-id` | Renders "That vendor isn't on your list." view. |
| Refresh mid-flow on `/brief` after partial fill | Form state is lost (local React state, not persisted to brief). Once submitted via Save-draft, state survives. Acceptable per the design. |
| Browser back from `/approvals` to `/` after Lock | History entry exists; back works without erroring. |
| Rapid double-click Lock | Button has `disabled={!!busy}` guard; second click is no-op. |

## Fix plan for Phase 3

P0: none. P1: BUG-1. P2 < 20 LOC each: BUG-3, BUG-4. BUG-5 needs > 20 LOC to surface per-field errors well — log as deferred. P3: deferred (BUG-6, BUG-7, BUG-8).
