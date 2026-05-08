"use client";

import Link from "next/link";
import { useState } from "react";
import { ALLERGEN_LABEL, type ProjectState } from "@/lib/types";
import { useProject } from "./StateProvider";
import { EmptyState, PageHeader, Stat } from "./ui";

export function CakeView() {
  const { state, setState, loading } = useProject();
  const [busy, setBusy] = useState<string | null>(null);

  if (loading || !state) return <div className="pt-10 text-center text-ink-300">Loading…</div>;
  const cake = state.cake;

  const post = async (body: object, key: string) => {
    setBusy(key);
    try {
      const r = await fetch("/api/cake", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const j = (await r.json()) as { state?: ProjectState };
      if (j.state) setState(j.state);
    } finally { setBusy(null); }
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Patissier"
        title="Cake & dessert"
        subtitle="Tier count, flavors, fillings, frosting, allergens. Allergens cross-check guest dietary records."
      />

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => post({ op: "propose" }, "propose")}
          disabled={!!busy || !state.brief?.locked}
          className="rounded-2xl bg-ink text-paper-50 hover:bg-ink-400 px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {busy === "propose" ? "Patissier working…" : cake ? "Re-propose" : "Have Patissier propose"}
        </button>
        {cake && (
          <button onClick={() => post({ op: "propose_lock" }, "lock")} className="rounded-2xl border hairline bg-white/80 hover:bg-white px-4 py-2 text-sm transition-colors">
            Propose lock
          </button>
        )}
      </div>

      {cake ? (
        <article className="surface rounded-card border hairline shadow-card p-4 sm:p-5 animate-fade-in">
          <div className="grid grid-cols-3 gap-3 max-w-md stagger">
            <Stat label="Tiers" value={cake.tiers} />
            <Stat label="Servings" value={cake.servings} />
            <Stat label="Flavors" value={cake.flavors.length} />
          </div>

          <div className="mt-5">
            <h3 className="display text-base mb-1.5">Flavor stack <span className="text-ink-300 font-sans text-[12px]">(bottom → top)</span></h3>
            <ul className="text-[13px] divide-y hairline">
              {cake.flavors.map((f, i) => (
                <li key={i} className="py-2 flex justify-between items-baseline">
                  <span className="flex items-baseline gap-3">
                    <span className="display text-base text-ink-300 tabular-nums w-6 text-center">{cake.tiers - i}</span>
                    {f}
                  </span>
                  <span className="text-ink-300">{cake.fillings[i] ?? "—"}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-5 grid sm:grid-cols-2 gap-4">
            <div>
              <h3 className="display text-base">Frosting</h3>
              <p className="text-[13px] text-ink-400 mt-1 leading-relaxed">{cake.frostingStyle}</p>
            </div>
            <div>
              <h3 className="display text-base">Decoration</h3>
              <p className="text-[13px] text-ink-400 mt-1 leading-relaxed">{cake.decorationNotes}</p>
            </div>
          </div>

          <div className="mt-4">
            <h3 className="display text-base">Allergens</h3>
            {cake.allergens && cake.allergens.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {cake.allergens.map((a) => (
                  <span key={a} className="text-[10px] uppercase tracking-[0.14em] border border-risk-medium/30 bg-risk-medium/5 text-risk-medium rounded-full px-2 py-0.5">
                    {ALLERGEN_LABEL[a]}
                  </span>
                ))}
              </div>
            )}
            {cake.allergenNotes && (
              <p className="text-[13px] text-risk-medium mt-2 italic leading-relaxed">{cake.allergenNotes}</p>
            )}
            <Link href="/dietary" className="inline-block mt-2 text-[12px] text-accent hover:text-accent-soft transition-colors">
              Cross-checked against guest allergens in /dietary →
            </Link>
          </div>

          {cake.approved && <div className="eyebrow text-risk-low mt-4">✓ locked</div>}
        </article>
      ) : (
        <EmptyState title="No cake spec yet" hint="Patissier designs the tier count, flavors, fillings, and decoration based on the brief vibe." />
      )}
    </div>
  );
}
