"use client";

// Pricing. the four plan tiers presented like a luxury concierge brochure,
// not a SaaS pricing page.

import { useState } from "react";
import { PRICING_PLANS, type ProjectState } from "@/lib/types";
import { useProject } from "./StateProvider";
import { useToast } from "./Toast";
import { PageHeader } from "./ui";
import { Reveal } from "./Atmosphere";

export function PricingView() {
  const { state, setState, loading } = useProject();
  const { notify } = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  if (loading || !state) return <div className="pt-10 text-center text-ink-300">Loading…</div>;

  const setPlan = async (plan: ProjectState["plan"], label: string) => {
    setBusy(plan);
    try {
      const r = await fetch("/api/settings", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "plan", plan }),
      });
      const j = (await r.json()) as { state?: ProjectState };
      if (j.state) {
        setState(j.state);
        notify({ kind: "approval", title: `${label} plan selected`, detail: "Your AISLE team has updated your tier." });
      }
    } finally { setBusy(null); }
  };

  return (
    <div className="flex flex-col gap-10 pb-24">
      <PageHeader
        eyebrow="Plans"
        title="Pricing"
        subtitle="We don't charge vendors. We don't take spread. Trust in the marketplace is the moat. The whole business is on the couple side, and we keep it small."
      />

      <Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger">
          {PRICING_PLANS.map((p, i) => {
            const active = state.plan === p.id;
            const featured = i === 1; // Couple Plus highlighted
            return (
              <article
                key={p.id}
                className={`relative surface rounded-card border shadow-card hover:shadow-cardHover transition-all duration-300 hover:-translate-y-0.5 p-6 flex flex-col ${
                  active ? "border-ink/40 ring-1 ring-sage-300/40"
                  : featured ? "border-sage-300/60"
                  : "hairline"
                } ${active ? "bg-sage-50/30" : ""}`}
              >
                {featured && !active && (
                  <span className="absolute top-3 right-3 text-[9.5px] uppercase tracking-[0.22em] font-mono text-sage-500">
                    Most picked
                  </span>
                )}
                <div className="flex items-baseline justify-between">
                  <h2 className="display text-[22px] leading-tight">{p.label}</h2>
                  {active && <span className="eyebrow text-sage-500 text-[10px]">✓ current</span>}
                </div>
                <div className="display text-[44px] mt-2 leading-none tabular-nums">
                  ${p.monthly}
                  <span className="text-[13px] text-ink-300 font-sans ml-0.5 align-baseline">/mo</span>
                </div>
                <p className="text-[13px] text-ink-300 mt-3 leading-relaxed">{p.blurb}</p>
                <ul className="mt-4 flex-1 flex flex-col gap-1.5 text-[13px]">
                  {p.features.map((f, j) => (
                    <li key={j} className="flex gap-2.5">
                      <span className="text-sage-500 shrink-0 mt-1.5">·</span>
                      <span className="leading-relaxed">{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => setPlan(p.id, p.label)}
                  disabled={!!busy || active}
                  className={`mt-5 w-full rounded-2xl py-3 text-sm font-semibold transition-all disabled:opacity-50 ${
                    active
                      ? "bg-paper-200/60 text-ink-300"
                      : featured
                      ? "cta-sage"
                      : "bg-paper-200/60 text-ink hover:bg-ink hover:text-paper-50"
                  }`}
                  style={featured && !active ? { boxShadow: "0 8px 22px -10px rgba(79,93,68,0.55)" } : undefined}
                >
                  {active ? "Current plan" : busy === p.id ? "…" : `Pick ${p.label}`}
                </button>
              </article>
            );
          })}
        </div>
      </Reveal>

      <Reveal>
        <p className="text-[11.5px] uppercase tracking-[0.22em] text-ink-300/80 text-center font-mono">
          v0 doesn&apos;t take real payment. Switching plans here only changes the UI surface.
        </p>
      </Reveal>
    </div>
  );
}
