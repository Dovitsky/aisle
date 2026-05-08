"use client";

import { useState } from "react";
import type { ProjectState } from "@/lib/types";
import { useProject } from "./StateProvider";
import { EmptyState, PageHeader } from "./ui";

export function BeautyView() {
  const { state, setState, loading } = useProject();
  const [ceremonyTime, setCeremonyTime] = useState("16:00");
  const [weddingDate, setWeddingDate] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  if (loading || !state) return <div className="pt-10 text-center text-ink-300">Loading…</div>;

  const propose = async () => {
    setBusy("propose");
    try {
      const r = await fetch("/api/beauty", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "propose", ceremonyTime, weddingDate: weddingDate || new Date().toISOString().slice(0, 10) }),
      });
      const j = (await r.json()) as { state?: ProjectState };
      if (j.state) setState(j.state);
    } finally { setBusy(null); }
  };

  const trials = state.beauty.filter((b) => b.trial);
  const dayOf = state.beauty.filter((b) => !b.trial).sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Atelier"
        title="Hair & makeup"
        subtitle="Day-of beauty schedule. Hair starts ~5 hours before ceremony, makeup ~3 hours before. Organizer last to finish."
      />

      <section className="surface rounded-card border hairline shadow-card p-4 sm:p-5 grid sm:grid-cols-3 gap-3">
        <label className="text-sm flex flex-col gap-1">
          <span className="eyebrow">Ceremony time</span>
          <input type="time" value={ceremonyTime} onChange={(e) => setCeremonyTime(e.target.value)} className="rounded-lg border hairline bg-white/80 px-3 py-2 text-sm focus:outline-none" />
        </label>
        <label className="text-sm flex flex-col gap-1">
          <span className="eyebrow">Wedding date</span>
          <input type="date" value={weddingDate} onChange={(e) => setWeddingDate(e.target.value)} className="rounded-lg border hairline bg-white/80 px-3 py-2 text-sm focus:outline-none" />
        </label>
        <div className="flex items-end">
          <button onClick={propose} disabled={!!busy || !state.brief?.locked} className="w-full rounded-2xl bg-ink text-paper-50 hover:bg-ink-400 px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50">
            {busy === "propose" ? "Atelier working…" : state.beauty.length ? "Re-propose" : "Schedule"}
          </button>
        </div>
      </section>

      {state.beauty.length === 0 ? (
        <EmptyState title="No schedule yet" hint="Atelier reads the wedding party and computes a back-to-back hair + makeup timeline so the organizer finishes last (closest to first look)." />
      ) : (
        <>
          {dayOf.length > 0 && (
            <section className="surface rounded-card border hairline shadow-card p-4 sm:p-5">
              <h2 className="display text-lg mb-2">Day-of timeline</h2>
              <ol className="divide-y hairline">
                {dayOf.map((b) => (
                  <li key={b.id} className="py-2.5 grid grid-cols-[60px_1fr_auto] gap-3 text-[13px]">
                    <div className="display text-base text-ink-300 tabular-nums">{b.startTime}</div>
                    <div>
                      <div>{b.who}</div>
                      <div className="text-[11px] text-ink-300">{b.service} · {b.durationMin} min</div>
                    </div>
                    <div className="text-[11px] text-ink-300 text-right self-center max-w-[160px]">{b.notes ?? ""}</div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {trials.length > 0 && (
            <section className="surface rounded-card border hairline shadow-card p-4 sm:p-5">
              <h2 className="display text-lg mb-2">Trials</h2>
              <ul className="divide-y hairline">
                {trials.map((b) => (
                  <li key={b.id} className="py-2 text-[13px]">
                    <div>{b.who} — {b.service}</div>
                    {b.notes && <div className="text-[11px] text-ink-300">{b.notes}</div>}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
