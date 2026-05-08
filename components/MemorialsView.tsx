"use client";

import { useState } from "react";
import type { Memorial, ProjectState } from "@/lib/types";
import { useProject } from "./StateProvider";
import { EmptyState, PageHeader } from "./ui";

const TREATMENT_LABEL: Record<Memorial["treatment"], string> = {
  memorial_table: "Memorial table",
  ceremony_mention: "Ceremony mention",
  candle: "Lit candle",
  reserved_seat: "Reserved seat",
  boutonniere_charm: "Boutonnière charm",
};

export function MemorialsView() {
  const { state, setState, loading } = useProject();
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState("");
  const [side, setSide] = useState<Memorial["side"]>("organizer");
  const [treatment, setTreatment] = useState<Memorial["treatment"]>("ceremony_mention");
  const [busy, setBusy] = useState(false);

  if (loading || !state) return <div className="pt-10 text-center text-ink-300">Loading…</div>;

  const post = async (body: object) => {
    setBusy(true);
    try {
      const r = await fetch("/api/memorials", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const j = (await r.json()) as { state?: ProjectState };
      if (j.state) setState(j.state);
    } finally { setBusy(false); }
  };

  const add = () => {
    if (!name || !relationship) return;
    post({ op: "add", name, relationship, side, treatment });
    setName(""); setRelationship("");
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Tributes"
        title="In memory"
        subtitle="Quietly carry the people who can't be there. Memorial table, ceremony mention, lit candle, reserved seat, or a small charm."
      />

      <section className="surface rounded-card border hairline shadow-card p-4 sm:p-5 grid sm:grid-cols-5 gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="rounded-lg border hairline bg-white/80 px-3 py-2 text-sm focus:outline-none" />
        <input value={relationship} onChange={(e) => setRelationship(e.target.value)} placeholder="Relationship" className="rounded-lg border hairline bg-white/80 px-3 py-2 text-sm focus:outline-none" />
        <select value={side} onChange={(e) => setSide(e.target.value as Memorial["side"])} className="rounded-lg border hairline bg-white/80 px-3 py-2 text-sm focus:outline-none">
          <option value="organizer">Organizer</option>
          <option value="partner">Partner</option>
          <option value="both">Both</option>
        </select>
        <select value={treatment} onChange={(e) => setTreatment(e.target.value as Memorial["treatment"])} className="rounded-lg border hairline bg-white/80 px-3 py-2 text-sm focus:outline-none">
          {(Object.keys(TREATMENT_LABEL) as Memorial["treatment"][]).map((t) => <option key={t} value={t}>{TREATMENT_LABEL[t]}</option>)}
        </select>
        <button onClick={add} disabled={busy || !name} className="rounded-2xl bg-ink text-paper-50 hover:bg-ink-400 px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50">Add</button>
      </section>

      {state.memorials.length === 0 ? (
        <EmptyState title="No tributes yet" hint="Add someone you'd like to remember during the day." />
      ) : (
        <ul className="grid sm:grid-cols-2 gap-3 stagger">
          {state.memorials.map((m) => (
            <li key={m.id} className="surface rounded-card border hairline shadow-card p-4 hover:shadow-cardHover transition-shadow">
              <div className="flex items-baseline justify-between">
                <h3 className="display text-base">{m.name}</h3>
                <span className="eyebrow">{TREATMENT_LABEL[m.treatment]}</span>
              </div>
              <div className="text-[12px] text-ink-300">{m.relationship} · {m.side} side</div>
              <textarea
                defaultValue={m.notes ?? ""}
                onBlur={(e) => post({ op: "update", id: m.id, patch: { notes: e.target.value } })}
                rows={2}
                placeholder="Notes (favorite phrase, song, etc.)"
                className="mt-2 w-full rounded border hairline bg-white/80 px-2 py-1 text-[12px] focus:outline-none"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
