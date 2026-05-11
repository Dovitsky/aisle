"use client";

// Florals. The per-piece arrangement program from Botanist. Real stems,
// real vessels, real quantities, pulled from the locked palette + season.
//
// Layout: editorial hero with N pieces + total cost side stat; sage-mono
// propose card; grouped sections (Ceremony / Personal / Reception /
// Ancillary) with per-piece card-shell tiles showing primary/secondary
// stems + vessel notes + subtotal. Approved pieces ring sage.

import { useState } from "react";
import type { FloralPiece, ProjectState } from "@/lib/types";
import { useProject } from "./StateProvider";
import { useToast } from "./Toast";
import { Reveal, CountUp } from "./Atmosphere";

const PIECE_LABEL: Record<FloralPiece, string> = {
  ceremony_arch: "Ceremony arch",
  ceremony_aisle: "Aisle markers",
  centerpiece: "Centerpiece",
  bouquet_organizer: "Bouquet — yours",
  bouquet_partner: "Bouquet — partner",
  bouquet_party: "Wedding-party bouquets",
  boutonniere: "Boutonnières",
  corsage: "Corsages",
  cake_florals: "Cake florals",
  head_table: "Head-table garland",
  welcome_floral: "Welcome arrangement",
  ladies_room: "Lounge florals",
  petals: "Send-off petals",
};

const AREA_FOR: Record<FloralPiece, "Ceremony" | "Personal" | "Reception" | "Ancillary"> = {
  ceremony_arch: "Ceremony", ceremony_aisle: "Ceremony", petals: "Ceremony",
  bouquet_organizer: "Personal", bouquet_partner: "Personal", bouquet_party: "Personal",
  boutonniere: "Personal", corsage: "Personal",
  centerpiece: "Reception", head_table: "Reception", cake_florals: "Reception",
  welcome_floral: "Ancillary", ladies_room: "Ancillary",
};

const AREA_BLURB: Record<"Ceremony" | "Personal" | "Reception" | "Ancillary", string> = {
  Ceremony: "Where the vows happen.",
  Personal: "Carried, pinned, worn.",
  Reception: "Where you eat and dance.",
  Ancillary: "The quiet extras most guests notice last.",
};

const AREA_ORDER = ["Ceremony", "Personal", "Reception", "Ancillary"] as const;

