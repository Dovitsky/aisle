"use client";

import { useState } from "react";
import type { ProjectState } from "@/lib/types";
import { useProject } from "./StateProvider";
import { PageHeader } from "./ui";

export function LicenseView() {
  const { state, setState, loading } = useProject();
  const [stateName, setStateName] = useState("NY");
  const [county, setCounty] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  if (loading || !state) return <div className="pt-10 text-center text-ink-300">Loading…</div>;

  const post = async (body: object, key: string) => {
    setBusy(key);
    try {
      const r = await fetch("/api/license", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const j = (await r.json()) as { state?: ProjectState };
      if (j.state) setState(j.state);
    } finally { setBusy(null); }
  };

  const lic = state.license;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Clerk"
        title="Marriage license"
        subtitle="Per-state requirements vary widely. Application timing, photo ID, waiting period, expiration window — all of it. Don't skip this; the license is what makes a wedding legal."
      />

      {!lic ? (
        <section className="surface rounded-card border hairline shadow-card p-4 sm:p-5">
          <h2 className="display text-xl">Where will you marry?</h2>
          <div className="mt-3 grid sm:grid-cols-3 gap-2">
            <input value={stateName} onChange={(e) => setStateName(e.target.value)} placeholder="State (NY, CA, etc.)" maxLength={2} className="rounded-lg border hairline bg-white/80 px-3 py-2 text-sm uppercase focus:outline-none" />
            <input value={county} onChange={(e) => setCounty(e.target.value)} placeholder="County" className="rounded-lg border hairline bg-white/80 px-3 py-2 text-sm focus:outline-none" />
            <button onClick={() => post({ op: "seed", state: stateName, county }, "seed")} disabled={!!busy || !stateName || !county} className="rounded-2xl bg-ink text-paper-50 hover:bg-ink-400 px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50">
              Look up requirements
            </button>
          </div>
        </section>
      ) : (
        <>
          <section className="surface rounded-card border hairline shadow-card p-4 sm:p-5 animate-fade-in">
            <div className="flex items-baseline justify-between flex-wrap gap-2">
              <h2 className="display text-xl">{lic.county}, {lic.state}</h2>
              <span className="eyebrow">{lic.filedAt ? "✓ filed" : lic.pickedUpAt ? "picked up" : "not yet picked up"}</span>
            </div>
            <ol className="mt-3 list-decimal pl-5 text-[13px] space-y-1">
              {lic.requirements.map((r, i) => <li key={i}>{r}</li>)}
            </ol>
          </section>

          <section className="surface rounded-card border hairline shadow-card p-4 sm:p-5 grid sm:grid-cols-2 gap-3 text-sm">
            <DateField label="Application appointment" value={lic.appointmentDate} onChange={(v) => post({ op: "update", patch: { appointmentDate: v } }, "appt")} />
            <DateField label="Application date" value={lic.applicationDate} onChange={(v) => post({ op: "update", patch: { applicationDate: v } }, "app")} />
            <DateField label="Picked up" value={lic.pickedUpAt} onChange={(v) => post({ op: "update", patch: { pickedUpAt: v } }, "up")} />
            <DateField label="Filed by officiant" value={lic.filedAt} onChange={(v) => post({ op: "update", patch: { filedAt: v } }, "f")} />
            <div className="sm:col-span-2 text-[12px] text-ink-300">
              Expiration window: {lic.expiresAt}
            </div>
            <button
              onClick={() => post({ op: "propose_file" }, "file")}
              disabled={!!busy || Boolean(lic.filedAt)}
              className="sm:col-span-2 rounded-2xl bg-ink text-paper-50 hover:bg-ink-400 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
            >
              Confirm officiant filing
            </button>
          </section>
        </>
      )}
    </div>
  );
}

function DateField({ label, value, onChange }: { label: string; value?: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-sm">
      <span className="text-ink-400">{label}</span>
      <input type="date" defaultValue={value ?? ""} onBlur={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-lg border hairline bg-white/80 px-3 py-2 text-sm focus:outline-none" />
    </label>
  );
}
