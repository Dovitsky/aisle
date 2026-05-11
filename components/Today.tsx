"use client";

// Today. the home screen.
//
// Two completely different states:
//  • No brief locked yet. the editorial Welcome — Landing for a fresh
//    visitor, or ContinuingDraft when a starter brief is mid-fill.
//  • Brief locked. the CommandCenter post-lock surface.
//
// Everything dashboard-shaped lives in `CommandCenter.tsx`. This file is
// just the routing shell + the two pre-lock surfaces.

import Link from "next/link";
import { useEffect, useState } from "react";
import { useProject } from "./StateProvider";
import { Landing } from "./Landing";
import { CommandCenter } from "./CommandCenter";
import { BreathingDot } from "./Atmosphere";
import type { ProjectState } from "@/lib/types";

interface WatcherFlag {
  level: "info" | "warn" | "critical";
  topic: string;
  message: string;
  module: string;
}

export function Today() {
  const { state, loading } = useProject();
  const [flags, setFlags] = useState<WatcherFlag[]>([]);

  useEffect(() => {
    void fetch("/api/watcher").then((r) => r.json()).then((j) => setFlags(j.flags ?? []));
  }, [
    state?.brief?.locked, state?.approvals.length,
    state?.budget.length, state?.guests.length, state?.dayOf.length,
  ]);

  if (loading || !state) return <PageSkeleton />;
  if (!state.brief?.locked) return <Welcome state={state} />;

  return <CommandCenter state={state} flags={flags} />;
}

// ===================================================================
// PRE-LOCK WELCOME. full-bleed editorial; sample briefs; chat as secondary
// ===================================================================

function Welcome({ state }: { state: ProjectState }) {
  // If the user has loaded a starter brief but hasn't locked it yet, show a
  // softer "continuing your story" surface that nudges them into the chat,
  // not the full hero. Otherwise the new editorial Landing.
  const partialBrief = !!state.brief && !state.brief.locked;

  if (partialBrief) {
    return <ContinuingDraft state={state} />;
  }

  return <Landing />;
}

// ---------- Continuing-your-draft (soft handoff into the chat) ----------

