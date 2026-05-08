"use client";

import { useState } from "react";
import type { ProjectState } from "@/lib/types";
import { useProject } from "./StateProvider";
import { EmptyState, PageHeader } from "./ui";

export function HoneymoonView() {
  const { state, setState, loading } = useProject();
  const [busy, setBusy] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (loading || !state) return <div className="pt-10 text-center text-ink-300">Loading…</div>;

  if (state.viewer === "partner" && state.gates.honeymoon) {
    return <p className="pt-16 text-center text-ink-300 animate-fade-in-soft">I don&apos;t have anything to share on that.</p>;
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

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Itinerist · Gateable"
        title="Honeymoon"
        subtitle="Multi-segment itinerary. Mark any segment surprise and turn the gate on; the partner won't see it."
      />

      <section className="surface rounded-card border hairline shadow-card p-4 sm:p-5 flex items-center justify-between gap-3">
        <div>
          <div className="display text-lg">Surprise gate</div>
          <div className="text-[12px] text-ink-300">{state.gates.honeymoon ? "On — partner cannot see surprise segments." : "Off — partner can see everything."}</div>
        </div>
        <button
          onClick={() => post({ op: state.gates.honeymoon ? "disable_gate" : "enable_gate" }, "gate")}
          disabled={!!busy}
          className={`rounded-2xl px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${state.gates.honeymoon ? "bg-risk-high text-paper-50 hover:opacity-90" : "bg-ink text-paper-50 hover:bg-ink-400"}`}
        >
          {state.gates.honeymoon ? "Disable" : "Enable"}
        </button>
      </section>

      <section className="surface rounded-card border hairline shadow-card p-4 sm:p-5">
        <h2 className="display text-xl mb-2">Propose itinerary</h2>
        <div className="flex gap-2 flex-wrap">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border hairline bg-white/80 px-3 py-2 text-sm focus:outline-none" />
          <button
            onClick={() => date && post({ op: "propose", weddingDate: date }, "propose")}
            disabled={!!busy || !date || !state.brief?.locked}
            className="rounded-2xl bg-ink text-paper-50 hover:bg-ink-400 px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {busy === "propose" ? "Itinerist working…" : "Propose"}
          </button>
        </div>
        {!state.brief?.locked && <p className="text-xs text-ink-300 mt-2">Lock the brief first.</p>}
        {error && <p className="text-sm text-risk-high mt-2">{error}</p>}
      </section>

      {state.honeymoon.length === 0 ? (
        <EmptyState title="No segments yet" hint="Pick the wedding date and Itinerist will propose 2-4 segments starting ~7 days after." />
      ) : (
        <ol className="grid sm:grid-cols-2 gap-3 stagger">
          {state.honeymoon.map((s) => (
            <li key={s.id} className="surface rounded-card border hairline shadow-card hover:shadow-cardHover transition-shadow p-4">
              <div className="flex items-baseline justify-between">
                <h3 className="display text-base">{s.city}, {s.country}</h3>
                {s.surprise && <span className="eyebrow text-risk-medium">surprise</span>}
              </div>
              <div className="text-[12px] text-ink-300 mt-1">{s.arrivalDate} → {s.departureDate}</div>
              {s.hotel && <div className="text-[13px] mt-2"><span className="text-ink-300">Hotel:</span> {s.hotel}</div>}
              {s.notes && <p className="text-[13px] text-ink-400 mt-1 leading-relaxed">{s.notes}</p>}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
