"use client";

// First-run brief intake. PRD §5.1.

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useProject } from "./StateProvider";
import type { CulturalTradition, ProjectState } from "@/lib/types";
import { PageHeader } from "./ui";

const INPUT = "mt-1 w-full rounded-lg border hairline bg-white/80 px-3 py-2 text-[15px] focus:outline-none transition-colors";

export function BriefForm() {
  const router = useRouter();
  const { state, setState, loading } = useProject();
  const [organizerName, setOrganizerName] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [dateWindow, setDateWindow] = useState("");
  const [region, setRegion] = useState("");
  const [guestCount, setGuestCount] = useState(120);
  const [budgetUsd, setBudgetUsd] = useState(75000);
  const [vibe, setVibe] = useState("");
  const [plannerStatus, setPlannerStatus] = useState<"none" | "want_one" | "have_one">("want_one");
  const [cultural, setCultural] = useState<CulturalTradition>("secular");
  const [formality, setFormality] = useState<"formal" | "modern" | "warm" | "casual">("modern");
  const [destination, setDestination] = useState(false);
  const [weddingDate, setWeddingDate] = useState("");
  const [busy, setBusy] = useState<"save" | "lock" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!state?.brief) return;
    setOrganizerName(state.brief.organizerName);
    setPartnerName(state.brief.partnerName);
    setDateWindow(state.brief.dateWindow);
    setRegion(state.brief.region);
    setGuestCount(state.brief.guestCount);
    setBudgetUsd(state.brief.budgetUsd);
    setVibe(state.brief.vibe);
    setPlannerStatus(state.brief.plannerStatus);
    setCultural(state.brief.cultural ?? "secular");
    setFormality(state.brief.formalityTone ?? "modern");
    setDestination(state.brief.destination ?? false);
    setWeddingDate(state.brief.weddingDate ?? "");
  }, [state?.brief]);

  if (loading || !state) return <div className="pt-10 text-center text-ink-300">Loading…</div>;

  const submit = async (lock: boolean) => {
    setBusy(lock ? "lock" : "save");
    setError(null);
    try {
      const r = await fetch("/api/brief", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          organizerName, partnerName, dateWindow, region, guestCount, budgetUsd, vibe, plannerStatus,
          cultural, formalityTone: formality, destination,
          weddingDate: weddingDate || undefined,
          lock,
        }),
      });
      const j = (await r.json()) as { state?: ProjectState; error?: string };
      if (!r.ok) {
        setError(j.error ?? `Error ${r.status}`);
        return;
      }
      if (j.state) setState(j.state);
      if (lock) router.push("/approvals");
    } finally { setBusy(null); }
  };

  const locked = state.brief?.locked;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Tell us about it"
        title="The wedding"
        subtitle="A few honest answers. We'll handle the rest."
      />

      {locked && (
        <div className="rounded-card border border-risk-low/20 bg-risk-low/5 px-4 py-3 text-sm flex items-center gap-2 animate-fade-in-soft">
          <span className="text-risk-low">✓</span>
          <span>Brief locked at {new Date(state.brief!.lockedAt!).toLocaleString()}.</span>
        </div>
      )}

      <div className="surface rounded-card border hairline shadow-card p-4 sm:p-5 flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Organizer">
            <input className={INPUT} value={organizerName} onChange={(e) => setOrganizerName(e.target.value)} placeholder="First name" />
          </Field>
          <Field label="Partner">
            <input className={INPUT} value={partnerName} onChange={(e) => setPartnerName(e.target.value)} placeholder="First name" />
          </Field>
        </div>

        <Field label="Date window">
          <input className={INPUT} value={dateWindow} onChange={(e) => setDateWindow(e.target.value)} placeholder="e.g., Late September 2026" />
        </Field>

        <Field label="Specific date (optional)">
          <input type="date" className={INPUT} value={weddingDate} onChange={(e) => setWeddingDate(e.target.value)} />
        </Field>

        <Field label="Region">
          <input className={INPUT} value={region} onChange={(e) => setRegion(e.target.value)} placeholder="e.g., Hudson Valley, NY" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Guest count">
            <input type="number" className={INPUT} value={guestCount} min={2} max={2000} onChange={(e) => setGuestCount(Number(e.target.value))} />
          </Field>
          <Field label="Budget envelope (USD)">
            <input type="number" className={INPUT} value={budgetUsd} min={1000} step={1000} onChange={(e) => setBudgetUsd(Number(e.target.value))} />
          </Field>
        </div>

        <Field label="Vibe & references">
          <textarea rows={4} className={INPUT} value={vibe} onChange={(e) => setVibe(e.target.value)} placeholder="A few sentences. Editorial film photography, candlelit reception, stone barn, lots of wildflowers, no DJ banter…" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Cultural / religious tradition">
            <select className={INPUT} value={cultural} onChange={(e) => setCultural(e.target.value as CulturalTradition)}>
              <option value="secular">Secular</option>
              <option value="catholic">Catholic</option>
              <option value="jewish">Jewish</option>
              <option value="hindu">Hindu</option>
              <option value="muslim">Muslim</option>
              <option value="interfaith">Interfaith</option>
              <option value="civil">Civil</option>
              <option value="other">Other / custom</option>
            </select>
          </Field>
          <Field label="Formality tone">
            <select className={INPUT} value={formality} onChange={(e) => setFormality(e.target.value as "formal" | "modern" | "warm" | "casual")}>
              <option value="formal">Formal</option>
              <option value="modern">Modern</option>
              <option value="warm">Warm</option>
              <option value="casual">Casual</option>
            </select>
          </Field>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={destination} onChange={(e) => setDestination(e.target.checked)} />
          <span>Destination wedding <span className="text-ink-300">(changes save-the-date and invitation timing)</span></span>
        </label>

        <Field label="Planner">
          <select className={INPUT} value={plannerStatus} onChange={(e) => setPlannerStatus(e.target.value as "none" | "want_one" | "have_one")}>
            <option value="none">No planner. AISLE concierge handles it</option>
            <option value="want_one">Want one. match me with a planner</option>
            <option value="have_one">Already have one. invite them</option>
          </select>
        </Field>

        {error && <p className="text-sm text-risk-high animate-fade-in-soft">{error}</p>}
      </div>

      <div className="flex gap-2 sticky-cta">
        <button
          onClick={() => submit(false)}
          disabled={!!busy}
          className="flex-1 rounded-2xl border hairline bg-white/90 backdrop-blur py-3 text-sm font-medium hover:bg-white transition-colors disabled:opacity-50"
        >
          {busy === "save" ? "Saving…" : "Save draft"}
        </button>
        <button
          onClick={() => submit(true)}
          disabled={!!busy}
          className="cta-sage flex-1 rounded-2xl py-3 text-sm font-semibold transition-all disabled:opacity-50"
        >
          {busy === "lock" ? "Locking…" : locked ? "Re-lock" : "Lock brief"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="text-ink-400">{label}</span>
      {children}
    </label>
  );
}
