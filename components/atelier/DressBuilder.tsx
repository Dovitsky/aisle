"use client";

// /atelier/dress. the dress builder.
//
// Three-column layout on desktop, stacked on mobile:
//   Left: taxonomy panel (8 collapsible sections) + natural language input
//   Center: 4-up generation canvas with Sketch / Render CTAs and active concept
//   Right: vertical concept stack (the one pinned, then shortlist, then in-consideration)
//
// Generation hits POST /api/atelier/generate which returns a 4-up grid
// and appends a new DressConcept (status: in_consideration). Saving a
// hero / promoting status hits PATCH /api/atelier/concepts.

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useProject } from "../StateProvider";
import { useToast } from "../Toast";
import { AtelierShell } from "./AtelierShell";
import { TaxonomyPanel } from "./TaxonomyPanel";
import { ConceptStack } from "./ConceptStack";
import type {
  DressConcept,
  DressGenerationMode,
  DressTaxonomy,
  ProjectState,
} from "@/lib/types";

export function DressBuilder() {
  const { state, setState, loading } = useProject();
  const { notify } = useToast();
  const searchParams = useSearchParams();
  const focusedConceptId = searchParams.get("concept");

  const [taxonomy, setTaxonomy] = useState<DressTaxonomy>({
    fabric: [],
    embellishment: [],
  });
  const [naturalLanguage, setNaturalLanguage] = useState("");
  const [generating, setGenerating] = useState<DressGenerationMode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeConcept, setActiveConcept] = useState<DressConcept | null>(null);

  const concepts = useMemo<DressConcept[]>(
    () => state?.atelier?.concepts.filter((c) => c.kind === "dress") ?? [],
    [state],
  );

  // If the URL points at a specific concept (?concept=…), open it.
  useEffect(() => {
    if (!focusedConceptId) return;
    const c = concepts.find((x) => x.id === focusedConceptId);
    if (c) {
      setActiveConcept(c);
      setTaxonomy(c.taxonomy);
      if (c.naturalLanguage) setNaturalLanguage(c.naturalLanguage);
    }
  }, [focusedConceptId, concepts]);

  const generate = async (mode: DressGenerationMode) => {
    if (generating) return;
    setGenerating(mode);
    setError(null);
    try {
      const r = await fetch("/api/atelier/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "dress",
          mode,
          taxonomy,
          naturalLanguage,
        }),
      });
      const j = (await r.json()) as {
        state?: ProjectState;
        concept?: DressConcept;
        error?: string;
        capped?: boolean;
      };
      if (!r.ok) {
        setError(j.error ?? "Generation failed.");
        if (j.capped) {
          notify({ kind: "info", title: "Daily cap reached", detail: j.error });
        }
        return;
      }
      if (j.state) setState(j.state);
      if (j.concept) {
        setActiveConcept(j.concept);
        notify({
          kind: "agent",
          agent: "Couturier",
          title: mode === "sketch" ? "Four sketches drawn" : "Four editorials rendered",
          detail: "Tap a frame to refine, or save the ones you love.",
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setGenerating(null);
    }
  };

  const patchConcept = async (
    conceptId: string,
    patch: { status?: DressConcept["status"]; heroImageUrl?: string; remove?: boolean },
  ) => {
    const r = await fetch("/api/atelier/concepts", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ conceptId, ...patch }),
    });
    const j = (await r.json()) as { state?: ProjectState; error?: string };
    if (j.state) setState(j.state);
    return j;
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
      <div className="grid lg:grid-cols-[280px_minmax(0,1fr)_240px] gap-6 lg:gap-8">
        {/* LEFT: taxonomy + natural language */}
        <aside className="min-w-0 order-2 lg:order-none">
          <TaxonomyPanel
            taxonomy={taxonomy}
            onChange={setTaxonomy}
          />
          <div className="mt-6">
            <p className="text-[10px] uppercase tracking-[0.28em] font-mono text-ink-300 mb-2.5">
              Or describe it
            </p>
            <textarea
              value={naturalLanguage}
              onChange={(e) => setNaturalLanguage(e.target.value)}
              rows={5}
              placeholder="Describe the dress in your own words. The agent will translate."
              className="w-full rounded-xl bg-white px-4 py-3 text-[14px] leading-relaxed focus:outline-none focus:border-sage-deep transition-colors"
              style={{ border: "1px solid rgba(14,15,13,0.10)", minHeight: 140 }}
            />
          </div>
        </aside>

        {/* CENTER: canvas + CTAs */}
        <main className="min-w-0 order-1 lg:order-none">
          <CanvasHeader
            generating={generating}
            onGenerate={generate}
          />
          {error && (
            <div
              className="mt-4 rounded-lg px-3 py-2 text-[12px] leading-relaxed"
              style={{
                background: "rgba(168,52,26,0.06)",
                border: "1px solid rgba(168,52,26,0.25)",
                color: "#8A2A14",
              }}
            >
              {error}
            </div>
          )}
          <Canvas
            generating={generating}
            concept={activeConcept}
            onPromote={(s) =>
              activeConcept && patchConcept(activeConcept.id, { status: s })
            }
            onPickHero={(url) =>
              activeConcept &&
              patchConcept(activeConcept.id, { heroImageUrl: url })
            }
          />
        </main>

        {/* RIGHT: concept stack */}
        <aside className="min-w-0 order-3 lg:order-none">
          <ConceptStack
            concepts={concepts}
            activeId={activeConcept?.id}
            onSelect={(c) => {
              setActiveConcept(c);
              setTaxonomy(c.taxonomy);
              setNaturalLanguage(c.naturalLanguage ?? "");
            }}
            onPromote={(c, s) => patchConcept(c.id, { status: s })}
            onRemove={(c) => patchConcept(c.id, { remove: true })}
          />
        </aside>
      </div>
    </AtelierShell>
  );
}

