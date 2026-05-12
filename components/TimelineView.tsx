"use client";

// /timeline. rebuilt against AISLE_TIMELINE_REVISION.docx.
//
// Ten fixes from the spec:
//   1. Hero typography re-weighted. "Foundation" becomes queen.
//   2. Three-state milestones (past/present/future) with date stamps + pulse.
//   3. Italic Cormorant sentence replaces "1/32 CHECKED OFF".
//   4. Three checklist card states. done / next / queued.
//   5. One eyebrow per visual region. "WHAT'S NEXT" gone.
//   6. 12-column staggered grid at lg+.
//   7. Embedded "Maestro is…" panel; floating pill hidden on this route.
//   8. Ambient 2.5% noise texture + softer hairlines.
//   9. One editorial photograph in the right column.
//   10. Header simplification. page-local restraint only.

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CHECKLIST,
  ChecklistItem,
  currentMonthsOut,
} from "@/lib/checklist";
import { useProject } from "./StateProvider";
import type { ProjectState } from "@/lib/types";

// ----------------------------------------------------------- phase rail ---

interface PhaseDef {
  key: string;
  label: string;
  tagline: string;
  /** Months before the wedding when this phase is "current". used as the
   *  anchor for the date-stamp math. */
  anchor: number;
}

const PHASES: PhaseDef[] = [
  { key: "intake",     label: "Intake",     tagline: "tell us about it",   anchor: 13 },
  { key: "foundation", label: "Foundation", tagline: "venue + date",       anchor: 12 },
  { key: "discovery",  label: "Discovery",  tagline: "the key team",       anchor: 9 },
  { key: "design",     label: "Design",     tagline: "mood + florals",     anchor: 6 },
  { key: "logistics",  label: "Logistics",  tagline: "rooms, rides",       anchor: 4 },
  { key: "paperwork",  label: "Paperwork",  tagline: "contracts + license",anchor: 2 },
  { key: "day-of",     label: "Day-of",     tagline: "it's happening",     anchor: 0 },
  { key: "after",      label: "After",      tagline: "thank-yous",         anchor: -1 },
];

function inferPhaseIndex(state: ProjectState): number {
  if (!state.brief) return 0;
  if (!state.brief.locked) return 0;
  if (state.dayOfMode) return 6;
  const contracted = state.vendors.filter((v) => v.status === "contracted" || v.status === "paid").length;
  const venueLocked = state.vendors.some((v) => v.category === "Venue" && (v.status === "contracted" || v.status === "paid"));
  const photogLocked = state.vendors.some((v) => v.category === "Photographer" && (v.status === "contracted" || v.status === "paid"));
  const licenseFiled = !!state.license?.filedAt;
  const m = state.brief.dateWindow.match(/(\d{4})-(\d{2})-(\d{2})/);
  const ms = m ? new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00`).getTime() : NaN;
  const days = Number.isFinite(ms) ? Math.round((ms - Date.now()) / 86_400_000) : null;
  if (days !== null && days < 0) return 7;
  if (days !== null && days <= 7) return 6;
  if (licenseFiled || contracted >= 5) return 5;
  if (contracted >= 3) return 4;
  if (venueLocked && photogLocked) return 3;
  if (venueLocked) return 2;
  return 1;
}

function weddingMonth(state: ProjectState): Date | null {
  const w = state.brief?.weddingDate ?? state.brief?.dateWindow ?? "";
  const m = w.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00`);
  const my = w.match(/([A-Za-z]+)\s+(\d{4})/);
  if (my) {
    const MONTH: Record<string, number> = {
      january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
      july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
    };
    const k = my[1].toLowerCase();
    if (k in MONTH) return new Date(parseInt(my[2], 10), MONTH[k], 15);
  }
  const seasonYear = w.match(/(spring|summer|fall|autumn|winter)\s*(\d{4})/i);
  if (seasonYear) {
    const M: Record<string, number> = { spring: 3, summer: 6, fall: 8, autumn: 8, winter: 11 };
    return new Date(parseInt(seasonYear[2], 10), M[seasonYear[1].toLowerCase()] ?? 6, 15);
  }
  return null;
}

