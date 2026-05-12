"use client";

// Cake. Patissier sketches the tier count, flavor stack, frosting, and
// decoration. Allergens auto-cross-check against the guests' dietary
// records.
//
// Layout: editorial hero with cake-state title (no cake / N tiers, N
// flavors / locked); sage-mono propose card; numbered flavor stack with
// bottom-tier-first ordering; frosting/decoration as two card-shell
// tiles; allergen warning in risk-medium when present with /dietary
// cross-link; send-to-decisions CTA when not yet locked.

import Link from "next/link";
import { useState } from "react";
import { ALLERGEN_LABEL, type ProjectState } from "@/lib/types";
import { useProject } from "./StateProvider";
import { PickedForYou } from "./PickedForYou";
import { useToast } from "./Toast";
import { Reveal, CountUp } from "./Atmosphere";
import { ThoughtStream } from "./ThoughtStream";

export function CakeView() {
  const { state, setState, loading } = useProject();
  const { notify } = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  if (loading || !state) {
    return <div className="pt-10 text-center text-ink-300">Loading…</div>;
  }
  const cake = state.cake;
  const briefLocked = !!state.brief?.locked;

  const post = async (body: object, key: string) => {
    setBusy(key);
    try {
      const r = await fetch("/api/cake", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await r.json()) as { state?: ProjectState };
      if (j.state) {
        setState(j.state);
        if (key === "propose") {
          notify({
            kind: "agent",
            agent: "Patissier",
            title: "A cake spec",
            detail: `${j.state.cake?.tiers ?? 0} tiers · ${j.state.cake?.flavors.length ?? 0} flavors`,
          });
        } else if (key === "lock") {
          notify({
            kind: "approval",
            agent: "Patissier",
            title: "Lock the cake?",
            detail: "Open the home queue to confirm.",
            hrefOnClick: "/",
          });
        }
      }
    } finally {
      setBusy(null);
    }
  };

  const guests = state.brief?.guestCount ?? 0;
  const servingsPerGuest = cake && guests ? (cake.servings / guests).toFixed(1) : null;

  return (
    <div className="flex flex-col gap-12 pb-12">
      {/* Hero */}
      <header>
        <p className="text-[10px] uppercase tracking-[0.26em] text-sage-500 font-mono mb-2">
          Patissier · The cake
        </p>
        <div className="flex items-baseline justify-between gap-6 flex-wrap">
          <h1 className="display text-[36px] sm:text-[44px] lg:text-[52px] leading-[1.02] tracking-[-0.01em]">
            {!cake ? (
              <>The <span className="italic text-sage-500">last bite</span> of the night.</>
            ) : cake.approved ? (
              <><CountUp value={cake.tiers} /> tiers,{" "}
                <span className="italic text-sage-500">locked</span>.</>
            ) : (
              <><CountUp value={cake.tiers} /> tiers,{" "}
                <span className="italic text-sage-500">{cake.flavors.length} flavors</span>.</>
            )}
          </h1>
          {cake && (
            <div className="text-right">
              <div className="display text-[28px] tabular-nums leading-none text-sage-500">
                {cake.servings}
              </div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-ink-300 font-mono mt-1">
                servings{servingsPerGuest ? ` · ${servingsPerGuest} per guest` : ""}
              </div>
            </div>
          )}
        </div>
        <p className="text-[14px] text-ink-300 mt-4 leading-relaxed max-w-[60ch]">
          {cake
            ? `${cake.frostingStyle} frosting, ${cake.flavors.length} flavors. Allergens cross-check against your guests' dietary records automatically.`
            : "Patissier sketches a starting cake from your vibe and guest count. tiers, flavors, fillings, frosting, decoration. Swap any piece."}
        </p>
        {briefLocked && (
          <div className="mt-5">
            <PickedForYou />
          </div>
        )}
      </header>

      {/* Propose card */}
      {!briefLocked ? (
        <Reveal>
          <div className="rounded-card border hairline bg-white/55 px-6 py-5 max-w-xl">
            <p className="text-[10px] uppercase tracking-[0.22em] text-sage-500 font-mono mb-2">
              Not yet
            </p>
            <p className="text-[14px] text-ink leading-relaxed">
              Seal the dossier first. Patissier needs the season, palette, and headcount before
              sketching a cake.
            </p>
          </div>
        </Reveal>
      ) : (
        <Reveal>
          <section className="rounded-card border hairline bg-white/85 px-5 py-5">
            <p className="text-[10px] uppercase tracking-[0.22em] text-sage-500 font-mono mb-3">
              {cake ? "Try a different one" : "Sketch a starting cake"}
            </p>
            <p className="text-[14px] text-ink-300 leading-relaxed max-w-[60ch]">
              {cake
                ? "Replaces the current spec. Existing edits will be lost."
                : "Tiers, flavors, fillings, frosting, decoration. Pulled from your design palette and the season."}
            </p>
            <div className="mt-4 flex items-center gap-4">
              <button
                onClick={() => post({ op: "propose" }, "propose")}
                disabled={!!busy}
                className="btn-primary"
                style={{ paddingInline: "1.4rem", paddingBlock: "0.55rem" }}
              >
                {busy === "propose"
                  ? "Patissier working…"
                  : cake ? "Re-sketch" : "Sketch a cake"}
              </button>
              {busy === "propose" && <ThoughtStream kind="agent-thinking" tone="sage" size="sm" />}
            </div>
          </section>
        </Reveal>
      )}

      {!cake && briefLocked && (
        <Reveal>
          <div className="rounded-card border hairline bg-white/55 px-7 py-12 max-w-xl">
            <p className="display text-[26px] text-ink leading-tight">No cake yet.</p>
            <p className="text-[14px] text-ink-300 mt-3 leading-relaxed">
              Click <span className="text-ink not-italic">Sketch a cake</span> above and Patissier
              will draft a starting cake. flavors per tier, fillings, frosting, decoration.
            </p>
          </div>
        </Reveal>
      )}

      {cake && (
        <>
          {/* Flavor stack */}
          <Reveal>
            <section className="surface rounded-card card-shell overflow-hidden">
              <header className="px-5 pt-4 pb-3 border-b hairline">
                <p className="text-[10px] uppercase tracking-[0.22em] text-sage-500 font-mono">
                  The stack
                </p>
                <p className="text-[11.5px] text-ink-300 italic mt-0.5">
                  Bottom tier first. what guests cut into.
                </p>
              </header>
              <ul className="divide-y hairline">
                {cake.flavors.map((f, i) => {
                  const tier = cake.tiers - i;
                  return (
                    <li
                      key={i}
                      className="px-5 py-3 grid grid-cols-[44px_1fr_1.1fr] gap-4 items-baseline"
                    >
                      <span className="display italic text-ink-300 tabular-nums text-[20px] text-center">
                        {tier}
                      </span>
                      <span className="display italic text-[19px] text-ink leading-tight">
                        {f}
                      </span>
                      <span className="text-[12.5px] text-ink-300 text-right leading-relaxed">
                        {cake.fillings[i] ?? ", "}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          </Reveal>

          {/* Frosting + decoration */}
          <Reveal>
            <section className="grid sm:grid-cols-2 gap-4">
              <div className="surface rounded-card card-shell px-5 py-5 overflow-hidden">
                <p className="text-[10px] uppercase tracking-[0.22em] text-sage-500 font-mono mb-2">
                  Frosting
                </p>
                <p className="text-[15px] text-ink leading-relaxed">
                  {cake.frostingStyle}
                </p>
              </div>
              <div className="surface rounded-card card-shell px-5 py-5 overflow-hidden">
                <p className="text-[10px] uppercase tracking-[0.22em] text-sage-500 font-mono mb-2">
                  Decoration
                </p>
                <p className="text-[15px] text-ink leading-relaxed">
                  {cake.decorationNotes}
                </p>
              </div>
            </section>
          </Reveal>

          {/* Allergens */}
          {(cake.allergens?.length || cake.allergenNotes) && (
            <Reveal>
              <section className="rounded-card border border-risk-medium/25 bg-risk-medium/[0.04] px-5 py-5">
                <p className="text-[10px] uppercase tracking-[0.22em] text-risk-medium font-mono mb-3">
                  Heads up · allergens
                </p>
                {cake.allergens && cake.allergens.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2.5">
                    {cake.allergens.map((a) => (
                      <span
                        key={a}
                        className="text-[10.5px] uppercase tracking-[0.16em] border border-risk-medium/30 bg-white/80 text-risk-medium rounded-full px-2.5 py-0.5"
                      >
                        {ALLERGEN_LABEL[a]}
                      </span>
                    ))}
                  </div>
                )}
                {cake.allergenNotes && (
                  <p className="text-[13px] text-risk-medium italic leading-relaxed">
                    {cake.allergenNotes}
                  </p>
                )}
                <Link
                  href="/dietary"
                  className="inline-block mt-3 text-[11px] uppercase tracking-[0.18em] text-ink-400 hover:text-sage-500 transition-colors"
                >
                  Cross-check against guests →
                </Link>
              </section>
            </Reveal>
          )}

          {/* Lock action */}
          {!cake.approved && (
            <Reveal>
              <div className="rounded-card border hairline bg-white/55 px-6 py-5 max-w-2xl">
                <p className="text-[10px] uppercase tracking-[0.22em] text-sage-500 font-mono mb-2">
                  When it&rsquo;s ready
                </p>
                <p className="text-[14px] text-ink leading-relaxed">
                  Lock the cake to send it through Decisions for couple review, then on to your
                  patissier as a final spec.
                </p>
                <button
                  onClick={() => post({ op: "propose_lock" }, "lock")}
                  disabled={!!busy}
                  className="mt-4 text-[11px] uppercase tracking-[0.18em] border border-sage-300 hover:border-sage-500 text-sage-500 rounded-full px-3.5 py-1.5 transition-colors"
                >
                  {busy === "lock" ? "Working…" : "Send to decisions to lock"}
                </button>
              </div>
            </Reveal>
          )}
        </>
      )}
    </div>
  );
}
