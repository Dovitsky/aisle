"use client";

import { useState } from "react";
import type { ProjectState } from "@/lib/types";
import { useProject } from "./StateProvider";
import { EmptyState, PageHeader } from "./ui";

const KIND_LABEL = {
  ring: "Ring",
  proposal_plan: "Proposal",
  engagement_photos: "Engagement photos",
  announcement: "Announcement",
  engagement_party: "Engagement party",
} as const;

export function EngagementView() {
  const { state, setState, loading } = useProject();
  const [context, setContext] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading || !state) return <div className="pt-10 text-center text-ink-300">Loading…</div>;

  const propose = async () => {
    if (!context.trim()) return;
    setBusy(true);
    try {
      const r = await fetch("/api/engagement", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "propose", context }),
      });
      const j = (await r.json()) as { state?: ProjectState };
      if (j.state) setState(j.state);
    } finally { setBusy(false); }
  };

  const update = async (id: string, patch: { status?: "idea" | "planned" | "done"; scheduledFor?: string }) => {
    const r = await fetch("/api/engagement", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ op: "update", id, patch }),
    });
    const j = (await r.json()) as { state?: ProjectState };
    if (j.state) setState(j.state);
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Concierge · Pre-brief"
        title="Engagement studio"
        subtitle="Before you have a brief, you have a relationship and a question. Ring research, a proposal plan, the announcement, and the photoshoot."
      />

      <section className="surface rounded-card border hairline shadow-card p-4 sm:p-5">
        <textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          rows={3}
          placeholder="Tell Concierge a few sentences: how long you've been together, what you're thinking about for the proposal, ring preferences, anything you'd like to nail down before going public…"
          className="w-full rounded-lg border hairline bg-white/80 px-3 py-2 text-sm focus:outline-none"
        />
        <button
          onClick={propose}
          disabled={busy || !context.trim()}
          className="mt-3 rounded-2xl bg-ink text-paper-50 hover:bg-ink-400 px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {busy ? "Concierge working…" : "Propose milestones"}
        </button>
      </section>

      {state.engagement.length === 0 ? (
        <EmptyState title="Nothing yet" hint="Give Concierge a sentence or two above, or browse the suggestions when they appear." />
      ) : (
        <ol className="grid sm:grid-cols-2 gap-3 stagger">
          {state.engagement.map((m) => (
            <li key={m.id} className="surface rounded-card border hairline shadow-card hover:shadow-cardHover transition-shadow p-4">
              <div className="flex items-baseline justify-between gap-2">
                <span className="eyebrow">{KIND_LABEL[m.kind] ?? m.kind}</span>
                <select
                  value={m.status}
                  onChange={(e) => update(m.id, { status: e.target.value as "idea" | "planned" | "done" })}
                  className="text-[11px] uppercase tracking-[0.14em] bg-transparent border hairline rounded-full px-2 py-0.5"
                >
                  <option value="idea">Idea</option>
                  <option value="planned">Planned</option>
                  <option value="done">Done</option>
                </select>
              </div>
              <h3 className="display text-base mt-1">{m.title}</h3>
              <p className="text-[13px] text-ink-400 mt-1 leading-relaxed">{m.description}</p>
              <input
                type="date"
                defaultValue={m.scheduledFor ?? ""}
                onBlur={(e) => update(m.id, { scheduledFor: e.target.value })}
                className="mt-2 text-[12px] rounded border hairline bg-white/80 px-2 py-1"
              />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
