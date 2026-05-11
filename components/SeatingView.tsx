"use client";

// Seating. Quartermaster floor plan + NL constraint input + per-guest
// explainer. The most stressful spreadsheet exercise of any wedding,
// reframed as a constraint-satisfaction conversation.
//
// Layout: editorial hero with state-aware count (no guests / N to seat /
// N seated at M tables + cost), sage-mono toolbar with init/solve/lock,
// NL constraint card with running constraint+cost counter, floor-plan
// SVG paired with per-table card-shell grid, explanation card pinned
// under the floor plan when the solver speaks.

import { useMemo, useState } from "react";
import type { ProjectState } from "@/lib/types";
import { useProject } from "./StateProvider";
import { Reveal, CountUp } from "./Atmosphere";

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

  const yesCount = state.guests.filter((g) => g.rsvp === "yes").length;
  const seatedCount = Object.keys(state.seating.assignments).length;
  const tableCount = state.seating.tables.length;
  const constraintCount = state.seating.constraints.length;
  const locked = state.seating.locked;

  const post = async (body: object, key: string, then?: (j: any) => void) => {
    setBusy(key); setError(null);
    try {
      const r = await fetch("/api/seating", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await r.json()) as { state?: ProjectState; error?: string; cost?: number; added?: number; explanation?: string };
      if (!r.ok) { setError(j.error ?? `Error ${r.status}`); return; }
      if (j.state) setState(j.state);
      then?.(j);
    } finally { setBusy(null); }
  };

  const init = () => post({ op: "init_tables", tableSize }, "init", () => {
    setExplanation(null);
  });
  const solve = () => {
    const t0 = performance.now();
    post({ op: "solve" }, "solve", (j) => {
      const ms = Math.round(performance.now() - t0);
      setExplanation(`Solver returned cost ${j.cost ?? "?"} in ${ms}ms.`);
    });
  };
  const addInstruction = () => {
    if (!instruction.trim()) return;
    post({ op: "instruction", text: instruction }, "instr", (j) => {
      setInstruction("");
      setExplanation(`Added ${j.added ?? 0} constraint(s). Re-solve to apply.`);
    });
  };
  const explain = (guestId: string) =>
    post({ op: "explain", guestId }, "explain", (j) => {
      if (j.explanation) setExplanation(j.explanation);
    });
  const proposeLock = () => post({ op: "propose_lock" }, "lock");

  // --------------- No guests yet ---------------
  if (state.guests.length === 0) {
    return (
      <div className="flex flex-col gap-12 pb-12">
        <header>
          <p className="text-[10px] uppercase tracking-[0.26em] text-sage-500 font-mono mb-2">
            Quartermaster · The seating chart
          </p>
          <h1 className="display text-[36px] sm:text-[44px] lg:text-[52px] leading-[1.02] tracking-[-0.01em]">
            <span className="italic text-sage-500">Nothing</span> to seat yet.
          </h1>
          <p className="text-[14px] text-ink-300 mt-4 leading-relaxed max-w-[60ch]">
            Add a few households on the Guests page first. Once you have names, Quartermaster
            can lay out tables and accept constraints in plain English.
          </p>
        </header>
        <Reveal>
          <a
            href="/guests"
            className="btn-primary inline-block w-fit"
            style={{ paddingInline: "1.4rem", paddingBlock: "0.55rem" }}
          >
            Open Guests
          </a>
        </Reveal>
      </div>
    );
  }

  const tablesNeeded = Math.max(1, Math.ceil((yesCount || state.guests.length) / tableSize));

  return (
    <div className="flex flex-col gap-12 pb-12">
      {/* Hero */}
      <header>
        <p className="text-[10px] uppercase tracking-[0.26em] text-sage-500 font-mono mb-2">
          Quartermaster · The seating chart
        </p>
        <div className="flex items-baseline justify-between gap-6 flex-wrap">
          <h1 className="display text-[36px] sm:text-[44px] lg:text-[52px] leading-[1.02] tracking-[-0.01em]">
            {locked ? (
              <>Seating's <span className="italic text-sage-500">locked</span>.</>
            ) : tableCount === 0 ? (
              <><CountUp value={yesCount || state.guests.length} /> guests,{" "}
                <span className="italic text-sage-500">where will they sit?</span></>
            ) : (
              <><CountUp value={seatedCount} /> at{" "}
                <span className="italic text-sage-500">{tableCount} tables</span>.</>
            )}
          </h1>
          {tableCount > 0 && (
            <div className="text-right">
              <div className="display text-[28px] tabular-nums leading-none text-sage-500">
                {state.seating.cost}
              </div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-ink-300 font-mono mt-1">
                cost
              </div>
            </div>
          )}
        </div>
        <p className="text-[14px] text-ink-300 mt-4 leading-relaxed max-w-[60ch]">
          Annealing solver against typed constraints. Tell Quartermaster things like
          <span className="italic text-ink"> &ldquo;Don&rsquo;t seat Karen near James&rdquo;</span> or
          <span className="italic text-ink"> &ldquo;Put college friends together&rdquo;</span> and
          re-solve. Lower cost is a better fit.
        </p>
      </header>

      {/* Toolbar */}
      <Reveal>
        <section className="rounded-card border hairline bg-white/85 px-5 py-5">
          <p className="text-[10px] uppercase tracking-[0.22em] text-sage-500 font-mono mb-4">
            {tableCount === 0 ? "Lay out the room" : "Re-balance"}
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-[0.18em] text-ink-300 font-mono">
                Seats per table
              </span>
              <input
                type="number" min={2} max={20}
                value={tableSize}
                onChange={(e) => setTableSize(Number(e.target.value))}
                className="w-20 rounded-lg border hairline bg-paper-50 px-3 py-1.5 text-[14px] focus:outline-none focus:border-sage-300"
              />
            </label>
            <button
              onClick={init}
              disabled={!!busy || locked}
              className="text-[11px] uppercase tracking-[0.18em] border border-ink/15 hover:border-ink/30 rounded-full px-3.5 py-1.5 transition-colors text-ink-400 hover:text-ink disabled:opacity-50"
            >
              {busy === "init" ? "Initializing…" : `${tableCount > 0 ? "Re-init" : "Init"} · ${tablesNeeded} tables`}
            </button>
            <button
              onClick={solve}
              disabled={!!busy || !tableCount || locked}
              className="btn-primary"
              style={{ paddingInline: "1.4rem", paddingBlock: "0.55rem" }}
            >
              {busy === "solve" ? "Solving…" : seatedCount > 0 ? "Re-solve" : "Solve"}
            </button>
            <button
              onClick={proposeLock}
              disabled={!!busy || !seatedCount || locked}
              className="text-[11px] uppercase tracking-[0.18em] border border-sage-300 hover:border-sage-500 text-sage-500 rounded-full px-3.5 py-1.5 transition-colors disabled:opacity-40"
            >
              {locked ? "Locked" : "Propose lock"}
            </button>
          </div>
        </section>
      </Reveal>

      {/* NL constraint input */}
      {tableCount > 0 && (
        <Reveal>
          <section className="rounded-card border hairline bg-white/85 px-5 py-5">
            <p className="text-[10px] uppercase tracking-[0.22em] text-sage-500 font-mono mb-3">
              Constraints, in plain English
            </p>
            <div className="flex gap-2">
              <input
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addInstruction()}
                placeholder={`Don't seat Karen near James · Put the college friends together · Keep the parents at one table`}
                className="flex-1 rounded-lg border hairline bg-paper-50 px-3 py-2 text-[14px] focus:outline-none focus:border-sage-300"
              />
              <button
                onClick={addInstruction}
                disabled={!!busy || !instruction.trim()}
                className="btn-primary shrink-0"
                style={{ paddingInline: "1.2rem", paddingBlock: "0.55rem" }}
              >
                {busy === "instr" ? "…" : "Add"}
              </button>
            </div>
            <div className="mt-3 flex items-center gap-5 text-[11.5px] text-ink-300">
              <span className="flex items-baseline gap-1.5">
                <span className="text-[10px] uppercase tracking-[0.18em] font-mono">Constraints</span>
                <span className="text-ink tabular-nums">{constraintCount}</span>
              </span>
              <span className="flex items-baseline gap-1.5">
                <span className="text-[10px] uppercase tracking-[0.18em] font-mono">Cost</span>
                <span className="text-ink tabular-nums">{state.seating.cost}</span>
              </span>
              {locked && (
                <span className="text-[10px] uppercase tracking-[0.18em] font-mono text-sage-500">
                  Locked
                </span>
              )}
            </div>
          </section>
        </Reveal>
      )}

      {error && <p className="text-[13px] text-risk-high">{error}</p>}

      {/* Floor plan + tables */}
      {tableCount > 0 && (
        <Reveal>
          <section>
            <h2 className="display italic text-[22px] text-ink leading-tight mb-5">
              The room
            </h2>
            <div className="grid lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-4 items-start">
              <div className="surface rounded-card card-shell p-3 aspect-[5/4]">
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
                        <text x={t.x} y={t.y - 0.5} textAnchor="middle" fontSize={2.6} fill="#1A1814" className="font-display">
                          {t.label.replace("Table ", "")}
                        </text>
                        <text x={t.x} y={t.y + 2.2} textAnchor="middle" fontSize={1.8} fill="#6B655A">
                          {seated}/{t.capacity}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              <ul className="flex flex-col gap-3 max-h-[600px] overflow-y-auto pr-1">
                {state.seating.tables.map((t) => {
                  const guests = guestsByTable[t.id] ?? [];
                  const over = guests.length > t.capacity;
                  return (
                    <li
                      key={t.id}
                      className={`surface rounded-card card-shell px-4 py-3 ${
                        over ? "ring-1 ring-risk-high/40" : ""
                      }`}
                    >
                      <div className="flex items-baseline justify-between mb-1.5">
                        <h3 className="display italic text-[17px] text-ink leading-tight">
                          {t.label}
                        </h3>
                        <span className={`text-[10px] uppercase tracking-[0.18em] font-mono ${
                          over ? "text-risk-high" : guests.length === 0 ? "text-ink-300" : "text-sage-500"
                        }`}>
                          {guests.length}<span className="text-ink-300">/</span>{t.capacity}
                        </span>
                      </div>
                      {guests.length === 0 ? (
                        <p className="text-[12px] text-ink-300 italic">Empty</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {guests.map((g) => (
                            <button
                              key={g.id}
                              onClick={() => explain(g.id)}
                              className={`text-[11px] rounded-full px-2.5 py-1 border transition-colors ${
                                g.side === "organizer"
                                  ? "border-accent/30 bg-accent-wash/40 hover:bg-accent-wash/70"
                                  : g.side === "partner"
                                    ? "border-ink/15 bg-paper-200/40 hover:bg-paper-200/70"
                                    : "border-ink/10 bg-white/70 hover:bg-white"
                              }`}
                              title="Click to ask why this seat"
                            >
                              {g.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            {explanation && (
              <div className="mt-4 rounded-card border hairline bg-sage-200/15 px-4 py-3 text-[13px] italic text-ink-400 leading-relaxed animate-fade-in-soft">
                {explanation}
              </div>
            )}
          </section>
        </Reveal>
      )}

      {tableCount === 0 && (
        <Reveal>
          <div className="rounded-card border hairline bg-white/55 px-7 py-12 max-w-xl">
            <p className="display text-[26px] text-ink leading-tight">No room laid out yet.</p>
            <p className="text-[14px] text-ink-300 mt-3 leading-relaxed">
              Pick how many seats per table and click <span className="text-ink not-italic">Init</span> above —
              Quartermaster will lay out enough tables for everyone who&rsquo;s said yes.
            </p>
          </div>
        </Reveal>
      )}
    </div>
  );
}
