"use client";

// PickedForYou — a small ribbon that surfaces the reasoning behind
// specialist recommendations. Lives on Florals / Cake / Bar / Music /
// any module where the AI picked something based on accumulated state.
//
// The point is to make AISLE's intelligence VISIBLE: not "here's a
// generic cake suggestion" but "we picked this for October in the
// Hudson Valley · candlelit editorial palette · 120 guests, because
// we already know all of that about you." It earns the user's trust
// by showing its work.

import { useMemo } from "react";
import { useProject } from "./StateProvider";
import { weddingContext } from "@/lib/agents/context";

interface PickedForYouProps {
  /** Optional override line. When omitted, derived from current state. */
  reasoning?: string;
  /** Tone of the ribbon. */
  tone?: "sage" | "ink";
}

export function PickedForYou({ reasoning, tone = "sage" }: PickedForYouProps) {
  const { state } = useProject();
  const derived = useMemo(() => {
    if (reasoning) return reasoning;
    if (!state) return null;
    const ctx = weddingContext(state);
    return ctx?.reasoning ?? null;
  }, [reasoning, state]);

  if (!derived) return null;

  const wrap =
    tone === "ink"
      ? "border-ink/15 bg-ink/[0.02] text-ink-300"
      : "border-sage-300/40 bg-sage-50 text-sage-deep";

  return (
    <div
      className={`inline-flex items-center gap-2.5 rounded-full border px-3.5 py-1.5 text-[11px] uppercase tracking-[0.18em] font-mono ${wrap}`}
    >
      <span
        className="inline-block w-1.5 h-1.5 rounded-full bg-sage-500 animate-pulse-soft shrink-0"
        aria-hidden
      />
      <span className="font-semibold tracking-[0.2em]">Picked for you</span>
      <span className="text-ink-300 normal-case tracking-normal font-sans not-italic">
        {derived}
      </span>
    </div>
  );
}
