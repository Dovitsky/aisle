"use client";

// Budget. visual allocation against the brief envelope.
//
// Hero: italic Cormorant header + envelope number.
// Master bar: a single horizontal bar of the envelope showing paid / committed
// / planned / remaining as proportional sage segments.
// Per-category rows: italic title, plan number, mini-bar of committed within
// plan, variance pill, hover-edit.

import { useState } from "react";
import Link from "next/link";
import type { ProjectState, BudgetLine } from "@/lib/types";
import { useProject } from "./StateProvider";
import { Reveal, CountUp } from "./Atmosphere";

const fmt = (n: number) => `$${(n || 0).toLocaleString()}`;

export function BudgetView() {
  const { state, setState, loading } = useProject();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  if (loading || !state) return <div className="pt-10 text-center text-ink-300">Loading…</div>;

  const total = state.brief?.budgetUsd ?? 0;
  const planSum = state.budget.reduce((s, l) => s + l.planUsd, 0);
  const committedSum = state.budget.reduce((s, l) => s + l.committedUsd, 0);
  const paidSum = state.budget.reduce((s, l) => s + l.paidUsd, 0);
  const remaining = Math.max(0, total - planSum);

  const propose = async () => {
    setBusy(true); setError(null);
    try {
      const r = await fetch("/api/budget", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "propose" }),
      });
      const j = (await r.json()) as { state?: ProjectState; error?: string };
      if (!r.ok) { setError(j.error ?? `Error ${r.status}`); return; }
      if (j.state) setState(j.state);
    } finally { setBusy(false); }
  };

  const upsert = async (line: { id?: string; category: string; planUsd: number; committedUsd: number; paidUsd: number }) => {
    setError(null);
    const r = await fetch("/api/budget", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ op: "upsert", line }),
    });
    const j = (await r.json()) as { state?: ProjectState; error?: string };
    if (!r.ok) setError(j.error ?? `Error ${r.status}`);
    if (j.state) setState(j.state);
  };

  const removeLine = async (id: string) => {
    const r = await fetch("/api/budget", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ op: "delete", id }),
    });
    const j = (await r.json()) as { state?: ProjectState };
    if (j.state) setState(j.state);
  };

  const briefLocked = !!state.brief?.locked;

  // Sort lines plan desc for the visual hierarchy
  const lines = [...state.budget].sort((a, b) => b.planUsd - a.planUsd);
  const maxLine = Math.max(0, ...lines.map((l) => l.planUsd));

  // Master bar segments. proportional to envelope (or planSum if over-envelope)
  const denom = Math.max(total, planSum, 1);
  const segPaid = (paidSum / denom) * 100;
  const segCommitted = ((committedSum - paidSum) / denom) * 100;
  const segPlanned = ((planSum - committedSum) / denom) * 100;
  const segRemaining = total > planSum ? ((total - planSum) / denom) * 100 : 0;
  const overBy = planSum > total ? planSum - total : 0;

  return (
    <div className="flex flex-col gap-12 pb-12">
      {/* Hero */}
      <header>
        <p className="text-[10px] uppercase tracking-[0.26em] text-sage-500 font-mono mb-2">
          Budget
        </p>
        <div className="flex items-baseline justify-between gap-6 flex-wrap">
          <h1 className="display text-[36px] sm:text-[44px] lg:text-[52px] leading-[1.02] tracking-[-0.01em]">
            Where the money goes.
          </h1>
          <div className="text-right">
            <div className="display text-[40px] tabular-nums leading-none">
              <CountUp value={total} format={(n) => `$${n.toLocaleString()}`} />
            </div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-ink-300 font-mono mt-1">
              envelope
            </div>
          </div>
        </div>
      </header>

      {!briefLocked && (
        <div className="rounded-card border hairline bg-white/60 px-5 py-4 text-[14px]">
          Seal the dossier first. <Link href="/dossier" className="underline-offset-4 underline hover:text-sage-500">Open dossier</Link>.
        </div>
      )}

      {/* MASTER BAR. proportional segments */}
      {(planSum > 0 || total > 0) && (
        <Reveal>
          <section>
            <div className="flex items-baseline justify-between mb-3 text-[10px] uppercase tracking-[0.22em] font-mono">
              <span className="text-sage-500">Status</span>
              {overBy > 0 && (
                <span className="text-risk-high">
                  Over envelope by {fmt(overBy)}
                </span>
              )}
            </div>

            <div
              className="relative h-3 rounded-full overflow-hidden bg-ink/8"
              role="img"
              aria-label={`${fmt(paidSum)} paid, ${fmt(committedSum)} committed, ${fmt(planSum)} planned, ${fmt(remaining)} remaining`}
            >
              {segPaid > 0 && (
                <span
                  className="absolute top-0 bottom-0 left-0 bg-sage-500 transition-[width] duration-700"
                  style={{ width: `${segPaid}%` }}
                />
              )}
              {segCommitted > 0 && (
                <span
                  className="absolute top-0 bottom-0 bg-sage-400 transition-[width] duration-700"
                  style={{ left: `${segPaid}%`, width: `${segCommitted}%` }}
                />
              )}
              {segPlanned > 0 && (
                <span
                  className="absolute top-0 bottom-0 bg-sage-200 transition-[width] duration-700"
                  style={{
                    left: `${segPaid + segCommitted}%`,
                    width: `${segPlanned}%`,
                  }}
                />
              )}
              {segRemaining > 0 && (
                <span
                  className="absolute top-0 bottom-0 bg-paper-300/60 transition-[width] duration-700"
                  style={{
                    left: `${segPaid + segCommitted + segPlanned}%`,
                    width: `${segRemaining}%`,
                  }}
                />
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Legend swatch="bg-sage-500" label="Paid" value={fmt(paidSum)} />
              <Legend swatch="bg-sage-400" label="Committed" value={fmt(committedSum - paidSum)} sub={`${fmt(committedSum)} total`} />
              <Legend swatch="bg-sage-200" label="Planned" value={fmt(planSum - committedSum)} sub={`${fmt(planSum)} planned`} />
              <Legend swatch="bg-paper-300" label="Remaining" value={fmt(remaining)} />
            </div>
          </section>
        </Reveal>
      )}

      {/* Empty state */}
      {briefLocked && state.budget.length === 0 && (
        <Reveal>
          <div className="rounded-card border hairline bg-white/55 px-7 py-12 max-w-xl">
            <p className="display text-[26px] text-ink leading-tight">
              No allocation yet.
            </p>
            <p className="text-[14px] text-ink-300 mt-3 leading-relaxed">
              We can lay out a starting allocation across the standard categories. venue, photography, catering, florals, music, and the rest. You can edit any line before locking it as the working plan.
            </p>
            <button
              onClick={propose}
              disabled={busy}
              className="btn-primary mt-5"
            >
              {busy ? "Working…" : "Pull a starting budget together"}
            </button>
          </div>
        </Reveal>
      )}

      {error && <p className="text-sm text-risk-high">{error}</p>}

      {/* Allocation rows */}
      {lines.length > 0 && (
        <Reveal>
          <section>
            <div className="flex items-baseline justify-between mb-5">
              <h2 className="display italic text-[22px] text-ink leading-tight">
                Allocation
                <span className="not-italic text-ink-300 ml-2 text-[14px]">{lines.length}</span>
              </h2>
              {lines.length > 0 && (
                <button
                  onClick={propose}
                  disabled={busy}
                  className="text-[11px] uppercase tracking-[0.18em] text-ink-300 hover:text-ink transition-colors"
                >
                  {busy ? "Re-running…" : "Re-run Treasurer →"}
                </button>
              )}
            </div>

            <ul className="flex flex-col">
              {lines.map((l, i) => (
                <BudgetRow
                  key={l.id}
                  line={l}
                  maxLine={maxLine}
                  divider={i < lines.length - 1}
                  isEditing={editingId === l.id}
                  onEdit={() => setEditingId(l.id)}
                  onCancelEdit={() => setEditingId(null)}
                  onSave={(updated) => {
                    upsert(updated);
                    setEditingId(null);
                  }}
                  onDelete={() => removeLine(l.id)}
                />
              ))}
            </ul>
          </section>
        </Reveal>
      )}
    </div>
  );
}

function Legend({
  swatch, label, value, sub,
}: {
  swatch: string;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex items-baseline gap-2.5">
      <span className={`inline-block w-2 h-2 rounded-full ${swatch} mt-1`} aria-hidden />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-[0.22em] text-ink-300 font-mono">{label}</div>
        <div className="display text-[20px] tabular-nums leading-tight mt-0.5">{value}</div>
        {sub && <div className="text-[11px] text-ink-200 font-mono mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

function BudgetRow({
  line, maxLine, divider, isEditing, onEdit, onCancelEdit, onSave, onDelete,
}: {
  line: BudgetLine;
  maxLine: number;
  divider: boolean;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (l: { id: string; category: string; planUsd: number; committedUsd: number; paidUsd: number }) => void;
  onDelete: () => void;
}) {
  // Per-line bar: width is proportional to the largest line's plan, so the
  // visual hierarchy mirrors the actual allocation.
  const barWidthPct = maxLine > 0 ? (line.planUsd / maxLine) * 100 : 0;
  // Within the bar, sage-500 fills paid, sage-400 fills committed-paid.
  const paidPctOfPlan = line.planUsd > 0 ? (line.paidUsd / line.planUsd) * 100 : 0;
  const committedPctOfPlan = line.planUsd > 0 ? ((line.committedUsd - line.paidUsd) / line.planUsd) * 100 : 0;
  const overCommitted = line.committedUsd > line.planUsd;
  const variance = line.planUsd - line.committedUsd;

  return (
    <li className={`group py-4 ${divider ? "border-b hairline" : ""}`}>
      <div className="flex items-baseline justify-between gap-4 mb-2">
        <h3 className="display italic text-[19px] text-ink leading-tight">{line.category}</h3>
        <div className="flex items-baseline gap-3 shrink-0">
          {!isEditing && (
            <>
              <span className="display text-[20px] tabular-nums leading-none">{fmt(line.planUsd)}</span>
              <button onClick={onEdit} className="text-[10px] uppercase tracking-[0.18em] text-ink-300 hover:text-ink opacity-0 group-hover:opacity-100 transition-opacity">
                Edit
              </button>
            </>
          )}
        </div>
      </div>

      {!isEditing ? (
        <>
          {/* Proportional bar */}
          <div className="relative h-1.5 rounded-full bg-ink/5 overflow-hidden" style={{ width: `${barWidthPct}%`, minWidth: "60px" }}>
            <span
              className="absolute top-0 bottom-0 left-0 bg-sage-500"
              style={{ width: `${paidPctOfPlan}%` }}
              aria-hidden
            />
            <span
              className="absolute top-0 bottom-0 bg-sage-400"
              style={{ left: `${paidPctOfPlan}%`, width: `${committedPctOfPlan}%` }}
              aria-hidden
            />
          </div>

          <div className="flex items-baseline justify-between gap-4 mt-1.5 text-[11.5px] text-ink-300 font-mono">
            <span>
              {line.committedUsd > 0
                ? `${fmt(line.committedUsd)} committed${line.paidUsd > 0 ? ` · ${fmt(line.paidUsd)} paid` : ""}`
                : "Nothing committed yet"}
            </span>
            <span className={overCommitted ? "text-risk-high" : variance < 0 ? "text-risk-high" : "text-ink-300"}>
              {variance < 0 ? `over by ${fmt(-variance)}` : variance > 0 ? `${fmt(variance)} left` : "matched"}
            </span>
          </div>
        </>
      ) : (
        <BudgetEditor
          line={line}
          onSave={onSave}
          onCancel={onCancelEdit}
          onDelete={onDelete}
        />
      )}
    </li>
  );
}

function BudgetEditor({
  line, onSave, onCancel, onDelete,
}: {
  line: BudgetLine;
  onSave: (l: { id: string; category: string; planUsd: number; committedUsd: number; paidUsd: number }) => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const [plan, setPlan] = useState(line.planUsd);
  const [committed, setCommitted] = useState(line.committedUsd);
  const [paid, setPaid] = useState(line.paidUsd);

  return (
    <div className="mt-1 rounded-xl border hairline bg-white/85 p-4 grid sm:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end">
      <Field label="Plan" value={plan} onChange={setPlan} />
      <Field label="Committed" value={committed} onChange={setCommitted} />
      <Field label="Paid" value={paid} onChange={setPaid} />
      <div className="flex items-center gap-2 sm:justify-end pt-1">
        <button
          onClick={() => onSave({ id: line.id, category: line.category, planUsd: plan, committedUsd: committed, paidUsd: paid })}
          className="btn-primary"
          style={{ paddingInline: "1.1rem", paddingBlock: "0.5rem" }}
        >
          Save
        </button>
        <button onClick={onCancel} className="text-[11px] uppercase tracking-[0.18em] text-ink-300 hover:text-ink">
          Cancel
        </button>
        <button onClick={onDelete} className="text-[11px] uppercase tracking-[0.18em] text-risk-high/70 hover:text-risk-high ml-2">
          Delete
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-[0.22em] text-ink-300 font-mono">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="rounded-lg border hairline bg-paper-50 px-3 py-2 text-[15px] tabular-nums focus:outline-none focus:border-sage-300"
      />
    </label>
  );
}
