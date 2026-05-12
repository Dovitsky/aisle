"use client";

// Bar. The program from Sommelier. Style + signatures + wine/beer/spirit
// list + a real zero-proof. Volumetrics estimated at ~1.5 drinks per
// guest per hour over a typical 4-hour reception.
//
// Layout: editorial hero with bar style + per-guest-per-hour side stat;
// sage-mono propose card; bar-policy pill row; menu grouped into 5
// kind-panels (signatures highlighted in sage, then wine/beer/spirit/
// zero-proof) each card-shell with italic Cormorant kind title +
// sage-mono count.

import { useState } from "react";
import type { BarMenuItem, ProjectState } from "@/lib/types";
import { PickedForYou } from "./PickedForYou";
import { useProject } from "./StateProvider";
import { useToast } from "./Toast";
import { Reveal, CountUp } from "./Atmosphere";

const KIND_LABEL: Record<BarMenuItem["kind"], string> = {
  signature: "Signatures",
  wine: "Wine",
  beer: "Beer",
  spirit: "Spirits",
  non_alcoholic: "Zero-proof",
};

const KIND_BLURB: Record<BarMenuItem["kind"], string> = {
  signature: "Two cocktails named for the couple, easy to batch.",
  wine: "A small list — a sparkling, a white, a red, a rosé.",
  beer: "Local where possible — one lager, one ale.",
  spirit: "Rail spirits if open bar; a single feature pour otherwise.",
  non_alcoholic: "A real drink, not garnish-on-soda.",
};

const STYLE_LABEL: Record<NonNullable<ProjectState["bar"]>["style"], string> = {
  open: "Open bar",
  limited: "Limited bar",
  dry: "Dry",
  beer_wine_only: "Beer + wine only",
};

const STYLE_ORDER = ["open", "limited", "beer_wine_only", "dry"] as const;

export function BarView() {
  const { state, setState, loading } = useProject();
  const { notify } = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  if (loading || !state) return <div className="pt-10 text-center text-ink-300">Loading…</div>;
  const bar = state.bar;
  const briefLocked = !!state.brief?.locked;

  const post = async (body: { op: string; style?: string }, key: string) => {
    setBusy(key);
    try {
      const r = await fetch("/api/bar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await r.json()) as { state?: ProjectState };
      if (j.state) {
        setState(j.state);
        if (body.op === "propose") {
          const items = j.state.bar?.itemMenu.length ?? 0;
          notify({
            kind: "agent",
            agent: "Sommelier",
            title: items === 1 ? "1 item on the menu" : `${items} items on the menu`,
            detail: "Two signatures, the wine list, the beer pours, a real zero-proof.",
          });
        } else if (body.op === "set_style" && body.style) {
          const label = STYLE_LABEL[body.style as keyof typeof STYLE_LABEL] ?? body.style;
          notify({ kind: "info", title: `Bar style — ${label}`, detail: "Rebalancing the volume estimate." });
        }
      }
    } finally {
      setBusy(null);
    }
  };

  const grouped: Record<BarMenuItem["kind"], BarMenuItem[]> = {
    signature: [], wine: [], beer: [], spirit: [], non_alcoholic: [],
  };
  for (const it of bar?.itemMenu ?? []) grouped[it.kind].push(it);

  const orderedKinds: BarMenuItem["kind"][] = ["signature", "wine", "beer", "spirit", "non_alcoholic"];

  const guestCount = state.brief?.guestCount ?? 0;
  const servings = bar?.itemMenu.reduce((s, it) => s + (it.servings ?? 0), 0) ?? 0;
  const perGuestPerHour = guestCount > 0 ? (servings / guestCount / 4).toFixed(1) : null;

  return (
    <div className="flex flex-col gap-12 pb-12">
      {/* Hero */}
      <header>
        <p className="text-[10px] uppercase tracking-[0.26em] text-sage-500 font-mono mb-2">
          Sommelier · The bar
        </p>
        <div className="flex items-baseline justify-between gap-6 flex-wrap">
          <h1 className="display text-[36px] sm:text-[44px] lg:text-[52px] leading-[1.02] tracking-[-0.01em]">
            {!bar ? (
              <>The pour, <span className="italic text-sage-500">all night long</span>.</>
            ) : (
              <>
                <CountUp value={bar.itemMenu.length} /> on the list,{" "}
                <span className="italic text-sage-500">{STYLE_LABEL[bar.style].toLowerCase()}</span>.
              </>
            )}
          </h1>
          {bar && (
            <div className="text-right">
              <div className="display text-[28px] tabular-nums leading-none text-sage-500">
                ${bar.estimatedAlcoholBudget.toLocaleString()}
              </div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-ink-300 font-mono mt-1">
                {perGuestPerHour ? `${perGuestPerHour} / guest / hr` : "estimated"}
              </div>
            </div>
          )}
        </div>
        <p className="text-[14px] text-ink-300 mt-4 leading-relaxed max-w-[60ch]">
          Style, signatures, wine, beer, spirits, and a zero-proof that actually feels like a
          drink. Volumetrics estimated at ~1.5 drinks per guest per hour over a four-hour
          reception.
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
              Seal the dossier first — Sommelier needs your headcount and tone before drafting
              the bar.
            </p>
          </div>
        </Reveal>
      ) : (
        <Reveal>
          <section className="rounded-card border hairline bg-white/85 px-5 py-5">
            <p className="text-[10px] uppercase tracking-[0.22em] text-sage-500 font-mono mb-3">
              {bar ? "Try a different bar" : "Pull a bar plan together"}
            </p>
            <p className="text-[14px] text-ink-300 leading-relaxed max-w-[60ch]">
              {bar
                ? "Replaces the entire menu. Existing edits will be lost."
                : "Two signatures named for each of you, a curated wine list, a couple of beer pours, and a real zero-proof."}
            </p>
            <div className="mt-4 flex items-center gap-4">
              <button
                onClick={() => post({ op: "propose" }, "propose")}
                disabled={!!busy}
                className="btn-primary"
                style={{ paddingInline: "1.4rem", paddingBlock: "0.55rem" }}
              >
                {busy === "propose"
                  ? "Sommelier working…"
                  : bar ? "Re-do" : "Draft the bar"}
              </button>
            </div>
          </section>
        </Reveal>
      )}

      {/* Empty */}
      {!bar && briefLocked && (
        <Reveal>
          <div className="rounded-card border hairline bg-white/55 px-7 py-12 max-w-xl">
            <p className="display text-[26px] text-ink leading-tight">No bar program yet.</p>
            <p className="text-[14px] text-ink-300 mt-3 leading-relaxed">
              Click <span className="text-ink not-italic">Draft the bar</span> above and Sommelier
              will draft a starting menu — signatures, wine, beer, spirits, and a zero-proof.
            </p>
          </div>
        </Reveal>
      )}

      {bar && (
        <>
          {/* Bar policy */}
          <Reveal>
            <section className="rounded-card border hairline bg-white/85 px-5 py-5">
              <p className="text-[10px] uppercase tracking-[0.22em] text-sage-500 font-mono mb-3">
                Bar policy
              </p>
              <div className="flex gap-1.5 flex-wrap">
                {STYLE_ORDER.map((s) => (
                  <button
                    key={s}
                    onClick={() => post({ op: "set_style", style: s }, "style")}
                    disabled={!!busy}
                    className={`text-[11px] uppercase tracking-[0.16em] border rounded-full px-3 py-1 transition-colors ${
                      bar.style === s
                        ? "bg-ink text-paper-50 border-ink"
                        : "border-ink/15 text-ink-400 hover:border-ink/30 hover:text-ink"
                    } disabled:opacity-50`}
                  >
                    {STYLE_LABEL[s]}
                  </button>
                ))}
              </div>
              {bar.notes && (
                <p className="text-[13px] text-ink-400 italic max-w-prose mt-4 leading-relaxed">
                  {bar.notes}
                </p>
              )}
            </section>
          </Reveal>

          {/* Menu grouped */}
          <Reveal>
            <section>
              <h2 className="display italic text-[22px] text-ink leading-tight mb-5">
                The list
              </h2>
              <div className="grid lg:grid-cols-2 gap-4">
                {orderedKinds.map((kind) =>
                  grouped[kind].length === 0 ? null : (
                    <KindPanel
                      key={kind}
                      kind={kind}
                      items={grouped[kind]}
                    />
                  ),
                )}
              </div>
            </section>
          </Reveal>
        </>
      )}
    </div>
  );
}

