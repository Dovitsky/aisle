"use client";

// Today — the home screen.
//
// Two states:
//  • No brief — full-bleed welcome with letter-reveal hero, animated ampersand,
//    floating sage orbs, and a single black CTA. Chat dock below as secondary.
//  • Brief locked — giant days-to-wedding number, names, decisions inline with
//    cursor-spotlight cards, recent activity trail.

import Link from "next/link";
import { useEffect, useState } from "react";
import { useProject } from "./StateProvider";
import { ApprovalCardView } from "./ApprovalCard";
import { PhaseStrip } from "./PhaseStrip";
import { StatGrid } from "./StatGrid";
import { BotanicalAccent } from "./BotanicalAccent";
import { StarterBriefs } from "./StarterBriefs";
import {
  CountUp, Reveal, LetterReveal, BreathingDot,
} from "./Atmosphere";
import { HeroAtmosphere } from "./HeroAtmosphere";

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
  if (!state.brief?.locked) return <Welcome />;

  const pending = state.approvals.filter((a) => a.status === "pending");
  const recent = state.approvals.filter((a) => a.status !== "pending").slice(-3).reverse();
  const days = countdownDays(state.brief.dateWindow);
  const topFlag = flags.find((f) => f.level === "critical") ?? flags.find((f) => f.level === "warn");

  return (
    <div className="flex flex-col gap-12 pb-24">
      {/* HERO */}
      <header className="relative pt-6 lg:pt-14 animate-slow-rise">
        {/* Decorative botanical accent — sits behind the hero on the right */}
        <BotanicalAccent
          className="hidden lg:block absolute -right-8 -top-2 opacity-60 pointer-events-none"
          width={320}
        />

        <p className="display italic text-ink-300 text-base lg:text-lg flex items-center gap-2.5 relative z-10">
          <BreathingDot />
          {greeting()}, {state.brief.organizerName}.
        </p>

        <h1 className="display text-[44px] sm:text-[60px] lg:text-[80px] mt-3 leading-[0.96] text-balance relative z-10">
          <span className="block">{state.brief.organizerName}</span>
          <span className="block text-ink-300 -mt-1">
            <span className="animate-amp inline-block text-sage-500 mr-3">&</span>
            {state.brief.partnerName}
          </span>
        </h1>

        <div className="mt-6 flex items-baseline gap-x-8 gap-y-3 flex-wrap relative z-10">
          <div className="text-[14px] text-ink-300 leading-relaxed flex items-baseline gap-x-3">
            <span>{prettyDate(state.brief.dateWindow)}</span>
            <span className="text-ink-200">·</span>
            <span>{state.brief.region}</span>
            <span className="text-ink-200">·</span>
            <span>{state.brief.guestCount} guests</span>
          </div>
        </div>

        {topFlag && (
          <div className="mt-7 inline-flex items-center gap-2 text-[12.5px] text-ink-400 leading-relaxed glass border hairline rounded-full px-3.5 py-1.5 relative z-10">
            <span
              className={`inline-block w-1.5 h-1.5 rounded-full ${
                topFlag.level === "critical" ? "bg-risk-high" : "bg-sage-400"
              }`}
              aria-hidden
            />
            {topFlag.message}
          </div>
        )}
      </header>

      {/* PHASE STRIP — where you are in the journey */}
      <Reveal>
        <PhaseStrip state={state} />
      </Reveal>

      {/* STAT GRID — four big number moments */}
      <Reveal>
        <StatGrid state={state} />
      </Reveal>

      {/* (Countdown is now part of StatGrid as the first cell.) */}

      {/* DECISIONS — the heart of the home screen */}
      {pending.length > 0 ? (
        <Reveal>
          <section>
            <div className="flex items-baseline justify-between mb-5">
              <h2 className="display text-[26px] lg:text-3xl">
                {pending.length === 1 ? (
                  <>One decision waits for you</>
                ) : (
                  <>
                    <CountUp value={pending.length} /> decisions wait for you
                  </>
                )}
              </h2>
              {pending.length > 4 && (
                <Link
                  href="/approvals"
                  className="text-[11px] uppercase tracking-[0.18em] text-ink-300 hover:text-ink transition-colors"
                >
                  See all
                </Link>
              )}
            </div>
            <div className="grid sm:grid-cols-2 gap-4 stagger">
              {pending.slice(0, 4).map((c) => (
                <ApprovalCardView key={c.id} card={c} />
              ))}
            </div>
          </section>
        </Reveal>
      ) : (
        <Reveal>
          <div className="rounded-card border hairline glass px-7 py-12 text-center max-w-xl">
            <p className="display text-2xl text-ink leading-tight">All quiet.</p>
            <p className="text-[14px] text-ink-300 mt-3 leading-relaxed">
              Specialist work happens in the background. When something needs you, it'll appear here.
            </p>
          </div>
        </Reveal>
      )}

      {/* RECENTLY */}
      {recent.length > 0 && (
        <Reveal>
          <section>
            <h2 className="display italic text-base text-ink-300 mb-3">Recently</h2>
            <ul className="flex flex-col">
              {recent.map((c, i) => (
                <li
                  key={c.id}
                  className={`py-3.5 flex items-baseline justify-between gap-4 ${
                    i < recent.length - 1 ? "border-b hairline" : ""
                  }`}
                >
                  <span className="text-[14px] text-ink truncate">{c.title}</span>
                  <span
                    className={`text-[10.5px] uppercase tracking-[0.18em] shrink-0 ${
                      c.status === "approved" ? "text-sage-500"
                        : c.status === "rejected" ? "text-risk-high"
                        : "text-ink-300"
                    }`}
                  >
                    {c.status === "approved" ? "Done" : c.status === "rejected" ? "Passed" : "Edited"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </Reveal>
      )}
    </div>
  );
}

// --------------------------------------------------------------------
// Welcome — full-bleed, letter-reveal headline, animated ampersand orbs.
// --------------------------------------------------------------------

function Welcome() {
  return (
    <div className="flex flex-col pb-28">
      {/* HERO ZONE — editorial photo stack lives inside, bounded to this area */}
      <section className="relative flex flex-col min-h-[calc(100vh-10rem)] lg:min-h-[calc(100vh-6rem)]">
        {/* Editorial photo stack — sits behind the hero on the right (lg+) */}
        <HeroAtmosphere />

      {/* Top meta row */}
      <div className="flex items-center justify-between pt-2 lg:pt-4 animate-fade-in relative z-10">
        <p className="eyebrow flex items-center gap-2.5 text-[10.5px]">
          <BreathingDot />
          aisle
        </p>
        <p className="text-[10px] uppercase tracking-[0.28em] text-ink-300 hidden sm:block">
          The autonomous wedding
        </p>
      </div>

      {/* Spacer to anchor the hero */}
      <div className="flex-1 min-h-[8vh]" />

      {/* Hero — manifesto layout */}
      <h1
        className="relative z-10 leading-[0.92] tracking-[-0.015em]"
        style={{
          fontFamily: '"Cormorant", "Cormorant Garamond", Georgia, serif',
          fontWeight: 300,
          fontFeatureSettings: '"liga", "dlig", "kern"',
        }}
      >
        <span
          className="block text-ink"
          style={{ fontSize: "clamp(44px, 8vw, 96px)" }}
        >
          <LetterReveal text="Plan nothing" />
          <span className="text-sage-500">.</span>
        </span>
        <span
          className="block italic text-sage-500 mt-0.5"
          style={{
            fontSize: "clamp(34px, 6.4vw, 78px)",
            fontWeight: 300,
            paddingLeft: "0.4em",
          }}
        >
          <LetterReveal text="Decide everything" step={1.2} />
          <span className="text-ink">.</span>
        </span>
      </h1>

      {/* Animated sage rule + manifesto lines */}
      <div
        className="mt-10 lg:mt-14 animate-fade-in relative z-10"
        style={{ animationDelay: "1.2s", animationFillMode: "both" }}
      >
        <div
          className="h-px bg-gradient-to-r from-sage-400 via-sage-300 to-transparent origin-left"
          style={{
            animation: "rule-grow 1100ms cubic-bezier(0.2,0.7,0.2,1) 1.0s both",
            maxWidth: "240px",
          }}
        />
        <ul className="mt-7 grid sm:grid-cols-3 gap-x-10 gap-y-3 max-w-[680px]">
          {[
            "We find the venue.",
            "We draft the emails.",
            "We bring you the answers.",
          ].map((line, i) => (
            <li
              key={i}
              className="text-[14.5px] lg:text-[15px] text-ink-400 leading-relaxed animate-fade-in"
              style={{ animationDelay: `${1.3 + i * 0.12}s`, animationFillMode: "both" }}
            >
              {line}
            </li>
          ))}
        </ul>
      </div>

      {/* CTA row */}
      <div
        className="mt-12 lg:mt-16 flex items-center gap-5 animate-fade-in relative z-10"
        style={{ animationDelay: "1.8s", animationFillMode: "both" }}
      >
        <Link href="/brief" className="btn-primary group">
          Begin
          <span className="ml-2 inline-block transition-transform group-hover:translate-x-1" aria-hidden>
            →
          </span>
        </Link>
        <span className="text-[11px] uppercase tracking-[0.24em] text-ink-300">
          or talk to us first
        </span>
      </div>
      </section>

      <StarterBriefs />
    </div>
  );
}

// --------------------------------------------------------------------
// Skeleton
// --------------------------------------------------------------------
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

// --------------------------------------------------------------------
function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Late evening";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function prettyDate(window: string): string {
  return window;
}

function countdownDays(window: string): number | null {
  const m = window.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const target = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ms = target.getTime() - today.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}
