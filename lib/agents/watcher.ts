// Watcher — continuous risk monitor (PRD §4.2).
// Looks at the current state and flags issues: budget overruns, missing
// foundation entities late in the schedule, contracts unsigned for too long,
// RSVP cadence falling behind.
//
// Watcher also *acts* — when a vendor goes stale, Watcher queues a polite
// nudge email Approval Card via Outreach so the couple sees it and can
// approve a follow-up.

import { ProjectState } from "../types";
import { assertBudgetInvariant } from "./treasurer";
import { appendApproval, appendChat, readState } from "../store";
import { negotiatorDraft } from "./negotiator";

export interface WatcherFlag {
  level: "info" | "warn" | "critical";
  topic: string;
  message: string;
  module: string;
}

export function watcherScan(state: ProjectState): WatcherFlag[] {
  const flags: WatcherFlag[] = [];

  if (!state.brief) {
    flags.push({ level: "info", topic: "Brief", message: "Brief not started.", module: "discovery" });
  } else if (!state.brief.locked) {
    flags.push({ level: "warn", topic: "Brief", message: "Brief is drafted but not locked. Specialist agents won't run until it's locked.", module: "discovery" });
  }

  // Budget invariant
  if (state.budget.length) {
    const inv = assertBudgetInvariant(state.budget);
    if (!inv.ok) flags.push({ level: "critical", topic: "Budget", message: inv.violation ?? "Invariant violated", module: "budget" });

    if (state.brief?.budgetUsd) {
      const planSum = state.budget.reduce((s, l) => s + l.planUsd, 0);
      if (planSum > state.brief.budgetUsd) {
        flags.push({
          level: "warn",
          topic: "Budget",
          message: `Plan total ($${planSum.toLocaleString()}) exceeds the brief envelope ($${state.brief.budgetUsd.toLocaleString()}).`,
          module: "budget",
        });
      }
      const committedSum = state.budget.reduce((s, l) => s + l.committedUsd, 0);
      if (committedSum > state.brief.budgetUsd * 0.9) {
        flags.push({
          level: "info",
          topic: "Budget",
          message: `Committed spend is at ${Math.round((committedSum / state.brief.budgetUsd) * 100)}% of envelope.`,
          module: "budget",
        });
      }
    }
  }

  // Foundation: do we have a Venue?
  if (state.brief?.locked) {
    const venue = state.vendors.find((v) => v.category === "Venue" && (v.status === "contracted" || v.status === "paid"));
    if (!venue) {
      flags.push({
        level: "warn",
        topic: "Foundation",
        message: "No venue is contracted yet. Most downstream phases depend on this.",
        module: "vendors",
      });
    }
  }

  // Stale contacts — escalating cadence
  const now = Date.now();
  for (const v of state.vendors) {
    if (v.status === "contacted" && v.lastTouchAt) {
      const days = (now - new Date(v.lastTouchAt).getTime()) / (1000 * 60 * 60 * 24);
      if (days > 14) {
        flags.push({
          level: "warn",
          topic: "Vendor",
          message: `${v.name} hasn't replied in ${Math.round(days)} days. Consider passing or sending a final nudge.`,
          module: "vendors",
        });
      } else if (days > 7) {
        flags.push({
          level: "info",
          topic: "Vendor",
          message: `${v.name} hasn't replied in ${Math.round(days)} days. Outreach can send a polite nudge.`,
          module: "vendors",
        });
      } else if (days > 5) {
        flags.push({
          level: "info",
          topic: "Vendor",
          message: `${v.name} has been quiet for ${Math.round(days)} days.`,
          module: "vendors",
        });
      }
    }
    // Quoting → Negotiating cadence
    if (v.status === "quoting" && v.lastTouchAt) {
      const days = (now - new Date(v.lastTouchAt).getTime()) / (1000 * 60 * 60 * 24);
      if (days > 5) {
        flags.push({
          level: "info",
          topic: "Vendor",
          message: `${v.name} quoted ${Math.round(days)} days ago — time to counter or commit.`,
          module: "vendors",
        });
      }
    }
  }

  // Guests: response rate if RSVPs are open.
  if (state.guests.length) {
    const responded = state.guests.filter((g) => g.rsvp !== "no_response").length;
    const pct = Math.round((responded / state.guests.length) * 100);
    if (pct < 50 && state.guests.length >= 30) {
      flags.push({
        level: "info",
        topic: "RSVPs",
        message: `${pct}% responded. Outreach can run a follow-up cadence.`,
        module: "guests",
      });
    }
  }

  // Day-of: any item delayed
  for (const item of state.dayOf) {
    if (item.status === "delayed") {
      flags.push({
        level: "critical",
        topic: "Day-of",
        message: `${item.title} (${item.time}) is delayed.`,
        module: "day-of",
      });
    }
  }

  return flags;
}

