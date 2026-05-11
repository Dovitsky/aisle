"use client";

// Approvals. the decisions queue.
//
// Pending cards grouped two ways the user can flip between:
//   • by risk   . Big call / Worth a look / Easy (heaviest decisions first)
//   • by phase  . Foundation / Design / Logistics / etc. (wedding-area
//     view; matches the dashboard's Concierge block)
// History split into Today / This week / Earlier as a quiet trail. Empty
// states feel intentional, not blank.

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ApprovalCard, Phase } from "@/lib/types";
import { PHASES } from "@/lib/types";
import { ApprovalCardView } from "./ApprovalCard";
import { useProject } from "./StateProvider";
import { Reveal, CountUp, BreathingDot } from "./Atmosphere";

type Tab = "pending" | "history";
type GroupBy = "risk" | "phase";

const RISK_LABEL: Record<ApprovalCard["risk"], string> = {
  high: "Big call",
  medium: "Worth a look",
  low: "Easy",
};
const RISK_DOT: Record<ApprovalCard["risk"], string> = {
  high: "bg-risk-high",
  medium: "bg-risk-medium",
  low: "bg-sage-400",
};
const RISK_HINT: Record<ApprovalCard["risk"], string> = {
  high: "Money or commitments. Read carefully.",
  medium: "Worth pausing on, then proceed.",
  low: "Quick yes/no. you can move fast.",
};

// Canonical wedding-planning phase order; matches dashboard.
const PHASE_ORDER: Phase[] = [
  "foundation", "discovery", "design", "logistics",
  "guest_management", "personal_prep", "week_of",
  "wedding_day", "post_event",
];
const PHASE_LABEL: Record<Phase, string> = Object.fromEntries(
  PHASES.map((p) => [p.id, p.label]),
) as Record<Phase, string>;
const PHASE_BLURB: Record<Phase, string> = Object.fromEntries(
  PHASES.map((p) => [p.id, p.blurb]),
) as Record<Phase, string>;
const RISK_RANK = { high: 0, medium: 1, low: 2 } as const;

