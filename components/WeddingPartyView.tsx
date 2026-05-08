"use client";

import { useState } from "react";
import type { ProjectState, WeddingPartyMember } from "@/lib/types";
import { useProject } from "./StateProvider";
import { EmptyState, PageHeader } from "./ui";

const ROLE_LABEL: Record<WeddingPartyMember["role"], string> = {
  maid_of_honor: "Maid of honor",
  best_man: "Best man",
  bridesmaid: "Bridesmaid",
  groomsman: "Groomsman",
  officiant: "Officiant",
  ring_bearer: "Ring bearer",
  flower_kid: "Flower kid",
  usher: "Usher",
  officiant_witness: "Witness",
  other: "Other",
};

export function WeddingPartyView() {
  const { state, setState, loading } = useProject();
  const [name, setName] = useState("");
  const [role, setRole] = useState<WeddingPartyMember["role"]>("bridesmaid");
  const [side, setSide] = useState<"organizer" | "partner">("organizer");
  const [busy, setBusy] = useState(false);

  if (loading || !state) return <div className="pt-10 text-center text-ink-300">Loading…</div>;

  const post = async (body: object) => {
    setBusy(true);
    try {
      const r = await fetch("/api/wedding-party", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const j = (await r.json()) as { state?: ProjectState };
      if (j.state) setState(j.state);
    } finally { setBusy(false); }
  };

  const add = () => {
    if (!name) return;
    post({ op: "add", name, role, side });
    setName("");
  };

  const update = (id: string, patch: Partial<WeddingPartyMember>) => post({ op: "update", id, patch });

  const grouped: Record<string, WeddingPartyMember[]> = {
    organizer: state.weddingParty.filter((m) => m.side === "organizer"),
    partner: state.weddingParty.filter((m) => m.side === "partner"),
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Personnel"
        title="Wedding party"
        subtitle="Bridesmaids, groomsmen, officiant, ring bearer, ushers. Track attire, sizes, gifts."
      />

      <section className="surface rounded-card border hairline shadow-card p-4 sm:p-5 grid sm:grid-cols-4 gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="rounded-lg border hairline bg-white/80 px-3 py-2 text-sm focus:outline-none" />
        <select value={role} onChange={(e) => setRole(e.target.value as WeddingPartyMember["role"])} className="rounded-lg border hairline bg-white/80 px-3 py-2 text-sm focus:outline-none">
          {(Object.keys(ROLE_LABEL) as WeddingPartyMember["role"][]).map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
        </select>
        <select value={side} onChange={(e) => setSide(e.target.value as "organizer" | "partner")} className="rounded-lg border hairline bg-white/80 px-3 py-2 text-sm focus:outline-none">
          <option value="organizer">Organizer side</option>
          <option value="partner">Partner side</option>
        </select>
        <button onClick={add} disabled={busy || !name} className="rounded-2xl bg-ink text-paper-50 hover:bg-ink-400 py-2 text-sm font-medium transition-colors disabled:opacity-50">Add</button>
      </section>

      {state.weddingParty.length === 0 ? (
        <EmptyState title="No party yet" hint="Add your maid of honor, best man, bridesmaids, groomsmen, officiant, ring bearers, ushers." />
      ) : (
        <div className="grid lg:grid-cols-2 gap-3 stagger">
          {(["organizer", "partner"] as const).map((s) => (
            <section key={s} className="surface rounded-card border hairline shadow-card p-4">
              <h2 className="display text-lg capitalize">{s} side <span className="text-ink-300 font-sans text-[12px]">({grouped[s].length})</span></h2>
              <ul className="mt-2 divide-y hairline">
                {grouped[s].map((m) => (
                  <li key={m.id} className="py-3 grid gap-1.5">
                    <div className="flex items-baseline justify-between">
                      <div className="text-[14px]">{m.name}</div>
                      <span className="eyebrow">{ROLE_LABEL[m.role]}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <input defaultValue={m.attireSize ?? ""} onBlur={(e) => update(m.id, { attireSize: e.target.value })} placeholder="Size" className="rounded border hairline bg-white/80 px-2 py-1 text-[12px] focus:outline-none" />
                      <input defaultValue={m.attireColor ?? ""} onBlur={(e) => update(m.id, { attireColor: e.target.value })} placeholder="Color" className="rounded border hairline bg-white/80 px-2 py-1 text-[12px] focus:outline-none" />
                      <input defaultValue={m.giftIdea ?? ""} onBlur={(e) => update(m.id, { giftIdea: e.target.value })} placeholder="Gift idea" className="rounded border hairline bg-white/80 px-2 py-1 text-[12px] focus:outline-none" />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] text-ink-300 inline-flex items-center gap-1">
                        <input type="checkbox" defaultChecked={m.attireOrdered} onChange={(e) => update(m.id, { attireOrdered: e.target.checked })} />
                        Attire ordered
                      </label>
                      <button onClick={() => post({ op: "delete", id: m.id })} className="ml-auto text-[10px] text-risk-high hover:opacity-80">remove</button>
                    </div>
                  </li>
                ))}
                {grouped[s].length === 0 && <li className="py-2 text-[12px] text-ink-300 italic">none yet</li>}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
