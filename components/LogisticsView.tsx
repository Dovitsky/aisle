"use client";

// Logistics. three pillars: where guests sleep, how they move, what they
// find waiting in their room. Out-of-town household count drives quantities.

import { useMemo, useState } from "react";
import type { ProjectState } from "@/lib/types";
import { useProject } from "./StateProvider";
import { useDialog } from "./Dialog";
import { useToast } from "./Toast";
import { PageHeader, Stat } from "./ui";
import { Reveal } from "./Atmosphere";

export function LogisticsView() {
  const { state, setState, loading } = useProject();
  const dialog = useDialog();
  const { notify } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const counts = useMemo(() => {
    if (!state) return { outOfTown: 0, totalRooms: 0, bookedRooms: 0, shuttleSeats: 0, shuttleCapacity: 0 };
    return {
      outOfTown: state.households.filter((h) => h.outOfTown).length,
      totalRooms: state.hotelBlocks.reduce((s, h) => s + h.roomsBlocked, 0),
      bookedRooms: state.hotelBlocks.reduce((s, h) => s + h.roomsBooked, 0),
      shuttleSeats: state.shuttles.reduce((s, sh) => s + sh.reservedSeats, 0),
      shuttleCapacity: state.shuttles.reduce((s, sh) => s + sh.capacity, 0),
    };
  }, [state]);

  if (loading || !state) {
    return <div className="pt-10 text-center text-ink-300">Loading…</div>;
  }

  const post = async (body: object, key: string) => {
    setBusy(key);
    setError(null);
    try {
      const r = await fetch("/api/logistics", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await r.json()) as { state?: ProjectState; error?: string };
      if (!r.ok) {
        setError(j.error ?? `Error ${r.status}`);
        return;
      }
      if (j.state) setState(j.state);
    } finally {
      setBusy(null);
    }
  };

  const proposeBlock = async () => {
    const data = await dialog.form({
      title: "Reserve a hotel block",
      body: "We'll draft an inquiry to the hotel and queue a decision card for the contract.",
      fields: [
        { id: "hotel", label: "Hotel name", type: "text", default: "The Roundhouse", required: true },
        { id: "rate", label: "Nightly rate (USD)", type: "number", default: "260", required: true },
        {
          id: "rooms",
          label: "Rooms to block",
          type: "number",
          default: "20",
          required: true,
          hint: `Out-of-town households so far: ${counts.outOfTown}`,
        },
      ],
      confirmLabel: "Reserve",
    });
    if (!data) return;
    const rate = Number(data.rate);
    const rooms = Number(data.rooms);
    if (!rate || !rooms) return;
    await post({ op: "propose_block", hotel: data.hotel, nightlyRate: rate, rooms }, "block");
    notify({
      kind: "agent",
      agent: "Concierge",
      title: `${rooms} rooms requested at ${data.hotel}`,
      detail: "Approval card queued. contract follows once they reply.",
      hrefOnClick: "/approvals",
    });
  };

  const wbTotal = state.welcomeBag.reduce((s, i) => s + i.unitCostUsd, 0);
  const wbGrand = wbTotal * Math.max(1, counts.outOfTown);

  return (
    <div className="flex flex-col gap-10 pb-12">
      <PageHeader
        eyebrow="Logistics"
        title="Hotels, transport, welcome bag."
        subtitle={`${counts.outOfTown} household${counts.outOfTown === 1 ? "" : "s"} traveling in.`}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 stagger">
        <Stat label="Households traveling" value={counts.outOfTown} />
        <Stat
          label="Hotel rooms"
          value={`${counts.bookedRooms} / ${counts.totalRooms}`}
          sub={counts.totalRooms === 0 ? "No blocks yet" : `${Math.round((counts.bookedRooms / counts.totalRooms) * 100)}% booked`}
          tone={counts.totalRooms > 0 && counts.bookedRooms === counts.totalRooms ? "low" : "muted"}
        />
        <Stat
          label="Shuttle seats"
          value={`${counts.shuttleSeats} / ${counts.shuttleCapacity}`}
          sub={counts.shuttleCapacity === 0 ? "No shuttles yet" : "Reserved"}
        />
        <Stat
          label="Welcome bag"
          value={wbTotal > 0 ? `$${wbTotal}` : ","}
          sub={wbTotal > 0 ? `≈ $${wbGrand} total` : "Not built"}
        />
      </div>

      {/* HOTEL BLOCK */}
      <Reveal>
        <section className="surface rounded-card border hairline shadow-card p-5">
          <div className="flex items-baseline justify-between flex-wrap gap-2 mb-3">
            <h2 className="display italic text-[20px]">Hotel block</h2>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => post({ op: "seed_blocks" }, "seedB")}
                disabled={!!busy || state.hotelBlocks.length > 0}
                className="rounded-2xl border hairline bg-white/85 hover:bg-white px-4 py-2 text-[12px] uppercase tracking-[0.18em] transition-colors disabled:opacity-50"
              >
                {busy === "seedB" ? "Adding…" : "Add a starter block"}
              </button>
              <button
                onClick={proposeBlock}
                disabled={!!busy}
                className="rounded-2xl cta-sage px-5 py-2 text-[13px] font-semibold transition-colors disabled:opacity-50"
              >
                {busy === "block" ? "Working…" : "Reserve a new block"}
              </button>
            </div>
          </div>
          {state.hotelBlocks.length === 0 ? (
            <p className="text-[13.5px] text-ink-300 italic">
              Nothing reserved yet. Boutique hotels usually want 90+ days notice. start any time the venue is locked.
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3 stagger">
              {state.hotelBlocks.map((h) => {
                const pct = h.roomsBlocked > 0 ? (h.roomsBooked / h.roomsBlocked) * 100 : 0;
                return (
                  <article
                    key={h.id}
                    className="rounded-card border hairline bg-white/70 p-4 hover:bg-white transition-colors"
                  >
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <h3 className="display italic text-[18px] leading-tight truncate">
                        {h.hotel}
                      </h3>
                      <span className="text-[10px] uppercase tracking-[0.18em] text-sage-500 font-mono shrink-0">
                        ${h.nightlyRateUsd}/night
                      </span>
                    </div>
                    <p className="text-[12px] text-ink-300">{h.city}</p>
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="display tabular-nums text-[22px]">{h.roomsBooked}</span>
                      <span className="text-ink-300 text-[13px]">/ {h.roomsBlocked} booked</span>
                    </div>
                    <div className="mt-2 h-[3px] rounded-full bg-ink/8 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-sage-500 via-sage-400 to-sage-300 transition-[width] duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-ink-300 mt-2">
                      Releases {h.releaseDate}
                    </p>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </Reveal>

      {/* TRANSPORTATION */}
      <Reveal>
        <section className="surface rounded-card border hairline shadow-card p-5">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="display italic text-[20px]">Transportation</h2>
            <button
              onClick={() => post({ op: "seed_shuttles" }, "seedS")}
              disabled={!!busy || state.shuttles.length > 0}
              className="rounded-2xl border hairline bg-white/85 hover:bg-white px-4 py-2 text-[12px] uppercase tracking-[0.18em] transition-colors disabled:opacity-50"
            >
              {busy === "seedS" ? "Adding…" : "Add starter shuttles"}
            </button>
          </div>
          {state.shuttles.length === 0 ? (
            <p className="text-[13.5px] text-ink-300 italic">
              Nothing booked yet. Plan one out (hotel → ceremony) and one back (reception → hotel) per shuttle run.
            </p>
          ) : (
            <ul className="divide-y hairline">
              {state.shuttles.map((sh) => (
                <li
                  key={sh.id}
                  className="py-3 grid grid-cols-[1fr_auto] items-center gap-3 text-[14px]"
                >
                  <div>
                    <div className="display italic text-[16px]">{sh.route}</div>
                    <div className="text-[11.5px] text-ink-300 mt-0.5">
                      Pickup {sh.pickupTime}
                    </div>
                  </div>
                  <div className="text-[12px] text-sage-500 font-mono uppercase tracking-[0.18em] tabular-nums">
                    {sh.reservedSeats} / {sh.capacity} seats
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </Reveal>

      {/* WELCOME BAG */}
      <Reveal>
        <section className="surface rounded-card border hairline shadow-card p-5">
          <div className="flex items-baseline justify-between flex-wrap gap-2 mb-3">
            <h2 className="display italic text-[20px]">Welcome bag</h2>
            <button
              onClick={() => post({ op: "propose_welcome_bag" }, "wb")}
              disabled={!!busy}
              className="rounded-2xl cta-sage px-5 py-2 text-[13px] font-semibold transition-colors disabled:opacity-50"
            >
              {busy === "wb" ? "Working…" : state.welcomeBag.length ? "Try a different bag" : "Pull together a welcome bag"}
            </button>
          </div>
          {state.welcomeBag.length === 0 ? (
            <p className="text-[13.5px] text-ink-300 italic">
              Nothing in the bag yet. Locals sip and sleep at home. these go in hotel rooms for the {counts.outOfTown} household{counts.outOfTown === 1 ? "" : "s"} traveling in.
            </p>
          ) : (
            <>
              <div className="text-[12.5px] text-ink-300 leading-relaxed mb-3">
                <strong className="display text-[20px] text-ink tabular-nums">${wbTotal}</strong>
                <span className="ml-1.5">per bag · for {counts.outOfTown} household{counts.outOfTown === 1 ? "" : "s"} · ≈ <strong className="tabular-nums text-ink">${wbGrand}</strong> total</span>
              </div>
              <ul className="divide-y hairline">
                {state.welcomeBag.map((it) => (
                  <li
                    key={it.id}
                    className="py-2.5 grid grid-cols-[1fr_auto] items-baseline gap-3 text-[14px]"
                  >
                    <div className="min-w-0">
                      <div className="display italic text-[15px]">{it.item}</div>
                      <div className="text-[11.5px] text-ink-300 mt-0.5">{it.rationale}</div>
                    </div>
                    <div className="text-[12px] text-ink-300 tabular-nums shrink-0">
                      ${it.unitCostUsd}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </Reveal>

      {error && <p className="text-sm text-risk-high">{error}</p>}
    </div>
  );
}
