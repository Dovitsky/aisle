"use client";

import { useState } from "react";
import type { BarMenuItem, ProjectState } from "@/lib/types";
import { useProject } from "./StateProvider";
import { EmptyState, PageHeader, Stat } from "./ui";

const KIND_LABEL: Record<BarMenuItem["kind"], string> = {
  signature: "Signature",
  wine: "Wine",
  beer: "Beer",
  spirit: "Spirit",
  non_alcoholic: "Non-alcoholic",
};

export function BarView() {
  const { state, setState, loading } = useProject();
  const [busy, setBusy] = useState<string | null>(null);

  if (loading || !state) return <div className="pt-10 text-center text-ink-300">Loading…</div>;
  const bar = state.bar;

  const post = async (body: object, key: string) => {
    setBusy(key);
    try {
      const r = await fetch("/api/bar", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const j = (await r.json()) as { state?: ProjectState };
      if (j.state) setState(j.state);
    } finally { setBusy(null); }
  };

  const grouped: Record<BarMenuItem["kind"], BarMenuItem[]> = {
    signature: [], wine: [], beer: [], spirit: [], non_alcoholic: [],
  };
  for (const it of bar?.itemMenu ?? []) {
    grouped[it.kind].push(it);
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Sommelier"
        title="Bar program"
        subtitle="Bar style, signatures, wines, beers, spirits, non-alc. Estimates ≈1.5 drinks per guest per hour."
      />

      <div>
        <button
          onClick={() => post({ op: "propose" }, "propose")}
          disabled={!!busy || !state.brief?.locked}
          className="rounded-2xl bg-ink text-paper-50 hover:bg-ink-400 px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {busy === "propose" ? "Sommelier working…" : bar ? "Re-propose" : "Have Sommelier propose"}
        </button>
      </div>

      {bar ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger">
            <Stat label="Style" value={<span className="capitalize">{bar.style.replace(/_/g, " ")}</span>} />
            <Stat label="Signatures" value={bar.signatureCount} />
            <Stat label="Items total" value={bar.itemMenu.length} />
            <Stat label="Alcohol $" value={`$${bar.estimatedAlcoholBudget.toLocaleString()}`} />
          </div>
          <div className="flex gap-1 flex-wrap">
            {(["open", "limited", "dry", "beer_wine_only"] as const).map((s) => (
              <button
                key={s}
                onClick={() => post({ op: "set_style", style: s }, "style")}
                className={`chip ${bar.style === s ? "chip-on" : "chip-off"} capitalize`}
              >
                {s.replace(/_/g, " ")}
              </button>
            ))}
          </div>
          <p className="text-[13px] text-ink-400 italic max-w-prose">{bar.notes}</p>
          <div className="grid lg:grid-cols-2 gap-3 stagger">
            {(Object.keys(grouped) as BarMenuItem["kind"][]).map((kind) => (
              <section key={kind} className="surface rounded-card border hairline shadow-card hover:shadow-cardHover transition-shadow p-4">
                <h3 className="display text-base">{KIND_LABEL[kind]}</h3>
                <ul className="mt-2 divide-y hairline">
                  {grouped[kind].map((it) => (
                    <li key={it.id} className="py-2">
                      <div className="flex justify-between text-[13px]">
                        <span>{it.name}</span>
                        {it.servings && <span className="text-ink-300 tabular-nums">~{it.servings} pours</span>}
                      </div>
                      {it.description && <div className="text-[11px] text-ink-300 mt-0.5">{it.description}</div>}
                    </li>
                  ))}
                  {grouped[kind].length === 0 && <li className="py-1 text-[12px] text-ink-300 italic">none</li>}
                </ul>
              </section>
            ))}
          </div>
        </>
      ) : (
        <EmptyState title="No bar program yet" hint="Sommelier proposes signatures named for each partner, a curated wine list, beer options, and a non-alc that actually feels like a drink." />
      )}
    </div>
  );
}
