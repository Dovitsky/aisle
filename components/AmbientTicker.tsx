"use client";

// AmbientTicker. a quiet horizontal strip just below the editorial hero on
// the dashboard. Surfaces the most recent agent ledger entries (Scout
// shortlisting, Designer drafting, Treasurer allocating, etc.) and rotates
// through them with a gentle crossfade every six seconds. Keeps the page
// feeling alive between explicit cascades, without ever stealing focus.
//
// Design rules:
//   • Agents only. user-initiated ledger events stay out of the ambient
//     channel (those land as decision cards or activity-feed rows).
//   • Most-recent first; rotates through the last five agent entries.
//   • Hover or focus pauses the rotation so the user can read.
//   • prefers-reduced-motion freezes on the latest entry, no fade animation.
//   • Hidden entirely when no agent activity is on the ledger yet.
//
// State source: <StateProvider> already polls /api/state in the background
// after lock and pivot moments, so this component just reads state.ledger
// and re-renders when it changes. No extra polling on its own.

import { useEffect, useMemo, useRef, useState } from "react";
import { pickAmbient } from "@/lib/ambient";
import { useProject } from "./StateProvider";
import { BreathingDot } from "./Atmosphere";

const ROTATE_MS = 6_000;

export function AmbientTicker() {
  const { state } = useProject();
  const [paused, setPaused] = useState(false);

  // Stable, sorted list of recent agent entries (most recent first).
  const items = useMemo(() => pickAmbient(state?.ledger ?? []), [state?.ledger]);

  const [index, setIndex] = useState(0);

  // When the ledger appends a fresh agent entry, snap to it (the new one is
  // at index 0 because we sort descending). This lets a just-fired specialist
  // surface immediately rather than waiting through the rotation.
  const lastTopId = useRef<string | null>(null);
  useEffect(() => {
    const top = items[0]?.id ?? null;
    if (top && top !== lastTopId.current) {
      lastTopId.current = top;
      setIndex(0);
    }
  }, [items]);

  // Rotation timer.
  useEffect(() => {
    if (items.length <= 1 || paused || prefersReducedMotion()) return;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, ROTATE_MS);
    return () => clearInterval(t);
  }, [items.length, paused]);

  if (items.length === 0) return null;
  const cur = items[Math.min(index, items.length - 1)];

  return (
    <div
      className="rounded-full border hairline glass px-4 py-1.5 inline-flex items-center gap-3 max-w-full"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      tabIndex={0}
      aria-live="polite"
      aria-atomic="true"
      title="Specialist activity"
    >
      <BreathingDot />
      <div className="flex items-baseline gap-2.5 min-w-0 flex-1">
        {cur.agent && (
          <span className="text-[10px] uppercase tracking-[0.22em] font-mono text-sage-500 shrink-0">
            {cur.agent}
          </span>
        )}
        <TickerLine key={cur.id} text={cur.summary} />
      </div>
      <span className="text-[10.5px] uppercase tracking-[0.18em] font-mono text-ink-300 shrink-0 tabular-nums">
        {timeAgo(cur.at)}
      </span>
      {items.length > 1 && (
        <span
          className="text-[10px] font-mono text-ink-200 tabular-nums shrink-0"
          aria-hidden
        >
          {index + 1}/{items.length}
        </span>
      )}
    </div>
  );
}

function TickerLine({ text }: { text: string }) {
  return (
    <span
      key={text}
      className="display italic text-[14px] sm:text-[15px] text-ink-400 leading-snug truncate animate-ticker-fade"
    >
      {text}
    </span>
  );
}

function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const ms = Date.now() - t;
  const min = Math.round(ms / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.round(hr / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.round(d / 30);
  return `${mo}mo ago`;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