function stampForAnchor(weddingAt: Date | null, monthsBefore: number): string {
  if (!weddingAt) return ", ";
  const d = new Date(weddingAt);
  d.setMonth(d.getMonth() - monthsBefore);
  return d.toLocaleString("en-US", { month: "short", year: "2-digit" }).replace(" ", " '");
}

// ----------------------------------------------------------- the view ---

export function TimelineView() {
  const { state, loading } = useProject();
  const now = state ? currentMonthsOut(state) : 12;
  const activePhase = state ? inferPhaseIndex(state) : 1;
  const wedAt = state ? weddingMonth(state) : null;

  // Group checklist items by months-out band.
  const currentGroup = useMemo(() => {
    if (!state) return [];
    return CHECKLIST.filter((c) => Math.abs(c.monthsOut - now) <= 1 && c.monthsOut >= 0);
  }, [state, now]);

  const comingUp = useMemo(() => {
    if (!state) return [];
    return CHECKLIST.filter((c) => c.monthsOut < now - 1 && c.monthsOut >= 0)
      .sort((a, b) => b.monthsOut - a.monthsOut);
  }, [state, now]);

  if (loading || !state) {
    return <div className="pt-10 text-center text-ink-300">Loading…</div>;
  }

  // Classify current-group items: first non-done becomes "next", rest queued.
  const classified = (() => {
    let nextAssigned = false;
    return currentGroup.map((it) => {
      const done = it.isDone(state);
      if (done) return { it, state: "done" as const };
      if (!nextAssigned) {
        nextAssigned = true;
        return { it, state: "next" as const };
      }
      return { it, state: "queued" as const };
    });
  })();

  const currentPhase = PHASES[activePhase];
  const benchmark = benchmarkSentence(state, now);
  const heroImage =
    state.brief?.heroImage && !state.brief.heroImage.startsWith("data:image/svg+xml")
      ? state.brief.heroImage
      : null;

  return (
    <div className="timeline-page relative" style={{ background: "transparent" }}>
      {/* Ambient noise. Fix 8. Sits beneath everything. */}
      <NoiseLayer />

      <div className="relative z-10 pb-16">
        {/* ─── HERO ROW ─── Fix 1, Fix 3, Fix 6 ─── */}
        <header className="grid lg:grid-cols-12 gap-x-8 lg:gap-x-10 pt-6 lg:pt-12 pb-10 lg:pb-16 border-b border-ink/8">
          <div className="lg:col-span-9 min-w-0">
            <p
              className="uppercase mb-4 lg:mb-6"
              style={{
                fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                fontSize: 9.5,
                letterSpacing: "0.22em",
                color: "rgba(26,26,24,0.42)",
                fontWeight: 500,
              }}
            >
              Where you are
            </p>
            <div className="flex items-end gap-3 flex-wrap">
              <span
                className="tabular-nums shrink-0"
                style={{
                  fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                  fontSize: 12,
                  color: "rgba(26,26,24,0.32)",
                  paddingBottom: "0.85em",
                }}
              >
                {String(activePhase + 1).padStart(2, "0")} / {String(PHASES.length).padStart(2, "0")}
              </span>
              <h1
                className="leading-[0.95] tracking-[-0.03em]"
                style={{
                  fontFamily: '"Cormorant Garamond","Cormorant",Georgia,serif',
                  fontWeight: 400,
                  fontSize: "clamp(72px, 11vw, 140px)",
                  color: "#1A1A18",
                }}
              >
                {currentPhase.label}
              </h1>
              <span
                className="italic leading-none shrink-0"
                style={{
                  fontFamily: '"Cormorant Garamond","Cormorant",Georgia,serif',
                  fontStyle: "italic",
                  fontWeight: 400,
                  fontSize: "clamp(24px, 3.6vw, 38px)",
                  color: "rgba(26,26,24,0.55)",
                  paddingBottom: "0.55em",
                }}
              >
                . {currentPhase.tagline}
              </span>
            </div>
          </div>

          <aside className="lg:col-span-3 mt-6 lg:mt-0 self-end lg:text-right">
            <p
              className="italic"
              style={{
                fontFamily: '"Cormorant Garamond","Cormorant",Georgia,serif',
                fontStyle: "italic",
                fontWeight: 400,
                fontSize: 18,
                lineHeight: 1.45,
                color: "#4F5D44",
                maxWidth: 280,
                marginLeft: "auto",
              }}
            >
              {benchmark}
            </p>
            <p
              className="mt-2 uppercase"
              style={{
                fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                fontSize: 10.5,
                letterSpacing: "0.22em",
                color: "rgba(26,26,24,0.36)",
              }}
            >
              Corsia benchmark
            </p>
          </aside>
        </header>

        {/* ─── MILESTONES ROW ─── Fix 2 ─── */}
        <section
          aria-label="Phase rail"
          className="py-14 lg:py-20 border-b border-ink/8 relative"
        >
          <div className="relative">
            {/* Hairline rule passes BEHIND the indicators. The indicators
                punch through with a paper-colored halo. */}
            <span
              aria-hidden
              className="absolute left-2 right-2 top-[6px] h-px"
              style={{ background: "rgba(26,26,24,0.10)" }}
            />
            <ol className="relative grid grid-cols-4 sm:grid-cols-8 gap-x-2">
              {PHASES.map((p, i) => {
                const state: "past" | "present" | "future" =
                  i < activePhase ? "past" : i === activePhase ? "present" : "future";
                const stamp = stampForAnchor(wedAt, p.anchor);
                return (
                  <li key={p.key} className="flex flex-col items-start gap-3">
                    <Milestone state={state} />
                    <div>
                      <p
                        className="uppercase"
                        style={{
                          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                          fontSize: 10.5,
                          letterSpacing: "0.18em",
                          fontWeight: state === "present" ? 600 : 400,
                          color:
                            state === "past"
                              ? "rgba(26,26,24,0.45)"
                              : state === "present"
                              ? "#1A1A18"
                              : "rgba(26,26,24,0.28)",
                        }}
                      >
                        {p.label}
                      </p>
                      <p
                        className="mt-1 tabular-nums"
                        style={{
                          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                          fontSize: 10,
                          letterSpacing: "0.04em",
                          fontWeight: state === "present" ? 500 : 400,
                          color:
                            state === "present"
                              ? "#1A1A18"
                              : "rgba(26,26,24,0.30)",
                        }}
                      >
                        {stamp}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        {/* ─── MONTH BY MONTH ROW ─── Fix 6, Fix 9 ─── */}
        <section className="grid lg:grid-cols-12 gap-x-10 py-14 lg:py-20">
          <div className="lg:col-span-8 min-w-0">
            <h2
              className="leading-[1.04] tracking-[-0.012em]"
              style={{
                fontFamily: '"Cormorant Garamond","Cormorant",Georgia,serif',
                fontWeight: 400,
                fontSize: "clamp(40px, 5vw, 56px)",
                color: "#1A1A18",
              }}
            >
              Month by month.
            </h2>
            <p
              className="mt-5 max-w-[58ch]"
              style={{
                fontFamily: 'Georgia, "EB Garamond", serif',
                fontSize: 15.5,
                lineHeight: 1.7,
                color: "rgba(26,26,24,0.62)",
              }}
            >
              Items check themselves as the work lands. book a venue, file the
              license, RSVPs come in. You don&apos;t tick boxes. Just live your
              life.
            </p>
          </div>

          <figure className="lg:col-span-4 mt-8 lg:mt-0">
            <div
              className="relative overflow-hidden"
              style={{
                aspectRatio: "4 / 5",
                borderRadius: 4,
                background:
                  "linear-gradient(140deg, #E8D8A8 0%, #C7B998 40%, #8E9B7F 100%)",
              }}
            >
              {heroImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={heroImage}
                  alt=""
                  aria-hidden
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ filter: "saturate(108%)" }}
                />
              ) : (
                <span
                  aria-hidden
                  className="absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(ellipse 60% 40% at 50% 35%, rgba(255,255,255,0.18), transparent 60%)",
                  }}
                />
              )}
            </div>
            <figcaption
              className="mt-3 italic"
              style={{
                fontFamily: '"Cormorant Garamond","Cormorant",Georgia,serif',
                fontStyle: "italic",
                fontSize: 13,
                color: "rgba(26,26,24,0.55)",
              }}
            >
              {regionCaption(state)}
            </figcaption>
          </figure>
        </section>

        {/* ─── CHECKLIST ROW ─── Fix 4, Fix 5, Fix 6, Fix 7 ─── */}
        <section className="grid lg:grid-cols-12 gap-x-10 pb-14 lg:pb-20 border-b border-ink/8">
          <div className="lg:col-span-9 min-w-0">
            <div className="flex items-baseline justify-between gap-3 mb-7 flex-wrap">
              <p
                className="uppercase"
                style={{
                  fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                  fontSize: 10,
                  letterSpacing: "0.18em",
                  color: "rgba(26,26,24,0.42)",
                }}
              >
                {now > 0 ? `${now} months out` : now === 0 ? "Day of" : "After"} ·{" "}
                <span style={{ color: "#4F5D44" }}>you are here</span>
              </p>
              <p
                className="italic"
                style={{
                  fontFamily: '"Cormorant Garamond","Cormorant",Georgia,serif',
                  fontStyle: "italic",
                  fontSize: 14,
                  color: "#4F5D44",
                }}
              >
                {currentPhase.label}
              </p>
            </div>

            <ul className="flex flex-col gap-3">
              {classified.map(({ it, state: cardState }) => (
                <li key={it.id}>
                  <ChecklistCard
                    item={it}
                    state={cardState}
                    doneAt={cardState === "done" ? doneStamp(state, it, wedAt) : undefined}
                  />
                </li>
              ))}
            </ul>
          </div>

          <aside className="lg:col-span-3 mt-10 lg:mt-0">
            <MaestroPanel />
          </aside>
        </section>

        {/* ─── COMING UP ROW ─── */}
        {comingUp.length > 0 && (
          <section className="pt-12 lg:pt-16">
            <p
              className="uppercase mb-7"
              style={{
                fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                fontSize: 10,
                letterSpacing: "0.18em",
                color: "rgba(26,26,24,0.42)",
              }}
            >
              Coming up
            </p>
            <div className="grid lg:grid-cols-12 gap-x-10 gap-y-4">
              {comingUp.slice(0, 9).map((it) => (
                <div key={it.id} className="lg:col-span-4">
                  <ChecklistCard item={it} state="queued" />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------- milestone ---

function Milestone({ state }: { state: "past" | "present" | "future" }) {
  if (state === "present") {
    return (
      <span
        className="relative inline-flex items-center justify-center"
        style={{
          width: 22,
          height: 22,
          background: "#FBF8F2", // paper halo punches through the rule
          borderRadius: 9999,
        }}
        aria-hidden
      >
        {/* outer pulsing ring */}
        <span
          className="absolute"
          style={{
            width: 16,
            height: 16,
            borderRadius: 9999,
            border: "1.5px solid #4F5D44",
            animation: "milestone-pulse 2.4s ease-in-out infinite",
          }}
        />
        {/* filled core */}
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: 9999,
            background: "#4F5D44",
          }}
        />
        <style jsx>{`
          @keyframes milestone-pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.18); opacity: 0.5; }
          }
          @media (prefers-reduced-motion: reduce) {
            span { animation: none !important; }
          }
        `}</style>
      </span>
    );
  }
  if (state === "past") {
    return (
      <span
        className="relative inline-flex items-center justify-center"
        style={{ width: 22, height: 22, background: "#FBF8F2", borderRadius: 9999 }}
        aria-hidden
      >
        <span
          className="absolute"
          style={{
            width: 18,
            height: 18,
            borderRadius: 9999,
            border: "1px solid rgba(79,93,68,0.20)",
          }}
        />
        <span
          style={{
            width: 10,
            height: 10,
            borderRadius: 9999,
            background: "#4F5D44",
          }}
        />
      </span>
    );
  }
  // future
  return (
    <span
      className="relative inline-flex items-center justify-center"
      style={{ width: 22, height: 22, background: "#FBF8F2", borderRadius: 9999 }}
      aria-hidden
    >
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: 9999,
          border: "1px solid rgba(26,26,24,0.18)",
          background: "transparent",
        }}
      />
    </span>
  );
}

// -------------------------------------------------------- checklist ---

function ChecklistCard({
  item,
  state,
  doneAt,
}: {
  item: ChecklistItem;
  state: "done" | "next" | "queued";
  doneAt?: string;
}) {
  const base: React.CSSProperties = {
    borderRadius: 16,
    border: "1px solid rgba(26,26,24,0.08)",
    background: "#FFFFFF",
  };
  const styleByState: Record<typeof state, React.CSSProperties> = {
    done: { ...base },
    next: {
      ...base,
      background: "#FBF9F3",
      borderLeft: "2px solid #4F5D44",
    },
    queued: { ...base },
  };
  const padding =
    state === "next" ? "20px 22px" : "18px 22px";

  const body = (
    <div className="flex items-start gap-3.5" style={{ padding, ...styleByState[state], borderRadius: 16 }}>
      <Checkbox state={state} />
      <div className="min-w-0 flex-1">
        <h3
          className="leading-tight"
          style={{
            fontFamily: '"Cormorant Garamond","Cormorant",Georgia,serif',
            fontWeight: 400,
            fontSize: state === "next" ? 18 : 17,
            color:
              state === "done"
                ? "rgba(26,26,24,0.55)"
                : state === "next"
                ? "#1A1A18"
                : "rgba(26,26,24,0.78)",
          }}
        >
          {item.title}
        </h3>
        {state !== "done" && (
          <p
            className="mt-1.5"
            style={{
              fontFamily: 'Georgia, "EB Garamond", serif',
              fontSize: state === "next" ? 14 : 13,
              lineHeight: 1.55,
              color:
                state === "next"
                  ? "rgba(26,26,24,0.62)"
                  : "rgba(26,26,24,0.42)",
            }}
          >
            {item.detail}
          </p>
        )}
        {state === "done" && doneAt && (
          <p
            className="mt-1 italic"
            style={{
              fontFamily: '"Cormorant Garamond","Cormorant",Georgia,serif',
              fontStyle: "italic",
              fontSize: 13,
              color: "#4F5D44",
            }}
          >
            {doneAt}
          </p>
        )}
        {state === "next" && (
          <p
            className="mt-3 italic flex items-baseline gap-1"
            style={{
              fontFamily: '"Cormorant Garamond","Cormorant",Georgia,serif',
              fontStyle: "italic",
              fontSize: 13,
              color: "#4F5D44",
              justifyContent: "flex-end",
              display: "flex",
            }}
          >
            <span>start</span>
            <span aria-hidden>→</span>
          </p>
        )}
      </div>
    </div>
  );

  if (state === "next" && item.href) {
    return (
      <Link
        href={item.href}
        className="block transition-colors hover:bg-[#FAF6EB]"
        style={{ borderRadius: 16 }}
      >
        {body}
      </Link>
    );
  }
  if (state === "queued" && item.href) {
    return <div>{body}</div>;
  }
  return body;
}

function Checkbox({ state }: { state: "done" | "next" | "queued" }) {
  if (state === "done") {
    return (
      <span
        className="shrink-0 inline-flex items-center justify-center"
        style={{
          width: 24,
          height: 24,
          borderRadius: 9999,
          background: "#4F5D44",
          color: "#FBF7F0",
          marginTop: 2,
        }}
        aria-hidden
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2.5 6.4 L5 8.8 L9.5 3.5" />
        </svg>
      </span>
    );
  }
  return (
    <span
      className="shrink-0 inline-flex items-center justify-center"
      style={{
        width: 24,
        height: 24,
        borderRadius: 9999,
        border:
          state === "next"
            ? "1.5px solid #4F5D44"
            : "1px solid rgba(26,26,24,0.20)",
        background: "#FFFFFF",
        marginTop: 2,
      }}
      aria-hidden
    />
  );
}

// ----------------------------------------------------------- maestro ---

const MAESTRO_LINES = [
  "reviewing the venue's revised proposal.",
  "drafting the photographer follow-up.",
  "reconciling the hotel block deposit.",
  "scheduling the florist consult.",
  "watching three RSVPs that haven't replied.",
];

function MaestroPanel() {
  const [i, setI] = useState(0);
  const [fading, setFading] = useState(false);
  useEffect(() => {
    const t = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setI((n) => (n + 1) % MAESTRO_LINES.length);
        setFading(false);
      }, 300);
    }, 4000);
    return () => clearInterval(t);
  }, []);
  return (
    <div>
      <p
        className="uppercase mb-3"
        style={{
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
          fontSize: 10,
          letterSpacing: "0.22em",
          color: "rgba(26,26,24,0.42)",
        }}
      >
        Maestro is
      </p>
      <p
        className="italic transition-opacity duration-300"
        style={{
          fontFamily: '"Cormorant Garamond","Cormorant",Georgia,serif',
          fontStyle: "italic",
          fontSize: 16,
          lineHeight: 1.55,
          color: "#4F5D44",
          maxWidth: 280,
          opacity: fading ? 0 : 1,
          minHeight: "5.5em",
        }}
      >
        {MAESTRO_LINES[i]}
      </p>
      <button
        type="button"
        onClick={() => {
          // The chat dock listens to a global state. keep this gesture
          // simple: nudge the user toward the ChatDock open button.
          window.dispatchEvent(new CustomEvent("aisle:openMaestro"));
        }}
        className="mt-3 text-left"
        style={{
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
          fontSize: 11,
          letterSpacing: "0.04em",
          color: "rgba(26,26,24,0.42)",
        }}
      >
        tap to see all of today&apos;s work →
      </button>
    </div>
  );
}

