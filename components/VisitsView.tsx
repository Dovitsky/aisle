"use client";

import { useState } from "react";
import type { ProjectState, VisitKind } from "@/lib/types";
import { useProject } from "./StateProvider";
import { EmptyState, PageHeader } from "./ui";

const KIND_LABEL: Record<VisitKind, string> = {
  tasting: "Tasting",
  site_visit: "Site visit",
  trial: "Trial",
  consultation: "Consultation",
  fitting: "Fitting",
};

export function VisitsView() {
  const { state, setState, loading } = useProject();
  const [kind, setKind] = useState<VisitKind>("tasting");
  const [vendorName, setVendorName] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading || !state) return <div className="pt-10 text-center text-ink-300">Loading…</div>;

  const post = async (body: object) => {
    setBusy(true);
    try {
      const r = await fetch("/api/visits", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const j = (await r.json()) as { state?: ProjectState };
      if (j.state) setState(j.state);
    } finally { setBusy(false); }
  };

  const add = () => {
    if (!vendorName || !date) return;
    post({ op: "add", kind, vendorName, date, time, attendees: [state.brief?.organizerName ?? "", state.brief?.partnerName ?? ""].filter(Boolean) });
    setVendorName(""); setDate(""); setTime("");
  };

  const upcoming = state.visits.filter((v) => !v.done).sort((a, b) => a.date.localeCompare(b.date));
  const done = state.visits.filter((v) => v.done);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Calendar"
        title="Tastings & site visits"
        subtitle="Bookings across vendors. Caterer tastings, venue walkthroughs, dress fittings, hair/makeup trials."
      />

      <section className="surface rounded-card border hairline shadow-card p-4 sm:p-5 grid sm:grid-cols-5 gap-2">
        <select value={kind} onChange={(e) => setKind(e.target.value as VisitKind)} className="rounded-lg border hairline bg-white/80 px-3 py-2 text-sm focus:outline-none">
          {(Object.keys(KIND_LABEL) as VisitKind[]).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
        </select>
        <input value={vendorName} onChange={(e) => setVendorName(e.target.value)} placeholder="Vendor / location" className="rounded-lg border hairline bg-white/80 px-3 py-2 text-sm focus:outline-none sm:col-span-2" />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border hairline bg-white/80 px-3 py-2 text-sm focus:outline-none" />
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="rounded-lg border hairline bg-white/80 px-3 py-2 text-sm focus:outline-none" />
        <button onClick={add} disabled={busy || !vendorName || !date} className="rounded-2xl bg-ink text-paper-50 hover:bg-ink-400 px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 sm:col-span-5">
          Book
        </button>
      </section>

      <section>
        <h2 className="eyebrow mb-2">Upcoming ({upcoming.length})</h2>
        {upcoming.length === 0 ? (
          <EmptyState title="Nothing booked" hint="Add a tasting, site visit, fitting, or trial above." />
        ) : (
          <ol className="flex flex-col gap-2 stagger">
            {upcoming.map((v) => (
              <li key={v.id} className="surface rounded-card border hairline shadow-card hover:shadow-cardHover transition-shadow p-3 grid grid-cols-[100px_1fr_auto] gap-3 items-center">
                <div className="display text-sm">
                  <div className="tabular-nums">{v.date}</div>
                  {v.time && <div className="text-ink-300 text-[12px] tabular-nums">{v.time}</div>}
                </div>
                <div>
                  <div className="text-[14px]">{v.vendorName}</div>
                  <div className="text-[11px] text-ink-300">{KIND_LABEL[v.kind]}{v.attendees.length ? ` · ${v.attendees.join(" + ")}` : ""}</div>
                </div>
                <button onClick={() => post({ op: "update", id: v.id, patch: { done: true } })} className="chip chip-off">
                  Mark done
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>

      {done.length > 0 && (
        <section>
          <h2 className="eyebrow mb-2">Completed ({done.length})</h2>
          <ul className="text-[13px] text-ink-300">
            {done.map((v) => <li key={v.id} className="line-through tabular-nums">{v.date} · {v.vendorName}</li>)}
          </ul>
        </section>
      )}
    </div>
  );
}
