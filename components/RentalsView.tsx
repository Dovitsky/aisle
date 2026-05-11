"use client";

// Rentals. editorial inventory of every chair, table, glass, fork, and
// piece of lighting the day will need. Steward computes a starting
// inventory from guest count and table count; couple adjusts.

import { useMemo, useState } from "react";
import type { ProjectState, RentalCategory, RentalItem } from "@/lib/types";
import { useProject } from "./StateProvider";
import { useToast } from "./Toast";
import { EmptyState, PageHeader, Stat } from "./ui";
import { Reveal } from "./Atmosphere";
import { ThoughtStream } from "./ThoughtStream";

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

const CAT_BLURB: Record<RentalCategory, string> = {
  seating: "Chairs for ceremony and reception, in matching style.",
  tables: "Long, round, or mixed. sized to your floor plan.",
  linens: "Tablecloths, runners, napkins.",
  china: "Plates and bowls. courses dictate count.",
  glassware: "Water, wine, champagne. three per guest at minimum.",
  flatware: "Forks, knives, spoons. by course.",
  dance_floor: "Square footage scales with guest count.",
  lighting: "Bistro strings, pin spots, uplighting.",
  tent: "If outdoors. frame, sidewalls, flooring.",
  heaters: "For shoulder-season evenings.",
  other: "Loose ends. easels, signs, A-frames.",
};

const CAT_ORDER: RentalCategory[] = [
  "tent", "seating", "tables", "linens", "china", "glassware", "flatware",
  "dance_floor", "lighting", "heaters", "other",
];

export function RentalsView() {
  const { state, setState, loading } = useProject();
  const { notify } = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const g: Record<RentalCategory, RentalItem[]> = {} as Record<RentalCategory, RentalItem[]>;
    if (!state) return g;
    for (const r of state.rentals) {
      g[r.category] = g[r.category] ?? [];
      g[r.category].push(r);
    }
    return g;
  }, [state]);

  if (loading || !state) {
    return <div className="pt-10 text-center text-ink-300">Loading…</div>;
  }

  const post = async (body: object, key: string) => {
    setBusy(key);
    try {
      const r = await fetch("/api/rentals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await r.json()) as { state?: ProjectState };
      if (j.state) {
        setState(j.state);
        if (key === "propose") {
          notify({
            kind: "agent",
            agent: "Steward",
            title: `${j.state.rentals.length} items lined up`,
            detail: "Adjust quantities below and we'll send the inventory to your rental vendor.",
          });
        }
      }
    } finally {
      setBusy(null);
    }
  };

  const total = state.rentals.reduce((s, r) => s + r.quantity * r.unitCost, 0);
  const itemsCount = state.rentals.reduce((s, r) => s + r.quantity, 0);
  const briefLocked = !!state.brief?.locked;
  const guestCount = state.brief?.guestCount ?? 0;

  return (
    <div className="flex flex-col gap-10 pb-12">
      <PageHeader
        eyebrow="The day-of inventory"
        title={
          <>
            Rentals.
          </>
        }
        subtitle="A running list of what your rental vendor needs to deliver and pick up. We start with a sensible default for your guest count and table count. tweak anything that's off."
        action={
          briefLocked && (
            <button
              onClick={() => post({ op: "propose" }, "propose")}
              disabled={!!busy}
              className="rounded-2xl cta-sage px-5 py-2.5 text-[13px] font-semibold transition-colors disabled:opacity-50"
            >
              {busy === "propose"
                ? "Working…"
                : state.rentals.length
                  ? "Re-do the list"
                  : "Build the list"}
            </button>
          )
        }
      />

      {busy === "propose" && (
        <ThoughtStream kind="agent-thinking" tone="sage" size="sm" />
      )}

      {/* Stat row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 stagger">
        <Stat label="Categories" value={Object.keys(grouped).length} />
        <Stat label="Items" value={itemsCount.toLocaleString()} sub={`across ${state.rentals.length} line items`} />
        <Stat label="Estimated cost" value={`$${total.toLocaleString()}`} tone="ink" />
        <Stat label="For" value={`${guestCount || ","} guests`} sub="based on your dossier" />
      </div>

      {!briefLocked && (
        <div className="rounded-card border hairline bg-white/60 px-5 py-4 text-[14px]">
          Seal the dossier first and Steward will pull a starting list together.
        </div>
      )}

      {state.rentals.length === 0 && briefLocked ? (
        <Reveal>
          <EmptyState
            title="Nothing on the list yet."
            hint="We compute the inventory from your guest count and table count. chairs, linens, china, glassware, dance floor, lighting, tent if you need one. Click build the list and we'll lay out a starting set."
          />
        </Reveal>
      ) : (
        <div className="flex flex-col gap-4 stagger">
          {CAT_ORDER.filter((c) => grouped[c]?.length).map((cat) => {
            const items = grouped[cat];
            const sub = items.reduce((s, r) => s + r.quantity * r.unitCost, 0);
            const qty = items.reduce((s, r) => s + r.quantity, 0);
            return (
              <Reveal key={cat}>
                <section className="surface rounded-card border hairline shadow-card hover:shadow-cardHover transition-shadow p-5">
                  <div className="flex items-baseline justify-between gap-3 mb-1">
                    <h2 className="display italic text-[20px] leading-tight">
                      {CAT_LABEL[cat]}
                    </h2>
                    <span className="text-[10px] uppercase tracking-[0.18em] text-sage-500 font-mono tabular-nums">
                      ×{qty.toLocaleString()} · ${sub.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-[12.5px] text-ink-300 italic mb-3 leading-relaxed">
                    {CAT_BLURB[cat]}
                  </p>
                  <ul className="divide-y hairline">
                    {items.map((r) => (
                      <li
                        key={r.id}
                        className="py-2 grid grid-cols-[1fr_auto_auto] gap-3 text-[13.5px] hover:bg-paper-200/30 -mx-2 px-2 rounded transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="text-ink truncate">{r.item}</div>
                          {r.notes && (
                            <div className="text-[11.5px] text-ink-300 mt-0.5">
                              {r.notes}
                            </div>
                          )}
                        </div>
                        <div className="text-ink-300 tabular-nums shrink-0">
                          ×{r.quantity.toLocaleString()}
                        </div>
                        <div className="text-right tabular-nums shrink-0">
                          ${(r.quantity * r.unitCost).toLocaleString()}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              </Reveal>
            );
          })}
        </div>
      )}
    </div>
  );
}