// --------------------------------------------------------------------

function KindPanel({
  kind, items,
}: {
  kind: BarMenuItem["kind"];
  items: BarMenuItem[];
}) {
  const isSignature = kind === "signature";
  return (
    <article className={`surface rounded-card card-shell hover:shadow-cardHover transition-all overflow-hidden ${
      isSignature ? "ring-1 ring-sage-300/60" : ""
    }`}>
      <header className="px-5 pt-4 pb-3 border-b hairline">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <p className={`text-[10px] uppercase tracking-[0.22em] font-mono ${
              isSignature ? "text-sage-500" : "text-sage-500"
            }`}>
              {isSignature ? "The signatures" : KIND_LABEL[kind]}
            </p>
            <h3 className="display italic text-[20px] text-ink leading-tight mt-0.5">
              {isSignature ? "Named for you both" : KIND_BLURB[kind]}
            </h3>
          </div>
          <span className="text-[10.5px] uppercase tracking-[0.22em] font-mono text-ink-300 tabular-nums shrink-0">
            {items.length}
          </span>
        </div>
      </header>
      <ul className="divide-y hairline">
        {items.map((it) => (
          <li key={it.id} className="px-5 py-3">
            <div className="flex items-baseline justify-between gap-3 text-[14px]">
              <span className={`text-ink leading-tight ${isSignature ? "display italic text-[17px]" : ""}`}>
                {it.name}
              </span>
              {it.servings !== undefined && (
                <span className="text-[10.5px] uppercase tracking-[0.18em] font-mono text-ink-300 tabular-nums shrink-0">
                  ~{it.servings} pours
                </span>
              )}
            </div>
            {it.description && (
              <p className="text-[12.5px] text-ink-300 italic mt-1 leading-relaxed">
                {it.description}
              </p>
            )}
          </li>
        ))}
      </ul>
    </article>
  );
}
