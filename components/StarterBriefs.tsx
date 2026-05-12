"use client";

// StarterBriefs. six taste-level templates shown on the Welcome screen.
// One click loads the template into state, posts an opening chat from
// Maestro asking for names, and the user lands on the locked-brief flow
// without ever filling out the form.

import { useState } from "react";
import { useProject } from "./StateProvider";
import { useToast } from "./Toast";
import { STARTER_BRIEFS } from "@/lib/starterBriefs";
import type { ProjectState } from "@/lib/types";

export function StarterBriefs() {
  const { setState, setChatOpen } = useProject();
  const { notify } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const apply = async (id: string) => {
    setBusy(id);
    setError(null);
    try {
      const r = await fetch("/api/starter-brief", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const j = (await r.json()) as { state?: ProjectState; error?: string };
      if (j.error) {
        setError(j.error);
        return;
      }
      if (j.state) {
        setState(j.state);
        const tpl = STARTER_BRIEFS.find((s) => s.id === id);
        notify({
          kind: "agent",
          agent: "Maestro",
          title: tpl ? `Starting from ${tpl.title}` : "Starter loaded",
          detail: "Tell me your names and we're off.",
          duration: 5000,
        });
        // Open the ChatDock so the user immediately sees Maestro's first
        // question. without this, the brief loads but the user lands back
        // on the Welcome screen with no visible next step.
        setTimeout(() => setChatOpen(true), 350);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="mt-20 lg:mt-24 relative z-10">
      <div className="flex items-baseline justify-between mb-6">
        <h2 className="display italic text-[22px] lg:text-[26px] text-ink leading-tight">
          Or start from{" "}
          <span className="text-sage-500">a taste</span>.
        </h2>
        <p className="text-[10px] uppercase tracking-[0.24em] text-ink-300 font-mono hidden sm:block">
          Six presets · pick one to skip the cold start
        </p>
      </div>

      {error && <p className="text-sm text-risk-high mb-4">{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6">
        {STARTER_BRIEFS.map((s) => (
          <button
            key={s.id}
            onClick={() => apply(s.id)}
            disabled={!!busy}
            className="brief-card group text-left relative overflow-hidden rounded-card border hairline bg-paper-50 disabled:opacity-50"
          >
            {/* Hero image. the main visual identity */}
            <div className="relative aspect-[4/3] overflow-hidden bg-paper-200">
              {/* Tinted accent wash. visible during image load, also peeks through edges */}
              <div
                className="absolute inset-0 transition-opacity duration-700 group-hover:opacity-0"
                style={{
                  background: `linear-gradient(135deg, ${s.accent}33, ${s.accent}11 60%, transparent)`,
                }}
                aria-hidden
              />

              {/* The photograph */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.image}
                alt=""
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-[1.06] will-change-transform"
                style={{ objectPosition: s.imagePosition ?? "center" }}
              />

              {/* Top vignette. keeps the eyebrow readable on light photos */}
              <div
                className="absolute inset-x-0 top-0 h-20 pointer-events-none opacity-70 group-hover:opacity-50 transition-opacity duration-700"
                style={{
                  background: "linear-gradient(180deg, rgba(14,14,12,0.28), transparent)",
                }}
                aria-hidden
              />

              {/* Bottom fade INTO the paper panel. makes the seam feel deliberate */}
              <div
                className="absolute inset-x-0 bottom-0 h-16 pointer-events-none"
                style={{
                  background: "linear-gradient(180deg, transparent, #FAFAF7)",
                }}
                aria-hidden
              />

              {/* Eyebrow on photograph */}
              <div
                className="absolute top-4 left-5 right-5 flex items-center justify-between text-[10px] uppercase tracking-[0.28em] font-mono text-paper-50"
                style={{
                  textShadow:
                    "0 1px 2px rgba(14,14,12,0.55), 0 0 12px rgba(14,14,12,0.25)",
                }}
              >
                <span>{s.region}</span>
              </div>
            </div>

            {/* Text panel below image */}
            <div className="px-6 pt-5 pb-6 relative">
              <div className="display text-[22px] lg:text-[24px] leading-tight tracking-[-0.005em]">
                {s.title}
              </div>
              <p className="text-[13px] text-ink-300 mt-2 leading-relaxed line-clamp-2">
                {s.blurb}
              </p>
              <div className="mt-4 flex items-baseline gap-x-3 gap-y-1 flex-wrap text-[11px] text-ink-300 font-mono">
                <span>{s.brief.guestCount} guests</span>
                <span className="text-ink-200">·</span>
                <span className="italic">from ${(s.brief.budgetUsd / 1000).toFixed(0)}k</span>
                <span className="text-ink-200">·</span>
                <span>{s.brief.dateWindow}</span>
              </div>

              <div className="mt-5 flex items-center justify-between">
                <span className="text-[13px] text-ink group-hover:text-sage-500 transition-colors duration-500">
                  {busy === s.id ? "Loading…" : "Start this story"}
                </span>
                <span
                  className="text-[14px] text-ink-300 group-hover:text-sage-500 transition-all duration-500 group-hover:translate-x-1"
                  aria-hidden
                >
                  →
                </span>
              </div>
            </div>

            {/* Sage glow ring on hover */}
            <div
              className="pointer-events-none absolute inset-0 rounded-card opacity-0 group-hover:opacity-100 transition-opacity duration-700"
              style={{
                boxShadow: "0 0 0 1px rgba(168,181,160,0.45), 0 30px 60px -28px rgba(79,93,68,0.35), 0 14px 36px -18px rgba(14,14,12,0.18)",
              }}
              aria-hidden
            />
          </button>
        ))}
      </div>
    </section>
  );
}
