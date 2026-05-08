"use client";

import { useState } from "react";
import type { ProjectState } from "@/lib/types";
import { useProject } from "./StateProvider";
import { EmptyState, PageHeader } from "./ui";

export function SpeechesView() {
  const { state, setState, loading } = useProject();
  const [speaker, setSpeaker] = useState("");
  const [relationship, setRelationship] = useState("");
  const [prompts, setPrompts] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading || !state) return <div className="pt-10 text-center text-ink-300">Loading…</div>;

  if (state.viewer === "partner" && state.gates.speech) {
    return <p className="pt-16 text-center text-ink-300 animate-fade-in-soft">I don&apos;t have anything to share on that.</p>;
  }

  const draft = async () => {
    if (!speaker || !relationship || !prompts.trim()) return;
    setBusy(true);
    try {
      const r = await fetch("/api/voice", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "draft_speech", speaker, relationship, prompts }),
      });
      const j = (await r.json()) as { state?: ProjectState };
      if (j.state) setState(j.state);
      setSpeaker(""); setRelationship(""); setPrompts("");
    } finally { setBusy(false); }
  };

  const update = async (id: string, patch: { draft?: string; approved?: boolean }) => {
    const r = await fetch("/api/voice", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ op: "update_speech", id, patch }),
    });
    const j = (await r.json()) as { state?: ProjectState };
    if (j.state) setState(j.state);
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Voice"
        title="Speeches & toasts"
        subtitle="Drafts for whoever's giving a toast. Read aloud at full volume before the day. Specifics beat abstractions."
      />

      <section className="surface rounded-card border hairline shadow-card p-4 sm:p-5 grid gap-2">
        <div className="grid sm:grid-cols-2 gap-2">
          <input value={speaker} onChange={(e) => setSpeaker(e.target.value)} placeholder="Speaker (e.g., Maid of honor)" className="rounded-lg border hairline bg-white/80 px-3 py-2 text-sm focus:outline-none" />
          <input value={relationship} onChange={(e) => setRelationship(e.target.value)} placeholder="Relationship (e.g., Sister of the bride)" className="rounded-lg border hairline bg-white/80 px-3 py-2 text-sm focus:outline-none" />
        </div>
        <textarea
          value={prompts}
          onChange={(e) => setPrompts(e.target.value)}
          rows={3}
          placeholder="One specific story. The moment you knew. The thing they always do. Anything you'd never want to forget."
          className="rounded-lg border hairline bg-white/80 px-3 py-2 text-sm focus:outline-none"
        />
        <button
          onClick={draft}
          disabled={busy || !speaker || !relationship || !prompts.trim()}
          className="rounded-2xl bg-ink text-paper-50 hover:bg-ink-400 px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 self-start"
        >
          {busy ? "Voice working…" : "Draft this speech"}
        </button>
      </section>

      {state.speeches.length === 0 ? (
        <EmptyState title="No speeches yet" hint="Draft one above. The toast that gets the loudest laugh starts with one specific story." />
      ) : (
        <div className="flex flex-col gap-3 stagger">
          {state.speeches.map((sp) => (
            <article key={sp.id} className="surface rounded-card border hairline shadow-card hover:shadow-cardHover transition-shadow p-4 sm:p-5">
              <div className="flex items-baseline justify-between gap-2 flex-wrap">
                <h3 className="display text-lg">{sp.speaker}</h3>
                <span className="eyebrow">{sp.wordCount} words · ~{Math.round(sp.wordCount / 130)} min</span>
              </div>
              <textarea
                defaultValue={sp.draft}
                onBlur={(e) => update(sp.id, { draft: e.target.value })}
                rows={10}
                className="mt-2 w-full rounded-lg border hairline bg-white/80 px-3 py-2 text-[15px] font-display leading-relaxed focus:outline-none"
              />
              <button
                onClick={() => update(sp.id, { approved: !sp.approved })}
                className={`mt-3 rounded-2xl px-4 py-1.5 text-sm border transition-colors ${sp.approved ? "bg-risk-low/10 border-risk-low/30 text-risk-low" : "bg-white/80 hairline hover:bg-white"}`}
              >
                {sp.approved ? "✓ Approved" : "Mark approved"}
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
