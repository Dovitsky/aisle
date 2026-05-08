"use client";

// Seating — Cartographer floor plan + NL instruction input + explainer.

import { useMemo, useState } from "react";
import type { ProjectState } from "@/lib/types";
import { useProject } from "./StateProvider";
import { EmptyState, PageHeader } from "./ui";

export function SeatingView() {
  const { state, setState, loading } = useProject();
  const [tableSize, setTableSize] = useState(8);
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const guestsByTable = useMemo(() => {
    const m: Record<string, { id: string; name: string; side: string }[]> = {};
    if (!state) return m;
    for (const g of state.guests) {
      const tid = state.seating.assignments[g.id];
      if (!tid) continue;
      m[tid] = m[tid] || [];
      m[tid].push({ id: g.id, name: g.preferredName ?? g.fullName, side: g.side });
    }
    return m;
  }, [state]);

  if (loading || !state) return <div className="pt-10 text-center text-ink-300">Loading…</div>;

  const init = async () => {
    setBusy("init"); setError(null);
    try {
      const r = await fetch("/api/seating", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "init_tables", tableSize }),
      });
      const j = (await r.json()) as { state?: ProjectState; error?: string };
      if (!r.ok) { setError(j.error ?? `Error ${r.status}`); return; }
      if (j.state) setState(j.state);
    } finally { setBusy(null); }
  };

  const solve = async () => {
    setBusy("solve"); setError(null);
    const t0 = performance.now();
    try {
      const r = await fetch("/api/seating", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "solve" }),
      });
      const j = (await r.json()) as { state?: ProjectState; cost?: number; error?: string };
      if (!r.ok) { setError(j.error ?? `Error ${r.status}`); return; }
      if (j.state) setState(j.state);
      const ms = Math.round(performance.now() - t0);
      setExplanation(`Solver returned cost ${j.cost ?? "?"} in ${ms}ms.`);
    } finally { setBusy(null); }
  };

  const addInstruction = async () => {
    if (!instruction.trim()) return;
    setBusy("instr"); setError(null);
    try {
      const r = await fetch("/api/seating", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "instruction", text: instruction }),
      });
      const j = (await r.json()) as { state?: ProjectState; added?: number; error?: string };
      if (!r.ok) { setError(j.error ?? `Error ${r.status}`); return; }
      if (j.state) setState(j.state);
      setInstruction("");
      setExplanation(`Added ${j.added ?? 0} constraint(s).`);
    } finally { setBusy(null); }
  };

  const explain = async (guestId: string) => {
    setBusy("explain"); setError(null);
    try {
      const r = await fetch("/api/seating", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "explain", guestId }),
      });
      const j = (await r.json()) as { explanation?: string; error?: string };
      if (j.explanation) setExplanation(j.explanation);
    } finally { setBusy(null); }
  };

  const proposeLock = async () => {
    setBusy("lock"); setError(null);
    try {
      const r = await fetch("/api/seating", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "propose_lock" }),
      });
      const j = (await r.json()) as { state?: ProjectState; error?: string };
      if (!r.ok) { setError(j.error ?? `Error ${r.status}`); return; }
      if (j.state) setState(j.state);
    } finally { setBusy(null); }
  };

  const yesCount = state.guests.filter((g) => g.rsvp === "yes").length;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Cartographer"
        title="Seating"
        subtitle={`Annealing solver against typed constraints. Tell the agent things like "Don't seat Karen near James" or "Put college friends together" and re-solve.`}
      />

      {state.guests.length === 0 ? (
        <EmptyState
          title="No guests to seat yet"
          hint="Open Guests and seed a demo list, or add a few households."
          action={{ label: "Open Guests", href: "/guests", primary: true }}
        />
      ) : (
        <section className="surface rounded-card border hairline shadow-card p-4 sm:p-5 flex flex-wrap gap-3 items-end">
          <label className="text-sm flex flex-col gap-1">
            <span className="eyebrow">Seats per table</span>
            <input
              type="number" min={2} max={20}
              value={tableSize}
              onChange={(e) => setTableSize(Number(e.target.value))}
              className="w-20 rounded border hairline bg-white/80 px-2 py-2 text-sm"
            />
          </label>
          <button onClick={init} disabled={!!busy} className="rounded-2xl border hairline bg-white/80 hover:bg-white px-4 py-2 text-sm transition-colors disabled:opacity-50">
            {busy === "init" ? "Initializing…" : `Init tables (${Math.max(1, Math.ceil((yesCount || state.guests.length) / tableSize))})`}
          </button>
          <button onClick={solve} disabled={!!busy || !state.seating.tables.length} className="rounded-2xl bg-ink text-paper-50 hover:bg-ink-400 px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50">
            {busy === "solve" ? "Solving…" : "Solve"}
          </button>
          <button onClick={proposeLock} disabled={!!busy || !Object.keys(state.seating.assignments).length} className="rounded-2xl border hairline bg-white/80 hover:bg-white px-4 py-2 text-sm transition-colors disabled:opacity-50">
            Propose lock
          </button>
        </section>
      )}

      {state.seating.tables.length > 0 && (
        <>
          <section className="surface rounded-card border hairline shadow-card p-3 sm:p-4">
            <div className="flex gap-2">
              <input
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addInstruction()}
                placeholder={`e.g., "Don't seat Karen Lee near James Lee" — then re-solve`}
                className="flex-1 rounded-lg border hairline bg-white/80 px-3 py-2 text-sm focus:outline-none"
              />
              <button onClick={addInstruction} disabled={!!busy || !instruction.trim()} className="rounded-2xl bg-ink text-paper-50 hover:bg-ink-400 px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50">
                {busy === "instr" ? "…" : "Add constraint"}
              </button>
            </div>
            <div className="mt-2 text-[12px] text-ink-300 flex items-center gap-3">
              <span>Constraints: <strong className="text-ink">{state.seating.constraints.length}</strong></span>
              <span>Cost: <strong className="text-ink">{state.seating.cost}</strong></span>
              {state.seating.locked && <span className="eyebrow text-risk-low">locked</span>}
            </div>
          </section>

          {error && <p className="text-sm text-risk-high">{error}</p>}
          {explanation && (
            <div className="rounded-card border hairline bg-white/70 px-4 py-3 text-sm italic text-ink-400 animate-fade-in-soft">
              {explanation}
            </div>
          )}

          <div className="grid lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-4">
            <div className="surface rounded-card border hairline shadow-card p-2 aspect-[5/4]">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                {state.seating.tables.map((t) => {
                  const seated = guestsByTable[t.id]?.length ?? 0;
                  const over = seated > t.capacity;
                  return (
                    <g key={t.id}>
                      {t.shape === "round" ? (
                        <circle cx={t.x} cy={t.y} r={5.5} fill={over ? "#A23F33" : "#FBF8F1"} stroke="#1A1814" strokeWidth={0.4} />
                      ) : (
                        <rect x={t.x - 6} y={t.y - 3} width={12} height={6} fill={over ? "#A23F33" : "#FBF8F1"} stroke="#1A1814" strokeWidth={0.4} rx={0.6} />
                      )}
                      <text x={t.x} y={t.y - 0.5} textAnchor="middle" fontSize={2.6} fill="#1A1814" className="font-display">{t.label.replace("Table ", "")}</text>
                      <text x={t.x} y={t.y + 2.2} textAnchor="middle" fontSize={1.8} fill="#6B655A">{seated}/{t.capacity}</text>
                    </g>
                  );
                })}
              </svg>
            </div>

            <div className="flex flex-col gap-2 max-h-[600px] overflow-y-auto pr-1 stagger">
              {state.seating.tables.map((t) => {
                const guests = guestsByTable[t.id] ?? [];
                return (
                  <div key={t.id} className="surface rounded-card border hairline shadow-card px-3 py-2.5">
                    <div className="flex items-baseline justify-between">
                      <h3 className="display text-base">{t.label}</h3>
                      <span className="eyebrow">{guests.length}/{t.capacity}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {guests.map((g) => (
                        <button
                          key={g.id}
                          onClick={() => explain(g.id)}
                          className={`text-[11px] rounded-full px-2 py-1 border transition-colors ${
                            g.side === "organizer" ? "border-accent/30 bg-accent-wash/40 hover:bg-accent-wash/70" :
                            g.side === "partner" ? "border-ink/15 bg-paper-200/40 hover:bg-paper-200/70" :
                            "border-ink/10 bg-white/70 hover:bg-white"
                          }`}
                          title="Click to ask Cartographer why"
                        >
                          {g.name}
                        </button>
                      ))}
                      {!guests.length && <span className="text-[12px] text-ink-300 italic">empty</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