export function ApprovalsList() {
  const { state, loading } = useProject();
  const [tab, setTab] = useState<Tab>("pending");
  const [groupBy, setGroupBy] = useState<GroupBy>("risk");

  const { pending, history, byRisk, byPhase, byBucket } = useMemo(() => {
    const empty = {
      pending: [] as ApprovalCard[],
      history: [] as ApprovalCard[],
      byRisk: { high: [], medium: [], low: [] } as Record<ApprovalCard["risk"], ApprovalCard[]>,
      byPhase: {} as Record<Phase, ApprovalCard[]>,
      byBucket: { today: [], week: [], earlier: [] } as Record<"today" | "week" | "earlier", ApprovalCard[]>,
    };
    if (!state) return empty;

    const pending = state.approvals.filter((a) => a.status === "pending");
    const history = state.approvals
      .filter((a) => a.status !== "pending")
      .sort((a, b) => (b.resolvedAt ?? "").localeCompare(a.resolvedAt ?? ""));

    const byRisk = { high: [] as ApprovalCard[], medium: [] as ApprovalCard[], low: [] as ApprovalCard[] };
    for (const c of pending) byRisk[c.risk].push(c);

    const byPhase: Record<Phase, ApprovalCard[]> = {
      discovery: [], foundation: [], design: [], logistics: [],
      guest_management: [], personal_prep: [], week_of: [],
      wedding_day: [], post_event: [],
    };
    for (const c of pending) byPhase[c.phase as Phase]?.push(c);
    for (const k of Object.keys(byPhase) as Phase[]) {
      byPhase[k].sort((a, b) =>
        (RISK_RANK[a.risk] - RISK_RANK[b.risk]) ||
        (+new Date(a.createdAt) - +new Date(b.createdAt))
      );
    }

    const now = new Date();
    const sodMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const weekAgoMs = sodMs - 6 * 24 * 60 * 60 * 1000;
    const byBucket = { today: [] as ApprovalCard[], week: [] as ApprovalCard[], earlier: [] as ApprovalCard[] };
    for (const c of history) {
      const t = c.resolvedAt ? new Date(c.resolvedAt).getTime() : 0;
      if (t >= sodMs) byBucket.today.push(c);
      else if (t >= weekAgoMs) byBucket.week.push(c);
      else byBucket.earlier.push(c);
    }

    return { pending, history, byRisk, byPhase, byBucket };
  }, [state]);

  if (loading || !state) {
    return <div className="pt-10 text-center text-ink-300">Loading…</div>;
  }

  return (
    <div className="flex flex-col gap-12 pb-12">
      <header>
        <p className="text-[10px] uppercase tracking-[0.26em] text-sage-500 font-mono mb-2 flex items-center gap-2">
          <BreathingDot />
          Decisions
        </p>
        <div className="flex items-baseline justify-between gap-6 flex-wrap">
          <h1 className="display text-[36px] sm:text-[44px] lg:text-[52px] leading-[1.02] tracking-[-0.01em]">
            {pending.length === 0 ? (
              <>All clear.</>
            ) : pending.length === 1 ? (
              <>One decision pending.</>
            ) : (
              <>
                <CountUp value={pending.length} /> decisions pending.
              </>
            )}
          </h1>
          {history.length > 0 && (
            <div className="text-right">
              <div className="display text-[28px] tabular-nums leading-none">
                {history.length}
              </div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-ink-300 font-mono mt-1">
                resolved
              </div>
            </div>
          )}
        </div>

        {/* Tab toggle + (when on Pending) the group-by toggle */}
        <div className="mt-6 flex gap-3 items-center flex-wrap">
          <div className="flex gap-1 p-1 rounded-full border hairline bg-white/40 w-fit">
            {(["pending", "history"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-full text-[11px] uppercase tracking-[0.18em] transition-colors ${
                  tab === t ? "bg-ink text-paper-50" : "text-ink-300 hover:text-ink"
                }`}
              >
                {t === "pending" ? "Pending" : "History"}
                <span className="ml-1.5 opacity-60 font-mono">
                  {t === "pending" ? pending.length : history.length}
                </span>
              </button>
            ))}
          </div>

          {tab === "pending" && pending.length > 0 && (
            <>
              <span className="text-[10px] uppercase tracking-[0.22em] text-ink-300 font-mono">
                grouped by
              </span>
              <div className="flex gap-1 p-1 rounded-full border hairline bg-white/40 w-fit">
                {(["risk", "phase"] as GroupBy[]).map((g) => (
                  <button
                    key={g}
                    onClick={() => setGroupBy(g)}
                    className={`px-3.5 py-1 rounded-full text-[11px] uppercase tracking-[0.18em] transition-colors ${
                      groupBy === g ? "bg-sage-100 text-ink" : "text-ink-300 hover:text-ink"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </header>

      {/* PENDING. grouped by risk OR phase */}
      {tab === "pending" && (
        <>
          {pending.length === 0 ? (
            <ClearState />
          ) : groupBy === "risk" ? (
            <div className="flex flex-col gap-12">
              {(["high", "medium", "low"] as const).map((r) => {
                const items = byRisk[r];
                if (!items.length) return null;
                return (
                  <Reveal key={r}>
                    <section>
                      <div className="flex items-baseline justify-between mb-4">
                        <div className="flex items-baseline gap-3">
                          <span className={`inline-block w-1.5 h-1.5 rounded-full ${RISK_DOT[r]}`} aria-hidden />
                          <h2 className="display italic text-[20px] text-ink leading-tight">
                            {RISK_LABEL[r]}
                            <span className="not-italic text-ink-300 ml-2 text-[14px]">{items.length}</span>
                          </h2>
                        </div>
                        <p className="text-[11px] uppercase tracking-[0.16em] text-ink-300 hidden sm:block">
                          {RISK_HINT[r]}
                        </p>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3 stagger">
                        {items.map((c) => (
                          <ApprovalCardView key={c.id} card={c} />
                        ))}
                      </div>
                    </section>
                  </Reveal>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col gap-12">
              {PHASE_ORDER.map((p) => {
                const items = byPhase[p];
                if (!items?.length) return null;
                return (
                  <Reveal key={p}>
                    <section>
                      <div className="flex items-baseline justify-between mb-4">
                        <div className="flex items-baseline gap-3">
                          <h2 className="display italic text-[22px] text-ink leading-tight">
                            {PHASE_LABEL[p]}
                          </h2>
                          <span className="text-[10.5px] uppercase tracking-[0.22em] text-sage-500 font-mono tabular-nums">
                            {items.length} {items.length === 1 ? "decision" : "decisions"}
                          </span>
                          {/* Risk dot summary chips inside this phase */}
                          <div className="flex items-center gap-1 ml-2">
                            {(["high", "medium", "low"] as const).map((r) => {
                              const n = items.filter((c) => c.risk === r).length;
                              if (!n) return null;
                              return (
                                <span
                                  key={r}
                                  className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] font-mono ${
                                    r === "high" ? "text-risk-high" : r === "medium" ? "text-risk-medium" : "text-sage-500"
                                  }`}
                                  title={RISK_LABEL[r]}
                                >
                                  <span className={`inline-block w-1 h-1 rounded-full ${RISK_DOT[r]}`} aria-hidden />
                                  {n}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                        <p className="text-[11px] italic text-ink-300 hidden md:block max-w-[320px] text-right truncate">
                          {PHASE_BLURB[p]}
                        </p>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3 stagger">
                        {items.map((c) => (
                          <ApprovalCardView key={c.id} card={c} />
                        ))}
                      </div>
                    </section>
                  </Reveal>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* HISTORY. bucketed by time */}
      {tab === "history" && (
        <>
          {history.length === 0 ? (
            <EmptyHistory />
          ) : (
            <div className="flex flex-col gap-10">
              {(["today", "week", "earlier"] as const).map((b) => {
                const items = byBucket[b];
                if (!items.length) return null;
                return (
                  <Reveal key={b}>
                    <section>
                      <div className="flex items-baseline justify-between mb-3">
                        <h2 className="display italic text-[18px] text-ink-400 leading-tight">
                          {b === "today" ? "Today" : b === "week" ? "This week" : "Earlier"}
                          <span className="not-italic text-ink-300 ml-2 text-[13px]">{items.length}</span>
                        </h2>
                      </div>
                      <ul className="flex flex-col">
                        {items.map((c, i) => (
                          <HistoryRow key={c.id} card={c} divider={i < items.length - 1} />
                        ))}
                      </ul>
                    </section>
                  </Reveal>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function HistoryRow({ card, divider }: { card: ApprovalCard; divider: boolean }) {
  const tone =
    card.status === "approved" ? "text-sage-500" :
    card.status === "rejected" ? "text-risk-high" : "text-ink-300";
  const verb =
    card.status === "approved" ? "Done" :
    card.status === "rejected" ? "Passed" : "Edited";
  const when = card.resolvedAt
    ? new Date(card.resolvedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
    : "";

  return (
    <li className={`py-3.5 flex items-baseline justify-between gap-4 ${divider ? "border-b hairline" : ""}`}>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] text-ink truncate">{card.title}</div>
        <div className="text-[11px] uppercase tracking-[0.16em] text-ink-300 mt-0.5">
          {card.agent} · {card.phase.replace(/_/g, " ")}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className={`text-[10.5px] uppercase tracking-[0.18em] ${tone}`}>{verb}</div>
        <div className="text-[10px] text-ink-200 mt-0.5 font-mono">{when}</div>
      </div>
    </li>
  );
}

function ClearState() {
  return (
    <Reveal>
      <div className="rounded-card border hairline bg-white/55 px-7 py-12 text-center max-w-xl">
        <p className="display text-[26px] text-ink leading-tight">
          Nothing waits on you.
        </p>
        <p className="text-[14px] text-ink-300 mt-3 leading-relaxed max-w-md mx-auto">
          Specialists are working in the background. The next decision will surface here automatically.
        </p>
        <div className="mt-6 flex justify-center gap-3 text-[11px] uppercase tracking-[0.18em] text-ink-300">
          <Link href="/" className="hover:text-ink transition-colors">Home →</Link>
          <span className="text-ink-200">·</span>
          <Link href="/timeline" className="hover:text-ink transition-colors">Timeline →</Link>
          <span className="text-ink-200">·</span>
          <Link href="/vendors" className="hover:text-ink transition-colors">Vendors →</Link>
        </div>
      </div>
    </Reveal>
  );
}

function EmptyHistory() {
  return (
    <div className="text-[14px] text-ink-300 italic">
      Nothing resolved yet. Approved, edited, and rejected cards will trail here.
    </div>
  );
}
