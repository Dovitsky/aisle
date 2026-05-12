"use client";

// CommandCenter. the post-lock dashboard.
//
// This is the screen the couple lands on every morning. It is the calm
// sequence — three sections, top to bottom, with everything else
// living on its own module:
//
//   1. Where am I in the wedding?       → BriefStrip (editorial hero)
//   2. What is the ONE thing right now? → RightNow / NoDecisionsRightNow
//                                          + a Watcher heads-up block
//                                          if any flags are warn/critical
//   3. What should I do this phase?     → RecommendedForPhase
//
// Everything else — the rest of the pending approvals, vendor replies,
// at-a-glance stats — lives on the dedicated module surfaces. This
// page is deliberately not a dashboard buffet.

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ApprovalCard, ProjectState } from "@/lib/types";
import { ApprovalCardView } from "./ApprovalCard";
import { Reveal, BreathingDot, CountUp } from "./Atmosphere";
import { useProject } from "./StateProvider";
import { regionHeroFallback } from "@/lib/regionHero";

interface WatcherFlag {
  level: "info" | "warn" | "critical";
  topic: string;
  message: string;
  module: string;
}

// =====================================================================
// PHASE LOGIC
// =====================================================================

type PhaseKey =
  | "foundation"
  | "discovery"
  | "design"
  | "logistics"
  | "paperwork"
  | "day-of"
  | "after";

const PHASE_LABEL: Record<PhaseKey, string> = {
  foundation: "Foundation",
  discovery: "Discovery",
  design: "Design",
  logistics: "Logistics",
  paperwork: "Paperwork",
  "day-of": "Day-of week",
  after: "After the wedding",
};

const PHASE_TAGLINE: Record<PhaseKey, string> = {
  foundation: "Venue, photographer, budget. the bones.",
  discovery: "Florist, caterer, music. the team.",
  design: "Mood, flowers, cake, bar. the look and the taste.",
  logistics: "Hotel block, shuttles, welcome bag, seating.",
  paperwork: "Contracts, license, deposits.",
  "day-of": "Timeline, contingencies, the playbook.",
  after: "Thank-yous, tips, payments closed out.",
};

