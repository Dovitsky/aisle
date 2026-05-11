"use client";

// Registry. Curator's proposed gift list, grouped by category, with
// purchase tracking. Purchases flow into Thanks automatically.
//
// Layout: editorial hero with N items + purchased-of-total italic count
// + total-dollars side stat; sage-mono propose card with Re-propose
// tertiary; category sections with sage-mono label + italic blurb-as-
// title + per-section count/total/bought; per-item rows with truncated
// name + italic vendor + tabular price + Mark-bought / Bought state.

import { useState } from "react";
import type { ProjectState, RegistryItem } from "@/lib/types";
import { useProject } from "./StateProvider";
import { useToast } from "./Toast";
import { Reveal, CountUp } from "./Atmosphere";

const CATEGORY_LABEL: Record<string, string> = {
  kitchen: "Kitchen",
  dining: "Dining",
  bedroom: "Bedroom",
  bath: "Bath",
  experience: "Experiences",
  cash_fund: "Cash funds",
  charity: "Charity",
  other: "Everything else",
};

const CATEGORY_BLURB: Record<string, string> = {
  kitchen: "Le Creuset, All-Clad — the things that get used every day.",
  dining: "Heath plates, Riedel glassware — the table you'll set for years.",
  bedroom: "Linen sheets, considered comforters.",
  bath: "Coyuchi towels, Frette robes.",
  experience: "Honeymoon upgrades, tasting menus, first-night flights.",
  cash_fund: "Down payment, savings, untagged generosity.",
  charity: "World Central Kitchen, the local food bank, climate.",
  other: "The rest of it.",
};

const CATEGORY_ORDER = Object.keys(CATEGORY_LABEL);