// ---------------------------------------------------------------- canvas ---

function CanvasHeader({
  generating,
  onGenerate,
}: {
  generating: DressGenerationMode | null;
  onGenerate: (m: DressGenerationMode) => void;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 flex-wrap">
      <div>
        <p className="text-[10px] uppercase tracking-[0.32em] font-mono text-sage-deep mb-1.5">
          Dress builder
        </p>
        <h1
          className="display text-[34px] sm:text-[40px] leading-[1.05] text-ink"
          style={{ fontWeight: 400 }}
        >
          Draw it. Then render it.
        </h1>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => onGenerate("sketch")}
          disabled={!!generating}
          className="inline-flex items-center gap-2 rounded-full border border-ink/12 bg-white hover:bg-ink/[0.04] px-5 py-2.5 text-[12px] uppercase tracking-[0.20em] font-mono text-ink transition-all disabled:opacity-50"
        >
          <span aria-hidden>✦</span>
          {generating === "sketch" ? "Sketching…" : "Sketch this"}
        </button>
        <button
          type="button"
          onClick={() => onGenerate("editorial")}
          disabled={!!generating}
          className="cta-sage inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[12px] uppercase tracking-[0.20em] font-mono transition-all disabled:opacity-50"
        >
          <span aria-hidden>◆</span>
          {generating === "editorial" ? "Rendering…" : "Render this"}
        </button>
      </div>
    </div>
  );
}

