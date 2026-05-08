"use client";

import { useState } from "react";
import type { PreEventKind, ProjectState } from "@/lib/types";
import { useProject } from "./StateProvider";
import { EmptyState, PageHeader } from "./ui";

const KIND_LABEL: Record<PreEventKind, string> = {
  engagement_party: "Engagement party",
  bridal_shower: "Shower",
  bachelor_party: "Bachelor party",
  bachelorette_party: "Bachelorette",
  rehearsal_dinner: "Rehearsal dinner",
  welcome_drinks: "Welcome drinks",
  after_party: "After party",
  morning_after_brunch: "Morning-after brunch",
};

export function PreEventsView() {
  const { state, setState, loading } = useProject();
  const [kind, setKind] = useState<PreEventKind>("rehearsal_dinner");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [hostNames, setHostNames] = useState("");
  const [invitedCount, setInvitedCount] = useState(20);
  const [busy, setBusy] = useState(false);

  if (loading || !state) return <div className="pt-10 text-center text-ink-300">Loading…</div>;

  const post = async (body: object) => {
    setBusy(true);
    try {
      const r = await fetch("/api/pre-events", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const j = (await r.json()) as { state?: ProjectState };
      if (j.state) setState(j.state);
    } finally { setBusy(false); }
  };

  const add = () => {
    if (!date || !location) return;
    post({
      op: "add", kind, date, location,
      hostNames: hostNames.split(",").map((s) => s.trim()).filter(Boolean),
      invitedCount,
    });
    setDate(""); setLocation(""); setHostNames("");
  };

  const sorted = state.preEvents.slice().sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Around the wedding"
        title="Pre-wedding events"
        subtitle="Engagement party, shower, bach/ette, rehearsal dinner, welcome drinks, after-party, morning-after brunch. Each gets a date, hosts, and a guest count."
      />

      <section className="surface rounded-card border hairline shadow-card p-4 sm:p-5 grid sm:grid-cols-6 gap-2">
        <select value={kind} onChange={(e) => setKind(e.target.value as PreEventKind)} className="rounded-lg border hairline bg-white/80 px-3 py-2 text-sm focus:outline-none sm:col-span-2">
          {(Object.keys(KIND_LABEL) as PreEventKind[]).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
        </select>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border hairline bg-white/80 px-3 py-2 text-sm focus:outline-none" />
        <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" className="rounded-lg border hairline bg-white/80 px-3 py-2 text-sm focus:outline-none" />
        <input value={hostNames} onChange={(e) => setHostNames(e.target.value)} placeholder="Hosts (comma)" className="rounded-lg border hairline bg-white/80 px-3 py-2 text-sm focus:outline-none" />
        <input type="number" value={invitedCount} onChange={(e) => setInvitedCount(Number(e.target.value))} className="rounded-lg border hairline bg-white/80 px-3 py-2 text-sm focus:outline-none" />
        <button onClick={add} disabled={busy || !date || !location} className="sm:col-span-6 rounded-2xl bg-ink text-paper-50 hover:bg-ink-400 py-2 text-sm font-medium transition-colors disabled:opacity-50">Add event</button>
      </section>

      {sorted.length === 0 ? (
        <EmptyState title="No events yet" hint="The rehearsal dinner is usually the first to schedule. Welcome drinks and morning-after brunch matter for out-of-town guests." />
      ) : (
        <ol className="flex flex-col gap-2 stagger">
          {sorted.map((e) => (
            <li key={e.id} className="surface rounded-card border hairline shadow-card hover:shadow-cardHover transition-shadow p-3 grid grid-cols-[120px_1fr_auto] gap-3 items-center">
              <div className="display text-sm tabular-nums">{e.date}</div>
              <div>
                <div className="text-[14px]">{KIND_LABEL[e.kind]}</div>
                <div className="text-[11px] text-ink-300">{e.location} · hosted by {e.hostNames.join(", ") || "—"} · {e.invitedCount} invited</div>
              </div>
              <button onClick={() => post({ op: "delete", id: e.id })} className="text-[10px] text-risk-high hover:opacity-80">remove</button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
