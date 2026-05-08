"use client";

import { useState } from "react";
import type { ProjectState, RentalCategory, RentalItem } from "@/lib/types";
import { useProject } from "./StateProvider";
import { EmptyState, PageHeader } from "./ui";

const CAT_LABEL: Record<RentalCategory, string> = {
  seating: "Seating",
  tables: "Tables",
  linens: "Linens",
  china: "China",
  glassware: "Glassware",
  flatware: "Flatware",
  dance_floor: "Dance floor",
  lighting: "Lighting",
  tent: "Tent",
  heaters: "Heaters",
  other: "Other",
};

export function RentalsView() {
  const { state, setState, loading } = useProject();
  const [busy, setBusy] = useState<string | null>(null);

  if (loading || !state) return <div className="pt-10 text-center text-ink-300">Loading…</div>;

  const post = async (body: object, key: string) => {
    setBusy(key);
    try {
      const r = await fetch("/api/rentals", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const j = (await r.json()) as { state?: ProjectState };
      if (j.state) setState(j.state);
    } finally { setBusy(null); }
  };

  const total = state.rentals.reduce((s, r) => s + r.quantity * r.unitCost, 0);
  const grouped: Record<RentalCategory, RentalItem[]> = {} as Record<RentalCategory, RentalItem[]>;
  for (const r of state.rentals) {
    grouped[r.category] = grouped[r.category] ?? [];
    grouped[r.category].push(r);
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Steward"
        title="Rentals"
        subtitle="Inventory list for the rental vendor. Quantities derived from guest count and table count."
      />

      <div className="flex items-baseline gap-3 flex-wrap">
        <button
          onClick={() => post({ op: "propose" }, "propose")}
          disabled={!!busy || !state.brief?.locked}
          className="rounded-2xl bg-ink text-paper-50 hover:bg-ink-400 px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {busy === "propose" ? "Steward working…" : state.rentals.length ? "Re-propose" : "Have Steward propose"}
        </button>
        {state.rentals.length > 0 && (
          <span className="text-sm text-ink-300">Estimated total: <strong className="text-ink tabular-nums">${total.toLocaleString()}</strong></span>
        )}
      </div>

      {state.rentals.length === 0 ? (
        <EmptyState title="No rentals yet" hint="Steward will compute the inventory: chairs, tables, linens, china, glassware, dance floor, lighting." />
      ) : (
        <div className="flex flex-col gap-3 stagger">
          {(Object.keys(grouped) as RentalCategory[]).map((cat) => {
            const items = grouped[cat];
            const sub = items.reduce((s, r) => s + r.quantity * r.unitCost, 0);
            return (
              <section key={cat} className="surface rounded-card border hairline shadow-card hover:shadow-cardHover transition-shadow p-4">
                <div className="flex items-baseline justify-between">
                  <h2 className="display text-base">{CAT_LABEL[cat]}</h2>
                  <span className="text-[12px] text-ink-300 tabular-nums">${sub.toLocaleString()}</span>
                </div>
                <ul className="mt-1 divide-y hairline">
                  {items.map((r) => (
                    <li key={r.id} className="py-2 grid grid-cols-[1fr_auto_auto] gap-2 text-[13px]">
                      <div>
                        {r.item}
                        {r.notes && <div className="text-[11px] text-ink-300">{r.notes}</div>}
                      </div>
                      <div className="text-ink-300 tabular-nums">×{r.quantity}</div>
                      <div className="text-right tabular-nums">${(r.quantity * r.unitCost).toLocaleString()}</div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
