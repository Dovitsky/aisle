"use client";

import { useState } from "react";
import type { ProjectState, RegistryItem } from "@/lib/types";
import { useProject } from "./StateProvider";
import { EmptyState, PageHeader, Stat } from "./ui";

export function RegistryView() {
  const { state, setState, loading } = useProject();
  const [busy, setBusy] = useState<string | null>(null);

  if (loading || !state) return <div className="pt-10 text-center text-ink-300">Loading…</div>;

  const propose = async () => {
    setBusy("propose");
    try {
      const r = await fetch("/api/registry", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "propose" }),
      });
      const j = (await r.json()) as { state?: ProjectState };
      if (j.state) setState(j.state);
    } finally { setBusy(null); }
  };

  const proposePurchase = async (id: string) => {
    setBusy("buy-" + id);
    try {
      const r = await fetch("/api/registry", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "propose_purchase", id }),
      });
      const j = (await r.json()) as { state?: ProjectState };
      if (j.state) setState(j.state);
    } finally { setBusy(null); }
  };

  const groups: Record<string, RegistryItem[]> = {};
  for (const it of state.registry) {
    groups[it.category] = groups[it.category] ?? [];
    groups[it.category].push(it);
  }
  const total = state.registry.reduce((s, i) => s + i.priceUsd, 0);
  const purchased = state.registry.filter((i) => i.status === "purchased").reduce((s, i) => s + i.priceUsd, 0);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Curator"
        title="Registry"
        subtitle="Real items across kitchen, bedroom, dining, experiences, and cash funds. Purchases flow into Thank-yous automatically."
      />

      <div className="grid grid-cols-3 gap-3 max-w-md stagger">
        <Stat label="Items" value={state.registry.length} />
        <Stat label="Total" value={`$${total.toLocaleString()}`} />
        <Stat label="Purchased" value={`$${purchased.toLocaleString()}`} tone="low" />
      </div>

      {state.registry.length === 0 ? (
        <EmptyState
          title="No registry yet"
          hint="Curator will propose 12-18 items spanning kitchen, dining, bedroom, experiences, and cash funds — at least one charity option."
          action={{ label: busy === "propose" ? "Curator working…" : "Have Curator propose", onClick: propose, primary: true }}
        />
      ) : (
        <div className="flex flex-col gap-3 stagger">
          {Object.entries(groups).map(([cat, items]) => (
            <section key={cat} className="surface rounded-card border hairline shadow-card p-4">
              <h2 className="display text-base capitalize">{cat.replace("_", " ")}</h2>
              <ul className="mt-2 divide-y hairline">
                {items.map((it) => (
                  <li key={it.id} className="py-2.5 grid grid-cols-[1fr_auto_auto] items-baseline gap-3 text-sm">
                    <div>
                      <div>{it.item}</div>
                      <div className="text-[11px] text-ink-300">{it.vendor}</div>
                    </div>
                    <div className="text-[12px] text-ink-300 tabular-nums">${it.priceUsd}</div>
                    {it.status === "purchased" ? (
                      <span className="eyebrow text-risk-low">✓ purchased</span>
                    ) : (
                      <button
                        onClick={() => proposePurchase(it.id)}
                        disabled={busy === "buy-" + it.id}
                        className="chip chip-off"
                      >
                        Mark bought
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