export function RegistryView() {
  const { state, setState, loading } = useProject();
  const { notify } = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  if (loading || !state) return <div className="pt-10 text-center text-ink-300">Loading…</div>;

  const propose = async () => {
    setBusy("propose");
    try {
      const r = await fetch("/api/registry", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "propose" }),
      });
      const j = (await r.json()) as { state?: ProjectState };
      if (j.state) {
        setState(j.state);
        notify({
          kind: "agent",
          agent: "Curator",
          title: `${j.state.registry.length} registry items proposed`,
          detail: "Real brands at real current prices. Edit anything, then publish.",
        });
      }
    } finally { setBusy(null); }
  };

  const proposePurchase = async (id: string, item: string) => {
    setBusy("buy-" + id);
    try {
      const r = await fetch("/api/registry", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "propose_purchase", id }),
      });
      const j = (await r.json()) as { state?: ProjectState };
      if (j.state) {
        setState(j.state);
        notify({
          kind: "approval",
          title: `${item} marked bought`,
          detail: "A thank-you draft just landed in /thanks.",
        });
      }
    } finally { setBusy(null); }
  };

  const groups: Record<string, RegistryItem[]> = {};
  for (const it of state.registry) {
    groups[it.category] = groups[it.category] ?? [];
    groups[it.category].push(it);
  }
  const total = state.registry.reduce((s, i) => s + i.priceUsd, 0);
  const purchased = state.registry.filter((i) => i.status === "purchased").reduce((s, i) => s + i.priceUsd, 0);
  const purchasedCount = state.registry.filter((i) => i.status === "purchased").length;
  const orderedCats = Object.keys(groups).sort(
    (a, b) => CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b),
  );
  const hasRegistry = state.registry.length > 0;

  return (
    <div className="flex flex-col gap-12 pb-12">
      {/* Hero */}
      <header>
        <p className="text-[10px] uppercase tracking-[0.26em] text-sage-500 font-mono mb-2">
          Curator · The registry
        </p>
        <div className="flex items-baseline justify-between gap-6 flex-wrap">
          <h1 className="display text-[36px] sm:text-[44px] lg:text-[52px] leading-[1.02] tracking-[-0.01em]">
            {!hasRegistry ? (
              <>The things you&rsquo;ll <span className="italic text-sage-500">actually use</span>.</>
            ) : purchasedCount === state.registry.length ? (
              <>Everything <span className="italic text-sage-500">spoken for</span>.</>
            ) : (
              <>
                <CountUp value={purchasedCount} /> of {state.registry.length}{" "}
                <span className="italic text-sage-500">claimed</span>.
              </>
            )}
          </h1>
          {hasRegistry && (
            <div className="text-right">
              <div className="display text-[28px] tabular-nums leading-none text-sage-500">
                ${total.toLocaleString()}
              </div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-ink-300 font-mono mt-1">
                total{purchased > 0 ? ` · $${purchased.toLocaleString()} so far` : ""}
              </div>
            </div>
          )}
        </div>
        <p className="text-[14px] text-ink-300 mt-4 leading-relaxed max-w-[60ch]">
          Twelve to eighteen items across kitchen, dining, bedroom, experiences, and cash
          funds — at least one charity. Purchases flow into thank-you cards automatically.
        </p>
      </header>

      {/* Propose card */}
      {!hasRegistry ? (
        <Reveal>
          <section className="rounded-card border hairline bg-white/85 px-5 py-5">
            <p className="text-[10px] uppercase tracking-[0.22em] text-sage-500 font-mono mb-3">
              Pull a registry together
            </p>
            <p className="text-[14px] text-ink-300 leading-relaxed max-w-[60ch]">
              Curator drafts 12–18 items at real current prices — Le Creuset, Heath,
              Parachute, plus cash funds for the honeymoon and a charity option or two.
            </p>
            <div className="mt-4 flex items-center gap-4">
              <button
                onClick={propose}
                disabled={busy === "propose"}
                className="btn-primary"
                style={{ paddingInline: "1.4rem", paddingBlock: "0.55rem" }}
              >
                {busy === "propose" ? "Curator working…" : "Pull a registry together"}
              </button>
            </div>
          </section>
        </Reveal>
      ) : (
        <Reveal>
          <div className="flex justify-end">
            <button
              onClick={propose}
              disabled={busy === "propose"}
              className="text-[11px] uppercase tracking-[0.18em] border border-ink/15 hover:border-ink/30 rounded-full px-3.5 py-1.5 transition-colors text-ink-400 hover:text-ink disabled:opacity-50"
            >
              {busy === "propose" ? "Curator working…" : "Re-propose"}
            </button>
          </div>
        </Reveal>
      )}

      {/* Empty */}
      {!hasRegistry && (
        <Reveal>
          <div className="rounded-card border hairline bg-white/55 px-7 py-12 max-w-xl">
            <p className="display text-[26px] text-ink leading-tight">No registry yet.</p>
            <p className="text-[14px] text-ink-300 mt-3 leading-relaxed">
              Click <span className="text-ink not-italic">Pull a registry together</span> above and
              Curator will draft a tasteful starter list — real brands, real current prices —
              for you to edit before publishing to guests.
            </p>
          </div>
        </Reveal>
      )}

      {/* Category sections */}
      {hasRegistry && orderedCats.map((cat) => {
        const items = groups[cat] ?? [];
        const catTotal = items.reduce((s, i) => s + i.priceUsd, 0);
        const catBought = items.filter((i) => i.status === "purchased").reduce((s, i) => s + i.priceUsd, 0);
        return (
          <Reveal key={cat}>
            <section>
              <div className="flex items-baseline justify-between gap-3 mb-5 flex-wrap">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-sage-500 font-mono mb-0.5">
                    {CATEGORY_LABEL[cat] ?? cat}
                  </p>
                  <h2 className="display italic text-[22px] text-ink leading-tight">
                    {CATEGORY_BLURB[cat] ?? "—"}
                  </h2>
                </div>
                <span className="text-[10.5px] uppercase tracking-[0.22em] font-mono text-ink-300 tabular-nums">
                  {items.length} · ${catTotal.toLocaleString()}
                  {catBought > 0 && <span className="text-sage-500"> · ${catBought.toLocaleString()} bought</span>}
                </span>
              </div>
              <ul className="surface rounded-card card-shell overflow-hidden">
                {items.map((it, i) => {
                  const bought = it.status === "purchased";
                  return (
                    <li
                      key={it.id}
                      className={`px-5 py-3.5 grid grid-cols-[1fr_auto_auto] items-baseline gap-4 group hover:bg-paper-100/40 transition-colors ${
                        i < items.length - 1 ? "border-b hairline" : ""
                      } ${bought ? "opacity-60" : ""}`}
                    >
                      <div className="min-w-0">
                        <div className="text-[15px] text-ink leading-tight truncate">{it.item}</div>
                        <div className="text-[11.5px] text-ink-300 mt-0.5 italic">{it.vendor}</div>
                      </div>
                      <div className="display text-[17px] text-ink tabular-nums shrink-0">
                        ${it.priceUsd.toLocaleString()}
                      </div>
                      {bought ? (
                        <span className="text-[10.5px] uppercase tracking-[0.18em] text-sage-500 font-mono shrink-0">
                          Bought
                        </span>
                      ) : (
                        <button
                          onClick={() => proposePurchase(it.id, it.item)}
                          disabled={busy === "buy-" + it.id}
                          className="text-[10.5px] uppercase tracking-[0.18em] text-ink-300 hover:text-sage-500 transition-colors disabled:opacity-50 shrink-0"
                        >
                          {busy === "buy-" + it.id ? "…" : "Mark bought"}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          </Reveal>
        );
      })}
    </div>
  );
}
