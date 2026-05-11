"use client";

// Personal prep. The things only the two of you will say or wear. Vows
// for both partners (gated separately so neither has to read the other's
// before the day), with cross-links into Speeches and Dress.
//
// Layout: editorial hero with the most personal frame in the app — "the
// lines you'll say to each other." Two-card cross-link to /dress and
// /speeches. Then two VowsBlock sections, one per partner, with
// viewer-aware visibility (partner-of-organizer never sees organizer's
// draft; organizer sees partner's only if not gated).

import { useState } from "react";
import Link from "next/link";
import type { ProjectState, VowDraft } from "@/lib/types";
import { useProject } from "./StateProvider";
import { useToast } from "./Toast";
import { Reveal, CountUp } from "./Atmosphere";
import { ThoughtStream } from "./ThoughtStream";

export function PersonalPrepView() {
  const { state, loading } = useProject();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (loading || !state) {
    return <div className="pt-10 text-center text-ink-300">Loading…</div>;
  }

  const myWords = state.vows.find((v) => v.whose === "organizer")?.wordCount ?? 0;
  const theirWords = state.vows.find((v) => v.whose === "partner")?.wordCount ?? 0;
  const myMinutes = myWords > 0 ? Math.max(1, Math.round(myWords / 130)) : 0;
  const speechCount = state.speeches.length;
  const totalWords = myWords + theirWords;

  return (
    <div className="flex flex-col gap-12 pb-12">
      {/* Hero */}
      <header>
        <p className="text-[10px] uppercase tracking-[0.26em] text-sage-500 font-mono mb-2">
          Voice · Personal preparation
        </p>
        <div className="flex items-baseline justify-between gap-6 flex-wrap">
          <h1 className="display text-[36px] sm:text-[44px] lg:text-[52px] leading-[1.02] tracking-[-0.01em]">
            {totalWords === 0 ? (
              <>The lines you&rsquo;ll <span className="italic text-sage-500">say to each other</span>.</>
            ) : myWords > 0 && theirWords === 0 ? (
              <><CountUp value={myWords} /> words,{" "}
                <span className="italic text-sage-500">your half written</span>.</>
            ) : theirWords > 0 && myWords === 0 ? (
              <><span className="italic text-sage-500">Their half&rsquo;s written</span>. Yours is waiting.</>
            ) : (
              <>Both halves <span className="italic text-sage-500">drafted</span>.</>
            )}
          </h1>
          {myWords > 0 && (
            <div className="text-right">
              <div className="display text-[28px] tabular-nums leading-none text-sage-500">
                ~{myMinutes}<span className="text-[18px] text-ink-300"> min</span>
              </div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-ink-300 font-mono mt-1">
                your read time
              </div>
            </div>
          )}
        </div>
        <p className="text-[14px] text-ink-300 mt-4 leading-relaxed max-w-[60ch]">
          Vows, speeches, the dress. Each piece has its own scope — you can hide your draft
          from your partner until the day, and the gates around the dress and surprise gifts
          work the same way.
        </p>
      </header>

      {/* Cross-links */}
      <Reveal>
        <section className="grid sm:grid-cols-2 gap-4">
          <Link
            href="/dress"
            className="group surface rounded-card card-shell hover:shadow-cardHover transition-all hover:-translate-y-0.5 px-5 py-5 overflow-hidden"
          >
            <p className="text-[10px] uppercase tracking-[0.22em] text-sage-500 font-mono mb-2">
              Couturier · Dress & attire
            </p>
            <h3 className="display italic text-[24px] leading-tight group-hover:text-sage-500 transition-colors">
              What you&rsquo;ll wear →
            </h3>
            <p className="text-[13px] text-ink-300 mt-2 leading-relaxed">
              {state.gates.dress
                ? "Firewall on — your partner can&rsquo;t see anything in this room."
                : "Visible to both right now. Turn the firewall on inside if you want it private."}
            </p>
          </Link>
          <Link
            href="/speeches"
            className="group surface rounded-card card-shell hover:shadow-cardHover transition-all hover:-translate-y-0.5 px-5 py-5 overflow-hidden"
          >
            <p className="text-[10px] uppercase tracking-[0.22em] text-sage-500 font-mono mb-2">
              Voice · Speeches & toasts
            </p>
            <h3 className="display italic text-[24px] leading-tight group-hover:text-sage-500 transition-colors">
              {speechCount > 0 ? `${speechCount} in the works →` : "For whoever's at the mic →"}
            </h3>
            <p className="text-[13px] text-ink-300 mt-2 leading-relaxed">
              Maid of honor, best man, parents, you. Voice helps shape the arc.
            </p>
          </Link>
        </section>
      </Reveal>

      {/* Section header */}
      <Reveal>
        <header>
          <p className="text-[10px] uppercase tracking-[0.22em] text-sage-500 font-mono mb-1.5">
            The vows
          </p>
          <h2 className="display italic text-[22px] text-ink leading-tight">
            What you&rsquo;ll promise, in your own words
          </h2>
        </header>
      </Reveal>

      <VowsBlock setBusy={setBusy} setError={setError} busy={busy} whose="organizer" />
      <VowsBlock setBusy={setBusy} setError={setError} busy={busy} whose="partner" />

      {error && <p className="text-[13px] text-risk-high">{error}</p>}
    </div>
  );
}

