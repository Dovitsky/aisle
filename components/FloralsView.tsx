"use client";

import { useState } from "react";
import type { FloralPiece, ProjectState } from "@/lib/types";
import { useProject } from "./StateProvider";
import { EmptyState, PageHeader } from "./ui";

const PIECE_LABEL: Record<FloralPiece, string> = {
  ceremony_arch: "Ceremony arch",
  ceremony_aisle: "Aisle",
  centerpiece: "Centerpiece",
  bouquet_organizer: "Bouquet — organizer",
  bouquet_partner: "Bouquet — partner",
  bouquet_party: "Wedding-party bouquets",
  boutonniere: "Boutonnières",
  corsage: "Corsages",
  cake_florals: "Cake florals",
  head_table: "Head table garland",
  welcome_floral: "Welcome arrangement",
  ladies_room: "Lounge florals",
  petals: "Send-off petals",
};

export function FloralsView() {
  const { state, setState, loading } = useProject();
  const [busy, setBusy] = useState<string | null>(null);

  if (loading || !state) return <div className="pt-10 text-center text-ink-300">Loading…</div>;

  const post = async (body: object, key: string) => {
    setBusy(key);
    try {
      const r = await fetch("/api/florals", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const j = (await r.json()) as { state?: ProjectState };
      if (j.state) setState(j.state);
    } finally { setBusy(null); }
  };

  const total = state.florals.reduce((s, a) => s + a.unitCost * a.quantity, 0);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Botanist"
        title="Florals"
        subtitle="Per-piece arrangement specs: stems, vessels, quantities. Pulls palette from your locked design direction."
      />

      <div className="flex gap-3 items-baseline flex-wrap">
        <button
          onClick={() => post({ op: "propose" }, "propose")}
          disabled={!!busy || !state.brief?.locked}
          className="rounded-2xl bg-ink text-paper-50 hover:bg-ink-400 px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {busy === "propose" ? "Botanist working…" : state.florals.length ? "Re-propose" : "Have Botanist propose"}
        </button>
        {state.florals.length > 0 && (
          <span className="text-sm text-ink-300">Estimated total: <strong className="text-ink tabular-nums">${total.toLocaleString()}</strong></span>
        )}
      </div>

      {state.florals.length === 0 ? (
        <EmptyState title="No florals yet" hint="Per-piece specs (arch, aisle, centerpieces, bouquets, boutonnières, corsages, cake florals, head-table garland) with real stems, vessels, and quantities." />
      ) : (
        <div className="grid lg:grid-cols-2 gap-3 stagger">
          {state.florals.map((a) => (
            <article key={a.id} className="surface rounded-card border hairline shadow-card hover:shadow-cardHover transition-shadow p-4">
              <div className="flex items-baseline justify-between">
                <h3 className="display text-base">{PIECE_LABEL[a.piece]}</h3>
                <span className="eyebrow">qty {a.quantity} · ${a.unitCost} ea</span>
              </div>
              <div className="mt-2 text-[13px] space-y-0.5">
                <div><span className="text-ink-300">Primary:</span> {a.primary.join(", ") || "—"}</div>
                <div><span className="text-ink-300">Secondary:</span> {a.secondary.join(", ") || "—"}</div>
                {a.vesselNotes && <div className="text-ink-400 mt-1.5 italic">{a.vesselNotes}</div>}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
