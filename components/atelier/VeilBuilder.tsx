"use client";

// /atelier/veil — same UX pattern as the dress builder, veil-specific
// taxonomy. Editorial generations always show the veil paired with the
// chosen dress concept (handled server-side in the prompt builder).

import { useMemo, useState } from "react";
import { useProject } from "../StateProvider";
import { useToast } from "../Toast";
import { AtelierShell } from "./AtelierShell";
import type {
  DressConcept,
  DressGenerationMode,
  DressTaxonomy,
  ProjectState,
} from "@/lib/types";
import {
  VEIL_COLORS,
  VEIL_EDGES,
  VEIL_EMBELLISHMENTS,
  VEIL_FABRICS,
  VEIL_LENGTHS,
  VEIL_TIERS,
} from "@/lib/agents/couturier/taxonomy";

export function VeilBuilder() {
  const { state, setState, loading } = useProject();
  const { notify } = useToast();
  const [taxonomy, setTaxonomy] = useState<DressTaxonomy>({
    fabric: [],
    embellishment: [],
  });
  const [naturalLanguage, setNaturalLanguage] = useState("");
  const [generating, setGenerating] = useState<DressGenerationMode | null>(null);
  const [active, setActive] = useState<DressConcept | null>(null);
  const [error, setError] = useState<string | null>(null);

  const veilConcepts = useMemo<DressConcept[]>(
    () => state?.atelier?.concepts.filter((c) => c.kind === "veil") ?? [],
    [state],
  );
  const theDressOne = state?.atelier?.concepts.find(
    (c) => c.kind === "dress" && c.status === "the_one",
  );

  const setSingle = (key: keyof DressTaxonomy, value: string) => {
    setTaxonomy((t) => ({ ...t, [key]: value }));
  };

  const toggleMulti = (
    key: "fabric" | "embellishment",
    value: string,
    max?: number,
  ) => {
    setTaxonomy((t) => {
      const current = (t[key] as string[] | undefined) ?? [];
      if (current.includes(value))
        return { ...t, [key]: current.filter((x) => x !== value) };
      if (max && current.length >= max)
        return { ...t, [key]: [...current.slice(1), value] };
      return { ...t, [key]: [...current, value] };
    });
  };

  const generate = async (mode: DressGenerationMode) => {
    if (generating) return;
    if (mode === "editorial" && !theDressOne) {
      notify({
        kind: "info",
        title: "Need the dress first",
        detail: "Editorial veil generations require a chosen dress. Try sketch mode while you decide.",
      });
      return;
    }
    setGenerating(mode);
    setError(null);
    try {
      const r = await fetch("/api/atelier/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "veil",
          mode,
          taxonomy,
          naturalLanguage,
        }),
      });
      const j = (await r.json()) as {
        state?: ProjectState;
        concept?: DressConcept;
        error?: string;
      };
      if (!r.ok) {
        setError(j.error ?? "Generation failed.");
        return;
      }
      if (j.state) setState(j.state);
      if (j.concept) setActive(j.concept);
    } finally {
      setGenerating(null);
    }
  };

  const markTheOne = async (c: DressConcept) => {
    const r = await fetch("/api/atelier/concepts", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ conceptId: c.id, status: "the_one" }),
    });
    const j = (await r.json()) as { state?: ProjectState };
    if (j.state) setState(j.state);
  };

  if (loading || !state) {
    return (
      <AtelierShell>
        <div className="pt-10 text-center text-ink-300">Loading…</div>
      </AtelierShell>
    );
  }

  return (
    <AtelierShell>
      <header className="mb-8">
        <p className="text-[10px] uppercase tracking-[0.32em] font-mono text-sage-deep mb-2">
          The veil
        </p>
        <h1
          className="display text-[36px] sm:text-[44px] leading-[1.05] text-ink"
          style={{ fontWeight: 400 }}
        >
          A separate piece, with its own taxonomy.
        </h1>
        {!theDressOne && (
          <p className="text-[13px] text-ink-300 mt-3 leading-relaxed max-w-[560px]">
            Editorial veil generations show the veil on your chosen dress —
            mark a dress as &quot;the one&quot; first. Sketch mode works
            standalone any time.
          </p>
        )}
      </header>

      <div className="grid lg:grid-cols-[280px_minmax(0,1fr)] gap-6 lg:gap-8">
        <aside>
          <SimpleSection
            label="Length"
            options={VEIL_LENGTHS}
            selected={taxonomy.length}
            onPick={(v) => setSingle("length", v)}
          />
          <SimpleSection
            label="Tier"
            options={VEIL_TIERS}
            selected={taxonomy.tier}
            onPick={(v) => setSingle("tier", v)}
          />
          <SimpleSection
            label="Edge"
            options={VEIL_EDGES}
            selected={taxonomy.edge}
            onPick={(v) => setSingle("edge", v)}
          />
          <SimpleSection
            label="Fabric"
            options={VEIL_FABRICS}
            selected={taxonomy.fabric?.[0]}
            onPick={(v) =>
              setTaxonomy((t) => ({ ...t, fabric: [v] }))
            }
          />
          <SimpleSection
            label="Embellishment"
            options={VEIL_EMBELLISHMENTS}
            selectedMany={taxonomy.embellishment}
            onToggle={(v) => toggleMulti("embellishment", v, 2)}
          />
          <SimpleSection
            label="Color"
            options={VEIL_COLORS}
            selected={taxonomy.color}
            onPick={(v) => setSingle("color", v)}
          />
          <div className="mt-4">
            <textarea
              value={naturalLanguage}
              onChange={(e) => setNaturalLanguage(e.target.value)}
              rows={3}
              placeholder="Or describe the veil in your own words."
              className="w-full rounded-xl bg-white px-4 py-3 text-[13.5px] leading-relaxed focus:outline-none focus:border-sage-deep transition-colors"
              style={{ border: "1px solid rgba(14,15,13,0.10)", minHeight: 90 }}
            />
          </div>
        </aside>

        <main className="min-w-0">
          <div className="flex items-center justify-end gap-2 mb-4">
            <button
              type="button"
              onClick={() => generate("sketch")}
              disabled={!!generating}
              className="inline-flex items-center gap-2 rounded-full border border-ink/12 bg-white hover:bg-ink/[0.04] px-5 py-2.5 text-[12px] uppercase tracking-[0.20em] font-mono text-ink transition-all disabled:opacity-50"
            >
              <span aria-hidden>✦</span>
              {generating === "sketch" ? "Sketching…" : "Sketch"}
            </button>
            <button
              type="button"
              onClick={() => generate("editorial")}
              disabled={!!generating}
              className="cta-sage inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[12px] uppercase tracking-[0.20em] font-mono transition-all disabled:opacity-50"
            >
              <span aria-hidden>◆</span>
              {generating === "editorial" ? "Rendering…" : "Render"}
            </button>
          </div>

          {error && (
            <div
              className="mb-4 rounded-lg px-3 py-2 text-[12px] leading-relaxed"
              style={{
                background: "rgba(168,52,26,0.06)",
                border: "1px solid rgba(168,52,26,0.25)",
                color: "#8A2A14",
              }}
            >
              {error}
            </div>
          )}

          {generating ? (
            <div className="grid grid-cols-2 gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="aspect-square rounded-xl"
                  style={{ background: "rgba(168,181,160,0.18)" }}
                />
              ))}
            </div>
          ) : active ? (
            <div className="grid grid-cols-2 gap-3">
              {active.images.map((url, i) => (
                <div
                  key={url + i}
                  className="aspect-square rounded-xl overflow-hidden relative bg-paper-200"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Veil variation ${i + 1}`}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div
              className="aspect-[16/10] rounded-2xl flex items-center justify-center text-center px-8"
              style={{
                background: "#FFFFFF",
                border: "1px dashed rgba(14,15,13,0.10)",
              }}
            >
              <p
                className="display italic text-[24px] text-ink leading-tight max-w-[420px]"
                style={{ fontWeight: 400 }}
              >
                Couture houses sketch the veil separately. Start there.
              </p>
            </div>
          )}

          {veilConcepts.length > 0 && (
            <section className="mt-10">
              <p className="text-[10px] uppercase tracking-[0.28em] font-mono text-ink-300 mb-3">
                Veil concepts · {veilConcepts.length}
              </p>
              <ul className="grid grid-cols-4 gap-3">
                {veilConcepts.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => markTheOne(c)}
                      className="block w-full text-left"
                    >
                      <div
                        className="aspect-square rounded-lg overflow-hidden relative bg-paper-200"
                        style={
                          c.status === "the_one"
                            ? { boxShadow: "0 0 0 1.5px rgba(110,128,104,0.55)" }
                            : undefined
                        }
                      >
                        {c.heroImageUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={c.heroImageUrl}
                            alt="Veil concept"
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <p className="text-[10px] uppercase tracking-[0.18em] font-mono text-ink-300 mt-1.5 truncate">
                        {c.taxonomy.length ?? "veil"}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </main>
      </div>
    </AtelierShell>
  );
}

// ---------------------------------------------------------------- helpers ---

function SimpleSection({
  label,
  options,
  selected,
  selectedMany,
  onPick,
  onToggle,
}: {
  label: string;
  options: readonly string[];
  selected?: string;
  selectedMany?: string[];
  onPick?: (v: string) => void;
  onToggle?: (v: string) => void;
}) {
  return (
    <div className="border-b border-ink/8 py-3">
      <p className="text-[11px] uppercase tracking-[0.20em] font-mono text-ink mb-2">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = selectedMany ? selectedMany.includes(opt) : selected === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => (selectedMany ? onToggle?.(opt) : onPick?.(opt))}
              className={`text-[11.5px] px-2.5 py-1 rounded-full transition-all ${
                active
                  ? "bg-sage-50 text-sage-deep"
                  : "bg-white text-ink-400 hover:text-ink"
              }`}
              style={{
                border: active
                  ? "1px solid rgba(110,128,104,0.55)"
                  : "1px solid rgba(14,15,13,0.10)",
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
