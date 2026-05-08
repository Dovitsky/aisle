"use client";

// Dress workflow — gated. PRD §5.3 / §2.3.

import { useState } from "react";
import type { ProjectState } from "@/lib/types";
import { useProject } from "./StateProvider";
import { PageHeader } from "./ui";

export function DressView() {
  const { state, setState, loading } = useProject();
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (loading || !state) return <div className="pt-10 text-center text-ink-300">Loading…</div>;

  if (state.viewer === "partner" && state.gates.dress) {
    return (
      <div className="pt-16 text-center text-ink-300 max-w-md mx-auto animate-fade-in-soft">
        <p className="text-[15px]">I don&apos;t have anything to share on that.</p>
      </div>
    );
  }

  const concepts = state.designs.filter((d) => d.kind === "dress_concept");

  const enable = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/dress", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ op: "enable_gate" }) });
      const j = (await r.json()) as { state?: ProjectState };
      if (j.state) setState(j.state);
    } finally { setBusy(false); }
  };
  const disable = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/dress", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ op: "disable_gate" }) });
      const j = (await r.json()) as { state?: ProjectState };
      if (j.state) setState(j.state);
    } finally { setBusy(false); }
  };
  const propose = async () => {
    setBusy(true); setError(null);
    try {
      const r = await fetch("/api/dress", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ op: "propose", notes }) });
      const j = (await r.json()) as { state?: ProjectState; error?: string };
      if (!r.ok) { setError(j.error ?? `Error ${r.status}`); return; }
      if (j.state) setState(j.state);
    } finally { setBusy(false); }
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Couturier · Gated workflow"
        title="Dress"
        subtitle="When the gate is on, the partner's view of AISLE has no record of any of this — not the cards, not the budget line, not the vendor names, not the ledger entries."
      />

      <section className="surface rounded-card border hairline shadow-card p-4 sm:p-5 flex items-center justify-between gap-3">
        <div>
          <div className="display text-lg">Firewall</div>
          <div className="text-[12px] text-ink-300">{state.gates.dress ? "Enabled — partner cannot see anything in this scope." : "Disabled — partner can see all dress activity."}</div>
        </div>
        <button
          onClick={state.gates.dress ? disable : enable}
          disabled={busy}
          className={`rounded-2xl px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${state.gates.dress ? "bg-risk-high text-paper-50 hover:opacity-90" : "bg-ink text-paper-50 hover:bg-ink-400"}`}
        >
          {state.gates.dress ? "Disable gate" : "Enable gate"}
        </button>
      </section>

      <section className="surface rounded-card border hairline shadow-card p-4 sm:p-5">
        <h2 className="display text-xl mb-2">Couturier interview</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Silhouette references, designer preferences, body confidence notes, geographic constraints…"
          className="mt-2 w-full rounded-lg border hairline bg-white/80 px-3 py-2 text-sm focus:outline-none"
        />
        <button
          onClick={propose}
          disabled={busy || !state.brief?.locked}
          className="mt-3 rounded-2xl bg-ink text-paper-50 hover:bg-ink-400 px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {busy ? "Couturier working…" : "Propose six directions"}
        </button>
        {error && <p className="text-sm text-risk-high mt-2">{error}</p>}
      </section>

      {concepts.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-3 stagger">
          {concepts.map((d) => (
            <article key={d.id} className="surface rounded-card border hairline shadow-card p-4 hover:shadow-cardHover transition-shadow">
              <h3 className="display text-lg">{d.title}</h3>
              <pre className="mt-1 text-[13px] text-ink-400 whitespace-pre-wrap font-sans leading-relaxed">{d.description}</pre>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
