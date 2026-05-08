"use client";

// PhaseStrip — horizontal planning timeline with sage gradient fill.
//
// Reads ProjectState and infers the current phase from concrete signals
// (brief locked, contracts signed, days remaining, day-of mode). The strip
// shows seven phases as labelled nodes connected by a hairline that fills
// with sage up to the active node.

import type { ProjectState } from "@/lib/types";

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

export function PhaseStrip({ state }: { state: ProjectState }) {
  const active = inferPhaseIndex(state);
  // sage gradient progress as a percent of the strip width
  const progressPct = Math.min(100, Math.max(0, (active / (PHASES.length - 1)) * 100));

  return (
    <section aria-label="Planning phase" className="py-7 border-y hairline relative">
      <div className="text-[10px] uppercase tracking-[0.26em] text-sage-500 font-mono mb-4">
        Where you are
      </div>

      <div className="relative">
        {/* Connecting rail behind the dots */}
        <div className="absolute left-0 right-0 top-[6px] h-px bg-ink/8" aria-hidden />
        <div
          className="absolute left-0 top-[6px] h-px bg-gradient-to-r from-sage-500 via-sage-400 to-sage-300 transition-[width] duration-700"
          style={{ width: `${progressPct}%` }}
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
                    status === "current" ? "bg-sage-500" :
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
                  <div className={`text-[11.5px] uppercase tracking-[0.18em] font-medium ${
                    status === "current" ? "text-ink" :
                    status === "done"    ? "text-ink-300" :
                    "text-ink-200"
                  }`}>
                    {p.label}
                  </div>
                  <div className={`text-[11px] mt-0.5 leading-snug hidden sm:block ${
                    status === "next" ? "text-ink-200" : "text-ink-300"
                  }`}>
                    {p.tagline}
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
