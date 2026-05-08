"use client";

// Approvals — the decisions queue.
//
// Pending cards grouped by risk so the heaviest decisions surface first.
// History split into Today / This week / Earlier as a quiet trail. Empty
// states feel intentional, not blank.

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ApprovalCard, ProjectState } from "@/lib/types";
import { ApprovalCardView } from "./ApprovalCard";
import { useProject } from "./StateProvider";
import { Reveal, CountUp, BreathingDot } from "./Atmosphere";

type Tab = "pending" | "history";

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
  low: "Quick yes/no — you can move fast.",
};

export function ApprovalsList() {
  const { state, loading } = useProject();
  const [tab, setTab] = useState<Tab>("pending");

  const { pending, history, byRisk, byBucket } = useMemo(() => {
    const empty = {
      pending: [] as ApprovalCard[],
      history: [] as ApprovalCard[],
      byRisk: { high: [], medium: [], low: [] } as Record<ApprovalCard["risk"], ApprovalCard[]>,
      byBucket: { today: [], week: [], earlier: [] } as Record<"today" | "week" | "earlier", ApprovalCard[]>,
    };
    if (!state) return empty;

    const pending = state.approvals.filter((a) => a.status === "pending");
    const history = state.approvals
      .filter((a) => a.status !== "pending")
      .sort((a, b) => (b.resolvedAt ?? "").localeCompare(a.resolvedAt ?? ""));

    const byRisk = { high: [] as ApprovalCard[], medium: [] as ApprovalCard[], low: [] as ApprovalCard[] };
    for (const c of pending) byRisk[c.risk].push(c);

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

    return { pending, history, byRisk, byBucket };
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
              <>The queue is <span className="text-sage-500 italic">clear</span>.</>
            ) : pending.length === 1 ? (
              <>One decision waits for <span className="italic text-sage-500">you</span>.</>
            ) : (
              <>
                <CountUp value={pending.length} /> decisions wait for{" "}
                <span className="italic text-sage-500">you</span>.
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

        {/* Tab toggle */}
        <div className="mt-6 flex gap-1 p-1 rounded-full border hairline bg-white/40 self-start w-fit">
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
      </header>

      {/* PENDING — grouped by risk */}
      {tab === "pending" && (
        <>
          {pending.length === 0 ? (
            <ClearState />
          ) : (
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
          )}
        </>
      )}

      {/* HISTORY — bucketed by time */}
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
