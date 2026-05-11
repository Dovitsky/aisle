"use client";

// Tips. day-of cash envelopes per vendor.
//
// Pull from contracted vendors with industry-standard starting amounts,
// adjust per-line, mark each delivered as the day arrives. Hand-off field
// names who is responsible for handing each envelope over.

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ProjectState, TipEnvelope } from "@/lib/types";
import { useProject } from "./StateProvider";
import { Reveal, CountUp } from "./Atmosphere";

const fmt = (n: number) => `$${(n || 0).toLocaleString()}`;

export function TipsView() {
  const { state, setState, loading } = useProject();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { tips, total, delivered, undelivered, deliveredCount } = useMemo(() => {
    const tips = state?.tips ?? [];
    const total = tips.reduce((s, t) => s + t.amountUsd, 0);
    const delivered = tips.filter((t) => t.cashDelivered).reduce((s, t) => s + t.amountUsd, 0);
    return {
      tips,
      total,
      delivered,
      undelivered: total - delivered,
      deliveredCount: tips.filter((t) => t.cashDelivered).length,
    };
  }, [state?.tips]);

  if (loading || !state) return <div className="pt-10 text-center text-ink-300">Loading…</div>;

  const post = async (body: object, key: string) => {
    setBusy(key); setError(null);
    try {
      const r = await fetch("/api/tips", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await r.json()) as { state?: ProjectState; error?: string };
      if (!r.ok) { setError(j.error ?? `Error ${r.status}`); return; }
      if (j.state) setState(j.state);
    } finally { setBusy(null); }
  };
  const update = (id: string, patch: Partial<TipEnvelope>) =>
    post({ op: "update", id, patch }, "u-" + id);

  const remove = (id: string) => post({ op: "delete", id }, "del-" + id);

  // Pull from contracted vendors that don't yet have a tip envelope.
  const contractedNotEnveloped = useMemo(() => {
    if (!state) return [] as { name: string; category: string }[];
    return state.vendors
      .filter((v) => v.status === "contracted" || v.status === "paid")
      .filter((v) => !state.tips.some((t) => t.vendorId === v.id))
      .map((v) => ({ name: v.name, category: String(v.category) }));
  }, [state]);

  return (
    <div className="flex flex-col gap-12 pb-12">
      {/* Hero */}
      <header>
        <p className="text-[10px] uppercase tracking-[0.26em] text-sage-500 font-mono mb-2">
          Day-of cash
        </p>
        <div className="flex items-baseline justify-between gap-6 flex-wrap">
          <h1 className="display text-[36px] sm:text-[44px] lg:text-[52px] leading-[1.02] tracking-[-0.01em]">
            {tips.length === 0 ? (
              <>Tip envelopes.</>
            ) : (
              <>
                <CountUp value={tips.length} /> envelope{tips.length === 1 ? "" : "s"} ready.
              </>
            )}
          </h1>
          {tips.length > 0 && (
            <div className="text-right">
              <div className="display text-[28px] tabular-nums leading-none">
                {fmt(total)}
              </div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-ink-300 font-mono mt-1">
                in cash
              </div>
            </div>
          )}
        </div>
        <p className="text-[14px] text-ink-300 mt-4 leading-relaxed max-w-[60ch]">
          Cash beats Venmo on the day. Pull from your booked vendors and we'll suggest a starting tip. hair &amp; makeup ~20%, catering ~18%, photographer roughly $100–200 flat. Adjust whatever feels right.
        </p>
      </header>

      {/* Progress bar */}
      {tips.length > 0 && (
        <Reveal>
          <section>
            <div className="flex items-baseline justify-between mb-3 text-[10px] uppercase tracking-[0.22em] font-mono">
              <span className="text-sage-500">Status</span>
              <span className="text-ink-300">
                {deliveredCount} of {tips.length} delivered
                <span className="text-ink-200 mx-1.5">·</span>
                {fmt(undelivered)} still to pack
              </span>
            </div>
            <div
              className="relative h-3 rounded-full overflow-hidden bg-ink/8"
              role="img"
              aria-label={`${fmt(delivered)} delivered, ${fmt(undelivered)} packed`}
            >
              {delivered > 0 && (
                <span
                  className="absolute top-0 bottom-0 left-0 bg-sage-500 transition-[width] duration-700"
                  style={{ width: `${total > 0 ? (delivered / total) * 100 : 0}%` }}
                />
              )}
              {undelivered > 0 && (
                <span
                  className="absolute top-0 bottom-0 bg-sage-200 transition-[width] duration-700"
                  style={{
                    left: `${total > 0 ? (delivered / total) * 100 : 0}%`,
                    width: `${total > 0 ? (undelivered / total) * 100 : 0}%`,
                  }}
                />
              )}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Legend swatch="bg-sage-500" label="Delivered" value={fmt(delivered)} />
              <Legend swatch="bg-sage-200" label="Packed, not delivered" value={fmt(undelivered)} />
            </div>
          </section>
        </Reveal>
      )}

      {/* Action row */}
      <div className="flex items-baseline gap-3 flex-wrap">
        <button
          onClick={() => post({ op: "seed_from_vendors" }, "seed")}
          disabled={!!busy}
          className="text-[11px] uppercase tracking-[0.18em] text-ink hover:text-sage-500 transition-colors disabled:opacity-50"
        >
          {busy === "seed"
            ? "Pulling…"
            : tips.length
              ? contractedNotEnveloped.length > 0
                ? `+ Pull ${contractedNotEnveloped.length} new vendor${contractedNotEnveloped.length === 1 ? "" : "s"} →`
                : "Re-pull from vendors →"
              : "Pull from your booked vendors →"}
        </button>
        {tips.length > 0 && (
          <span className="text-[11px] uppercase tracking-[0.18em] text-ink-300">
            Or add an envelope manually below
          </span>
        )}
      </div>

      {error && <p className="text-sm text-risk-high">{error}</p>}

      {/* Empty state */}
      {tips.length === 0 ? (
        <Reveal>
          <div className="rounded-card border hairline bg-white/55 px-7 py-12 max-w-xl">
            <p className="display text-[26px] text-ink leading-tight">No envelopes yet.</p>
            <p className="text-[14px] text-ink-300 mt-3 leading-relaxed">
              Once vendors are booked, pull them in. we'll seed an envelope per vendor with a starting amount you can tune. Day-of, hand the envelopes to whoever's on point.
            </p>
            <div className="mt-5 flex items-center gap-4">
              <button
                onClick={() => post({ op: "seed_from_vendors" }, "seed")}
                disabled={!!busy}
                className="btn-primary"
              >
                {busy === "seed" ? "Pulling…" : "Pull from vendors"}
              </button>
              <Link
                href="/vendors"
                className="text-[11px] uppercase tracking-[0.2em] text-ink-300 hover:text-ink transition-colors"
              >
                Open Vendors →
              </Link>
            </div>
          </div>
        </Reveal>
      ) : (
        <Reveal>
          <section>
            <h2 className="display italic text-[22px] text-ink leading-tight mb-5">
              The envelopes
            </h2>
            <ul className="flex flex-col">
              {tips.map((t, i) => (
                <EnvelopeRow
                  key={t.id}
                  tip={t}
                  divider={i < tips.length - 1}
                  busy={busy === "u-" + t.id || busy === "del-" + t.id}
                  onUpdate={(patch) => update(t.id, patch)}
                  onRemove={() => remove(t.id)}
                />
              ))}
            </ul>
          </section>
        </Reveal>
      )}
    </div>
  );
}

