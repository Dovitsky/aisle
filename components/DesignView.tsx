"use client";

import { useState } from "react";
import type { ProjectState } from "@/lib/types";
import { useProject } from "./StateProvider";
import { EmptyState, PageHeader } from "./ui";

export function DesignView() {
  const { state, setState, loading } = useProject();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading || !state) return <div className="pt-10 text-center text-ink-300">Loading…</div>;

  const moodboards = state.designs.filter((d) => d.kind === "moodboard");

  const propose = async () => {
    setBusy(true); setError(null);
    try {
      const r = await fetch("/api/design", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "propose" }),
      });
      const j = (await r.json()) as { state?: ProjectState; error?: string };
      if (!r.ok) { setError(j.error ?? `Error ${r.status}`); return; }
      if (j.state) setState(j.state);
    } finally { setBusy(false); }
  };

  const publish = async (id: string, title: string) => {
    setBusy(true); setError(null);
    try {
      const r = await fetch("/api/design", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "publish", assetId: id, title }),
      });
      const j = (await r.json()) as { state?: ProjectState };
      if (j.state) setState(j.state);
    } finally { setBusy(false); }
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Designer"
        title="Design direction"
        subtitle="Six directions per pass. Locking a direction sets the system color and tone for stationery, signage, and florals."
        action={state.brief?.locked && (
          <button
            onClick={propose}
            disabled={busy}
            className="rounded-2xl bg-ink text-paper-50 px-4 py-2 text-sm font-medium hover:bg-ink-400 transition-colors disabled:opacity-50"
          >
            {busy ? "Designer working…" : moodboards.length ? "Generate another six" : "Propose six directions"}
          </button>
        )}
      />

      {!state.brief?.locked && (
        <div className="rounded-card border hairline bg-paper-200/40 px-4 py-3 text-sm">Lock the brief first.</div>
      )}

      {error && <p className="text-sm text-risk-high">{error}</p>}

      {moodboards.length === 0 && state.brief?.locked && (
        <EmptyState
          title="No mood boards yet"
          hint="Designer will produce six distinct directions in one pass — different formality, density, color, and cultural reference. You pick one."
          action={{ label: "Have Designer propose", onClick: propose, primary: true }}
        />
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 stagger">
        {moodboards.map((d) => (
          <article key={d.id} className="surface rounded-card border hairline shadow-card hover:shadow-cardHover transition-shadow overflow-hidden group">
            <div className="grid grid-cols-5 h-14 transition-transform group-hover:scale-[1.01] origin-top">
              {(d.swatches ?? []).slice(0, 5).map((c, i) => (
                <div key={i} style={{ background: c }} />
              ))}
            </div>
            <div className="p-4">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="display text-lg leading-snug">{d.title}</h3>
                {d.approved && <span className="eyebrow text-risk-low">locked</span>}
              </div>
              <p className="text-[13px] text-ink-400 mt-1.5 leading-relaxed">{d.description}</p>
              {d.refs && d.refs.length > 0 && (
                <ul className="mt-2.5 flex flex-wrap gap-1">
                  {d.refs.map((r, i) => (
                    <li key={i} className="text-[11px] border hairline rounded-full px-2 py-0.5 text-ink-300 bg-white/40">{r}</li>
                  ))}
                </ul>
              )}
              {!d.approved && (
                <button
                  onClick={() => publish(d.id, d.title)}
                  disabled={busy}
                  className="mt-3 w-full rounded-2xl border hairline bg-white/80 hover:bg-white py-2 text-sm transition-colors disabled:opacity-50"
                >
                  Lock this direction
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
