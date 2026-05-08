"use client";

// Day-Of console — PRD §5.5. Live timeline + contingency bands + Maestro Jr. mode.

import { useState } from "react";
import type { DayOfStatus, ProjectState } from "@/lib/types";
import { useProject } from "./StateProvider";
import { EmptyState, PageHeader } from "./ui";

const STATUS_ORDER: DayOfStatus[] = ["pending", "in_progress", "done", "delayed", "skipped"];
const STATUS_TONE: Record<DayOfStatus, string> = {
  pending: "border-ink/15 text-ink-300 bg-paper-200/40",
  in_progress: "border-accent/30 text-accent bg-accent-wash/40",
  done: "border-risk-low/30 text-risk-low bg-risk-low/5",
  delayed: "border-risk-high/30 text-risk-high bg-risk-high/5 animate-pulse-soft",
  skipped: "border-ink/10 text-ink-300 bg-paper-200/30 line-through",
};

const TOPIC_LABEL: Record<string, string> = {
  weather: "Weather",
  timeline_slip: "Timeline slip",
  vendor_late: "Vendor late",
  vendor_no_show: "Vendor no-show",
  guest_medical: "Guest medical",
  intoxication: "Intoxication near bar",
};

export function DayOfView() {
  const { state, setState, loading } = useProject();
  const [busy, setBusy] = useState<string | null>(null);

  if (loading || !state) return <div className="pt-10 text-center text-ink-300">Loading…</div>;

  const seedItems = async () => {
    setBusy("seed");
    try {
      const r = await fetch("/api/dayof", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "seed_template" }),
      });
      const j = (await r.json()) as { state?: ProjectState };
      if (j.state) setState(j.state);
    } finally { setBusy(null); }
  };

  const seedBands = async () => {
    setBusy("bands");
    try {
      const r = await fetch("/api/contingencies", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "seed_default" }),
      });
      const j = (await r.json()) as { state?: ProjectState };
      if (j.state) setState(j.state);
    } finally { setBusy(null); }
  };

  const cycle = async (id: string, current: DayOfStatus) => {
    const idx = STATUS_ORDER.indexOf(current);
    const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
    const r = await fetch("/api/dayof", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ op: "update", id, patch: { status: next } }),
    });
    const j = (await r.json()) as { state?: ProjectState };
    if (j.state) setState(j.state);
  };

  const trigger = async (id: string) => {
    const note = window.prompt(`Trigger note (what's happening?)`, "");
    if (!note) return;
    const r = await fetch("/api/contingencies", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ op: "trigger", id, note }),
    });
    const j = (await r.json()) as { state?: ProjectState };
    if (j.state) setState(j.state);
  };

  const toggleMode = async () => {
    setBusy("mode");
    try {
      const r = await fetch("/api/contingencies", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "toggle_day_of_mode", on: !state.dayOfMode }),
      });
      const j = (await r.json()) as { state?: ProjectState };
      if (j.state) setState(j.state);
    } finally { setBusy(null); }
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Wedding Day"
        title="Day-of console"
        subtitle="Approval queue is suspended in this mode. Maestro Jr. handles real-time decisions inside pre-approved bands; anything outside escalates first to the planner, then the couple as last resort."
      />

      <section className="surface rounded-card border hairline shadow-card p-4 sm:p-5 flex items-center justify-between gap-3">
        <div>
          <div className="display text-lg">Day-of mode</div>
          <div className="text-[12px] text-ink-300">{state.dayOfMode ? "Engaged. Chat is read-only. Bands armed." : "Off. Approval queue is live."}</div>
        </div>
        <button
          onClick={toggleMode}
          disabled={!!busy}
          className={`rounded-2xl px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${state.dayOfMode ? "bg-risk-high text-paper-50 hover:opacity-90" : "bg-ink text-paper-50 hover:bg-ink-400"}`}
        >
          {state.dayOfMode ? "Release" : "Engage"}
        </button>
      </section>

      <section className="surface rounded-card border hairline shadow-card p-4 sm:p-5">
        <div className="flex items-baseline justify-between gap-2 flex-wrap mb-3">
          <h2 className="display text-xl">Contingency bands</h2>
          {state.contingencies.length === 0 && (
            <button onClick={seedBands} disabled={!!busy} className="rounded-2xl border hairline bg-white/80 hover:bg-white px-3 py-1.5 text-sm transition-colors disabled:opacity-50">
              {busy === "bands" ? "…" : "Seed default bands"}
            </button>
          )}
        </div>
        {state.contingencies.length === 0 ? (
          <p className="text-sm text-ink-300 italic">No bands yet — Maestro Jr. needs these to act day-of.</p>
        ) : (
          <ul className="grid sm:grid-cols-2 gap-2 stagger">
            {state.contingencies.map((b) => (
              <li key={b.id} className={`rounded-card border ${b.triggered ? "border-risk-high/30 bg-risk-high/5" : "hairline bg-white/60 hover:bg-white"} p-3 transition-colors`}>
                <div className="flex items-baseline justify-between">
                  <h3 className="display text-base">{TOPIC_LABEL[b.topic]}</h3>
                  <span className="eyebrow">→ {b.escalation}</span>
                </div>
                <p className="text-[12px] text-ink-400 mt-1.5 leading-relaxed">{b.preApproved}</p>
                {b.triggered ? (
                  <p className="text-[12px] text-risk-high mt-2 italic">⚠ Triggered: {b.triggerNote}</p>
                ) : (
                  <button onClick={() => trigger(b.id)} disabled={!state.dayOfMode} className="mt-2 chip chip-off disabled:opacity-50">
                    Trigger
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="surface rounded-card border hairline shadow-card p-4 sm:p-5">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="display text-xl">Timeline</h2>
          {state.dayOf.length === 0 && (
            <button onClick={seedItems} disabled={!!busy} className="rounded-2xl border hairline bg-white/80 hover:bg-white px-3 py-1.5 text-sm transition-colors disabled:opacity-50">
              {busy === "seed" ? "…" : "Seed standard timeline"}
            </button>
          )}
        </div>
        {state.dayOf.length === 0 ? (
          <p className="text-sm text-ink-300 italic">No timeline yet.</p>
        ) : (
          <ol className="flex flex-col">
            {state.dayOf.map((item) => (
              <li key={item.id} className="grid grid-cols-[60px_1fr_auto] items-center gap-3 border-t hairline py-3 first:border-t-0 first:pt-0 last:pb-0">
                <div className="display text-lg leading-none text-ink-300 tabular-nums">{item.time}</div>
                <div className="min-w-0">
                  <div className="text-[14px]">{item.title}</div>
                  <div className="text-[11px] text-ink-300">{item.owner}</div>
                </div>
                <button
                  onClick={() => cycle(item.id, item.status)}
                  className={`text-[10px] uppercase tracking-[0.14em] border rounded-full px-2.5 py-1 transition-colors ${STATUS_TONE[item.status]}`}
                >
                  {item.status.replace("_", " ")}
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