function Canvas({
  generating,
  concept,
  onPromote,
  onPickHero,
}: {
  generating: DressGenerationMode | null;
  concept: DressConcept | null;
  onPromote: (status: DressConcept["status"]) => void;
  onPickHero: (url: string) => void;
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // When a fresh concept lands, close any open lightbox so the user sees
  // the new 4-up first.
  const conceptKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (concept?.id !== conceptKeyRef.current) {
      conceptKeyRef.current = concept?.id ?? null;
      setLightboxIndex(null);
    }
  }, [concept]);

  return (
    <section className="mt-6">
      {generating ? (
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <ShimmerTile key={i} delay={i * 150} />
          ))}
        </div>
      ) : !concept ? (
        <EmptyCanvas />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {concept.images.map((url, i) => (
            <button
              key={url + i}
              type="button"
              onClick={() => setLightboxIndex(i)}
              className="group relative aspect-[4/5] bg-paper-200 rounded-xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-sage-deep/50 cursor-zoom-in"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Variation ${i + 1}`}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
              />
              {concept.heroImageUrl === url && (
                <span
                  aria-hidden
                  className="absolute top-2 left-2 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[9.5px] uppercase tracking-[0.22em] font-mono"
                  style={{
                    background: "rgba(255,255,255,0.92)",
                    color: "#4F5D44",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  <span className="inline-block w-1 h-1 rounded-full bg-sage-deep" />
                  Hero
                </span>
              )}
              <span
                aria-hidden
                className="absolute inset-0 bg-ink/0 group-hover:bg-ink/[0.04] transition-colors"
              />
            </button>
          ))}
        </div>
      )}

      {/* Full-screen lightbox. opens when you tap any of the 4 tiles. */}
      {concept && lightboxIndex !== null && (
        <ImageLightbox
          concept={concept}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onPromote={onPromote}
          onPickHero={onPickHero}
        />
      )}
    </section>
  );
}

// ----------------------------------------------------------- lightbox ---

function ImageLightbox({
  concept,
  index,
  onIndexChange,
  onClose,
  onPromote,
  onPickHero,
}: {
  concept: DressConcept;
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
  onPromote: (status: DressConcept["status"]) => void;
  onPickHero: (url: string) => void;
}) {
  const total = concept.images.length;
  const url = concept.images[index];
  const isHero = concept.heroImageUrl === url;

  // Keyboard: Esc closes, ← / → cycle.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") onIndexChange((index + 1) % total);
      else if (e.key === "ArrowLeft") onIndexChange((index - 1 + total) % total);
    };
    window.addEventListener("keydown", onKey);
    // Lock body scroll while open.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [index, total, onClose, onIndexChange]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Concept image"
      className="fixed inset-0 z-[60] flex flex-col"
      style={{ background: "rgba(14,15,13,0.92)", backdropFilter: "blur(8px)" }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 pt-6 pb-4">
        <p className="text-[10.5px] uppercase tracking-[0.22em] font-mono text-paper-50/80">
          {concept.taxonomy.silhouette ?? "Concept"}
          <span className="text-paper-50/30 mx-2">·</span>
          {concept.mode}
          <span className="text-paper-50/30 mx-2">·</span>
          {index + 1} / {total}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="w-9 h-9 inline-flex items-center justify-center rounded-full text-paper-50/70 hover:text-paper-50 hover:bg-white/[0.08] transition-all"
        >
          <svg width="14" height="14" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path d="M2 2 L10 10 M10 2 L2 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Image stage with prev/next */}
      <div className="relative flex-1 min-h-0 flex items-center justify-center px-6">
        <button
          type="button"
          aria-label="Close lightbox"
          onClick={onClose}
          className="absolute inset-0 cursor-zoom-out"
        />
        {total > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onIndexChange((index - 1 + total) % total);
            }}
            aria-label="Previous"
            className="relative z-10 w-11 h-11 rounded-full text-paper-50/70 hover:text-paper-50 hover:bg-white/[0.08] transition-all inline-flex items-center justify-center shrink-0 mr-4"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={`Concept ${index + 1}`}
          onClick={(e) => e.stopPropagation()}
          className="relative z-10 max-h-[78vh] max-w-[80vw] w-auto h-auto object-contain rounded-lg shadow-2xl cursor-default"
        />
        {total > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onIndexChange((index + 1) % total);
            }}
            aria-label="Next"
            className="relative z-10 w-11 h-11 rounded-full text-paper-50/70 hover:text-paper-50 hover:bg-white/[0.08] transition-all inline-flex items-center justify-center shrink-0 ml-4"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        )}
      </div>

      {/* Action bar */}
      <div className="px-6 pb-7 pt-4 flex items-center justify-between gap-4 flex-wrap relative z-10">
        {/* Thumbnail strip */}
        <div className="flex items-center gap-2">
          {concept.images.map((u, i) => (
            <button
              key={u + i}
              type="button"
              onClick={() => onIndexChange(i)}
              aria-label={`Show variation ${i + 1}`}
              className={`relative w-12 h-15 rounded-md overflow-hidden transition-all ${
                i === index ? "ring-2 ring-paper-50" : "opacity-60 hover:opacity-100"
              }`}
              style={{ width: 44, height: 56 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => onPickHero(url)}
            disabled={isHero}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.05] hover:bg-white/[0.12] px-4 py-2 text-[11.5px] uppercase tracking-[0.20em] font-mono text-paper-50 transition-all disabled:opacity-50"
          >
            {isHero ? "Hero ✓" : "Set as hero"}
          </button>
          <button
            type="button"
            onClick={() => {
              onPickHero(url);
              onPromote("shortlist");
            }}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.05] hover:bg-white/[0.12] px-4 py-2 text-[11.5px] uppercase tracking-[0.20em] font-mono text-paper-50 transition-all"
          >
            ★ Shortlist
          </button>
          <button
            type="button"
            onClick={() => {
              onPickHero(url);
              onPromote("the_one");
            }}
            className="cta-sage inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11.5px] uppercase tracking-[0.20em] font-mono transition-all"
          >
            ◆ The one
          </button>
        </div>
      </div>
    </div>
  );
}

function ShimmerTile({ delay }: { delay: number }) {
  return (
    <div
      className="aspect-[4/5] rounded-xl overflow-hidden relative"
      style={{ background: "rgba(168,181,160,0.18)" }}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.55) 50%, transparent 65%)",
          animation: `couturier-shimmer 1.6s ease-in-out ${delay}ms infinite`,
        }}
      />
      <style jsx>{`
        @keyframes couturier-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}

function EmptyCanvas() {
  return (
    <div
      className="aspect-[16/10] rounded-2xl flex items-center justify-center text-center px-8"
      style={{
        background: "#FFFFFF",
        border: "1px dashed rgba(14,15,13,0.10)",
      }}
    >
      <div className="max-w-[380px]">
        <p
          className="display italic text-[26px] text-ink leading-tight"
          style={{ fontWeight: 400 }}
        >
          Pick a silhouette and a fabric.
        </p>
        <p className="text-[13px] text-ink-300 mt-3 leading-relaxed">
          Or just type the dress you see in your head. Either path works.
          When you&apos;re ready, sketch first. they&apos;re fast.
        </p>
      </div>
    </div>
  );
}

// EnlargedTile was replaced by ImageLightbox (the full-screen modal above).
