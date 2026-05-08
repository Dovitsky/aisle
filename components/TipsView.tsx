"use client";

import { useState } from "react";
import type { ProjectState } from "@/lib/types";
import { useProject } from "./StateProvider";
import { EmptyState, PageHeader, Stat } from "./ui";

export function TipsView() {
  const { state, setState, loading } = useProject();
  const [busy, setBusy] = useState<string | null>(null);

  if (loading || !state) return <div className="pt-10 text-center text-ink-300">Loading…</div>;

  const post = async (body: object, key: string) => {
    setBusy(key);
    try {
      const r = await fetch("/api/tips", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const j = (await r.json()) as { state?: ProjectState };
      if (j.state) setState(j.state);
    } finally { setBusy(null); }
  };

  const update = (id: string, patch: { amountUsd?: number; cashDelivered?: boolean; handedToOnDay?: string }) =>
    post({ op: "update", id, patch }, "u");

  const total = state.tips.reduce((s, t) => s + t.amountUsd, 0);
  const delivered = state.tips.filter((t) => t.cashDelivered).reduce((s, t) => s + t.amountUsd, 0);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Day-of cash"
        title="Tip envelopes"
        subtitle="Per-vendor cash envelope organizer for the wedding day. Industry-norm percentages are seeded as a starting point."
      />

      <div className="grid grid-cols-3 gap-3 max-w-md stagger">
        <Stat label="Envelopes" value={state.tips.length} />
        <Stat label="Total" value={`$${total.toLocaleString()}`} />
        <Stat label="Delivered" value={`$${delivered.toLocaleString()}`} tone="low" />
      </div>

      <button
        onClick={() => post({ op: "seed_from_vendors" }, "seed")}
        disabled={!!busy}
        className="self-start rounded-2xl bg-ink text-paper-50 hover:bg-ink-400 px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
      >
        {busy === "seed" ? "Seeding…" : state.tips.length ? "Re-seed from contracted vendors" : "Seed from contracted vendors"}
      </button>

      {state.tips.length === 0 ? (
        <EmptyState title="No envelopes yet" hint="Once vendors are contracted, seed from them to get a starting tip per category — H&M 20%, catering 18%, photographer ~$100-200 flat, etc." />
      ) : (
        <div className="surface rounded-card border hairline shadow-card overflow-hidden animate-fade-in-soft">
          <table className="w-full text-sm">
            <thead className="bg-paper-200/60 text-[11px] uppercase tracking-[0.14em] text-ink-300">
              <tr>
                <th className="text-left px-3 py-2.5">Recipient</th>
                <th className="text-right px-3 py-2.5">Amount</th>
                <th className="text-left px-3 py-2.5 hidden sm:table-cell">Hand-off</th>
                <th className="text-center px-3 py-2.5">Delivered</th>
              </tr>
            </thead>
            <tbody>
              {state.tips.map((t) => (
                <tr key={t.id} className="border-t hairline hover:bg-paper-200/20 transition-colors">
                  <td className="px-3 py-2.5">{t.recipient}</td>
                  <td className="text-right px-3 py-2.5">
                    <input
                      type="number"
                      defaultValue={t.amountUsd}
                      onBlur={(e) => update(t.id, { amountUsd: Number(e.target.value) })}
                      className="w-24 text-right rounded border hairline bg-white/80 px-2 py-1 text-sm tabular-nums focus:outline-none"
                    />
                  </td>
                  <td className="px-3 py-2.5 hidden sm:table-cell">
                    <input
                      defaultValue={t.handedToOnDay ?? ""}
                      onBlur={(e) => update(t.id, { handedToOnDay: e.target.value })}
                      placeholder="who delivers"
                      className="w-full rounded border hairline bg-white/80 px-2 py-1 text-sm focus:outline-none"
                    />
                  </td>
                  <td className="text-center px-3 py-2.5">
                    <input type="checkbox" defaultChecked={t.cashDelivered} onChange={(e) => update(t.id, { cashDelivered: e.target.checked })} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
