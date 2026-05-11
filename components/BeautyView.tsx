"use client";

// Beauty. the day-of hair & makeup timeline from Atelier. Editorial summary
// stat row up top, then the back-to-back schedule grouped by service track,
// then trials in a calmer secondary panel. Matches the FloralsView and
// PricingView polish bar.

import { useState } from "react";
import type { BeautyAppt, ProjectState } from "@/lib/types";
import { useProject } from "./StateProvider";
import { useToast } from "./Toast";
import { EmptyState, PageHeader } from "./ui";
import { Reveal } from "./Atmosphere";

const SERVICE_LABEL: Record<BeautyAppt["service"], string> = {
  hair: "Hair",
  makeup: "Makeup",
  both: "Hair + makeup",
};

export function BeautyView() {
  const { state, setState, loading } = useProject();
  const { notify } = useToast();
  const [ceremonyTime, setCeremonyTime] = useState("16:00");
  const [weddingDate, setWeddingDate] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  if (loading || !state) return <div className="pt-10 text-center text-ink-300">Loading…</div>;

  const propose = async () => {
    setBusy("propose");
    try {
      const r = await fetch("/api/beauty", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          op: "propose",
          ceremonyTime,
          weddingDate: weddingDate || new Date().toISOString().slice(0, 10),
        }),
      });
      const j = (await r.json()) as { state?: ProjectState };
      if (j.state) {
        setState(j.state);
        const dayOfCount = j.state.beauty.filter((b) => !b.trial).length;
        notify({
          kind: "agent",
          agent: "Atelier",
          title: dayOfCount === 1 ? "1 appointment scheduled" : `${dayOfCount} appointments scheduled`,
          detail: "Hair starts ~5 hours before ceremony, makeup ~3. Organizer finishes last.",
        });
      }
    } finally { setBusy(null); }
  };

  const trials = state.beauty.filter((b) => b.trial);
  const dayOf = state.beauty
    .filter((b) => !b.trial)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Stat-row metrics
  const totalMinutes = dayOf.reduce((s, b) => s + b.durationMin, 0);
  const peopleCount = new Set(dayOf.map((b) => b.who)).size;
  const startTime = dayOf[0]?.startTime ?? ",";
  const endTime = (() => {
    const last = dayOf[dayOf.length - 1];
    if (!last) return ",";
    const [h, m] = last.startTime.split(":").map(Number);
    if (Number.isNaN(h)) return ",";
    const tot = h * 60 + m + last.durationMin;
    const eh = Math.floor(tot / 60) % 24;
    const em = tot % 60;
    return `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
  })();

  // Group by service to show parallel tracks (hair vs. makeup vs. both)
  const tracks = (["both", "hair", "makeup"] as const)
    .map((s) => ({ service: s, items: dayOf.filter((b) => b.service === s) }))
    .filter((t) => t.items.length > 0);

  return (
    <div className="flex flex-col gap-10 pb-24">
      <PageHeader
        eyebrow="Hair & makeup"
        title="Hair & makeup"
        subtitle="Back-to-back hair + makeup timeline backwards-scheduled from your ceremony. Organizer is last in the chair so the look is fresh."
      />

      <Reveal>
        <section className="surface rounded-card border hairline shadow-card p-4 sm:p-5 grid sm:grid-cols-3 gap-3">
          <label className="text-sm flex flex-col gap-1">
            <span className="eyebrow">Ceremony time</span>
            <input
              type="time"
              value={ceremonyTime}
              onChange={(e) => setCeremonyTime(e.target.value)}
              className="rounded-lg border hairline bg-white/80 px-3 py-2 text-sm focus:outline-none"
            />
          </label>
          <label className="text-sm flex flex-col gap-1">
            <span className="eyebrow">Wedding date</span>
            <input
              type="date"
              value={weddingDate}
              onChange={(e) => setWeddingDate(e.target.value)}
              className="rounded-lg border hairline bg-white/80 px-3 py-2 text-sm focus:outline-none"
            />
          </label>
          <div className="flex items-end">
            <button
              onClick={propose}
              disabled={!!busy || !state.brief?.locked}
              className="w-full rounded-2xl cta-sage px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
              style={{ boxShadow: "0 8px 22px -10px rgba(79,93,68,0.55)" }}
            >
              {busy === "propose"
                ? "Working…"
                : state.beauty.length ? "Reschedule" : "Pull a schedule together"}
            </button>
          </div>
        </section>
      </Reveal>

      {state.beauty.length === 0 ? (
        <EmptyState
          title="No schedule yet"
          hint="We read the wedding party and lay out a back-to-back hair + makeup timeline so you finish last. closest to first look. and nobody's hair flattens."
        />
      ) : (
        <>
          {/* Hero stat row */}
          <Reveal>
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-ink/8 rounded-card overflow-hidden border hairline">
              <Stat
                label="Appointments"
                value={String(dayOf.length)}
                sub={trials.length > 0 ? `+${trials.length} trial${trials.length === 1 ? "" : "s"}` : undefined}
              />
              <Stat
                label="People"
                value={String(peopleCount)}
              />
              <Stat
                label="Window"
                value={startTime === "," ? "," : `${startTime} → ${endTime}`}
                sub={`${Math.round(totalMinutes / 60)}h chair time`}
              />
              <Stat
                label="Tracks"
                value={String(tracks.length)}
                sub={tracks.map((t) => SERVICE_LABEL[t.service]).join(" · ")}
              />
            </section>
          </Reveal>

          {/* Day-of timeline grouped by track */}
          {tracks.map((t) => (
            <Reveal key={t.service}>
              <section>
                <div className="flex items-baseline justify-between mb-4">
                  <h2 className="display italic text-[22px] text-ink leading-tight">
                    {SERVICE_LABEL[t.service]}
                  </h2>
                  <span className="text-[10.5px] uppercase tracking-[0.22em] font-mono text-sage-500 tabular-nums">
                    {t.items.length} {t.items.length === 1 ? "appointment" : "appointments"}
                  </span>
                </div>
                <article className="surface rounded-card border hairline shadow-card overflow-hidden">
                  <ol className="divide-y hairline">
                    {t.items.map((b, i) => (
                      <li
                        key={b.id}
                        className="px-4 sm:px-5 py-3 grid grid-cols-[68px_1fr_auto] gap-3 text-[13.5px] hover:bg-paper-100/50 transition-colors"
                      >
                        <div className="display text-base text-ink tabular-nums leading-tight">
                          {b.startTime}
                          <div className="text-[10px] uppercase tracking-[0.18em] font-mono text-ink-300 mt-0.5">
                            {b.durationMin} min
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="text-ink leading-tight">{b.who}</div>
                          {b.notes && (
                            <div className="text-[12px] text-ink-300 italic mt-1 leading-snug">
                              {b.notes}
                            </div>
                          )}
                        </div>
                        {i === t.items.length - 1 && (
                          <span className="text-[10px] uppercase tracking-[0.2em] font-mono text-sage-500 self-center shrink-0">
                            Last
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>
                </article>
              </section>
            </Reveal>
          ))}

          {/* Trials. calmer secondary panel */}
          {trials.length > 0 && (
            <Reveal>
              <section>
                <div className="flex items-baseline justify-between mb-4">
                  <h2 className="display italic text-[22px] text-ink-400 leading-tight">Trials</h2>
                  <span className="text-[10.5px] uppercase tracking-[0.22em] font-mono text-ink-300 tabular-nums">
                    {trials.length} scheduled
                  </span>
                </div>
                <article className="rounded-card border hairline bg-paper-50/60 overflow-hidden">
                  <ul className="divide-y hairline">
                    {trials.map((b) => (
                      <li key={b.id} className="px-4 sm:px-5 py-3 text-[13.5px]">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-ink">{b.who}</span>
                          <span className="text-[11px] uppercase tracking-[0.18em] font-mono text-ink-300">
                            {SERVICE_LABEL[b.service]}
                          </span>
                        </div>
                        {b.notes && (
                          <div className="text-[12px] text-ink-300 italic mt-1 leading-snug">
                            {b.notes}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </article>
              </section>
            </Reveal>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-paper-100 px-5 py-5 flex flex-col gap-1.5">
      <div className="text-[10px] uppercase tracking-[0.22em] text-sage-500 font-mono">
        {label}
      </div>
      <div className="display text-[22px] sm:text-[26px] leading-tight tabular-nums truncate">
        {value}
      </div>
      {sub && (
        <div className="text-[12px] text-ink-300 mt-0.5 leading-snug truncate">{sub}</div>
      )}
    </div>
  );
}