// --------------------------------------------------------------------
// Acts: side-effecting follow-ups.
// Distinct from `watcherScan` — these mutate state by queueing Approval Cards.
// --------------------------------------------------------------------

export interface WatcherActResult {
  nudgesQueued: number;
  vendorsNudged: string[];
  skipped: { vendor: string; reason: string }[];
  chatNotices: string[];   // markers for any chat messages Watcher posted this run
}

export async function watcherAct(state?: ProjectState): Promise<WatcherActResult> {
  const s = state ?? (await readState());
  const result: WatcherActResult = { nudgesQueued: 0, vendorsNudged: [], skipped: [], chatNotices: [] };
  if (!s.brief?.locked) return result;

  // ----- New: budget-over-envelope chat notice -----
  await maybePostBudgetOver(s, result);
  // ----- New: missing foundation (no venue) late in the planning window -----
  await maybePostMissingFoundation(s, result);
  // ----- New: RSVP cadence stalled after invitations went out -----
  await maybePostRsvpStalled(s, result);

  const now = Date.now();
  for (const v of s.vendors) {
    if (v.status !== "contacted" || !v.lastTouchAt) continue;
    const days = (now - new Date(v.lastTouchAt).getTime()) / (1000 * 60 * 60 * 24);
    if (days < 7) continue;          // not stale yet
    if (days > 21) continue;          // give up — Watcher will surface as a "consider passing" flag

    // Skip if there's already a pending nudge for this vendor.
    const existing = s.approvals.find((a) =>
      a.status === "pending" &&
      a.action.kind === "send_email" &&
      a.action.to.includes(v.name) &&
      /nudge|follow[- ]?up/i.test(a.title),
    );
    if (existing) {
      result.skipped.push({ vendor: v.name, reason: "nudge already queued" });
      continue;
    }

    // Draft a polite nudge via Negotiator.
    const goal = `${Math.round(days)} days have passed since our first email and we haven't heard back. Send a brief, polite nudge: re-state the date window + guest count, ask if they'd still like to discuss, and offer to close the loop if it's not a fit. Don't push.`;
    let body: string;
    try {
      body = await negotiatorDraft({ brief: s.brief, vendor: v, goal });
    } catch {
      body = `Hi ${v.name},\n\nJust circling back on our note from ${Math.round(days)} days ago — we're still looking at ${s.brief.dateWindow} in ${s.brief.region} for roughly ${s.brief.guestCount} guests.\n\nIf this isn't a fit, no problem — just let us know so we can close the loop.\n\nThanks,\nAISLE on behalf of ${s.brief.organizerName} & ${s.brief.partnerName}`;
    }

    await appendApproval({
      agent: "Watcher", phase: "discovery",
      title: `Send a nudge to ${v.name}?`,
      rationale: `Watcher flagged ${v.name} as stale (${Math.round(days)} days since last touch, status: ${v.status}). Negotiator drafted a polite follow-up. Approving sends via your connected Gmail.`,
      risk: "low",
      action: {
        kind: "send_email",
        to: `${v.name} (via AISLE alias)`,
        subject: `Re: Inquiry — ${s.brief.dateWindow}`,
        body,
      },
    });
    result.nudgesQueued += 1;
    result.vendorsNudged.push(v.name);
  }

  return result;
}

