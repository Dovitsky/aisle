"use client";

// /atelier/fittings — three states:
//   1. No "the_one" yet → placeholder
//   2. "the_one" set, no atelier selected → ranked atelier shortlist
//   3. Atelier selected → fitting plan + tech pack export

import { useEffect, useState } from "react";
import Link from "next/link";
import type { AtelierVendor, ProjectState, TechPackPayload } from "@/lib/types";
import { useProject } from "../StateProvider";
import { useToast } from "../Toast";
import { AtelierShell } from "./AtelierShell";

export function AtelierFittings() {
  const { state, setState, loading } = useProject();
  const { notify } = useToast();
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [ateliers, setAteliers] = useState<AtelierVendor[]>([]);
  const [exporting, setExporting] = useState(false);
  const [techPack, setTechPack] = useState<TechPackPayload | null>(null);

  const theOne = state?.atelier?.concepts.find(
    (c) => c.kind === "dress" && c.status === "the_one",
  );
  const selectedAtelierId = state?.atelier?.selectedAtelierId;
  const selectedAtelier = state?.atelier?.ateliers?.find(
    (a) => a.id === selectedAtelierId,
  );
  const fittingPlan = state?.atelier?.fittingPlan;

  useEffect(() => {
    if (!theOne) return;
    if (state?.atelier?.ateliers && state.atelier.ateliers.length > 0) {
      setAteliers(state.atelier.ateliers);
      return;
    }
    setLoadingMatches(true);
    void fetch("/api/atelier/ateliers")
      .then((r) => r.json())
      .then((j: { ateliers: AtelierVendor[] }) => setAteliers(j.ateliers ?? []))
      .finally(() => setLoadingMatches(false));
  }, [theOne, state?.atelier?.ateliers]);

  const selectAtelier = async (id: string) => {
    const r = await fetch("/api/atelier/ateliers", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ atelierId: id }),
    });
    const j = (await r.json()) as { state?: ProjectState };
    if (j.state) {
      setState(j.state);
      const chosen = ateliers.find((a) => a.id === id);
      if (chosen) {
        notify({
          kind: "agent",
          agent: "Couturier",
          title: `${chosen.name} it is`,
          detail: "Fitting plan built. Tech pack is ready to export.",
        });
      }
    }
  };

  const exportTechPack = async () => {
    if (!theOne || exporting) return;
    setExporting(true);
    try {
      const r = await fetch("/api/atelier/tech-pack", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ conceptId: theOne.id }),
      });
      const j = (await r.json()) as { payload?: TechPackPayload; error?: string };
      if (j.payload) {
        setTechPack(j.payload);
        notify({
          kind: "agent",
          agent: "Couturier",
          title: "Tech pack ready",
          detail: "Eight pages. Print or share with your atelier.",
        });
      }
    } finally {
      setExporting(false);
    }
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
      <header className="mb-10">
        <p className="text-[10px] uppercase tracking-[0.32em] font-mono text-sage-deep mb-2">
          Fittings & atelier
        </p>
        <h1
          className="display text-[36px] sm:text-[44px] leading-[1.05] text-ink"
          style={{ fontWeight: 400 }}
        >
          {!theOne
            ? "Mark a concept as the one to begin."
            : !selectedAtelier
            ? "Meet your atelier."
            : `${selectedAtelier.name}, then.`}
        </h1>
      </header>

      {!theOne ? (
        <EmptyFittings />
      ) : !selectedAtelier ? (
        <AtelierMatchList
          ateliers={ateliers}
          loading={loadingMatches}
          onSelect={selectAtelier}
        />
      ) : (
        <div className="grid lg:grid-cols-[1fr_320px] gap-10">
          <FittingPlanView
            items={fittingPlan?.items ?? []}
            atelier={selectedAtelier}
          />
          <TechPackRail
            techPack={techPack}
            exporting={exporting}
            onExport={exportTechPack}
            atelier={selectedAtelier}
          />
        </div>
      )}
    </AtelierShell>
  );
}

