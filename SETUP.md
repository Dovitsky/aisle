# Setup. make the app actually work

Three independent integrations, in dependency order. Each one's keys go in `.env.local`. After every edit to `.env.local`, restart `npm run dev`.

---

## 1. Anthropic (5 minutes)

Without this, every agent returns labeled offline stubs.

```
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL_ORCHESTRATOR=claude-opus-4-7
ANTHROPIC_MODEL_TRIAGE=claude-haiku-4-5-20251001
```

1. Sign up at <https://console.anthropic.com>, generate an API key.
2. Paste into `.env.local`. Restart.
3. Now Maestro chat, Scout shortlists, Cleric ceremony scripts, Larder dietary parsing, all 18 agents hit real Claude.

Cost guidance: a single couple's planning session typically uses $5–20 of Anthropic credit per month at active phases. Triage (Haiku) is cheap; the rest run on Opus.

---

## 2. Supabase (database + login + realtime, 30 minutes)

Without this, the app uses `data/store.json` and there's no real login.

### Create the project

1. Sign up at <https://supabase.com>. Create a new project. Pick the region closest to you.
2. Wait ~2 minutes for it to provision.

### Run the migrations

3. In the project dashboard: **SQL Editor → New query**.
4. Open [`supabase/migrations/0001_initial.sql`](supabase/migrations/0001_initial.sql), copy the whole file, paste into the SQL editor, click **Run**. Should complete in 2-3 seconds.
5. Same for [`supabase/migrations/0002_dietary_and_menu.sql`](supabase/migrations/0002_dietary_and_menu.sql).
6. Verify in **Table Editor**: you should see ~35 tables (profiles, projects, project_members, vendors, approvals, ledger_events, etc.).

### Wire up auth

7. **Authentication → URL Configuration**:
   - Site URL: `http://localhost:3000`
   - Redirect URLs: add `http://localhost:3000/auth/callback` and (later) your prod origin.
8. **Authentication → Providers → Email**: already enabled by default. The magic-link flow works out of the box. Supabase has a built-in SMTP relay for development; for production set up your own under **Settings → Auth → SMTP**.
9. (Optional) **Authentication → Providers → Google**: toggle on. Paste in the Google OAuth Client ID + Secret (see step 3 below. same credentials).

### Copy the keys

10. **Project Settings → API**. Copy three values:

```
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...

NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

11. Restart `npm run dev`. Visit `/settings`. Integrations panel should now read "✓ Postgres".

### What you get

- **Real login** at `/login`. magic link to email, plus optional Google. First sign-in auto-creates an empty project with you as the organizer.
- **Real persistence**. every Approval Card, vendor, guest, mood-board, ceremony section, etc. writes to Postgres. The dress firewall is now enforced by Row-Level Security at the DB level (not just by code).
- **Realtime**. when you have a partner connected to the same project, their device updates live as you mutate state. (Channels are already published in the migration.)
- **Append-only ledger**. Postgres triggers reject UPDATE/DELETE on `ledger_events`.

---

## 3. Google OAuth (Gmail integration, 15 minutes)

Without these, `/inbox` runs against a 5-message simulated fixture.

1. <https://console.cloud.google.com>. Create a project (or pick an existing one).
2. **APIs & Services → Library** → enable: Gmail API, People API.
3. **OAuth consent screen** → External → fill in the basics. App name "Corsia", user support email = yours.
4. **Credentials → Create Credentials → OAuth client ID → Web application**.
5. Authorized redirect URIs:
   ```
   http://localhost:3000/api/gmail/callback
   https://YOUR_PROD_DOMAIN/api/gmail/callback
   ```
   (Add the prod URI now even if you haven't deployed yet.)
6. Click Create. Copy the Client ID + Client Secret.
7. In `.env.local`:
   ```
   GOOGLE_CLIENT_ID=...apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-...
   GOOGLE_REDIRECT_URI=http://localhost:3000/api/gmail/callback
   ```
8. Restart. Open `/inbox` → "Connect Gmail" goes through real Google OAuth.

Same OAuth credentials can be used for Supabase Google sign-in. set the redirect URI to your Supabase callback (`https://YOUR_PROJECT.supabase.co/auth/v1/callback`) in addition to the Corsia one.

---

## Sanity checks

After all three are configured:

```sh
npm run dev
```

Visit:
- `/` → Today screen, Maestro greeting comes from real Claude.
- `/login` → magic-link form.
- `/inbox` → "Connect Gmail" button works; clicking takes you through Google's consent screen.
- `/settings` → Integrations panel shows ✓ Postgres + ✓ Gmail.
- `/dietary` → all 17 tests still pass: `npm test`.

If something breaks: check the dev server output, then look in the Supabase dashboard → Logs for SQL errors.

---

## What's still deferred

- **Real outbound email** when an approved card has `kind: send_email`. Currently the card flow ends at "approved". the email doesn't actually send. Wire `lib/email/send.ts` to Resend (~30 min).
- **Stripe Connect** for `schedule_payment` cards. Recommended: don't move money in v1, just track committed/paid manually.
- **Inngest cron** for scheduled scans. Today, click "Scan now" on `/inbox` to pull manually.
- **Image generation** for mood boards / dress concepts / welcome bag previews. Color swatches + text only.
- **Print partner integration** for stationery. Cards render as on-screen SVG mockups; nothing actually prints.
