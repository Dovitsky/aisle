"use client";

// Eight collapsible sections of named tags. Tag chips are small, hairline
// when unselected, sage-bordered + bg-sage-50 when selected. Single-pick
// dimensions (silhouette, neckline, etc.) deselect siblings on tap;
// multi-pick (fabric, embellishment) toggle.

import { useState } from "react";
import type { DressTaxonomy } from "@/lib/types";
import {
  BACKS,
  COLORS,
  EMBELLISHMENTS,
  FABRICS,
  NECKLINES,
  SILHOUETTES,
  SLEEVES,
  TRAINS,
} from "@/lib/agents/couturier/taxonomy";

type SectionKey =
  | "silhouette"
  | "neckline"
  | "sleeves"
  | "back"
  | "fabric"
  | "train"
  | "embellishment"
  | "color";

const SECTIONS: { key: SectionKey; label: string; options: readonly string[]; multi: boolean; max?: number }[] = [
  { key: "silhouette", label: "Silhouette", options: SILHOUETTES, multi: false },
  { key: "neckline", label: "Neckline", options: NECKLINES, multi: false },
  { key: "sleeves", label: "Sleeves", options: SLEEVES, multi: false },
  { key: "back", label: "Back", options: BACKS, multi: false },
  { key: "fabric", label: "Fabric", options: FABRICS, multi: true, max: 2 },
  { key: "train", label: "Train", options: TRAINS, multi: false },
  { key: "embellishment", label: "Embellishment", options: EMBELLISHMENTS, multi: true, max: 3 },
  { key: "color", label: "Color", options: COLORS, multi: false },
];

export function TaxonomyPanel({
  taxonomy,
  onChange,
}: {
  taxonomy: DressTaxonomy;
  onChange: (next: DressTaxonomy) => void;
}) {
  const [open, setOpen] = useState<Record<SectionKey, boolean>>({
    silhouette: true,
    neckline: false,
    sleeves: false,
    back: false,
    fabric: true,
    train: false,
    embellishment: false,
    color: false,
  });

  const isSelected = (key: SectionKey, opt: string): boolean => {
    const v = (taxonomy as unknown as Record<string, unknown>)[key];
    if (Array.isArray(v)) return v.includes(opt);
    return v === opt;
  };

  const toggle = (sec: typeof SECTIONS[number], opt: string) => {
    if (!sec.multi) {
      onChange({ ...taxonomy, [sec.key]: opt });
      return;
    }
    const current = ((taxonomy as unknown as Record<string, unknown>)[sec.key] as string[] | undefined) ?? [];
    let next: string[];
    if (current.includes(opt)) {
      next = current.filter((x) => x !== opt);
    } else if (sec.max && current.length >= sec.max) {
      // Replace the oldest.
      next = [...current.slice(1), opt];
    } else {
      next = [...current, opt];
    }
    onChange({ ...taxonomy, [sec.key]: next });
  };

  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.28em] font-mono text-ink-300 mb-3">
        Taxonomy
      </p>
      <div className="flex flex-col gap-1">
        {SECTIONS.map((sec) => (
          <Section
            key={sec.key}
            label={sec.label}
            isOpen={open[sec.key]}
            onToggle={() => setOpen((o) => ({ ...o, [sec.key]: !o[sec.key] }))}
            summary={summary(sec, taxonomy)}
          >
            <div className="flex flex-wrap gap-1.5 pt-2">
              {sec.options.map((opt) => {
                const active = isSelected(sec.key, opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggle(sec, opt)}
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
          </Section>
        ))}
      </div>
    </div>
  );
}

function Section({
  label,
  isOpen,
  onToggle,
  summary,
  children,
}: {
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  summary: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-ink/8 pb-2">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-baseline justify-between py-2 text-left hover:text-ink transition-colors"
      >
        <span className="text-[12.5px] uppercase tracking-[0.18em] font-mono text-ink">
          {label}
        </span>
        <span className="text-[11px] text-ink-300 italic max-w-[160px] truncate">
          {summary || (isOpen ? "" : ", ")}
        </span>
      </button>
      {isOpen && children}
    </div>
  );
}

function summary(sec: typeof SECTIONS[number], t: DressTaxonomy): string {
  const v = (t as unknown as Record<string, unknown>)[sec.key];
  if (Array.isArray(v)) return v.join(", ");
  return (v as string | undefined) ?? "";
}
