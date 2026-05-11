"use client";

// Speeches & toasts. Voice agent drafts a personal toast for whoever's
// taking the mic. Page is gated per-author when state.gates.speech is on
// (server-side filterForViewer handles the partner viewer too).

import { useMemo, useState } from "react";
import type { ProjectState, SpeechDraft } from "@/lib/types";
import { useProject } from "./StateProvider";
import { Reveal } from "./Atmosphere";

const ROLE_PRESETS: { label: string; relationship: string }[] = [
  { label: "Maid of honor",       relationship: "Best friend / sister of the bride" },
  { label: "Best man",            relationship: "Best friend / brother of the groom" },
  { label: "Father of the bride", relationship: "Father of the bride" },
  { label: "Mother of the bride", relationship: "Mother of the bride" },
  { label: "Officiant",           relationship: "Officiant for the ceremony" },
  { label: "Bride",               relationship: "Bride" },
  { label: "Groom",               relationship: "Groom" },
];

export function SpeechesView() {
  const { state, setState, loading } = useProject();
  const [speaker, setSpeaker] = useState("");
  const [relationship, setRelationship] = useState("");
  const [prompts, setPrompts] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const speeches = useMemo(() => state?.speeches ?? [], [state]);

  if (loading || !state) return <div className="pt-10 text-center text-ink-300">Loading…</div>;

  if (state.viewer === "partner" && state.gates.speech) {
    return (
      <div className="pt-24 text-center">
        <p className="text-[10px] uppercase tracking-[0.32em] text-sage-500 font-mono mb-4">
          Speeches
        </p>
        <p className="display italic text-[28px] text-ink-300 leading-tight">
          I don't have anything to share on that.
        </p>
      </div>
    );
  }

  const draft = async () => {
    if (!speaker || !relationship || !prompts.trim()) return;
    setBusy(true); setError(null);
    try {
      const r = await fetch("/api/voice", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "draft_speech", speaker, relationship, prompts }),
      });
      const j = (await r.json()) as { state?: ProjectState; error?: string };
      if (!r.ok) { setError(j.error ?? `Error ${r.status}`); return; }
      if (j.state) {
        setState(j.state);
        // Open the new speech if we can find it
        const newest = j.state.speeches[j.state.speeches.length - 1];
        if (newest) setOpenId(newest.id);
      }
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
    <div className="flex flex-col gap-12 pb-12">
      {/* Hero */}
      <header>
        <p className="text-[10px] uppercase tracking-[0.26em] text-sage-500 font-mono mb-2">
          Voice · The toasts
        </p>
        <div className="flex items-baseline justify-between gap-6 flex-wrap">
          <h1 className="display text-[36px] sm:text-[44px] lg:text-[52px] leading-[1.02] tracking-[-0.01em]">
            {speeches.length === 0 ? (
              <>Speeches & toasts.</>
            ) : speeches.length === 1 ? (
              <>One toast in progress.</>
            ) : (
              <>{speeches.length} toasts in progress.</>
            )}
          </h1>
          {speeches.length > 0 && (
            <div className="text-right">
              <div className="display text-[28px] tabular-nums leading-none text-sage-500">
                {speeches.filter((s) => s.approved).length}
              </div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-ink-300 font-mono mt-1">
                approved
              </div>
            </div>
          )}
        </div>
        <p className="text-[14px] text-ink-300 mt-4 leading-relaxed max-w-[60ch]">
          Voice drafts a 3–5 minute toast for whoever's taking the mic.
          Specifics beat abstractions. one story, one moment you knew, one promise.
          Read aloud at full volume before the day.
        </p>
      </header>

      {/* DRAFT FORM */}
      <Reveal>
        <section className="rounded-card border hairline bg-white/85 px-5 py-5">
          <div className="text-[10px] uppercase tracking-[0.22em] text-sage-500 font-mono mb-3">
            New toast
          </div>

          <div className="grid sm:grid-cols-[1fr_1fr] gap-3 mb-3">
            <label className="flex flex-col gap-1 min-w-0">
              <span className="text-[10px] uppercase tracking-[0.22em] text-ink-300 font-mono">
                Speaker
              </span>
              <input
                value={speaker}
                onChange={(e) => setSpeaker(e.target.value)}
                placeholder="e.g. Maid of honor"
                className="rounded-lg border hairline bg-paper-50 px-3 py-2 text-[14px] focus:outline-none focus:border-sage-300"
              />
            </label>
            <label className="flex flex-col gap-1 min-w-0">
              <span className="text-[10px] uppercase tracking-[0.22em] text-ink-300 font-mono">
                Relationship
              </span>
              <input
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                placeholder="e.g. Sister of the bride"
                className="rounded-lg border hairline bg-paper-50 px-3 py-2 text-[14px] focus:outline-none focus:border-sage-300"
              />
            </label>
          </div>

          {/* Role presets */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {ROLE_PRESETS.map((p) => {
              const active = speaker === p.label;
              return (
                <button
                  key={p.label}
                  onClick={() => {
                    setSpeaker(p.label);
                    if (!relationship) setRelationship(p.relationship);
                  }}
                  className={`text-[11px] uppercase tracking-[0.16em] rounded-full border px-3 py-1 transition-colors ${
                    active
                      ? "bg-ink text-paper-50 border-ink"
                      : "border-ink/15 text-ink-400 hover:border-ink/30 hover:text-ink"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-[0.22em] text-ink-300 font-mono">
              The good stuff
            </span>
            <textarea
              value={prompts}
              onChange={(e) => setPrompts(e.target.value)}
              rows={4}
              placeholder="One specific story. The moment you knew. The thing they always do. Anything you'd never want to forget."
              className="rounded-lg border hairline bg-paper-50 px-3 py-2.5 text-[14px] leading-relaxed focus:outline-none focus:border-sage-300"
            />
          </label>

          {error && <p className="text-sm text-risk-high mt-3">{error}</p>}

          <div className="mt-4 flex items-center gap-4">
            <button
              onClick={draft}
              disabled={busy || !speaker || !relationship || !prompts.trim()}
              className="btn-primary"
              style={{ paddingInline: "1.4rem", paddingBlock: "0.55rem" }}
            >
              {busy ? "Working…" : "Draft this toast"}
            </button>
            {!busy && (!speaker || !relationship || !prompts.trim()) && (
              <span className="text-[11px] uppercase tracking-[0.18em] text-ink-300">
                Need: speaker, relationship, and one specific story
              </span>
            )}
          </div>
        </section>
      </Reveal>

      {/* SPEECH LIST */}
      {speeches.length === 0 ? (
        <Reveal>
          <div className="rounded-card border hairline bg-white/55 px-7 py-12 max-w-xl">
            <p className="display text-[26px] text-ink leading-tight">
              No toasts yet.
            </p>
            <p className="text-[14px] text-ink-300 mt-3 leading-relaxed">
              Pick a role above and tell Voice one specific story. Drafts come back in 3–5 minutes spoken length, with one toast at the end and a glass-up. No clichés.
            </p>
          </div>
        </Reveal>
      ) : (
        <Reveal>
          <section>
            <h2 className="display italic text-[22px] text-ink leading-tight mb-5">
              In progress
            </h2>
            <div className="flex flex-col gap-4">
              {speeches.map((sp) => (
                <SpeechCard
                  key={sp.id}
                  sp={sp}
                  open={openId === sp.id}
                  onToggle={() => setOpenId(openId === sp.id ? null : sp.id)}
                  onUpdate={(patch) => update(sp.id, patch)}
                />
              ))}
            </div>
          </section>
        </Reveal>
      )}
    </div>
  );
}

// --------------------------------------------------------------------

function SpeechCard({
  sp, open, onToggle, onUpdate,
}: {
  sp: SpeechDraft;
  open: boolean;
  onToggle: () => void;
  onUpdate: (patch: { draft?: string; approved?: boolean }) => void;
}) {
  const minutes = Math.max(1, Math.round(sp.wordCount / 130));
  const wordTone =
    sp.wordCount < 250 ? "text-risk-medium" :
    sp.wordCount > 800 ? "text-risk-medium" :
    "text-sage-500";

  return (
    <article className={`surface rounded-card card-shell hover:shadow-cardHover transition-all overflow-hidden ${
      sp.approved ? "ring-1 ring-sage-300" : ""
    }`}>
      <div
        className="px-5 pt-4 pb-3 flex items-baseline justify-between gap-4 cursor-pointer"
        onClick={onToggle}
      >
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <h3 className="display text-[22px] leading-tight">{sp.speaker}</h3>
            {sp.approved && (
              <span className="text-[10px] uppercase tracking-[0.2em] text-sage-500 font-mono">
                approved
              </span>
            )}
          </div>
          <div className="mt-1 flex items-baseline gap-3 text-[11px] uppercase tracking-[0.18em] font-mono">
            <span className={wordTone}>
              {sp.wordCount} words
            </span>
            <span className="text-ink-300">~{minutes} min spoken</span>
          </div>
        </div>
        <button
          className="shrink-0 text-[10px] uppercase tracking-[0.22em] text-ink-300 hover:text-ink"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
        >
          {open ? "Collapse" : "Open"}
        </button>
      </div>

      {open && (
        <div className="px-5 pb-5 animate-fade-in-soft">
          <textarea
            defaultValue={sp.draft}
            onBlur={(e) => onUpdate({ draft: e.target.value })}
            rows={Math.min(28, Math.max(8, Math.ceil(sp.draft.length / 70)))}
            className="w-full rounded-xl border hairline bg-paper-50 px-4 py-3.5 text-[15px] font-display leading-[1.7] focus:outline-none focus:border-sage-300"
            style={{ fontFamily: '"Cormorant","Cormorant Garamond",Georgia,serif', fontWeight: 400 }}
          />
          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <button
              onClick={() => onUpdate({ approved: !sp.approved })}
              className={`rounded-full px-4 py-2 text-[12px] uppercase tracking-[0.18em] border transition-all ${
                sp.approved
                  ? "bg-sage-100 text-sage-500 border-sage-300 hover:bg-sage-200"
                  : "cta-sage border-transparent"
              }`}
            >
              {sp.approved ? "Un-approve" : "Mark approved"}
            </button>
            <button
              onClick={() => navigator.clipboard.writeText(sp.draft)}
              className="text-[11px] uppercase tracking-[0.18em] text-ink-300 hover:text-ink transition-colors"
            >
              Copy text
            </button>
            <span className="text-[11px] uppercase tracking-[0.18em] text-ink-300">
              Read aloud at full volume before the day
            </span>
          </div>
        </div>
      )}
    </article>
  );
}
