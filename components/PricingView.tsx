"use client";

import { useState } from "react";
import { PRICING_PLANS, type ProjectState } from "@/lib/types";
import { useProject } from "./StateProvider";
import { PageHeader } from "./ui";

export function PricingView() {
  const { state, setState, loading } = useProject();
  const [busy, setBusy] = useState<string | null>(null);

  if (loading || !state) return <div className="pt-10 text-center text-ink-300">Loading…</div>;

  const setPlan = async (plan: ProjectState["plan"]) => {
    setBusy(plan);
    try {
      const r = await fetch("/api/settings", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "plan", plan }),
      });
      const j = (await r.json()) as { state?: ProjectState };
      if (j.state) setState(j.state);
    } finally { setBusy(null); }
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Plans"
        title="Pricing"
        subtitle="We don't charge vendors. We don't take spread. Trust in the marketplace is the moat. Monetization is on the couple side."
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 stagger">
        {PRICING_PLANS.map((p) => {
          const active = state.plan === p.id;
          return (
            <article key={p.id} className={`surface rounded-card border shadow-card hover:shadow-cardHover transition-shadow p-5 flex flex-col ${active ? "border-ink/40" : "hairline"}`}>
              <div className="flex items-baseline justify-between">
                <h2 className="display text-xl">{p.label}</h2>
                {active && <span className="eyebrow text-risk-low">✓ current</span>}
              </div>
              <div className="display text-4xl mt-1">
                ${p.monthly}<span className="text-[13px] text-ink-300 font-sans ml-0.5">/mo</span>
              </div>
              <p className="text-[13px] text-ink-300 mt-2 leading-relaxed">{p.blurb}</p>
              <ul className="mt-3 flex-1 flex flex-col gap-1.5 text-[13px]">
                {p.features.map((f, i) => (
                  <li key={i} className="flex gap-2"><span className="text-accent shrink-0">·</span><span>{f}</span></li>
                ))}
              </ul>
              <button
                onClick={() => setPlan(p.id)}
                disabled={!!busy || active}
                className={`mt-4 w-full rounded-2xl py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${active ? "bg-paper-200/60 text-ink-300" : "bg-ink text-paper-50 hover:bg-ink-400"}`}
              >
                {active ? "Current plan" : busy === p.id ? "…" : `Pick ${p.label}`}
              </button>
            </article>
          );
        })}
      </div>

      <p className="text-[11px] text-ink-300 text-center">
        v0 doesn&apos;t take real payment. Switching plans here just changes what gets shown in the UI; nothing is billed.
      </p>
    </div>
  );
}