function VowsBlock({
  whose, busy, setBusy, setError,
}: {
  whose: VowDraft["whose"];
  busy: string | null;
  setBusy: (s: string | null) => void;
  setError: (s: string | null) => void;
}) {
  const { state, setState } = useProject();
  const { notify } = useToast();
  const [prompts, setPrompts] = useState("");
  if (!state) return null;
  const draft = state.vows.find((v) => v.whose === whose);
  const gateOn = state.gates[whose === "organizer" ? "vows_organizer" : "vows_partner"];

  // Visibility rules:
  //  • Partner viewing the organizer's block — never.
  //  • Organizer viewing partner's block — only if partner's vows aren't gated.
  if (state.viewer === "partner" && whose === "organizer") return null;
  if (state.viewer === "organizer" && whose === "partner" && state.gates.vows_partner) return null;

  const isMine =
    (state.viewer === "organizer" && whose === "organizer") ||
    (state.viewer === "partner" && whose === "partner");

  const draftIt = async () => {
    if (!prompts.trim()) return;
    setBusy("vow-" + whose);
    setError(null);
    try {
      const r = await fetch("/api/voice", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "draft_vows", whose, prompts }),
      });
      const j = (await r.json()) as { state?: ProjectState; error?: string };
      if (!r.ok) { setError(j.error ?? `Error ${r.status}`); return; }
      if (j.state) {
        setState(j.state);
        notify({
          kind: "agent",
          agent: "Voice",
          title: "A first draft, on you",
          detail: "Edit anything — read it aloud at full volume before the day.",
        });
      }
    } finally {
      setBusy(null);
    }
  };

  const updateDraft = async (text: string) => {
    const r = await fetch("/api/voice", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ op: "update_vow", whose, patch: { draft: text } }),
    });
    const j = (await r.json()) as { state?: ProjectState };
    if (j.state) setState(j.state);
  };

  const proposeLock = async () => {
    setBusy("lockvow-" + whose);
    try {
      const r = await fetch("/api/voice", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "propose_lock_vows", whose }),
      });
      const j = (await r.json()) as { state?: ProjectState };
      if (j.state) setState(j.state);
    } finally {
      setBusy(null);
    }
  };

  const wordCount = draft?.wordCount ?? 0;
  const minutes = wordCount > 0 ? Math.max(1, Math.round(wordCount / 130)) : 0;

  return (
    <Reveal>
      <section className={`surface rounded-card card-shell overflow-hidden ${
        draft?.locked ? "ring-1 ring-sage-300/60" : ""
      }`}>
        <header className="px-5 pt-4 pb-3 border-b hairline flex items-baseline justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-sage-500 font-mono">
              {isMine ? "Yours" : "Your partner's"}
            </p>
            <h3 className="display italic text-[24px] leading-tight mt-0.5">
              {isMine ? "Your vows" : "Your partner&rsquo;s vows"}
            </h3>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.18em] font-mono text-ink-300">
              {gateOn ? "Hidden from the other partner" : "Visible to both"}
            </p>
            {wordCount > 0 && (
              <p className="text-[11.5px] text-ink-300 mt-0.5">
                <span className="tabular-nums text-ink">{wordCount}</span> words · ~{minutes} min
              </p>
            )}
          </div>
        </header>

        <div className="px-5 py-5">
          {!draft ? (
            <>
              <p className="text-[13.5px] text-ink-300 italic mb-3 leading-relaxed">
                Tell Voice what you want to say. Specifics over abstractions — the moment you
                knew, the small habits, the promises you actually intend to keep.
              </p>
              <textarea
                value={prompts}
                onChange={(e) => setPrompts(e.target.value)}
                rows={4}
                placeholder="e.g. The Tuesday she stayed up with me when I was sick. The way they remember everyone's coffee order. The promise to keep choosing each other on the hard days, not just the easy ones."
                className="w-full rounded-lg border hairline bg-paper-50 px-3 py-2.5 text-[14px] leading-relaxed focus:outline-none focus:border-sage-300 resize-none"
              />
              <div className="mt-4 flex items-center gap-4">
                <button
                  onClick={draftIt}
                  disabled={busy === "vow-" + whose || !prompts.trim()}
                  className="btn-primary"
                  style={{ paddingInline: "1.4rem", paddingBlock: "0.55rem" }}
                >
                  {busy === "vow-" + whose ? "Voice working…" : "Draft a first version"}
                </button>
                {busy === "vow-" + whose && (
                  <ThoughtStream kind="agent-thinking" tone="sage" size="sm" />
                )}
              </div>
            </>
          ) : (
            <>
              <textarea
                defaultValue={draft.draft}
                onBlur={(e) => updateDraft(e.target.value)}
                rows={12}
                className="w-full rounded-xl border hairline bg-paper-50 px-4 py-3.5 text-[15.5px] leading-[1.75] focus:outline-none focus:border-sage-300"
                style={{
                  fontFamily: '"Cormorant","Cormorant Garamond",Georgia,serif',
                  fontWeight: 400,
                }}
              />
              {draft.notes && (
                <p className="text-[12.5px] text-ink-300 italic mt-3 leading-relaxed">
                  Voice&rsquo;s notes: {draft.notes}
                </p>
              )}
              <div className="mt-4 flex items-center gap-4 flex-wrap">
                <button
                  onClick={proposeLock}
                  disabled={busy === "lockvow-" + whose || draft.locked}
                  className={`text-[11px] uppercase tracking-[0.18em] border rounded-full px-3.5 py-1.5 transition-colors ${
                    draft.locked
                      ? "bg-sage-200 text-sage-500 border-sage-300"
                      : "border-sage-300 hover:border-sage-500 text-sage-500"
                  } disabled:opacity-60`}
                >
                  {draft.locked ? "Locked, ready to read" : busy === "lockvow-" + whose ? "Working…" : "Mark ready to read"}
                </button>
                <span className="text-[11px] uppercase tracking-[0.18em] text-ink-300">
                  Read aloud at full volume before the day
                </span>
              </div>
            </>
          )}
        </div>
      </section>
    </Reveal>
  );
}