// ---------------------------------------------------------------- empty ---

function EmptyFittings() {
  return (
    <div
      className="rounded-2xl p-12 text-center max-w-[560px]"
      style={{ background: "#FFFFFF", border: "1px dashed rgba(14,15,13,0.12)" }}
    >
      <p
        className="display italic text-[24px] text-ink leading-tight"
        style={{ fontWeight: 400 }}
      >
        Choose the one first.
      </p>
      <p className="text-[13px] text-ink-300 mt-3 leading-relaxed">
        Once you mark a dress concept as the one, the atelier match comes
        alive — a shortlist of houses that can build exactly this dress,
        with a fitting plan back from the wedding date.
      </p>
      <Link
        href="/atelier/dress"
        className="cta-sage inline-flex items-center gap-2 mt-6 rounded-full px-5 py-2 text-[11.5px] uppercase tracking-[0.22em] font-mono transition-all"
      >
        Open builder <span aria-hidden>→</span>
      </Link>
    </div>
  );
}

// --------------------------------------------------- atelier match list ---

function AtelierMatchList({
  ateliers,
  loading,
  onSelect,
}: {
  ateliers: AtelierVendor[];
  loading: boolean;
  onSelect: (id: string) => void;
}) {
  if (loading) {
    return (
      <div className="grid sm:grid-cols-2 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl p-6 h-[180px]"
            style={{ background: "rgba(168,181,160,0.10)" }}
          />
        ))}
      </div>
    );
  }
  if (ateliers.length === 0) {
    return (
      <p className="text-[14px] text-ink-300">No matches yet — try again.</p>
    );
  }
  return (
    <ul className="grid sm:grid-cols-2 gap-4">
      {ateliers.map((a) => (
        <li key={a.id}>
          <article
            className="rounded-2xl p-6 h-full flex flex-col"
            style={{
              background: "#FFFFFF",
              border: "1px solid rgba(14,15,13,0.06)",
            }}
          >
            <div className="flex items-baseline justify-between gap-3">
              <h3
                className="display text-[22px] leading-tight text-ink"
                style={{ fontWeight: 400 }}
              >
                {a.name}
              </h3>
              <span className="text-[10px] uppercase tracking-[0.22em] font-mono text-ink-300 shrink-0">
                {a.region}
              </span>
            </div>
            <p className="text-[12.5px] text-ink-400 mt-2 leading-relaxed italic">
              {a.whyMatch}
            </p>
            <dl className="grid grid-cols-3 gap-4 mt-5 text-[11px]">
              <Stat label="From" value={`$${(a.priceBand / 1000).toFixed(0)}k`} />
              <Stat label="Lead time" value={`${a.leadTimeMonths} mo`} />
              <Stat label="Style" value={(a.specialties[0] ?? "couture").replace("-", " ")} />
            </dl>
            <div className="mt-5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => onSelect(a.id)}
                className="cta-sage inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11.5px] uppercase tracking-[0.20em] font-mono transition-all"
              >
                Choose {a.name.split(" ")[0]} <span aria-hidden>→</span>
              </button>
            </div>
          </article>
        </li>
      ))}
    </ul>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[9.5px] uppercase tracking-[0.20em] text-ink-300">
        {label}
      </dt>
      <dd className="text-[13px] text-ink mt-0.5 capitalize">{value}</dd>
    </div>
  );
}

// ----------------------------------------------------- fitting plan view ---