export function FloralsView() {
  const { state, setState, loading } = useProject();
  const { notify } = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  if (loading || !state) return <div className="pt-10 text-center text-ink-300">Loading…</div>;

  const post = async (body: object, key: string) => {
    setBusy(key);
    try {
      const r = await fetch("/api/florals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await r.json()) as { state?: ProjectState };
      if (j.state) {
        setState(j.state);
        const newCount = j.state.florals?.length ?? 0;
        notify({
          kind: "agent",
          agent: "Botanist",
          title: `${newCount} arrangements proposed`,
          detail: "Real stems, real vessel notes, real quantities.",
        });
      }
    } finally { setBusy(null); }
  };

  const total = state.florals.reduce((s, a) => s + a.unitCost * a.quantity, 0);
  const stems = Array.from(new Set(state.florals.flatMap((a) => a.primary ?? []))).slice(0, 6);
  const groups = AREA_ORDER
    .map((area) => ({ area, items: state.florals.filter((a) => AREA_FOR[a.piece] === area) }))
    .filter((g) => g.items.length > 0);

  const briefLocked = Boolean(state.brief?.locked);
  const hasFlorals = state.florals.length > 0;

  return (
    <div className="flex flex-col gap-12 pb-12">
      {/* Hero */}
      <header>
        <p className="text-[10px] uppercase tracking-[0.26em] text-sage-500 font-mono mb-2">
          Botanist · The flowers
        </p>
        <div className="flex items-baseline justify-between gap-6 flex-wrap">
          <h1 className="display text-[36px] sm:text-[44px] lg:text-[52px] leading-[1.02] tracking-[-0.01em]">
            {!hasFlorals ? (
              <>Real stems, <span className="italic text-sage-500">real vessels</span>.</>
            ) : (
              <>
                <CountUp value={state.florals.length} /> pieces,{" "}
                <span className="italic text-sage-500">in season</span>.
              </>
            )}
          </h1>
          {hasFlorals && (
            <div className="text-right">
              <div className="display text-[28px] tabular-nums leading-none text-sage-500">
                ${total.toLocaleString()}
              </div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-ink-300 font-mono mt-1">
                estimated total
              </div>
            </div>
          )}
        </div>
        <p className="text-[14px] text-ink-300 mt-4 leading-relaxed max-w-[60ch]">
          Real stems, real vessels, real quantities — pulled from your locked design palette
          and the season we&rsquo;re in. Edit individual pieces; the line goes to your florist
          as a dossier.
        </p>
      </header>

      {/* Propose card */}
      {!briefLocked ? (
        <Reveal>
          <div className="rounded-card border hairline bg-white/55 px-6 py-5 max-w-xl">
            <p className="text-[10px] uppercase tracking-[0.22em] text-sage-500 font-mono mb-2">
              Not yet
            </p>
            <p className="text-[14px] text-ink leading-relaxed">
              Seal the dossier first — Botanist needs your season, palette, and headcount before
              proposing real arrangements.
            </p>
          </div>
        </Reveal>
      ) : (
        <Reveal>
          <section className="rounded-card border hairline bg-white/85 px-5 py-5">
            <p className="text-[10px] uppercase tracking-[0.22em] text-sage-500 font-mono mb-3">
              {hasFlorals ? "Try a different palette" : "Pull a flower plan together"}
            </p>
            <p className="text-[14px] text-ink-300 leading-relaxed max-w-[60ch]">
              {hasFlorals
                ? "Replaces the entire program. Existing edits will be lost."
                : "Botanist drafts per-piece specs — arch, aisle, centerpieces, bouquets, boutonnières, corsages, cake florals — with stems, vessels, and quantities."}
            </p>
            <div className="mt-4 flex items-center gap-4">
              <button
                onClick={() => post({ op: "propose" }, "propose")}
                disabled={!!busy}
                className="btn-primary"
                style={{ paddingInline: "1.4rem", paddingBlock: "0.55rem" }}
              >
                {busy === "propose"
                  ? "Botanist working…"
                  : hasFlorals ? "Re-do" : "Draft the program"}
              </button>
            </div>
          </section>
        </Reveal>
      )}

      {/* Primary stems strip */}
      {hasFlorals && stems.length > 0 && (
        <Reveal>
          <div className="flex items-baseline gap-3 flex-wrap text-[12.5px] text-ink-300">
            <span className="text-[10px] uppercase tracking-[0.22em] text-sage-500 font-mono">
              The stems
            </span>
            <span className="italic">{stems.join(" · ")}</span>
          </div>
        </Reveal>
      )}

      {/* Empty / Groups */}
      {!hasFlorals ? (
        <Reveal>
          <div className="rounded-card border hairline bg-white/55 px-7 py-12 max-w-xl">
            <p className="display text-[26px] text-ink leading-tight">No florals yet.</p>
            <p className="text-[14px] text-ink-300 mt-3 leading-relaxed">
              Per-piece specs (arch, aisle, centerpieces, bouquets, boutonnières, corsages,
              cake florals, head-table garland) with real stems, vessels, and quantities — all
              pulled from your design palette.
            </p>
          </div>
        </Reveal>
      ) : (
        groups.map((g) => (
          <Reveal key={g.area}>
            <section>
              <div className="flex items-baseline justify-between gap-3 mb-5 flex-wrap">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-sage-500 font-mono mb-0.5">
                    {g.area}
                  </p>
                  <h2 className="display italic text-[22px] text-ink leading-tight">
                    {AREA_BLURB[g.area]}
                  </h2>
                </div>
                <span className="text-[10.5px] uppercase tracking-[0.22em] font-mono text-ink-300 tabular-nums">
                  {g.items.length} {g.items.length === 1 ? "piece" : "pieces"}
                </span>
              </div>
              <div className="grid lg:grid-cols-2 gap-4">
                {g.items.map((a) => (
                  <article
                    key={a.id}
                    className={`surface rounded-card card-shell hover:shadow-cardHover transition-all overflow-hidden ${
                      a.approved ? "ring-1 ring-sage-300/50" : ""
                    }`}
                  >
                    <header className="px-5 pt-4 pb-3 border-b hairline flex items-baseline justify-between gap-3">
                      <h3 className="display italic text-[20px] text-ink leading-tight">
                        {PIECE_LABEL[a.piece]}
                      </h3>
                      <span className="text-[10.5px] uppercase tracking-[0.18em] font-mono text-sage-500 tabular-nums shrink-0">
                        ×{a.quantity} · ${a.unitCost}
                      </span>
                    </header>
                    <div className="px-5 py-4 text-[13.5px] space-y-1.5 leading-relaxed">
                      {(a.primary?.length ?? 0) > 0 && (
                        <div className="flex gap-2">
                          <span className="text-[10px] uppercase tracking-[0.18em] font-mono text-ink-300 shrink-0 mt-1">Primary</span>
                          <span className="text-ink">{a.primary.join(", ")}</span>
                        </div>
                      )}
                      {(a.secondary?.length ?? 0) > 0 && (
                        <div className="flex gap-2">
                          <span className="text-[10px] uppercase tracking-[0.18em] font-mono text-ink-300 shrink-0 mt-1">Secondary</span>
                          <span className="text-ink-400">{a.secondary.join(", ")}</span>
                        </div>
                      )}
                      {a.vesselNotes && (
                        <p className="text-ink-400 italic pt-2 leading-relaxed">
                          {a.vesselNotes}
                        </p>
                      )}
                    </div>
                    <footer className="px-5 py-3 border-t hairline flex items-baseline justify-between">
                      <span className="text-[10.5px] uppercase tracking-[0.18em] font-mono text-ink-300">
                        Subtotal
                      </span>
                      <span className="display text-[18px] text-ink tabular-nums">
                        ${(a.unitCost * a.quantity).toLocaleString()}
                      </span>
                    </footer>
                  </article>
                ))}
              </div>
            </section>
          </Reveal>
        ))
      )}
    </div>
  );
}
