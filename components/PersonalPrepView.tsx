"use client";

// Personal prep — vows + speeches landing.

import { useState } from "react";
import Link from "next/link";
import type { ProjectState, VowDraft } from "@/lib/types";
import { useProject } from "./StateProvider";
import { PageHeader } from "./ui";

export function PersonalPrepView() {
  const { state, setState, loading } = useProject();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (loading || !state) return <div className="pt-10 text-center text-ink-300">Loading…</div>;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Personal Prep"
        title="Personal preparation"
        subtitle="Vows, speeches, attire. Every author has their own scope; partners can hide their drafts from each other until the day."
      />

      <section className="grid sm:grid-cols-2 gap-3 stagger">
        <Link href="/dress" className="surface rounded-card border hairline shadow-card p-4 hover:shadow-cardHover transition-shadow group">
          <div className="eyebrow">Couturier</div>
          <div className="display text-xl mt-1 group-hover:text-accent transition-colors">Dress / attire →</div>
          <div className="text-[13px] text-ink-300 mt-1">Gated workflow.</div>
        </Link>
        <Link href="/speeches" className="surface rounded-card border hairline shadow-card p-4 hover:shadow-cardHover transition-shadow group">
          <div className="eyebrow">Voice</div>
          <div className="display text-xl mt-1 group-hover:text-accent transition-colors">Speeches & toasts →</div>
          <div className="text-[13px] text-ink-300 mt-1">Maid of honor, best man, parents.</div>
        </Link>
      </section>

      <VowsBlock setBusy={setBusy} setError={setError} busy={busy} whose="organizer" />
      <VowsBlock setBusy={setBusy} setError={setError} busy={busy} whose="partner" />

      {error && <p className="text-sm text-risk-high">{error}</p>}
    </div>
  );
}

function VowsBlock({ whose, busy, setBusy, setError }: {
  whose: VowDraft["whose"];
  busy: string | null;
  setBusy: (s: string | null) => void;
  setError: (s: string | null) => void;
}) {
  const { state, setState } = useProject();
  const [prompts, setPrompts] = useState("");
  if (!state) return null;
  const draft = state.vows.find((v) => v.whose === whose);
  const gateOn = state.gates[whose === "organizer" ? "vows_organizer" : "vows_partner"];

  if (state.viewer === "partner" && whose === "organizer") return null;
  if (state.viewer === "organizer" && whose === "partner" && state.gates.vows_partner) return null;

  const draftIt = async () => {
    if (!prompts.trim()) return;
    setBusy("vow-" + whose); setError(null);
    try {
      const r = await fetch("/api/voice", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "draft_vows", whose, prompts }),
      });
      const j = (await r.json()) as { state?: ProjectState; error?: string };
      if (!r.ok) { setError(j.error ?? `Error ${r.status}`); return; }
      if (j.state) setState(j.state);
    } finally { setBusy(null); }
  };

  const updateDraft = async (text: string) => {
    const r = await fetch("/api/voice", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ op: "update_vow", whose, patch: { draft: text } }),
    });
    const j = (await r.json()) as { state?: ProjectState };
    if (j.state) setState(j.state);
  };

  const proposeLock = async () => {
    setBusy("lockvow-" + whose);
    try {
      const r = await fetch("/api/voice", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "propose_lock_vows", whose }),
      });
      const j = (await r.json()) as { state?: ProjectState };
      if (j.state) setState(j.state);
    } finally { setBusy(null); }
  };

  return (
    <section className="surface rounded-card border hairline shadow-card p-4 sm:p-5">
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <h2 className="display text-xl">Vows — {whose}</h2>
        <span className="eyebrow">
          {gateOn ? "Hidden from the other partner" : "Visible to both"} · {draft?.wordCount ?? 0} words
        </span>
      </div>
      {!draft ? (
        <>
          <textarea
            value={prompts}
            onChange={(e) => setPrompts(e.target.value)}
            rows={3}
            placeholder="Tell Voice what you want to say. Specifics over abstractions: the moment you knew, the small habits, the promises you actually intend to keep…"
            className="mt-3 w-full rounded-lg border hairline bg-white/80 px-3 py-2 text-sm focus:outline-none"
          />
          <button
            onClick={draftIt}
            disabled={busy === "vow-" + whose || !prompts.trim()}
            className="mt-3 rounded-2xl bg-ink text-paper-50 hover:bg-ink-400 px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {busy === "vow-" + whose ? "Voice working…" : "Draft my vows"}
          </button>
        </>
      ) : (
        <>
          <textarea
            defaultValue={draft.draft}
            onBlur={(e) => updateDraft(e.target.value)}
            rows={10}
            className="mt-3 w-full rounded-lg border hairline bg-white/80 px-3 py-2 text-[15px] font-display leading-relaxed focus:outline-none"
          />
          {draft.notes && (
            <p className="text-[12px] text-ink-300 mt-2 italic">Notes: {draft.notes}</p>
          )}
          <div className="mt-3 flex gap-2">
            <button
              onClick={proposeLock}
              disabled={busy === "lockvow-" + whose || draft.locked}
              className="rounded-2xl bg-ink text-paper-50 hover:bg-ink-400 px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
            >
              {draft.locked ? "Locked" : "Propose lock"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
