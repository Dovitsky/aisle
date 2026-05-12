"use client";

// DressView. the gated workflow. When the firewall is on, the partner's
// view of Corsia shows nothing. no cards, no budget line, no vendor names,
// no ledger entries. Couturier proposes silhouettes here; the trying-on
// happens at fittings tracked under /visits.

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ProjectState } from "@/lib/types";
import { useProject } from "./StateProvider";
import { useToast } from "./Toast";
import { PageHeader, Stat } from "./ui";
import { Reveal } from "./Atmosphere";
import { ThoughtStream } from "./ThoughtStream";

export function DressView() {
  const { state, setState, loading } = useProject();
  const { notify } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const concepts = useMemo(() => {
    if (!state) return [];
    return state.designs.filter((d) => d.kind === "dress_concept");
  }, [state]);

  if (loading || !state) {
    return <div className="pt-10 text-center text-ink-300">Loading…</div>;
  }

  // The partner's view, when the gate is on, sees nothing. soft refusal.
  if (state.viewer === "partner" && state.gates.dress) {
    return (
      <div className="pt-24 text-center max-w-md mx-auto animate-fade-in-soft">
        <p className="text-[10px] uppercase tracking-[0.32em] text-sage-500 font-mono mb-4">
          Couturier
        </p>
        <p className="display italic text-[28px] text-ink-300 leading-tight">
          I don't have anything to share on that.
        </p>
      </div>
    );
  }

  const post = async (op: string, key: string, body: object = {}) => {
    setBusy(key);
    setError(null);
    try {
      const r = await fetch("/api/dress", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ op, ...body }),
      });
      const j = (await r.json()) as { state?: ProjectState; error?: string };
      if (!r.ok) {
        setError(j.error ?? `Error ${r.status}`);
        return;
      }
      if (j.state) {
        setState(j.state);
        if (op === "propose") {
          notify({
            kind: "agent",
            agent: "Couturier",
            title: "Six silhouettes drawn up",
            detail: "All hidden from your partner. Take your time.",
          });
        }
        if (op === "enable_gate" || op === "disable_gate") {
          notify({
            kind: "info",
            title: op === "enable_gate" ? "Firewall on" : "Firewall off",
            detail:
              op === "enable_gate"
                ? "Your partner won't see any dress activity."
                : "Dress activity will appear normally for both of you.",
          });
        }
      }
    } finally {
      setBusy(null);
    }
  };

  const briefLocked = !!state.brief?.locked;

  return (
    <div className="flex flex-col gap-10 pb-12">
      <PageHeader
        eyebrow="Personal & private"
        title={
          <>
            The dress.
          </>
        }
        subtitle="When the firewall is on, none of this exists for your partner. no cards, no budget line, no vendor names, no ledger entries. They won't even see this room in the menu."
      />

      {/* Firewall toggle */}
      <Reveal>
        <section
          className={`surface rounded-card border shadow-card p-5 flex items-center justify-between gap-4 ${
            state.gates.dress
              ? "border-sage-300/50 bg-sage-50/60"
              : "hairline bg-white/65"
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <span
                className={`inline-block w-1.5 h-1.5 rounded-full ${
                  state.gates.dress ? "bg-sage-500 animate-pulse-soft" : "bg-ink-200"
                }`}
                aria-hidden
              />
              <h2 className="display text-[20px] leading-tight">
                Firewall {state.gates.dress ? "is on" : "is off"}
              </h2>
            </div>
            <p className="text-[13px] text-ink-300 mt-1.5 leading-relaxed">
              {state.gates.dress
                ? "Your partner cannot see anything in this room. Trust the gate. turn it off only when you're ready to share."
                : "Your partner can see all dress activity. Turn this on to keep things to yourself."}
            </p>
          </div>
          <button
            onClick={() => post(state.gates.dress ? "disable_gate" : "enable_gate", "gate")}
            disabled={!!busy}
            className={`rounded-2xl px-5 py-2.5 text-[13px] font-semibold transition-colors disabled:opacity-50 shrink-0 ${
              state.gates.dress
                ? "border hairline bg-white text-ink hover:bg-paper-200/60"
                : "cta-sage"
            }`}
          >
            {busy === "gate" ? "…" : state.gates.dress ? "Turn off" : "Turn on"}
          </button>
        </section>
      </Reveal>

      {/* Stat row when concepts exist */}
      {concepts.length > 0 && (
        <div className="grid grid-cols-3 gap-3 max-w-md stagger">
          <Stat label="Directions" value={concepts.length} />
          <Stat label="Saved" value={concepts.filter((c) => c.approved).length} tone="low" />
          <Stat
            label="Fittings booked"
            value={state.visits.filter((v) => v.kind === "fitting").length}
            sub="under Visits"
          />
        </div>
      )}

      {/* Couturier interview */}
      <Reveal>
        <section className="surface rounded-card border hairline shadow-card p-5">
          <p className="text-[10px] uppercase tracking-[0.26em] text-sage-500 font-mono mb-3">
            Couturier interview
          </p>
          <p className="text-[14px] text-ink-300 leading-relaxed mb-3 max-w-[60ch]">
            A few sentences for the Couturier. silhouettes you keep coming back to,
            designers you love, body-confidence notes (formality, coverage, structure),
            geography (boutique nearby? trunk show coming up?). The more specific, the
            sharper the directions.
          </p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="e.g. Slip silhouette, low back, ivory rather than white. Anything Galia Lahav. Shoulders covered. Will travel to NYC for trunk shows."
            className="w-full rounded-lg border hairline bg-white/85 px-3 py-2.5 text-[14px] leading-relaxed focus:outline-none focus:border-sage-300 resize-none"
          />
          {!briefLocked && (
            <p className="text-[12px] text-ink-300 italic mt-2">
              Seal the dossier first and Couturier will have what it needs.
            </p>
          )}
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={() => post("propose", "propose", { notes })}
              disabled={!!busy || !briefLocked}
              className="rounded-2xl cta-sage px-5 py-2.5 text-[13px] font-semibold transition-colors disabled:opacity-50"
            >
              {busy === "propose"
                ? "Working…"
                : concepts.length === 0
                ? "Pull together six directions"
                : "Pull together six more"}
            </button>
            {busy === "propose" && (
              <ThoughtStream kind="dress-render" tone="sage" size="sm" />
            )}
          </div>
          {error && <p className="text-sm text-risk-high mt-3">{error}</p>}
        </section>
      </Reveal>

      {/* Concepts grid */}
      {concepts.length > 0 && (
        <Reveal>
          <section>
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="display italic text-[22px] leading-tight">
                Directions
                <span className="not-italic text-ink-300 ml-2 text-[14px]">
                  {concepts.length}
                </span>
              </h2>
              <Link
                href="/visits"
                className="text-[11px] uppercase tracking-[0.18em] text-ink-300 hover:text-sage-500 transition-colors"
              >
                Book a fitting →
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 stagger">
              {concepts.map((d) => (
                <article
                  key={d.id}
                  className="surface rounded-card border hairline shadow-card p-5 hover:shadow-cardHover transition-shadow"
                >
                  <h3 className="display italic text-[20px] leading-tight">
                    {d.title}
                  </h3>
                  {d.swatches && d.swatches.length > 0 && (
                    <div className="mt-3 flex gap-1">
                      {d.swatches.slice(0, 6).map((c, i) => (
                        <span
                          key={i}
                          className="block w-5 h-5 rounded-full border hairline"
                          style={{ background: c }}
                        />
                      ))}
                    </div>
                  )}
                  <pre className="mt-3 text-[13.5px] text-ink-400 whitespace-pre-wrap font-sans leading-relaxed">
                    {d.description}
                  </pre>
                </article>
              ))}
            </div>
          </section>
        </Reveal>
      )}
    </div>
  );
}
