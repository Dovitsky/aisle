"use client";

// /atelier home. The studio overview: status, the saved concepts grouped
// by status, and clear paths into the builder.

import Link from "next/link";
import { useMemo } from "react";
import Image from "next/image";
import { useProject } from "../StateProvider";
import { AtelierShell } from "./AtelierShell";

export function AtelierHome() {
  const { state } = useProject();
  const atelier = state?.atelier;
  const concepts = atelier?.concepts ?? [];

  const grouped = useMemo(() => {
    const theOne = concepts.find((c) => c.kind === "dress" && c.status === "the_one");
    const veilOne = concepts.find((c) => c.kind === "veil" && c.status === "the_one");
    const shortlist = concepts.filter(
      (c) => c.kind === "dress" && c.status === "shortlist",
    );
    const inConsideration = concepts.filter(
      (c) => c.kind === "dress" && c.status === "in_consideration",
    );
    return { theOne, veilOne, shortlist, inConsideration };
  }, [concepts]);

  const hasAnything = concepts.length > 0;

  return (
    <AtelierShell>
      <header className="mb-12">
        <p className="text-[10px] uppercase tracking-[0.32em] font-mono text-sage-deep mb-3">
          The Couturier
        </p>
        <h1
          className="display text-[44px] sm:text-[58px] lg:text-[68px] leading-[1.02] tracking-[-0.012em] text-ink max-w-[680px]"
          style={{ fontWeight: 400 }}
        >
          The dress, the veil,
          <br />
          <span className="italic text-sage-deep">and everything she wears.</span>
        </h1>
        <p className="text-[14.5px] text-ink-400 mt-5 leading-relaxed max-w-[560px]">
          An atelier inside the app. Build a dossier from couture-grade taxonomy,
          iterate as quickly as you can talk, and finish with a tech pack a real
          house can quote from. Nothing here is visible to your partner.
        </p>
      </header>

      {hasAnything && grouped.theOne && (
        <TheOnePanel concept={grouped.theOne} veil={grouped.veilOne} />
      )}

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-10 lg:gap-14 mt-12">
        <section>
          <div className="flex items-baseline justify-between mb-5 gap-3">
            <h2
              className="display text-[24px] text-ink leading-tight"
              style={{ fontWeight: 400 }}
            >
              {hasAnything ? "On the shortlist" : "Begin a concept"}
            </h2>
            <Link
              href="/atelier/dress"
              className="cta-sage inline-flex items-center gap-2 rounded-full px-5 py-2 text-[11.5px] uppercase tracking-[0.22em] font-mono transition-all"
            >
              Open dress builder <span aria-hidden>→</span>
            </Link>
          </div>

          {grouped.shortlist.length === 0 ? (
            <EmptyConceptRail hasAny={grouped.inConsideration.length > 0} />
          ) : (
            <ul className="grid sm:grid-cols-2 gap-4">
              {grouped.shortlist.map((c) => (
                <li key={c.id}>
                  <ConceptThumb concept={c} sized="md" />
                </li>
              ))}
            </ul>
          )}

          {grouped.inConsideration.length > 0 && (
            <div className="mt-10">
              <p className="text-[10px] uppercase tracking-[0.28em] font-mono text-ink-300 mb-3">
                In consideration · {grouped.inConsideration.length}
              </p>
              <ul className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {grouped.inConsideration.slice(0, 8).map((c) => (
                  <li key={c.id}>
                    <ConceptThumb concept={c} sized="sm" />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <aside>
          <div
            className="rounded-2xl p-6"
            style={{
              background: "#FFFFFF",
              border: "1px solid rgba(14,15,13,0.06)",
            }}
          >
            <p className="text-[10px] uppercase tracking-[0.28em] font-mono text-sage-deep mb-3">
              The flow
            </p>
            <ol className="space-y-3.5 text-[13.5px] leading-relaxed">
              <Step n="1" label="Tell me about the dress you've imagined" href="/atelier/dress" />
              <Step n="2" label="Pick from the taxonomy or just describe it" href="/atelier/dress" />
              <Step n="3" label="Sketch fast — render the keepers" href="/atelier/dress" />
              <Step n="4" label="Mark one The One" />
              <Step n="5" label="Meet your atelier match" href="/atelier/fittings" />
              <Step n="6" label="Export the tech pack" href="/atelier/fittings" />
            </ol>
          </div>

          <div className="rounded-2xl p-6 mt-4" style={{ background: "rgba(168,181,160,0.10)", border: "1px solid rgba(110,128,104,0.18)" }}>
            <p className="text-[10px] uppercase tracking-[0.28em] font-mono text-sage-deep mb-2">
              About the firewall
            </p>
            <p className="text-[12.5px] leading-relaxed text-ink-400">
              Everything in /atelier — concepts, ateliers, fittings, even
              the budget line — is invisible to your partner&apos;s view of Corsia.
              Maestro refuses to reveal anything here, gently.
            </p>
          </div>
        </aside>
      </div>
    </AtelierShell>
  );
}

// ---------------------------------------------------------------- pieces ---

function TheOnePanel({
  concept,
  veil,
}: {
  concept: { id: string; heroImageUrl: string; taxonomy: { silhouette?: string; fabric?: string[] }; createdAt: string };
  veil?: { id: string; heroImageUrl: string };
}) {
  return (
    <section
      className="rounded-2xl overflow-hidden mb-2 grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]"
      style={{ background: "#FFFFFF", border: "1px solid rgba(110,128,104,0.30)" }}
    >
      <div className="relative aspect-[4/5] bg-paper-200">
        {concept.heroImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={concept.heroImageUrl}
            alt="The chosen dress concept"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
      </div>
      <div className="p-7 lg:p-10 flex flex-col justify-center">
        <p className="text-[10px] uppercase tracking-[0.30em] font-mono text-sage-deep mb-2">
          The one
        </p>
        <p
          className="display italic text-[28px] leading-tight text-ink"
          style={{ fontWeight: 400 }}
        >
          {concept.taxonomy.silhouette ?? "Your dress"}
          {concept.taxonomy.fabric?.[0] && (
            <span className="text-ink-300"> · {concept.taxonomy.fabric[0].toLowerCase()}</span>
          )}
        </p>
        <p className="text-[13px] text-ink-400 mt-3 leading-relaxed">
          {veil ? "Veil chosen. " : "No veil yet. "}
          The atelier match is ready when you are.
        </p>
        <div className="mt-6 flex items-center gap-2 flex-wrap">
          <Link
            href="/atelier/fittings"
            className="cta-sage inline-flex items-center gap-2 rounded-full px-5 py-2 text-[11.5px] uppercase tracking-[0.22em] font-mono transition-all"
          >
            Open fittings <span aria-hidden>→</span>
          </Link>
          <Link
            href="/atelier/dress"
            className="inline-flex items-center gap-2 rounded-full border border-ink/12 bg-white hover:bg-ink/[0.03] px-4 py-2 text-[11.5px] uppercase tracking-[0.22em] font-mono text-ink transition-colors"
          >
            Refine
          </Link>
        </div>
      </div>
    </section>
  );
}

function ConceptThumb({
  concept,
  sized,
}: {
  concept: {
    id: string;
    heroImageUrl: string;
    status: string;
    taxonomy: { silhouette?: string };
    mode: string;
  };
  sized: "sm" | "md";
}) {
  const ring = concept.status === "the_one";
  return (
    <Link
      href={`/atelier/dress?concept=${concept.id}`}
      className="block group relative"
    >
      <div
        className={`relative bg-paper-200 overflow-hidden ${
          sized === "md" ? "aspect-[4/5] rounded-xl" : "aspect-square rounded-lg"
        }`}
        style={
          ring
            ? { boxShadow: "0 0 0 1.5px rgba(110,128,104,0.55)" }
            : undefined
        }
      >
        {concept.heroImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={concept.heroImageUrl}
            alt={concept.taxonomy.silhouette ?? "Dress concept"}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
          />
        )}
      </div>
      {sized === "md" && (
        <p className="text-[11px] uppercase tracking-[0.22em] font-mono text-ink-300 mt-2.5">
          {concept.taxonomy.silhouette ?? "Concept"} · {concept.mode}
        </p>
      )}
    </Link>
  );
}

function EmptyConceptRail({ hasAny }: { hasAny: boolean }) {
  return (
    <div
      className="rounded-2xl p-12 text-center"
      style={{ background: "#FFFFFF", border: "1px dashed rgba(14,15,13,0.12)" }}
    >
      <p
        className="display italic text-[24px] text-ink leading-tight max-w-[420px] mx-auto"
        style={{ fontWeight: 400 }}
      >
        {hasAny
          ? "Promote a concept you love to the shortlist."
          : "Tell me about the dress you've imagined."}
      </p>
      <p className="text-[13px] text-ink-300 mt-3 leading-relaxed max-w-[420px] mx-auto">
        Sketches are cheap — start there. Save the ones that catch you and the
        atelier match comes alive.
      </p>
      <Link
        href="/atelier/dress"
        className="cta-sage inline-flex items-center gap-2 mt-6 rounded-full px-5 py-2 text-[11.5px] uppercase tracking-[0.22em] font-mono transition-all"
      >
        Begin <span aria-hidden>→</span>
      </Link>
    </div>
  );
}

function Step({ n, label, href }: { n: string; label: string; href?: string }) {
  const body = (
    <>
      <span
        aria-hidden
        className="font-mono text-[10px] uppercase tracking-[0.22em] text-sage-deep w-5 shrink-0"
      >
        {n}
      </span>
      <span className="text-ink">{label}</span>
    </>
  );
  return (
    <li>
      {href ? (
        <Link
          href={href}
          className="flex items-baseline gap-3 hover:text-sage-deep transition-colors"
        >
          {body}
        </Link>
      ) : (
        <div className="flex items-baseline gap-3 text-ink-400">{body}</div>
      )}
    </li>
  );
}

// Silence the unused import warning — Image is reserved for future use.
void Image;