// ------------------------------------------------------------- noise ---

function NoiseLayer() {
  // Fixed pseudo across the viewport, multiply-blended, ~2.5% opacity.
  // Sits at z-index 0; content sits at z-index 10.
  return (
    <span
      aria-hidden
      className="fixed inset-0 pointer-events-none"
      style={{
        zIndex: 0,
        opacity: 0.04,
        mixBlendMode: "multiply",
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
        backgroundSize: "160px 160px",
      }}
    />
  );
}

// ---------------------------------------------------------- helpers ---

function benchmarkSentence(state: ProjectState, now: number): string {
  const venueLocked = state.vendors.some((v) => v.category === "Venue" && (v.status === "contracted" || v.status === "paid"));
  if (now > 11 && !venueLocked) {
    return `You're ${now} months out. Most couples have booked the venue by now.`;
  }
  if (now >= 9 && venueLocked) {
    return `Venue locked early. You're ahead of pace for most ${state.brief?.region ?? "weddings"}.`;
  }
  if (now >= 6 && now < 9) {
    return `Eight to six months out. the heart of vendor sign. Stay steady.`;
  }
  if (now < 3 && now >= 0) {
    return `Inside three months. let the work land. We'll surface anything urgent.`;
  }
  return `You're twelve months out. Most couples have booked the venue by now.`;
}

function regionCaption(state: ProjectState): string {
  const region = state.brief?.region ?? "The wedding region";
  const date = state.brief?.weddingDate ?? state.brief?.dateWindow ?? "";
  const m = date.match(/(\d{4})-(\d{2})/);
  if (m) {
    const month = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1).toLocaleString("en-US", { month: "long" });
    return `${region} · early ${month}`;
  }
  return region;
}

function doneStamp(
  state: ProjectState,
  item: ChecklistItem,
  wedAt: Date | null,
): string {
  if (item.id === "lock-brief" && state.brief?.lockedAt) {
    const d = new Date(state.brief.lockedAt);
    return `locked ${d.toLocaleString("en-US", { month: "long", day: "numeric" })}`;
  }
  if (wedAt) {
    const d = new Date(wedAt);
    d.setMonth(d.getMonth() - item.monthsOut);
    return `done ${d.toLocaleString("en-US", { month: "short", day: "numeric" })}`;
  }
  return "done";
}