// --------------------------------------------------------------------
// Chat-surfaced notices.
//
// Each emits an `agent: "Watcher"` chat message tagged with a marker like
// `[watcher:budget-over]`. The marker gives us a 7-day idempotency window —
// we don't re-post the same flag if it's already in recent chat.
// --------------------------------------------------------------------

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function postedRecently(s: ProjectState, marker: string, withinDays: number): boolean {
  const cutoff = Date.now() - withinDays * ONE_DAY_MS;
  return s.chat.some((m) =>
    m.agent === "Watcher" &&
    m.content.includes(marker) &&
    new Date(m.createdAt).getTime() >= cutoff
  );
}

function daysUntilWedding(s: ProjectState): number | null {
  if (!s.brief) return null;
  const m =
    (s.brief.weddingDate?.match(/(\d{4})-(\d{2})-(\d{2})/)) ??
    s.brief.dateWindow.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const t = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00`).getTime();
  return Math.round((t - Date.now()) / ONE_DAY_MS);
}

async function maybePostBudgetOver(s: ProjectState, result: WatcherActResult) {
  if (!s.brief) return;
  if (postedRecently(s, "[watcher:budget-over]", 7)) return;
  const envelope = s.brief.budgetUsd;
  if (envelope <= 0) return;
  const planSum = s.budget.reduce((sum, l) => sum + l.planUsd, 0);
  if (planSum <= envelope) return;

  const overBy = planSum - envelope;
  const overPct = Math.round((overBy / envelope) * 100);

  // Top 3 lines by plan size — the realistic trim candidates.
  const top = [...s.budget]
    .sort((a, b) => b.planUsd - a.planUsd)
    .slice(0, 3)
    .map((l) => `${l.category} ($${l.planUsd.toLocaleString()})`)
    .join(", ");

  const body = `Watcher · Budget is $${overBy.toLocaleString()} over envelope (${overPct}% over). The biggest lines are ${top}. Want me to ask Treasurer for a trim plan, or are you raising the envelope? [watcher:budget-over]`;

  await appendChat({ role: "agent", agent: "Watcher", content: body });
  result.chatNotices.push("budget-over");
}

async function maybePostMissingFoundation(s: ProjectState, result: WatcherActResult) {
  if (!s.brief) return;
  if (postedRecently(s, "[watcher:missing-venue]", 7)) return;
  const days = daysUntilWedding(s);
  if (days === null) return;
  if (days < 30) return;            // too late to act on this notice
  if (days > 240) return;           // 8+ months out — not yet urgent

  const venue = s.vendors.find(
    (v) => v.category === "Venue" && (v.status === "contracted" || v.status === "paid"),
  );
  if (venue) return;

  const body = `Watcher · It's ${days} days out and no venue is contracted yet. Most other dates depend on the venue locking — want me to refresh Scout's shortlist or push outreach on the current candidates? [watcher:missing-venue]`;

  await appendChat({ role: "agent", agent: "Watcher", content: body });
  result.chatNotices.push("missing-venue");
}

async function maybePostRsvpStalled(s: ProjectState, result: WatcherActResult) {
  if (!s.brief) return;
  if (postedRecently(s, "[watcher:rsvp-stalled]", 7)) return;

  // Did invitations actually go out? Look for an approved send_invitations card.
  const inviteCard = s.approvals
    .filter((a) => a.action.kind === "send_invitations" && a.status === "approved")
    .sort((a, b) => (b.resolvedAt ?? "").localeCompare(a.resolvedAt ?? ""))[0];
  if (!inviteCard?.resolvedAt) return;

  const sentDays = (Date.now() - new Date(inviteCard.resolvedAt).getTime()) / ONE_DAY_MS;
  if (sentDays < 14) return;         // give guests two weeks before nudging

  const total = s.guests.length;
  if (total < 10) return;            // not enough to compute a meaningful rate
  const responded = s.guests.filter((g) => g.rsvp !== "no_response").length;
  const pct = Math.round((responded / total) * 100);
  if (pct >= 70) return;             // healthy rate — quiet

  const awaiting = total - responded;
  const body = `Watcher · ${Math.round(sentDays)} days since invitations went out and ${pct}% have responded — ${awaiting} household${awaiting === 1 ? "" : "s"} still pending. Want Outreach to send a polite reminder cadence? [watcher:rsvp-stalled]`;

  await appendChat({ role: "agent", agent: "Watcher", content: body });
  result.chatNotices.push("rsvp-stalled");
}
