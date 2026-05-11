"use client";

// Visits. every tasting, site walk, dress fitting, hair trial in one
// calendar. Auto-pre-fills attendees with the couple from the brief.

import { useMemo, useState } from "react";
import type { ProjectState, VisitKind } from "@/lib/types";
import { useProject } from "./StateProvider";
import { useToast } from "./Toast";
import { EmptyState, PageHeader, Stat } from "./ui";
import { Reveal } from "./Atmosphere";

const KIND_LABEL: Record<VisitKind, string> = {
  tasting: "Tasting",
  site_visit: "Site visit",
  trial: "Trial",
  consultation: "Consultation",
  fitting: "Fitting",
};

const KIND_ICON: Record<VisitKind, string> = {
  tasting: "🍷",
  site_visit: "🏛",
  trial: "💄",
  consultation: "🗒",
  fitting: "👗",
};

export function VisitsView() {
  const { state, setState, loading } = useProject();
  const { notify } = useToast();
  const [kind, setKind] = useState<VisitKind>("tasting");
  const [vendorName, setVendorName] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [busy, setBusy] = useState(false);

  const upcoming = useMemo(() => {
    if (!state) return [];
    return state.visits.filter((v) => !v.done).sort((a, b) => a.date.localeCompare(b.date));
  }, [state]);

  const done = useMemo(() => {
    if (!state) return [];
    return state.visits
      .filter((v) => v.done)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [state]);

  if (loading || !state) {
    return <div className="pt-10 text-center text-ink-300">Loading…</div>;
  }

  const post = async (body: object) => {
    setBusy(true);
    try {
      const r = await fetch("/api/visits", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await r.json()) as { state?: ProjectState };
      if (j.state) setState(j.state);
    } finally {
      setBusy(false);
    }
  };

  const add = async () => {
    if (!vendorName || !date) return;
    await post({
      op: "add",
      kind,
      vendorName,
      date,
      time,
      attendees: [state.brief?.organizerName ?? "", state.brief?.partnerName ?? ""].filter(Boolean),
    });
    notify({
      kind: "info",
      title: `${KIND_LABEL[kind]} booked`,
      detail: `${vendorName} · ${date}${time ? " at " + time : ""}`,
    });
    setVendorName("");
    setDate("");
    setTime("");
  };

  // Closest upcoming highlights as the "next up" callout.
  const nextUp = upcoming[0];

  return (
    <div className="flex flex-col gap-10 pb-12">
      <PageHeader
        eyebrow="Calendar"
        title={
          <>
            Tastings, fittings, walk-throughs.
          </>
        }
        subtitle="One spot for the appointments scattered across vendors. Caterer tastings, venue walks, dress fittings, hair trials, officiant consultations."
      />

      {/* Stat row */}
      <div className="grid grid-cols-3 gap-3 max-w-md stagger">
        <Stat label="Upcoming" value={upcoming.length} />
        <Stat label="Done" value={done.length} tone="low" />
        <Stat label="Next up" value={nextUp ? nextUp.date : ","} sub={nextUp ? KIND_LABEL[nextUp.kind] + " · " + nextUp.vendorName : "Nothing booked"} />
      </div>

      {/* Add row */}
      <Reveal>
        <section className="surface rounded-card border hairline shadow-card p-5">
          <p className="text-[10px] uppercase tracking-[0.26em] text-sage-500 font-mono mb-3">
            Book a visit
          </p>
          <div className="grid sm:grid-cols-5 gap-2">
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as VisitKind)}
              className="rounded-lg border hairline bg-white/85 px-3 py-2 text-sm focus:outline-none focus:border-sage-300"
            >
              {(Object.keys(KIND_LABEL) as VisitKind[]).map((k) => (
                <option key={k} value={k}>
                  {KIND_ICON[k]}  {KIND_LABEL[k]}
                </option>
              ))}
            </select>
            <input
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              placeholder="Vendor or location"
              className="rounded-lg border hairline bg-white/85 px-3 py-2 text-sm focus:outline-none focus:border-sage-300 sm:col-span-2"
            />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg border hairline bg-white/85 px-3 py-2 text-sm focus:outline-none focus:border-sage-300"
            />
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="rounded-lg border hairline bg-white/85 px-3 py-2 text-sm focus:outline-none focus:border-sage-300"
            />
          </div>
          <button
            onClick={add}
            disabled={busy || !vendorName || !date}
            className="mt-3 rounded-2xl cta-sage px-5 py-2.5 text-[13px] font-semibold transition-colors disabled:opacity-50"
          >
            {busy ? "Booking…" : "Add to the calendar"}
          </button>
        </section>
      </Reveal>

      {/* Upcoming list */}
      <section>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="display italic text-[20px]">
            Coming up <span className="not-italic text-ink-300 ml-2 text-[14px]">{upcoming.length}</span>
          </h2>
        </div>
        {upcoming.length === 0 ? (
          <EmptyState
            title="Nothing on the books."
            hint="Add a tasting, site visit, dress fitting, or hair trial above and we'll keep it here next to everything else."
          />
        ) : (
          <ol className="flex flex-col gap-2 stagger">
            {upcoming.map((v) => (
              <Reveal key={v.id}>
                <li className="surface rounded-card border hairline shadow-card hover:shadow-cardHover transition-all hover:-translate-y-0.5 p-4 grid grid-cols-[auto_1fr_auto] gap-4 items-center">
                  <div className="text-center min-w-[64px]">
                    <div className="text-[26px] leading-none mb-1">{KIND_ICON[v.kind]}</div>
                    <div className="display text-[15px] tabular-nums">{formatShortDate(v.date)}</div>
                    {v.time && (
                      <div className="text-ink-300 text-[11px] tabular-nums">{v.time}</div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="display italic text-[17px] truncate">{v.vendorName}</div>
                    <div className="text-[12px] text-ink-300 mt-0.5 truncate">
                      {KIND_LABEL[v.kind]}
                      {v.attendees.length ? ` · ${v.attendees.join(" + ")}` : ""}
                    </div>
                  </div>
                  <button
                    onClick={() => post({ op: "update", id: v.id, patch: { done: true } })}
                    className="rounded-full text-[10px] uppercase tracking-[0.18em] border hairline px-3 py-1.5 text-ink-300 hover:border-sage-300 hover:text-sage-500 transition-colors shrink-0"
                  >
                    Mark done
                  </button>
                </li>
              </Reveal>
            ))}
          </ol>
        )}
      </section>

      {/* Done list */}
      {done.length > 0 && (
        <section>
          <h2 className="display italic text-[20px] mb-3">
            Already done <span className="not-italic text-ink-300 ml-2 text-[14px]">{done.length}</span>
          </h2>
          <ul className="text-[13px] text-ink-300 flex flex-col gap-1">
            {done.map((v) => (
              <li key={v.id} className="flex items-baseline gap-2 line-through">
                <span className="tabular-nums w-[88px] shrink-0">{formatShortDate(v.date)}</span>
                <span>{KIND_LABEL[v.kind]}</span>
                <span className="text-ink-200">·</span>
                <span className="truncate">{v.vendorName}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function formatShortDate(iso: string): string {
  const m = iso.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00`);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
