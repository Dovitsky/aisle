"use client";

// PhaseStrip. single, clear "where you are" indicator.
//
// Shows three things at once in a compact band:
//   1. The current phase, named clearly with its tagline.
//   2. A countdown to the wedding day.
//   3. The 8-phase rail with the current node lit, so the couple can see
//      the whole arc at a glance.
//
// This replaces the previous double-up where the home page rendered both
// this strip AND a separate "Phase X of 8" bar inside the decisions card.

import type { ProjectState } from "@/lib/types";
import { laneProgress } from "@/lib/lanes";

const PHASES: { key: string; label: string; tagline: string }[] = [
  { key: "intake",     label: "Intake",     tagline: "Tell us about it" },
  { key: "foundation", label: "Foundation", tagline: "Venue + date" },
  { key: "discovery",  label: "Discovery",  tagline: "The key team" },
  { key: "design",     label: "Design",     tagline: "Mood + florals" },
  { key: "logistics",  label: "Logistics",  tagline: "Rooms, rides, rentals" },
  { key: "paperwork",  label: "Paperwork",  tagline: "Contracts + license" },
  { key: "day-of",     label: "Day-of",     tagline: "It's happening" },
  { key: "after",      label: "After",      tagline: "Thank-yous, registry" },
];

function inferPhaseIndex(state: ProjectState): number {
  if (!state.brief) return 0;
  if (!state.brief.locked) return 0;
  if (state.dayOfMode) return 6;

  const contractedCount = state.vendors.filter((v) => v.status === "contracted" || v.status === "paid").length;
  const venueLocked = state.vendors.some((v) => v.category === "Venue" && (v.status === "contracted" || v.status === "paid"));
  const photogLocked = state.vendors.some((v) => v.category === "Photographer" && (v.status === "contracted" || v.status === "paid"));
  const licenseFiled = !!state.license?.filedAt;

  // Days until
  const m = state.brief.dateWindow.match(/(\d{4})-(\d{2})-(\d{2})/);
  const dateMs = m ? new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00`).getTime() : NaN;
  const days = Number.isFinite(dateMs) ? Math.round((dateMs - Date.now()) / (1000 * 60 * 60 * 24)) : null;

  if (days !== null && days < 0)        return 7; // After
  if (days !== null && days <= 7)        return 6; // Day-of week
  if (licenseFiled || contractedCount >= 5) return 5; // Paperwork
  if (contractedCount >= 3)             return 4; // Logistics
  if (venueLocked && photogLocked)      return 3; // Design
  if (venueLocked)                      return 2; // Discovery
  return 1; // Foundation
}

function daysUntil(state: ProjectState): number | null {
  if (!state.brief?.dateWindow) return null;
  const m = state.brief.dateWindow.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const ms = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00`).getTime();
  if (!Number.isFinite(ms)) return null;
  return Math.round((ms - Date.now()) / (1000 * 60 * 60 * 24));
}

export function PhaseStrip({ state }: { state: ProjectState }) {
  const active = inferPhaseIndex(state);
  const days = daysUntil(state);
  const current = PHASES[active];

  // Reuse the lanes module's notion of "lanes sealed" so the count is
  // consistent with everything else (decisions queue, AmbientTicker).
  const lanes = laneProgress(state, 0);
  const sealed = lanes.completed.length;

  // Format the countdown copy. Crisp, no jargon.
  const countdown =
    days === null ? null
      : days < 0  ? `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago`
      : days === 0 ? "Today"
      : days === 1 ? "Tomorrow"
      : days <= 7 ? `${days} days to go`
      : days <= 30 ? `${days} days to go`
      : days <= 365 ? `${Math.round(days / 7)} weeks to go`
      : `${Math.round(days / 30)} months to go`;

  return (
    <section
      aria-label="Where you are in planning"
      className="py-7 border-y hairline relative"
    >
      {/* Top row. eyebrow on the left, countdown chip on the right */}
      <div className="flex items-baseline justify-between gap-4 mb-3 flex-wrap">
        <p className="text-[10px] uppercase tracking-[0.28em] text-sage-500 font-mono">
          Where you are
        </p>
        {countdown && (
          <p className="text-[10.5px] uppercase tracking-[0.22em] font-mono text-ink-300">
            <span className="text-ink">{countdown}</span>
            <span className="text-ink-200 mx-1.5">·</span>
            <span>
              {sealed} of {PHASES.length} {sealed === 1 ? "phase" : "phases"} sealed
            </span>
          </p>
        )}
      </div>

      {/* Big current-phase callout */}
      <div className="flex items-baseline gap-3 mb-5">
        <span className="text-[11px] uppercase tracking-[0.24em] font-mono text-ink-300 tabular-nums">
          {String(active + 1).padStart(2, "0")} / {String(PHASES.length).padStart(2, "0")}
        </span>
        <h2 className="display text-[26px] lg:text-[30px] leading-[1.05] tracking-[-0.005em]">
          <span>{current.label}</span>
          <span className="display italic text-ink-300 ml-2.5 text-[20px] lg:text-[22px]">
           . {current.tagline.toLowerCase()}
          </span>
        </h2>
      </div>

      {/* Phase rail. dots + connecting line, all 8 phases visible at once */}
      <div className="relative">
        {/* Connecting rail behind the dots */}
        <div className="absolute left-0 right-0 top-[6px] h-px bg-ink/8" aria-hidden />
        <div
          className="absolute left-0 top-[6px] h-px bg-gradient-to-r from-sage-500 via-sage-400 to-sage-300 transition-[width] duration-700"
          style={{
            width: `${Math.min(100, Math.max(0, (active / (PHASES.length - 1)) * 100))}%`,
          }}
          aria-hidden
        />

        {/* Phase nodes */}
        <ol className="relative grid grid-cols-4 sm:grid-cols-8 gap-x-2">
          {PHASES.map((p, i) => {
            const status: "done" | "current" | "next" =
              i < active ? "done" : i === active ? "current" : "next";
            return (
              <li key={p.key} className="flex flex-col items-start">
                <span
                  className={`relative inline-block w-3 h-3 rounded-full -ml-[1px] -mt-[6px] transition-all ${
                    status === "current" ? "bg-sage-500 scale-125 shadow-[0_0_0_4px_rgba(168,181,160,0.18)]" :
                    status === "done"    ? "bg-sage-400" :
                    "bg-paper border border-ink/15"
                  }`}
                  aria-hidden
                >
                  {status === "current" && (
                    <span className="absolute inset-0 rounded-full bg-sage-500 animate-breathe" />
                  )}
                </span>
                <div className="mt-3">
                  <div className={`text-[11px] uppercase tracking-[0.16em] font-medium ${
                    status === "current" ? "text-ink" :
                    status === "done"    ? "text-ink-300" :
                    "text-ink-200"
                  }`}>
                    {p.label}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
