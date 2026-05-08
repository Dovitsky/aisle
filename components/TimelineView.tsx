"use client";

// Timeline — 12-month auto-checklist.
//
// Items group by months-out (12, 10, 9, 8 ... 0, after). Each item renders
// a checkbox-style card whose "done" state is computed from real signals
// (vendor contracted, approval resolved, license filed, brief locked) — no
// manual toggling. The current window is highlighted in sage; items past
// their target window that aren't done are flagged amber as "overdue."

import Link from "next/link";
import { useMemo } from "react";
import type { ProjectState } from "@/lib/types";
import {
  CHECKLIST,
  ChecklistItem,
  checklistByMonthsOut,
  currentMonthsOut,
} from "@/lib/checklist";
import { useProject } from "./StateProvider";
import { Reveal } from "./Atmosphere";

export function TimelineView() {
  const { state, loading } = useProject();

  const groups = useMemo(() => checklistByMonthsOut(), []);
  const now = state ? currentMonthsOut(state) : 12;

  if (loading || !state) {
    return <div className="pt-10 text-center text-ink-300">Loading…</div>;
  }

  const totalDone = state ? CHECKLIST.filter((i) => i.isDone(state)).length : 0;
  const totalPossible = CHECKLIST.length;
  const pct = totalPossible ? Math.round((totalDone / totalPossible) * 100) : 0;

  return (
    <div className="flex flex-col gap-12 pb-12">
      {/* Header */}
      <header>
        <p className="text-[10px] uppercase tracking-[0.26em] text-sage-500 font-mono mb-2">
          The plan
        </p>
        <div className="flex items-baseline justify-between gap-6 flex-wrap">
          <h1 className="display text-[36px] sm:text-[44px] lg:text-[52px] leading-[1.02] tracking-[-0.01em]">
            Twelve months,{" "}
            <span className="text-sage-500 italic">in order</span>.
          </h1>
          <div className="text-right">
            <div className="display text-[40px] tabular-nums leading-none">
              {totalDone}<span className="text-ink-300">/{totalPossible}</span>
            </div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-ink-300 font-mono mt-1">
              done
            </div>
          </div>
        </div>
        <p className="text-[14px] text-ink-300 mt-4 leading-relaxed max-w-[60ch]">
          Each item auto-checks itself when the signal lands —{" "}
          <span className="italic">venue contracted</span>,{" "}
          <span className="italic">RSVPs in</span>,{" "}
          <span className="italic">license filed</span>. Don't tick boxes; just live your life.
        </p>

        {/* Overall progress bar */}
        <div className="mt-6 h-[3px] bg-ink/8 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-sage-500 via-sage-400 to-sage-300 transition-[width] duration-1000"
            style={{ width: `${pct}%` }}
            aria-hidden
          />
        </div>
      </header>

      {/* Groups */}
      <div className="flex flex-col gap-10">
        {groups.map(({ monthsOut, items }) => {
          const isCurrent = inWindow(now, monthsOut);
          const isPast = monthsOut > now;
          const label = monthsOutLabel(monthsOut);
          const tagline = items[0]?.area;

          return (
            <Reveal key={monthsOut}>
              <section
                className={`relative rounded-card border hairline px-6 py-5 transition-colors ${
                  isCurrent ? "bg-sage-50/60 border-sage-300/40" : "bg-white/55"
                }`}
              >
                <div className="flex items-baseline justify-between gap-4 mb-4">
                  <div className="flex items-baseline gap-3">
                    <span className={`text-[10px] uppercase tracking-[0.24em] font-mono ${
                      isCurrent ? "text-sage-500" : "text-ink-300"
                    }`}>
                      {label}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] uppercase tracking-[0.18em] text-sage-500 font-medium">
                        you are here
                      </span>
                    )}
                  </div>
                  {tagline && (
                    <span className="display italic text-[16px] text-ink-300 hidden sm:block">
                      {tagline}
                    </span>
                  )}
                </div>

                <ul className="grid sm:grid-cols-2 gap-2.5">
                  {items.map((item) => {
                    const done = item.isDone(state);
                    const overdue = isPast && !done && monthsOut >= 0;
                    return (
                      <li key={item.id}>
                        <ChecklistRow item={item} done={done} overdue={overdue} />
                      </li>
                    );
                  })}
                </ul>
              </section>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}

function ChecklistRow({
  item, done, overdue,
}: {
  item: ChecklistItem;
  done: boolean;
  overdue: boolean;
}) {
  const inner = (
    <div
      className={`group flex items-start gap-3 rounded-xl px-4 py-3 transition-all ${
        done ? "bg-white/60"
          : overdue ? "bg-risk-medium/5 border border-risk-medium/30"
          : "bg-white/85 hover:bg-white border hairline hover:border-ink/20"
      }`}
    >
      {/* Checkbox glyph */}
      <span
        className={`shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full mt-0.5 transition-all ${
          done
            ? "bg-sage-500 text-paper-50"
            : overdue
            ? "border border-risk-medium/60 bg-risk-medium/10"
            : "border border-ink/20 bg-paper"
        }`}
        aria-hidden
      >
        {done && (
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 5.8 L4.5 8 L9 3" />
          </svg>
        )}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <h3
            className={`display text-[17px] leading-tight ${
              done ? "text-ink-300 line-through decoration-ink-200" :
              overdue ? "text-risk-medium" : "text-ink"
            } group-hover:text-sage-500 transition-colors`}
          >
            {item.title}
          </h3>
          {overdue && (
            <span className="text-[10px] uppercase tracking-[0.2em] text-risk-medium shrink-0 font-mono">
              Overdue
            </span>
          )}
        </div>
        <p className={`text-[12.5px] leading-snug mt-0.5 ${
          done ? "text-ink-300" : "text-ink-400"
        }`}>
          {item.detail}
        </p>
      </div>
    </div>
  );

  return item.href ? <Link href={item.href} className="block">{inner}</Link> : inner;
}

// "12 MONTHS OUT" / "ONE MONTH OUT" / "DAY OF" / "AFTER"
function monthsOutLabel(m: number): string {
  if (m < 0) return "After";
  if (m === 0) return "Day of";
  if (m === 1) return "One month out";
  return `${m} months out`;
}

// True if current monthsOut lands within +-1 of this group (so the "current
// window" highlight covers the user's immediate horizon, not just the exact
// month).
function inWindow(now: number, group: number): boolean {
  if (group < 0) return now < 0;
  return Math.abs(now - group) <= 1 && group >= 0;
}