function FittingPlanView({
  items,
  atelier,
}: {
  items: { id: string; kind: string; label: string; scheduledFor: string; bring: string[]; note?: string; done?: boolean }[];
  atelier: AtelierVendor;
}) {
  return (
    <section>
      <div className="flex items-baseline justify-between gap-3 mb-6 flex-wrap">
        <h2
          className="display text-[24px] text-ink leading-tight"
          style={{ fontWeight: 400 }}
        >
          The fitting plan
        </h2>
        <p className="text-[10.5px] uppercase tracking-[0.22em] font-mono text-ink-300">
          With {atelier.name} · {atelier.region}
        </p>
      </div>
      <ol className="relative pl-7 border-l border-ink/10">
        {items.map((it, idx) => (
          <li key={it.id} className="relative pb-7 last:pb-0">
            <span
              aria-hidden
              className="absolute -left-[34px] top-1 inline-flex items-center justify-center w-6 h-6 rounded-full bg-white text-[10px] font-mono"
              style={{ border: "1px solid rgba(110,128,104,0.45)", color: "#4F5D44" }}
            >
              {idx + 1}
            </span>
            <div
              className="rounded-xl p-5"
              style={{
                background: "#FFFFFF",
                border: "1px solid rgba(14,15,13,0.06)",
              }}
            >
              <div className="flex items-baseline justify-between gap-3 flex-wrap">
                <h3
                  className="display text-[18px] text-ink leading-tight"
                  style={{ fontWeight: 400 }}
                >
                  {it.label}
                </h3>
                <p className="text-[10.5px] uppercase tracking-[0.22em] font-mono text-sage-deep">
                  {formatDate(it.scheduledFor)}
                </p>
              </div>
              {it.bring.length > 0 && (
                <p className="text-[12.5px] text-ink-400 mt-2 leading-relaxed">
                  Bring: {it.bring.join(", ").toLowerCase()}.
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

// ----------------------------------------------------------- tech pack ---

function TechPackRail({
  techPack,
  exporting,
  onExport,
  atelier,
}: {
  techPack: TechPackPayload | null;
  exporting: boolean;
  onExport: () => void;
  atelier: AtelierVendor;
}) {
  return (
    <aside>
      <div
        className="rounded-2xl p-6"
        style={{ background: "#FFFFFF", border: "1px solid rgba(14,15,13,0.06)" }}
      >
        <p className="text-[10px] uppercase tracking-[0.30em] font-mono text-sage-deep mb-2">
          Tech pack
        </p>
        <p
          className="display italic text-[20px] text-ink leading-tight"
          style={{ fontWeight: 400 }}
        >
          Eight pages your atelier can quote from.
        </p>
        <ul className="mt-4 space-y-2 text-[12.5px] text-ink-400 leading-relaxed">
          <li>1. Title + designer brief</li>
          <li>2. Design specifications</li>
          <li>3. Reference imagery</li>
          <li>4. Construction notes</li>
          <li>5. Veil specifications</li>
          <li>6. Body & fit notes</li>
          <li>7. Fitting timeline</li>
          <li>8. Logistics</li>
        </ul>
        <button
          type="button"
          onClick={onExport}
          disabled={exporting}
          className="cta-sage w-full mt-5 inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[12px] uppercase tracking-[0.22em] font-mono transition-all disabled:opacity-50"
        >
          <span aria-hidden>◆</span>
          {exporting ? "Composing…" : techPack ? "Re-export tech pack" : "Export tech pack"}
        </button>
        {techPack && (
          <Link
            href={`/atelier/tech-pack-preview?concept=${techPack ? "open" : ""}`}
            className="mt-3 inline-flex items-center justify-center gap-2 w-full rounded-full border border-ink/10 bg-white hover:bg-ink/[0.03] px-4 py-2 text-[11.5px] uppercase tracking-[0.20em] font-mono text-ink transition-colors"
          >
            Preview
          </Link>
        )}
        <p className="text-[10.5px] text-ink-300 mt-4 leading-relaxed italic">
          We never auto-send. The atelier outreach goes through a normal
          approval card.
        </p>
      </div>
      <p className="text-[10.5px] text-ink-300 mt-4 leading-relaxed">
        Choosing {atelier.name} doesn&apos;t bind anything. You can change
        houses up until you sign their contract.
      </p>
    </aside>
  );
}