function inferPhase(state: ProjectState): PhaseKey {
  const venueLocked = state.vendors.some(
    (v) =>
      v.category === "Venue" &&
      (v.status === "contracted" || v.status === "paid"),
  );
  const photogLocked = state.vendors.some(
    (v) =>
      v.category === "Photographer" &&
      (v.status === "contracted" || v.status === "paid"),
  );
  const contractedCount = state.vendors.filter(
    (v) => v.status === "contracted" || v.status === "paid",
  ).length;
  const licenseFiled = !!state.license?.filedAt;

  // Days until
  const m = state.brief?.dateWindow?.match(/(\d{4})-(\d{2})-(\d{2})/);
  const days = m
    ? Math.round(
        (new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00`).getTime() -
          Date.now()) /
          (1000 * 60 * 60 * 24),
      )
    : null;

  if (state.dayOfMode || (days !== null && days <= 7 && days >= 0)) {
    return "day-of";
  }
  if (days !== null && days < 0) return "after";
  if (licenseFiled || contractedCount >= 7) return "paperwork";
  if (contractedCount >= 4) return "logistics";
  if (venueLocked && photogLocked) return "design";
  if (venueLocked) return "discovery";
  return "foundation";
}

interface Recommendation {
  key: string;
  title: string;
  blurb: string;
  href: string;
  state: "open" | "in_progress" | "done";
}

function recommendForPhase(
  phase: PhaseKey,
  state: ProjectState,
): Recommendation[] {
  const has = (cat: string) =>
    state.vendors.some(
      (v) =>
        v.category === cat &&
        (v.status === "contracted" || v.status === "paid"),
    );
  const inProgress = (cat: string) =>
    state.vendors.some(
      (v) =>
        v.category === cat &&
        ["contacted", "quoting", "negotiating"].includes(v.status),
    );
  const stateFor = (cat: string): Recommendation["state"] =>
    has(cat) ? "done" : inProgress(cat) ? "in_progress" : "open";

  const budgetSet = state.budget.some((l) => l.planUsd > 0);
  const designLocked = state.designs.some(
    (d) => d.kind === "moodboard" && d.approved,
  );
  const florals = state.florals.length > 0;
  const cake = !!state.cake;
  const bar = !!state.bar;
  const stationery = state.stationery.length > 0;
  const hotelBlock = state.hotelBlocks.length > 0;
  const shuttles = state.shuttles.length > 0;
  const seatingHasTables = state.seating.tables.length > 0;
  const seatingFilled = Object.keys(state.seating.assignments).length > 0;
  const welcomeBag = state.welcomeBag.length > 0;
  const license = state.license;
  const dayOfTimeline = state.dayOf.length > 0;
  const contingencies = state.contingencies.length > 0;
  const thanksReady = state.thanks.length > 0;
  const tipsReady = state.tips.length > 0;

  switch (phase) {
    case "foundation":
      return [
        {
          key: "venue",
          title: "Lock the venue",
          blurb: "Everything downstream waits on this.",
          href: "/vendors",
          state: stateFor("Venue"),
        },
        {
          key: "photographer",
          title: "Lock the photographer",
          blurb: "Books out 9–12 months ahead.",
          href: "/vendors",
          state: stateFor("Photographer"),
        },
        {
          key: "budget",
          title: "Set the budget envelope",
          blurb: "We'll allocate across categories.",
          href: "/budget",
          state: budgetSet ? "in_progress" : "open",
        },
      ];
    case "discovery":
      return [
        {
          key: "caterer",
          title: "Find a caterer",
          blurb: "Pricing scales with guest count.",
          href: "/vendors",
          state: stateFor("Caterer"),
        },
        {
          key: "florist",
          title: "Find a florist",
          blurb: "Books out 6–9 months in season.",
          href: "/vendors",
          state: stateFor("Florist"),
        },
        {
          key: "music",
          title: "Find a band or DJ",
          blurb: "Sets the energy for dinner and after.",
          href: "/vendors",
          state: stateFor("Band") === "done" || stateFor("DJ") === "done"
            ? "done"
            : stateFor("Band") === "in_progress" ||
              stateFor("DJ") === "in_progress"
            ? "in_progress"
            : "open",
        },
        {
          key: "officiant",
          title: "Lock the officiant",
          blurb: "Especially if your traditions are blended.",
          href: "/vendors",
          state: stateFor("Officiant"),
        },
      ];
    case "design":
      return [
        {
          key: "mood",
          title: "Pick a mood direction",
          blurb: "Then everything else cascades. paper, flowers, cake.",
          href: "/design",
          state: designLocked ? "done" : "open",
        },
        {
          key: "florals",
          title: "Approve the flower plan",
          blurb: "Per-piece, per-vessel, real stems.",
          href: "/florals",
          state: florals ? "in_progress" : "open",
        },
        {
          key: "cake",
          title: "Pick a cake",
          blurb: "Tiers, flavors, fillings, frosting.",
          href: "/cake",
          state: cake ? "done" : "open",
        },
        {
          key: "bar",
          title: "Pick a bar plan",
          blurb: "Signatures named for each of you.",
          href: "/bar",
          state: bar ? "done" : "open",
        },
        {
          key: "paper",
          title: "Approve the paper suite",
          blurb: "Save-the-date, invitation, programs, menus.",
          href: "/stationery",
          state: stationery ? "in_progress" : "open",
        },
      ];
    case "logistics":
      return [
        {
          key: "hotel",
          title: "Reserve hotel rooms",
          blurb: "Out-of-town guests need 90+ days.",
          href: "/logistics",
          state: hotelBlock ? "in_progress" : "open",
        },
        {
          key: "shuttles",
          title: "Set up shuttles",
          blurb: "Hotel ↔ ceremony ↔ reception.",
          href: "/logistics",
          state: shuttles ? "done" : "open",
        },
        {
          key: "welcome",
          title: "Build the welcome bag",
          blurb: "Waiting in their room when they arrive.",
          href: "/logistics",
          state: welcomeBag ? "done" : "open",
        },
        {
          key: "seating",
          title: seatingFilled
            ? "Approve the seating chart"
            : seatingHasTables
            ? "Solve the seating chart"
            : "Build the seating chart",
          blurb: "We'll re-solve when you tell us what to fix.",
          href: "/seating",
          state: seatingFilled ? "in_progress" : "open",
        },
      ];
    case "paperwork":
      return [
        {
          key: "license",
          title: license?.filedAt
            ? "License filed"
            : license?.pickedUpAt
            ? "Walk the license to the officiant"
            : license?.applicationDate
            ? "Pick up the license"
            : license
            ? "Apply for the marriage license"
            : "Look up license requirements",
          blurb: "State and county determine the window.",
          href: "/license",
          state: license?.filedAt ? "done" : license ? "in_progress" : "open",
        },
        {
          key: "contracts",
          title: "Sign open contracts",
          blurb: "Counsel has reviewed each redline.",
          href: "/vendors",
          state: state.vendors.some((v) => v.status === "negotiating")
            ? "in_progress"
            : "open",
        },
        {
          key: "deposits",
          title: "Schedule deposits and balances",
          blurb: "Approve every payment one tap at a time.",
          href: "/budget",
          state: state.budget.some((l) => l.committedUsd > 0)
            ? "in_progress"
            : "open",
        },
      ];
    case "day-of":
      return [
        {
          key: "timeline",
          title: "Lock the day-of timeline",
          blurb: "Hair-and-makeup through last dance.",
          href: "/day-of",
          state: dayOfTimeline ? "in_progress" : "open",
        },
        {
          key: "playbook",
          title: "Add if-this-then-that plans",
          blurb: "Rain plan, vendor no-show, cake delay.",
          href: "/day-of",
          state: contingencies ? "done" : "open",
        },
        {
          key: "tips",
          title: "Prepare tip envelopes",
          blurb: "Cash, labeled, handed off the night-of.",
          href: "/tips",
          state: tipsReady ? "in_progress" : "open",
        },
      ];
    case "after":
      return [
        {
          key: "thanks",
          title: "Send thank-yous",
          blurb: "One per attendee. Drafts ready.",
          href: "/thanks",
          state: thanksReady ? "in_progress" : "open",
        },
        {
          key: "tips",
          title: "Close out tips",
          blurb: "Mark each envelope delivered.",
          href: "/tips",
          state: tipsReady ? "in_progress" : "open",
        },
        {
          key: "honeymoon",
          title: "Honeymoon segments",
          blurb: "Travel, lodging, what to do each day.",
          href: "/honeymoon",
          state: state.honeymoon.length ? "in_progress" : "open",
        },
      ];
  }
}

// =====================================================================
// MAIN
// =====================================================================

export function CommandCenter({
  state,
  flags,
}: {
  state: ProjectState;
  flags: WatcherFlag[];
}) {
  const phase = inferPhase(state);
  const pending = state.approvals.filter((a) => a.status === "pending");
  const recs = recommendForPhase(phase, state);

  // Mission-control home. Four sections, top to bottom:
  //   1. BriefStrip — names + countdown + phase, the editorial hero.
  //   2. Decisions — all pending approval cards inline (was a separate
  //      /approvals page; now lives here). When zero pending, the
  //      "Your team is getting started…" agent activity shows instead.
  //   3. FlagsBlock — Watcher critical/warn heads-up if any.
  //   4. RecommendedForPhase — concrete steps for the current phase.
  const criticalOrWarn = flags.filter(
    (f) => f.level === "critical" || f.level === "warn",
  );

  return (
    <div className="flex flex-col gap-12 lg:gap-16 pb-24">
      <BriefStrip state={state} phase={phase} />

      <Reveal>
        <Decisions pending={pending} phase={phase} />
      </Reveal>

      {criticalOrWarn.length > 0 && (
        <Reveal>
          <FlagsBlock flags={criticalOrWarn} />
        </Reveal>
      )}

      <Reveal>
        <RecommendedForPhase phase={phase} recs={recs} />
      </Reveal>
    </div>
  );
}

// =====================================================================
// DECISIONS. Inline approvals queue + team-getting-started empty state.
// Replaces the old separate /approvals page. Risk-grouped, compact.
// =====================================================================

const DECISIONS_RISK_LABEL: Record<ApprovalCard["risk"], string> = {
  high: "Big call",
  medium: "Worth a look",
  low: "Easy",
};

function Decisions({
  pending,
  phase,
}: {
  pending: ApprovalCard[];
  phase: PhaseKey;
}) {
  if (pending.length === 0) {
    return <TeamGettingStarted phase={phase} />;
  }

  const byRisk: Record<ApprovalCard["risk"], ApprovalCard[]> = {
    high: [],
    medium: [],
    low: [],
  };
  for (const c of pending) byRisk[c.risk].push(c);

  return (
    <section>
      <div className="flex items-baseline justify-between gap-3 mb-7 lg:mb-8 flex-wrap">
        <div>
          <p className="text-[10.5px] uppercase tracking-[0.32em] font-mono text-sage-deep mb-2 font-semibold flex items-center gap-2">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full bg-sage-500 animate-pulse-soft"
              aria-hidden
            />
            Waiting on you
          </p>
          <h2
            className="display text-[26px] sm:text-[32px] leading-[1.1] text-ink"
            style={{ fontWeight: 400 }}
          >
            {pending.length === 1 ? (
              <>One decision.</>
            ) : (
              <>
                <CountUp value={pending.length} /> decisions.
              </>
            )}
          </h2>
        </div>
      </div>

      <div className="flex flex-col gap-10">
        {(["high", "medium", "low"] as const).map((r) => {
          const items = byRisk[r];
          if (!items.length) return null;
          return (
            <div key={r}>
              <div className="flex items-baseline gap-3 mb-3">
                <span
                  className={`inline-block w-1.5 h-1.5 rounded-full ${
                    r === "high"
                      ? "bg-risk-high"
                      : r === "medium"
                      ? "bg-risk-medium"
                      : "bg-sage-400"
                  }`}
                  aria-hidden
                />
                <h3 className="display italic text-[18px] text-ink leading-tight">
                  {DECISIONS_RISK_LABEL[r]}
                  <span className="not-italic text-ink-300 ml-2 text-[13px]">
                    {items.length}
                  </span>
                </h3>
              </div>
              <div className="grid sm:grid-cols-2 gap-3 stagger">
                {items.map((c) => (
                  <ApprovalCardView key={c.id} card={c} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// "Your team is getting started…" — shown right after lock, before any
// approvals exist. A roster of named specialists with breathing dots so
// the user understands the silence isn't emptiness, it's preparation.
const STARTING_TEAM = [
  { agent: "Scout", activity: "sourcing your venue and photographer" },
  { agent: "Botanist", activity: "sketching the floral program" },
  { agent: "Sommelier", activity: "drafting the bar" },
  { agent: "Cleric", activity: "composing the ceremony" },
  { agent: "Stationer", activity: "drafting the save-the-dates" },
  { agent: "Treasurer", activity: "laying out the budget envelope" },
] as const;

function TeamGettingStarted({ phase: _phase }: { phase: PhaseKey }) {
  return (
    <section
      className="rounded-card p-6 sm:p-8 relative overflow-hidden"
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(184,153,104,0.18)",
        boxShadow:
          "0 18px 40px -22px rgba(79,93,68,0.22), inset 0 1px 0 rgba(255,255,255,1)",
      }}
    >
      <span
        aria-hidden
        className="absolute left-0 top-0 bottom-0 w-0.5"
        style={{
          background: "linear-gradient(180deg, #C7D1BD 0%, #A8B5A0 100%)",
        }}
      />
      <p className="text-[10.5px] uppercase tracking-[0.32em] font-mono text-sage-deep mb-1.5 font-semibold flex items-center gap-2">
        <BreathingDot />
        Your team is getting started
      </p>
      <p className="text-[14px] text-ink-300 leading-relaxed mb-5 max-w-[560px]">
        The first decisions will land here as the specialists return with
        proposals. Nothing happens without your say.
      </p>
      <ul className="flex flex-col">
        {STARTING_TEAM.map((m, i) => (
          <li
            key={m.agent}
            className={`py-3 flex items-baseline justify-between gap-4 ${
              i < STARTING_TEAM.length - 1 ? "border-b hairline" : ""
            }`}
          >
            <div className="flex items-baseline gap-3 min-w-0">
              <span
                className="inline-block w-1.5 h-1.5 rounded-full bg-sage-400 animate-pulse-soft shrink-0"
                style={{ animationDelay: `${i * 0.18}s` }}
                aria-hidden
              />
              <span className="display italic text-[16px] text-ink leading-none shrink-0">
                {m.agent}
              </span>
              <span className="text-[13px] text-ink-300 leading-tight truncate">
                {m.activity}
              </span>
            </div>
            <span className="text-[10px] uppercase tracking-[0.22em] font-mono text-sage-500 shrink-0">
              working
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

// =====================================================================
// BRIEF STRIP. compressed hero. Names + countdown + phase pill.
// =====================================================================

function BriefStrip({
  state,
  phase,
}: {
  state: ProjectState;
  phase: PhaseKey;
}) {
  const brief = state.brief!;
  const days = useMemo(() => countdownDays(brief.dateWindow), [brief.dateWindow]);
  const venue = state.vendors.find(
    (v) =>
      v.category === "Venue" &&
      (v.status === "contracted" || v.status === "paid"),
  );

  const formattedDate = useMemo(() => {
    const m = brief.dateWindow.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return brief.dateWindow;
    return new Date(
      `${m[1]}-${m[2]}-${m[3]}T12:00:00`,
    ).toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, [brief.dateWindow]);

  // Custom hero image rendered after brief lock, fades in as a moody
  // backdrop so each wedding has a one-of-a-kind home page.
  const heroImage = brief.heroImage;
  // Region-matched stock photo fallback. Used whenever the AI-generated
  // hero hasn't arrived (or is still the SVG placeholder, or rendering
  // failed). The dashboard should NEVER show blank space above the
  // couple's names. Hudson Valley → autumn foliage; Amalfi → Tuscan
  // villa; Charleston → Spanish moss; etc. Universal warm-bouquet
  // fallback if no keyword matches.
  const fallbackHero = useMemo(() => regionHeroFallback(brief), [brief]);
  // Detect both "no hero yet" AND "placeholder SVG (gen failed earlier)"
  // so the dashboard always auto-renders the brief's scene on mount.
  const isPlaceholder =
    !!heroImage && heroImage.startsWith("data:image/svg+xml");
  const isMissing = !heroImage;
  const needsRender = brief.locked && (isMissing || isPlaceholder);
  // What we actually paint behind the type. AI-generated brief.heroImage
  // takes priority once it lands; until then we show the region-matched
  // stock photo so the hero is never empty.
  const displayedHero =
    !isMissing && !isPlaceholder ? heroImage! : fallbackHero.url;
  const { pollForUpdates } = useProject();
  const retriedRef = useRef<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(
    brief.heroError ?? null,
  );

  const triggerRender = useCallback(async () => {
    if (rendering) return;
    setRendering(true);
    setRenderError(null);
    try {
      const r = await fetch("/api/brief/render-hero?force=1", { method: "POST" });
      const j = (await r.json().catch(() => null)) as
        | { image?: string; mode?: string; model?: string; error?: string }
        | null;
      if (j?.mode === "placeholder" && j.error) {
        setRenderError(j.error);
      }
      pollForUpdates(120_000);
    } catch (e) {
      setRenderError(e instanceof Error ? e.message : String(e));
    } finally {
      setTimeout(() => setRendering(false), 5_000);
    }
  }, [rendering, pollForUpdates]);

  // Auto-fire render-hero once per brief identity. Brief identity = names +
  // region + date — so if the user locks a fresh brief, we re-render rather
  // than show a stale empty hero. The retriedRef carries the brief key so
  // a second mount with the same brief doesn't re-fire.
  useEffect(() => {
    if (!needsRender) return;
    const briefKey = `${brief.organizerName}|${brief.partnerName}|${brief.region}|${brief.dateWindow}`;
    if (retriedRef.current === briefKey) return;
    retriedRef.current = briefKey;
    void triggerRender();
  }, [needsRender, brief.organizerName, brief.partnerName, brief.region, brief.dateWindow, triggerRender]);

  return (
    <header
      className="relative animate-fade-in-soft overflow-hidden -mx-5 lg:-mx-12 px-5 lg:px-12 min-h-[440px] lg:min-h-[560px] flex flex-col justify-end"
      style={{ borderRadius: 0 }}
    >
      {/* The hero image. Always present — AI-rendered when ready,
          region-matched stock photo as the fallback. Never blank. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={displayedHero}
        src={displayedHero}
        alt={
          !isMissing && !isPlaceholder
            ? ""
            : fallbackHero.alt
        }
        aria-hidden={!isMissing && !isPlaceholder}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{
          animation: "hero-fade-in 1800ms ease-out both",
          filter: "saturate(118%) contrast(104%)",
          opacity: 0.95,
        }}
      />
      {/* Subtle dark gradient at the bottom edge only — keeps the
          photo dominant while giving white type something to land on. */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(14,15,13,0.18) 0%, transparent 22%, transparent 60%, rgba(14,15,13,0.45) 100%)",
        }}
      />
      {/* Very subtle film grain over the whole hero */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-[0.04] mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.5 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
          backgroundSize: "220px 220px",
        }}
      />
      <style jsx>{`
        @keyframes hero-fade-in {
          from { opacity: 0; transform: scale(1.06); filter: blur(8px) saturate(118%); }
          to   { opacity: 0.95; transform: scale(1); filter: blur(0) saturate(118%) contrast(104%); }
        }
        @media (prefers-reduced-motion: reduce) {
          img { animation: none !important; opacity: 0.90 !important; }
        }
      `}</style>

      {/* Top row. phase + greeting. anchored to the top of the hero */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between gap-4 flex-wrap pt-6 lg:pt-8 px-5 lg:px-12">
        <div className="flex items-center gap-3">
          <BreathingDot />
          <p className="text-[10.5px] uppercase tracking-[0.28em] font-mono"
             style={{ color: displayedHero ? "#FFFFFF" : "#4F5D44",
                      textShadow: displayedHero ? "0 1px 8px rgba(14,15,13,0.45)" : "none" }}>
            {greeting()}
          </p>
          <span style={{ color: displayedHero ? "rgba(255,255,255,0.55)" : "rgba(14,15,13,0.30)" }}>·</span>
          <p className="text-[10.5px] uppercase tracking-[0.22em] font-mono"
             style={{ color: displayedHero ? "rgba(255,255,255,0.85)" : "rgba(14,15,13,0.50)",
                      textShadow: displayedHero ? "0 1px 8px rgba(14,15,13,0.45)" : "none" }}>
            {PHASE_LABEL[phase]}
          </p>
          {(rendering || (isPlaceholder && brief.locked)) && (
            <>
              <span style={{ color: displayedHero ? "rgba(255,255,255,0.55)" : "rgba(14,15,13,0.30)" }}>·</span>
              <span
                className="text-[10px] uppercase tracking-[0.22em] font-mono italic"
                style={{
                  color: displayedHero ? "rgba(255,255,255,0.85)" : "rgba(14,15,13,0.50)",
                  textShadow: displayedHero ? "0 1px 8px rgba(14,15,13,0.45)" : "none",
                }}
              >
                rendering your scene…
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {(isPlaceholder || isMissing) && !rendering && brief.locked && (
            <button
              type="button"
              onClick={triggerRender}
              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] font-medium transition-all"
              style={{
                background: displayedHero ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.80)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                border: displayedHero ? "1px solid rgba(255,255,255,0.30)" : "1px solid rgba(14,15,13,0.10)",
                color: displayedHero ? "#FFFFFF" : "#0E0F0D",
                textShadow: displayedHero ? "0 1px 6px rgba(14,15,13,0.35)" : "none",
              }}
              aria-label="Generate scene image"
              title="Generate scene image"
            >
              <span aria-hidden>↻</span>
              <span className="hidden sm:inline">{isMissing ? "Generate scene" : "Regenerate"}</span>
            </button>
          )}
          <Link
            href="/timeline"
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[10.5px] uppercase tracking-[0.22em] font-medium transition-all"
            style={{
              background: displayedHero ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.80)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              border: displayedHero ? "1px solid rgba(255,255,255,0.30)" : "1px solid rgba(14,15,13,0.10)",
              color: displayedHero ? "#FFFFFF" : "#0E0F0D",
              textShadow: displayedHero ? "0 1px 6px rgba(14,15,13,0.35)" : "none",
            }}
          >
            See the plan
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>

      <div className="relative z-10 pb-7 lg:pb-12">

      {/* Names + countdown. White type over the photo. Magazine-cover. */}
      <div className="grid lg:grid-cols-[1fr_auto] gap-6 lg:gap-12 items-end">
        <div className="min-w-0">
          <h1
            className="display text-[42px] sm:text-[54px] lg:text-[68px] leading-[0.96] tracking-[-0.018em] text-balance"
            style={{
              color: displayedHero ? "#FFFFFF" : "#1A1A18",
              fontWeight: 400,
              textShadow: heroImage
                ? "0 2px 24px rgba(14,15,13,0.45), 0 1px 4px rgba(14,15,13,0.35)"
                : "none",
            }}
          >
            {brief.organizerName}
            <span
              className="italic mx-3"
              style={{
                color: displayedHero ? "rgba(255,255,255,0.78)" : "var(--sage-deep)",
              }}
            >
              &
            </span>
            {brief.partnerName}
          </h1>
          <p
            className="text-[10.5px] uppercase tracking-[0.26em] font-mono mt-4 leading-relaxed flex items-center gap-3 flex-wrap"
            style={{
              color: displayedHero ? "rgba(255,255,255,0.88)" : "rgba(14,15,13,0.55)",
              textShadow: displayedHero ? "0 1px 8px rgba(14,15,13,0.50)" : "none",
            }}
          >
            <span>{formattedDate}</span>
            <span style={{ color: displayedHero ? "rgba(255,255,255,0.45)" : "rgba(14,15,13,0.25)" }}>·</span>
            {venue ? (
              <>
                <span>{venue.name}</span>
                <span style={{ color: displayedHero ? "rgba(255,255,255,0.45)" : "rgba(14,15,13,0.25)" }}>·</span>
                <span style={{ fontStyle: "italic", textTransform: "none", letterSpacing: 0 }}>
                  {venue.city}
                </span>
              </>
            ) : (
              <span>{brief.region}</span>
            )}
            <span style={{ color: displayedHero ? "rgba(255,255,255,0.45)" : "rgba(14,15,13,0.25)" }}>·</span>
            <span>{brief.guestCount} guests</span>
          </p>
        </div>

        {days !== null && (
          <div className="flex items-baseline gap-3 shrink-0">
            <span
              className="display text-[56px] sm:text-[72px] lg:text-[88px] leading-[0.85] tracking-[-0.025em] tabular-nums"
              style={{
                color: heroImage
                  ? "#FFFFFF"
                  : days <= 7
                  ? "var(--sage-deep)"
                  : "var(--ink)",
                fontWeight: 300,
                textShadow: heroImage
                  ? "0 2px 24px rgba(14,15,13,0.45), 0 1px 4px rgba(14,15,13,0.35)"
                  : "none",
              }}
            >
              <CountUp value={Math.max(0, days)} durationMs={1000} />
            </span>
            <div className="flex flex-col gap-1 pb-2 lg:pb-3">
              <span
                className="text-[10px] uppercase tracking-[0.26em] font-mono"
                style={{
                  color: displayedHero ? "rgba(255,255,255,0.78)" : "var(--sage-deep)",
                  textShadow: displayedHero ? "0 1px 6px rgba(14,15,13,0.40)" : "none",
                }}
              >
                {days < 0 ? "days ago" : days === 0 ? "today" : days === 1 ? "day" : "days"}
              </span>
              <span
                className="text-[10.5px] italic"
                style={{
                  color: displayedHero ? "rgba(255,255,255,0.62)" : "rgba(14,15,13,0.40)",
                  textShadow: displayedHero ? "0 1px 6px rgba(14,15,13,0.40)" : "none",
                }}
              >
                {PHASE_TAGLINE[phase]}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* OpenAI error surfacing. Only shown when the image render failed
          AND we have an actual error message — used to debug why the
          hero is still a placeholder. */}
      {renderError && isPlaceholder && (
        <div
          className="mt-4 rounded-lg px-3 py-2 text-[11px] font-mono leading-relaxed"
          style={{
            background: "rgba(168,52,26,0.06)",
            border: "1px solid rgba(168,52,26,0.25)",
            color: "#8A2A14",
            maxWidth: "100%",
            wordBreak: "break-word",
          }}
        >
          <span className="font-semibold uppercase tracking-[0.18em] mr-2">
            Image gen:
          </span>
          {renderError}
        </div>
      )}

      </div>
    </header>
  );
}

// =====================================================================
// RIGHT NOW. the single most pressing decision, hero treatment
// =====================================================================

function RightNow({
  card,
  pending,
}: {
  card: ApprovalCard;
  pending: number;
}) {
  return (
    <section
      className="rounded-card relative overflow-hidden"
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(184,153,104,0.22)",
        boxShadow:
          "0 28px 72px -28px rgba(79,93,68,0.32), 0 10px 26px -10px rgba(110,128,104,0.18), inset 0 1px 0 rgba(255,255,255,1)",
      }}
    >
      {/* Left edge sage accent stripe — signals "this is THE thing" */}
      <span
        aria-hidden
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{
          background: "linear-gradient(180deg, #6E8068 0%, #4F5D44 100%)",
        }}
      />
      <div className="p-6 sm:p-8 pl-7 sm:pl-9">
        <div className="flex items-baseline justify-between gap-3 mb-5 flex-wrap">
          <div className="flex items-center gap-2.5">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full bg-sage-500 animate-pulse-soft"
              aria-hidden
            />
            <p className="text-[10.5px] uppercase tracking-[0.32em] font-mono text-sage-deep font-semibold">
              Right now
            </p>
          </div>
          {pending > 1 && (
            <Link
              href="/"
              className="text-[10.5px] uppercase tracking-[0.22em] font-mono text-ink-300 hover:text-sage-deep transition-colors"
            >
              {pending - 1} more after this →
            </Link>
          )}
        </div>
        <ApprovalCardView card={card} />
      </div>
    </section>
  );
}

function NoDecisionsRightNow({ phase }: { phase: PhaseKey }) {
  return (
    <section
      className="rounded-card p-6 sm:p-8 flex items-center gap-4 relative overflow-hidden"
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(184,153,104,0.18)",
        boxShadow:
          "0 18px 40px -22px rgba(79,93,68,0.22), inset 0 1px 0 rgba(255,255,255,1)",
      }}
    >
      <span
        aria-hidden
        className="absolute left-0 top-0 bottom-0 w-0.5"
        style={{
          background: "linear-gradient(180deg, #C7D1BD 0%, #A8B5A0 100%)",
        }}
      />
      <span
        className="inline-block w-2 h-2 rounded-full bg-sage-500"
        aria-hidden
      />
      <div className="min-w-0">
        <p className="text-[10.5px] uppercase tracking-[0.28em] font-mono text-sage-deep mb-1 font-semibold">
          All quiet
        </p>
        <p className="text-[15px] text-ink leading-relaxed">
          Nothing waits on you. We're working in the background. Recommended
          steps for {PHASE_LABEL[phase].toLowerCase()} are below.
        </p>
      </div>
    </section>
  );
}

// =====================================================================
// RECOMMENDED FOR THIS PHASE
// =====================================================================

function RecommendedForPhase({
  phase,
  recs,
}: {
  phase: PhaseKey;
  recs: Recommendation[];
}) {
  const open = recs.filter((r) => r.state === "open");
  const inProgress = recs.filter((r) => r.state === "in_progress");
  const done = recs.filter((r) => r.state === "done");

  return (
    <section>
      <div className="flex items-baseline justify-between gap-3 mb-8 lg:mb-10 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-[0.32em] font-mono text-sage-deep mb-2">
            For this phase
          </p>
          <h2 className="display text-[26px] sm:text-[32px] leading-[1.1] text-ink" style={{ fontWeight: 400 }}>
            {PHASE_TAGLINE[phase]}
          </h2>
        </div>
        <p className="text-[10px] uppercase tracking-[0.24em] font-mono text-ink-300 tabular-nums">
          {done.length} done <span className="text-ink-200 mx-1">·</span> {inProgress.length} going <span className="text-ink-200 mx-1">·</span> {open.length} ahead
        </p>
      </div>

      <ol className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-6 stagger">
        {recs.map((r, idx) => (
          <RecommendationCard key={r.key} rec={r} idx={idx} />
        ))}
      </ol>
    </section>
  );
}

function RecommendationCard({ rec, idx }: { rec: Recommendation; idx: number }) {
  const dot =
    rec.state === "done"
      ? "bg-sage-500"
      : rec.state === "in_progress"
      ? "bg-sage-300"
      : "bg-ink-200";
  const label =
    rec.state === "done" ? "Done" : rec.state === "in_progress" ? "In progress" : "Next";

  return (
    <li>
      <Link
        href={rec.href}
        className="group block bg-white border border-ink/8 hover:border-sage-deep/30 transition-all p-7 lg:p-8 rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3 mb-6">
          <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-ink-300">
            {String(idx + 1).padStart(2, "0")}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[9.5px] uppercase tracking-[0.20em] font-mono text-ink-300">
            <span className={`inline-block w-1 h-1 rounded-full ${dot}`} aria-hidden />
            {label}
          </span>
        </div>
        <h3
          className="display text-[22px] leading-[1.15] text-ink group-hover:text-sage-deep transition-colors"
          style={{ fontWeight: 400, letterSpacing: "-0.005em" }}
        >
          {rec.title}
        </h3>
        <p className="text-[13px] text-ink-300 mt-3 leading-relaxed">
          {rec.blurb}
        </p>
        <div className="mt-6 flex items-center gap-2 text-[10.5px] uppercase tracking-[0.22em] font-mono text-sage-deep opacity-0 group-hover:opacity-100 transition-opacity">
          Open <span aria-hidden>→</span>
        </div>
      </Link>
    </li>
  );
}

// =====================================================================
// FLAGS. Watcher concerns that aren't yet decisions
// =====================================================================

function FlagsBlock({ flags }: { flags: WatcherFlag[] }) {
  return (
    <section>
      <p className="text-[10.5px] uppercase tracking-[0.28em] font-mono text-sage-500 mb-4">
        Heads up
      </p>
      <ul className="flex flex-col gap-2">
        {flags.slice(0, 3).map((f, i) => (
          <li
            key={i}
            className={`rounded-card border px-4 py-3 ${
              f.level === "critical"
                ? "border-risk-high/30 bg-risk-high/5"
                : f.level === "warn"
                ? "border-risk-medium/30 bg-risk-medium/5"
                : "hairline bg-white/70"
            }`}
          >
            <div className="text-[10px] uppercase tracking-[0.18em] font-mono text-ink-300 mb-1">
              {f.topic}
            </div>
            <p className="text-[13px] text-ink leading-snug">{f.message}</p>
            <Link
              href={`/${f.module}`}
              className="text-[10.5px] uppercase tracking-[0.18em] font-mono text-ink-300 hover:text-sage-500 transition-colors mt-2 inline-block"
            >
              Open {f.module} →
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

// =====================================================================
// HELPERS
// =====================================================================

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function countdownDays(window: string): number | null {
  const m = window.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const ms = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00`).getTime();
  if (!Number.isFinite(ms)) return null;
  return Math.round((ms - Date.now()) / (1000 * 60 * 60 * 24));
}