function ContinuingDraft({ state }: { state: ProjectState }) {
  const brief = state.brief!;

  // The chat IS the experience on this surface. the page is just a thin
  // status header so the conversation has room to breathe. No autoOpen
  // either; the dock is already open from the landing submit, and nothing
  // we render here should compete with it for the user's attention.

  const year = brief.dateWindow.match(/(\d{4})/)?.[0] ?? null;

  // Compact horizontal progress. one row of filled / unfilled chips that
  // updates as Maestro extracts more from the conversation. Replaces the
  // big two-column grid that used to dominate the bottom of the page.
  const fieldKeys = [
    { key: "organizerName" as const, label: "You" },
    { key: "partnerName"  as const, label: "Partner" },
    { key: "dateWindow"   as const, label: "Date" },
    { key: "region"       as const, label: "Place" },
    { key: "guestCount"   as const, label: "Guests" },
    { key: "budgetUsd"    as const, label: "Budget" },
    { key: "vibe"         as const, label: "Vibe" },
  ];
  const filledCount = fieldKeys.filter(({ key }) => {
    const v = brief[key];
    return v !== undefined && v !== "" && v !== 0;
  }).length;

  return (
    <div
      className="flex flex-col items-center justify-start animate-fade-in-soft pt-10 lg:pt-16"
      style={{
        // Sit ABOVE where the chat dock lands so the dock never visually
        // collides with this page. 320px reserves for an expanded dock
        // (~280px on a short conversation) plus a small gap.
        minHeight: "calc(100vh - 320px)",
        maxWidth: 720,
        margin: "0 auto",
      }}
    >
      <p className="text-[10.5px] uppercase tracking-[0.28em] text-sage-500 font-mono flex items-center gap-2.5 mb-5">
        <BreathingDot />
        we&apos;re building your brief
      </p>

      {/* Compact headline. bounded type, never wraps awkwardly. */}
      <h1 className="display text-center text-[28px] sm:text-[34px] lg:text-[40px] leading-[1.1] tracking-[-0.01em] text-balance max-w-[640px]">
        {year && brief.region ? (
          <>{year} in {brief.region}.</>
        ) : year ? (
          <>{year}. Tell me where.</>
        ) : brief.region ? (
          <>{brief.region}. Tell me when.</>
        ) : (
          <>Tell me a little more.</>
        )}
      </h1>

      {/* Tight one-line meta */}
      {(brief.guestCount > 0 || brief.budgetUsd > 0 || brief.vibe) && (
        <p className="text-[13.5px] text-ink-300 leading-relaxed mt-4 text-center max-w-[520px]">
          {brief.guestCount > 0 && <>{brief.guestCount} guests · </>}
          {brief.budgetUsd > 0 && <>${(brief.budgetUsd / 1000).toFixed(0)}k · </>}
          <span className="italic">{brief.vibe || ""}</span>
        </p>
      )}

      {/* Horizontal progress chips. quiet, dense, gives glanceable status
          without claiming vertical real estate the chat dock will need. */}
      <div className="mt-10 flex items-center justify-center gap-1.5 flex-wrap max-w-[640px]">
        {fieldKeys.map(({ key, label }) => {
          const v = brief[key];
          const filled = v !== undefined && v !== "" && v !== 0;
          const display = !filled ? null
            : typeof v === "number"
              ? (key === "budgetUsd" ? `$${(v / 1000).toFixed(0)}k` : String(v))
              : String(v).slice(0, 24);
          return (
            <span
              key={key}
              className={`inline-flex items-baseline gap-1.5 rounded-full px-3 py-1 text-[11.5px] transition-colors ${
                filled
                  ? "bg-sage-50 text-sage-500 border border-sage-300/40"
                  : "bg-paper-100 text-ink-300 border hairline"
              }`}
            >
              <span className="uppercase tracking-[0.16em] font-mono text-[10px]">
                {label}
              </span>
              {filled && display && (
                <span className="italic">{display}</span>
              )}
            </span>
          );
        })}
      </div>

      {/* Progress bar. actual visual indicator, not a text caption */}
      <div className="mt-7 w-full max-w-[440px]">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-[10px] uppercase tracking-[0.22em] font-mono text-ink-300 tabular-nums">
            {filledCount} of {fieldKeys.length}
          </span>
          <span className="text-[10px] uppercase tracking-[0.22em] font-mono text-sage-500 inline-flex items-center gap-1.5">
            Keep going
            <span aria-hidden>↓</span>
          </span>
        </div>
        <div className="h-[3px] rounded-full bg-ink/8 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-sage-500 via-sage-400 to-sage-300 transition-[width] duration-700"
            style={{
              width: `${Math.round((filledCount / fieldKeys.length) * 100)}%`,
            }}
            aria-hidden
          />
        </div>
      </div>

      {/* Real CTA. bordered pill, not a buried link */}
      <div className="mt-10 flex items-center gap-3 flex-wrap justify-center">
        <Link
          href="/dossier"
          className="inline-flex items-center gap-2 rounded-full border hairline bg-white/80 hover:bg-white hover:border-ink/30 px-5 py-2.5 text-[12px] uppercase tracking-[0.22em] font-medium text-ink transition-all"
        >
          Or fill the form yourself
          <span aria-hidden>→</span>
        </Link>
      </div>
    </div>
  );
}

// ===================================================================
// SKELETON
// ===================================================================
function PageSkeleton() {
  return (
    <div className="space-y-6 pt-12 animate-fade-in-soft">
      <div className="h-3 w-12 rounded-full bg-ink/8 animate-pulse-soft" />
      <div className="h-14 w-[60%] rounded-md bg-ink/8 animate-pulse-soft" />
      <div className="h-4 w-72 rounded-md bg-ink/8 animate-pulse-soft" />
      <div className="grid sm:grid-cols-2 gap-3 mt-12">
        {[0, 1].map((i) => (
          <div key={i} className="h-44 rounded-card bg-ink/5 animate-pulse-soft" />
        ))}
      </div>
    </div>
  );
}