// --------------------------------------------------------------------

function Legend({ swatch, label, value }: { swatch: string; label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2.5">
      <span className={`inline-block w-2 h-2 rounded-full ${swatch} mt-1`} aria-hidden />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-[0.22em] text-ink-300 font-mono">{label}</div>
        <div className="display text-[20px] tabular-nums leading-tight mt-0.5">{value}</div>
      </div>
    </div>
  );
}

function EnvelopeRow({
  tip, divider, busy, onUpdate, onRemove,
}: {
  tip: TipEnvelope;
  divider: boolean;
  busy: boolean;
  onUpdate: (patch: Partial<TipEnvelope>) => void;
  onRemove: () => void;
}) {
  return (
    <li
      className={`group py-4 grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_180px_auto_auto] gap-x-4 gap-y-2 items-baseline ${
        divider ? "border-b hairline" : ""
      }`}
    >
      <div className="min-w-0">
        <h3 className={`display italic text-[19px] leading-tight ${tip.cashDelivered ? "text-ink-300" : "text-ink"}`}>
          {tip.recipient}
        </h3>
        <input
          defaultValue={tip.handedToOnDay ?? ""}
          onBlur={(e) => onUpdate({ handedToOnDay: e.target.value })}
          placeholder="Who hands it off?"
          className="mt-1 text-[12.5px] text-ink-400 bg-transparent border-b border-transparent focus:border-sage-300 focus:outline-none w-full max-w-[280px] py-0.5"
        />
      </div>

      <div className="hidden sm:flex items-baseline gap-2">
        <span className="text-[14px] text-ink-300 tabular-nums">$</span>
        <input
          type="number"
          min={0}
          defaultValue={tip.amountUsd}
          onBlur={(e) => onUpdate({ amountUsd: Number(e.target.value) || 0 })}
          className="display text-[22px] tabular-nums leading-none w-24 text-right rounded-md border hairline bg-paper-50 px-2 py-1 focus:outline-none focus:border-sage-300"
        />
      </div>

      <label className="flex items-center gap-2 cursor-pointer shrink-0">
        <input
          type="checkbox"
          defaultChecked={tip.cashDelivered}
          onChange={(e) => onUpdate({ cashDelivered: e.target.checked })}
          className="accent-sage-500 w-4 h-4"
        />
        <span className={`text-[10.5px] uppercase tracking-[0.18em] font-mono ${tip.cashDelivered ? "text-sage-500" : "text-ink-300"}`}>
          Delivered
        </span>
      </label>

      <button
        onClick={onRemove}
        disabled={busy}
        className="text-[10px] uppercase tracking-[0.18em] text-ink-300 hover:text-risk-high opacity-0 group-hover:opacity-100 transition-all"
      >
        Remove
      </button>

      {/* Mobile-only amount under the name */}
      <div className="sm:hidden text-[14px] text-ink-400 tabular-nums col-span-2">
        ${tip.amountUsd.toLocaleString()}
      </div>
    </li>
  );
}
