"use client";

// Honeymoon. Itinerist's multi-segment proposal. Gateable: when the gate
// is on, segments flagged `surprise: true` are filtered before reaching the
// partner viewer (server side). The page itself shows the planner's view.
//
// Layout: hero with total trip length and country list, surprise-gate
// switch, propose form, then a vertical timeline of segments. each card
// shows city/country, dates, hotel, notes, and whether it's a surprise.

import { useMemo, useState } from "react";
import Link from "next/link";
import type { HoneymoonSegment, ProjectState } from "@/lib/types";
import { useProject } from "./StateProvider";
import { Reveal } from "./Atmosphere";

export function HoneymoonView() {
  const { state, setState, loading } = useProject();
  const [busy, setBusy] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (loading || !state) return <div className="pt-10 text-center text-ink-300">Loading…</div>;

  if (state.viewer === "partner" && state.gates.honeymoon) {
    return (
      <div className="pt-24 text-center">
        <p className="text-[10px] uppercase tracking-[0.32em] text-sage-500 font-mono mb-4">
          Honeymoon
        </p>
        <p className="display italic text-[28px] text-ink-300 leading-tight">
          I don't have anything to share on that.
        </p>
      </div>
    );
  }

  const post = async (body: object, key: string) => {
    setBusy(key); setError(null);
    try {
      const r = await fetch("/api/honeymoon", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
      });
      const j = (await r.json()) as { state?: ProjectState; error?: string };
      if (!r.ok) { setError(j.error ?? `Error ${r.status}`); return; }
      if (j.state) setState(j.state);
    } finally { setBusy(null); }
  };

  const segments = useMemo(
    () =>
      [...state.honeymoon].sort((a, b) =>
        (a.arrivalDate ?? "").localeCompare(b.arrivalDate ?? "")
      ),
    [state.honeymoon],
  );

  const stats = useMemo(() => {
    if (segments.length === 0) {
      return { totalNights: 0, countries: [] as string[], stops: 0, surprises: 0 };
    }
    const countries = Array.from(new Set(segments.map((s) => s.country).filter(Boolean)));
    const surprises = segments.filter((s) => s.surprise).length;
    let totalNights = 0;
    for (const s of segments) {
      const a = parseISO(s.arrivalDate);
      const d = parseISO(s.departureDate);
      if (a && d) totalNights += Math.max(0, Math.round((d.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)));
    }
    return { totalNights, countries, stops: segments.length, surprises };
  }, [segments]);

  const briefLocked = !!state.brief?.locked;
  const gateOn = state.gates.honeymoon;

  // Default the proposal date to wedding date + 7d if known
  const defaultDate = useMemo(() => {
    const m = state.brief?.dateWindow.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return "";
    const t = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00`);
    t.setDate(t.getDate() + 7);
    return t.toISOString().slice(0, 10);
  }, [state.brief?.dateWindow]);

  return (
    <div className="flex flex-col gap-12 pb-12">
      {/* Hero */}
      <header>
        <p className="text-[10px] uppercase tracking-[0.26em] text-sage-500 font-mono mb-2">
          Itinerist · The honeymoon
        </p>
        <div className="flex items-baseline justify-between gap-6 flex-wrap">
          <h1 className="display text-[36px] sm:text-[44px] lg:text-[52px] leading-[1.02] tracking-[-0.01em]">
            {segments.length === 0 ? (
              <>Honeymoon.</>
            ) : (
              <>
                {stats.countries.length === 1
                  ? <>{stats.totalNights} nights in {stats.countries[0]}.</>
                  : <>{stats.totalNights} nights across {stats.countries.length} countries.</>}
              </>
            )}
          </h1>
          {segments.length > 0 && (
            <div className="text-right">
              <div className="display text-[28px] tabular-nums leading-none">
                {stats.stops}
              </div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-ink-300 font-mono mt-1">
                {stats.stops === 1 ? "stop" : "stops"}
              </div>
            </div>
          )}
        </div>
        <p className="text-[14px] text-ink-300 mt-4 leading-relaxed max-w-[60ch]">
          A multi-segment itinerary, sequenced from the day you fly out.
          Mark any leg <span className="italic">surprise</span> and turn the gate on. your partner won't see it on their viewer.
        </p>
      </header>

      {/* Surprise gate */}
      <Reveal>
        <section className="rounded-card border hairline bg-white/85 px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="display italic text-[18px] text-ink leading-tight">Surprise gate</div>
            <div className="text-[12px] text-ink-300 mt-1 leading-snug">
              {gateOn
                ? `On. ${stats.surprises > 0 ? `${stats.surprises} surprise segment${stats.surprises === 1 ? "" : "s"} hidden from the partner viewer.` : "any segment marked surprise will hide from the partner viewer."}`
                : "Off. both viewers see every segment."}
            </div>
          </div>
          <button
            onClick={() => post({ op: gateOn ? "disable_gate" : "enable_gate" }, "gate")}
            disabled={!!busy}
            className={`shrink-0 rounded-full px-5 py-2 text-[12px] uppercase tracking-[0.2em] font-medium transition-all ${
              gateOn
                ? "bg-risk-high/10 text-risk-high border border-risk-high/30 hover:bg-risk-high/15"
                : "cta-sage"
            } disabled:opacity-50`}
          >
            {gateOn ? "Disable gate" : "Enable gate"}
          </button>
        </section>
      </Reveal>

      {/* Propose */}
      <Reveal>
        <section>
          <div className="text-[10px] uppercase tracking-[0.22em] text-sage-500 font-mono mb-3">
            {segments.length === 0 ? "Get started" : "Re-propose"}
          </div>
          <div className="rounded-card border hairline bg-white/85 px-5 py-4 flex items-end gap-4 flex-wrap">
            <label className="flex flex-col gap-1 min-w-0 flex-1">
              <span className="text-[10px] uppercase tracking-[0.22em] text-ink-300 font-mono">
                Wedding date
              </span>
              <input
                type="date"
                value={date || defaultDate}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-lg border hairline bg-paper-50 px-3 py-2 text-[14px] focus:outline-none focus:border-sage-300"
              />
            </label>
            <button
              onClick={() => (date || defaultDate) && post({ op: "propose", weddingDate: date || defaultDate }, "propose")}
              disabled={!!busy || (!date && !defaultDate) || !briefLocked}
              className="btn-primary"
              style={{ paddingInline: "1.4rem", paddingBlock: "0.55rem" }}
            >
              {busy === "propose"
                ? "Working…"
                : segments.length === 0 ? "Sketch an itinerary" : "Try a different one"}
            </button>
          </div>
          {!briefLocked && (
            <p className="text-[12px] text-ink-300 mt-2">
              Lock the brief first.{" "}
              <Link href="/brief" className="underline-offset-4 underline hover:text-sage-500">
                Open brief
              </Link>
              .
            </p>
          )}
          {error && <p className="text-sm text-risk-high mt-2">{error}</p>}
        </section>
      </Reveal>

      {/* Segments. vertical timeline */}
      {segments.length === 0 ? (
        <Reveal>
          <div className="rounded-card border hairline bg-white/55 px-7 py-12 max-w-xl">
            <p className="display text-[26px] text-ink leading-tight">No segments yet.</p>
            <p className="text-[14px] text-ink-300 mt-3 leading-relaxed">
              Set the wedding date and Itinerist will propose 2-4 segments starting roughly seven days after. anchoring on real towns, real hotels, real seasonality.
            </p>
          </div>
        </Reveal>
      ) : (
        <Reveal>
          <section>
            <h2 className="display italic text-[22px] text-ink leading-tight mb-5">
              The route
            </h2>
            <ol className="relative">
              {/* Vertical connecting line */}
              <span
                className="absolute left-[7px] top-2 bottom-2 w-px bg-gradient-to-b from-sage-400 via-sage-300 to-transparent"
                aria-hidden
              />
              {segments.map((s, i) => (
                <SegmentRow
                  key={s.id}
                  s={s}
                  index={i}
                  last={i === segments.length - 1}
                />
              ))}
            </ol>
          </section>
        </Reveal>
      )}
    </div>
  );
}

// --------------------------------------------------------------------

function SegmentRow({
  s, index, last,
}: {
  s: HoneymoonSegment;
  index: number;
  last: boolean;
}) {
  const arr = parseISO(s.arrivalDate);
  const dep = parseISO(s.departureDate);
  const nights = arr && dep ? Math.max(0, Math.round((dep.getTime() - arr.getTime()) / (1000 * 60 * 60 * 24))) : null;
  const dateRange = arr && dep
    ? `${arr.toLocaleDateString(undefined, { month: "short", day: "numeric" })} → ${dep.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
    : `${s.arrivalDate} → ${s.departureDate}`;

  return (
    <li className={`relative pl-8 ${last ? "pb-0" : "pb-6"}`}>
      {/* Node on the rail */}
      <span
        className={`absolute left-0 top-3 w-[15px] h-[15px] rounded-full border-2 ${
          s.surprise
            ? "bg-risk-medium/15 border-risk-medium"
            : "bg-paper border-sage-500"
        }`}
        aria-hidden
      >
        {s.surprise && (
          <span className="absolute inset-1 rounded-full bg-risk-medium" />
        )}
      </span>

      <article className="surface rounded-card card-shell hover:shadow-cardHover transition-all overflow-hidden">
        <div className="px-5 pt-4 pb-5">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-sage-500 font-mono">
                Leg {index + 1} · {dateRange}
                {nights !== null && (
                  <span className="text-ink-300"> · {nights} {nights === 1 ? "night" : "nights"}</span>
                )}
              </p>
              <h3 className="display text-[24px] mt-1 leading-tight">
                {s.city}
                <span className="text-ink-300">, </span>
                <span className="italic text-ink-400">{s.country}</span>
              </h3>
            </div>
            {s.surprise && (
              <span className="text-[10px] uppercase tracking-[0.2em] text-risk-medium border border-risk-medium/40 rounded-full px-2.5 py-1 font-mono shrink-0">
                Surprise
              </span>
            )}
          </div>
          {s.hotel && (
            <p className="text-[13.5px] text-ink-400 mt-3">
              <span className="text-[10px] uppercase tracking-[0.22em] text-ink-300 font-mono mr-2">
                Stay
              </span>
              {s.hotel}
            </p>
          )}
          {s.notes && (
            <p className="text-[13.5px] text-ink-400 mt-2 leading-relaxed">{s.notes}</p>
          )}
        </div>
      </article>
    </li>
  );
}

// --------------------------------------------------------------------

function parseISO(s: string): Date | null {
  if (!s) return null;
  const m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00`);
}
