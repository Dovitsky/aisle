"use client";

import { useState } from "react";
import type { ProjectState } from "@/lib/types";
import { useProject } from "./StateProvider";
import { EmptyState, PageHeader } from "./ui";

export function LogisticsView() {
  const { state, setState, loading } = useProject();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (loading || !state) return <div className="pt-10 text-center text-ink-300">Loading…</div>;

  const post = async (body: object, key: string) => {
    setBusy(key); setError(null);
    try {
      const r = await fetch("/api/logistics", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
      });
      const j = (await r.json()) as { state?: ProjectState; error?: string };
      if (!r.ok) { setError(j.error ?? `Error ${r.status}`); return; }
      if (j.state) setState(j.state);
    } finally { setBusy(null); }
  };

  const proposeBlock = async () => {
    const hotel = window.prompt("Hotel name", "The Roundhouse");
    if (!hotel) return;
    const rate = Number(window.prompt("Nightly rate (USD)", "260") ?? "0");
    const rooms = Number(window.prompt("Rooms to block", "20") ?? "0");
    if (!rate || !rooms) return;
    await post({ op: "propose_block", hotel, nightlyRate: rate, rooms }, "block");
  };

  const outOfTownCount = state.households.filter((h) => h.outOfTown).length;
  const wbTotal = state.welcomeBag.reduce((s, i) => s + i.unitCostUsd, 0);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Logistics"
        title="Logistics"
        subtitle={`Hotel block, transportation, welcome bags. Out-of-town household count: ${outOfTownCount}.`}
      />

      <section className="surface rounded-card border hairline shadow-card p-4 sm:p-5">
        <div className="flex items-baseline justify-between flex-wrap gap-2 mb-3">
          <h2 className="display text-xl">Hotel block</h2>
          <div className="flex gap-2">
            <button onClick={() => post({ op: "seed_blocks" }, "seedB")} disabled={!!busy || state.hotelBlocks.length > 0} className="rounded-2xl border hairline bg-white/80 hover:bg-white px-3 py-1.5 text-sm transition-colors disabled:opacity-50">
              {busy === "seedB" ? "…" : "Seed blocks"}
            </button>
            <button onClick={proposeBlock} disabled={!!busy} className="rounded-2xl bg-ink text-paper-50 hover:bg-ink-400 px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50">
              {busy === "block" ? "…" : "Propose new block"}
            </button>
          </div>
        </div>
        {state.hotelBlocks.length === 0 ? (
          <p className="text-sm text-ink-300 italic">No blocks yet.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-2 stagger">
            {state.hotelBlocks.map((h) => (
              <div key={h.id} className="rounded-card border hairline bg-white/60 p-3 hover:bg-white transition-colors">
                <div className="display text-base">{h.hotel}</div>
                <div className="text-[12px] text-ink-300">{h.city} · ${h.nightlyRateUsd}/night</div>
                <div className="text-[14px] mt-2">
                  <strong className="display text-lg tabular-nums">{h.roomsBooked}</strong> / {h.roomsBlocked} rooms booked
                </div>
                <div className="text-[11px] text-ink-300 mt-0.5">Releases {h.releaseDate}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="surface rounded-card border hairline shadow-card p-4 sm:p-5">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="display text-xl">Transportation</h2>
          <button onClick={() => post({ op: "seed_shuttles" }, "seedS")} disabled={!!busy || state.shuttles.length > 0} className="rounded-2xl border hairline bg-white/80 hover:bg-white px-3 py-1.5 text-sm transition-colors disabled:opacity-50">
            {busy === "seedS" ? "…" : "Seed shuttles"}
          </button>
        </div>
        {state.shuttles.length === 0 ? (
          <p className="text-sm text-ink-300 italic">No shuttles yet.</p>
        ) : (
          <ul className="divide-y hairline">
            {state.shuttles.map((sh) => (
              <li key={sh.id} className="py-2.5 grid grid-cols-[1fr_auto] items-center gap-3 text-sm">
                <div>
                  <div className="font-medium">{sh.route}</div>
                  <div className="text-[11px] text-ink-300">Pickup {sh.pickupTime}</div>
                </div>
                <div className="text-[12px] text-ink-300 tabular-nums">{sh.reservedSeats}/{sh.capacity} seats</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="surface rounded-card border hairline shadow-card p-4 sm:p-5">
        <div className="flex items-baseline justify-between flex-wrap gap-2 mb-3">
          <h2 className="display text-xl">Welcome bag</h2>
          <button onClick={() => post({ op: "propose_welcome_bag" }, "wb")} disabled={!!busy} className="rounded-2xl bg-ink text-paper-50 hover:bg-ink-400 px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50">
            {busy === "wb" ? "Quartermaster working…" : state.welcomeBag.length ? "Re-propose" : "Have Quartermaster propose"}
          </button>
        </div>
        {state.welcomeBag.length === 0 ? (
          <p className="text-sm text-ink-300 italic">No welcome bag yet.</p>
        ) : (
          <>
            <div className="text-[12px] text-ink-300">
              <strong className="display text-lg text-ink tabular-nums">${wbTotal}</strong> per bag · for {outOfTownCount} households · ≈ <strong className="tabular-nums">${wbTotal * Math.max(1, outOfTownCount)}</strong> total
            </div>
            <ul className="mt-3 divide-y hairline">
              {state.welcomeBag.map((it) => (
                <li key={it.id} className="py-2 grid grid-cols-[1fr_auto] items-baseline gap-3 text-sm">
                  <div>
                    <div>{it.item}</div>
                    <div className="text-[11px] text-ink-300">{it.rationale}</div>
                  </div>
                  <div className="text-[12px] text-ink-300 tabular-nums">${it.unitCostUsd}</div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {error && <p className="text-sm text-risk-high">{error}</p>}
    </div>
  );
}
