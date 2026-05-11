"use client";

// Right-rail concept stack. The "the_one" concept pins to the top with a
// sage ring; shortlist follows; in-consideration after. Click to make
// that concept active in the canvas.

import type { DressConcept } from "@/lib/types";

export function ConceptStack({
  concepts,
  activeId,
  onSelect,
  onPromote,
  onRemove,
}: {
  concepts: DressConcept[];
  activeId?: string;
  onSelect: (c: DressConcept) => void;
  onPromote: (c: DressConcept, status: DressConcept["status"]) => void;
  onRemove: (c: DressConcept) => void;
}) {
  if (concepts.length === 0) {
    return (
      <div>
        <p className="text-[10px] uppercase tracking-[0.28em] font-mono text-ink-300 mb-3">
          Concepts
        </p>
        <div
          className="rounded-xl p-5 text-center"
          style={{
            background: "rgba(255,255,255,0.6)",
            border: "1px dashed rgba(14,15,13,0.10)",
          }}
        >
          <p className="text-[12.5px] text-ink-300 leading-relaxed italic">
            Saved concepts will live here.
          </p>
        </div>
      </div>
    );
  }

  const sorted = [...concepts].sort((a, b) => {
    const rank = (s: DressConcept["status"]) =>
      s === "the_one" ? 0 : s === "shortlist" ? 1 : 2;
    if (rank(a.status) !== rank(b.status)) return rank(a.status) - rank(b.status);
    return b.createdAt.localeCompare(a.createdAt);
  });

  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.28em] font-mono text-ink-300 mb-3">
        Concepts · {concepts.length}
      </p>
      <ul className="flex flex-col gap-2.5">
        {sorted.map((c) => (
          <li key={c.id}>
            <ConceptRow
              concept={c}
              isActive={c.id === activeId}
              onSelect={() => onSelect(c)}
              onPromote={(s) => onPromote(c, s)}
              onRemove={() => onRemove(c)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function ConceptRow({
  concept,
  isActive,
  onSelect,
  onPromote,
  onRemove,
}: {
  concept: DressConcept;
  isActive: boolean;
  onSelect: () => void;
  onPromote: (s: DressConcept["status"]) => void;
  onRemove: () => void;
}) {
  const isTheOne = concept.status === "the_one";
  const isShortlist = concept.status === "shortlist";

  return (
    <div
      className="group rounded-lg overflow-hidden bg-white relative"
      style={{
        border: isActive
          ? "1.5px solid #4F5D44"
          : isTheOne
          ? "1px solid rgba(110,128,104,0.55)"
          : "1px solid rgba(14,15,13,0.06)",
      }}
    >
      <button
        type="button"
        onClick={onSelect}
        className="block w-full text-left"
      >
        <div className="aspect-[4/5] bg-paper-200 relative">
          {concept.heroImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={concept.heroImageUrl}
              alt={concept.taxonomy.silhouette ?? "Concept"}
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          {isTheOne && (
            <span
              className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] uppercase tracking-[0.22em] font-mono italic"
              style={{
                background: "rgba(255,255,255,0.92)",
                color: "#4F5D44",
                fontFamily: '"Cormorant Garamond","Cormorant",Georgia,serif',
                fontStyle: "italic",
                fontSize: 11,
                letterSpacing: 0,
                textTransform: "none",
              }}
            >
              the one
            </span>
          )}
        </div>
        <div className="px-2.5 py-2">
          <p className="text-[10.5px] uppercase tracking-[0.18em] font-mono text-ink-300 truncate">
            {concept.taxonomy.silhouette ?? "Concept"} · {concept.mode}
          </p>
        </div>
      </button>
      <div className="px-2.5 pb-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!isTheOne && (
          <button
            type="button"
            title="Promote to the one"
            onClick={() => onPromote("the_one")}
            className="text-[9.5px] uppercase tracking-[0.18em] font-mono text-sage-deep hover:text-ink transition-colors"
          >
            ◆ The one
          </button>
        )}
        {!isShortlist && !isTheOne && (
          <button
            type="button"
            title="Save to shortlist"
            onClick={() => onPromote("shortlist")}
            className="text-[9.5px] uppercase tracking-[0.18em] font-mono text-ink-300 hover:text-ink transition-colors ml-auto"
          >
            ★ Shortlist
          </button>
        )}
        {!isTheOne && (
          <button
            type="button"
            title="Discard concept"
            onClick={onRemove}
            className="text-[9.5px] uppercase tracking-[0.18em] font-mono text-ink-200 hover:text-ink transition-colors ml-auto"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
