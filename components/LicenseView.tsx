"use client";

// License. The boring-but-mandatory paperwork. Per-state rules vary
// wildly (photo ID, waiting periods, application windows, expirations).
// Clerk pulls the requirements; couple fills in dates as they happen.
//
// Layout: editorial hero with contextual title (where-to-marry / X of 4
// done / filed), then a 4-step sage-rail timeline (Appointment → Applied
// → Picked up → Filed) with inline date editors. Filed state shows a
// quiet celebration card with the issuing/filing dates.

import { useMemo, useState } from "react";
import type { ProjectState } from "@/lib/types";
import { useProject } from "./StateProvider";
import { useToast } from "./Toast";
import { Reveal, CountUp } from "./Atmosphere";

type StageKey = "appointment" | "application" | "pickup" | "file";

const STAGE_LABEL: Record<StageKey, string> = {
  appointment: "Appointment",
  application: "Applied",
  pickup: "Picked up",
  file: "Filed",
};

const STAGE_BLURB: Record<StageKey, string> = {
  appointment: "Book the visit with the county clerk.",
  application: "The day you signed the application at the clerk's office.",
  pickup: "The day the license was issued and handed to you.",
  file: "The day your officiant returned the signed license to the county.",
};

export function LicenseView() {
  const { state, setState, loading } = useProject();
  const { notify } = useToast();
  const [stateName, setStateName] = useState("NY");
  const [county, setCounty] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const lic = state?.license;

  const doneCount = useMemo(() => {
    if (!lic) return 0;
    let n = 0;
    if (lic.appointmentDate) n++;
    if (lic.applicationDate) n++;
    if (lic.pickedUpAt) n++;
    if (lic.filedAt) n++;
    return n;
  }, [lic]);

  const progressPct = Math.round((doneCount / 4) * 100);

  if (loading || !state) {
    return <div className="pt-10 text-center text-ink-300">Loading…</div>;
  }

  const post = async (body: object, key: string) => {
    setBusy(key);
    try {
      const r = await fetch("/api/license", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await r.json()) as { state?: ProjectState };
      if (j.state) {
        setState(j.state);
        if (key === "seed") {
          notify({
            kind: "agent",
            agent: "Clerk",
            title: "Requirements pulled",
            detail: `For ${county}, ${stateName.toUpperCase()}.`,
          });
        }
        if (key === "file") {
          notify({
            kind: "agent",
            agent: "Clerk",
            title: "Filed.",
            detail: "Legally married, on paper.",
          });
        }
      }
    } finally {
      setBusy(null);
    }
  };

  // --------------- Pre-seed: where will you marry? ---------------
  if (!lic) {
    return (
      <div className="flex flex-col gap-12 pb-12">
        <header>
          <p className="text-[10px] uppercase tracking-[0.26em] text-sage-500 font-mono mb-2">
            Marriage license · The legal bit
          </p>
          <h1 className="display text-[36px] sm:text-[44px] lg:text-[52px] leading-[1.02] tracking-[-0.01em]">
            The paperwork that <span className="italic text-sage-500">makes it real</span>.
          </h1>
          <p className="text-[14px] text-ink-300 mt-4 leading-relaxed max-w-[60ch]">
            State rules vary wildly — application windows, ID requirements, waiting periods,
            expiration dates. Don't skip this; the license is what makes a wedding legal.
          </p>
        </header>

        <Reveal>
          <section className="rounded-card border hairline bg-white/85 px-5 py-5">
            <p className="text-[10px] uppercase tracking-[0.22em] text-sage-500 font-mono mb-4">
              Where will you marry?
            </p>
            <div className="grid sm:grid-cols-[100px_1fr_auto] gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-[0.18em] text-ink-300 font-mono">State</span>
                <input
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                  placeholder="NY"
                  maxLength={2}
                  className="rounded-lg border hairline bg-paper-50 px-3 py-2 text-[14px] uppercase focus:outline-none focus:border-sage-300"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-[0.18em] text-ink-300 font-mono">County</span>
                <input
                  value={county}
                  onChange={(e) => setCounty(e.target.value)}
                  placeholder="e.g. Kings"
                  className="rounded-lg border hairline bg-paper-50 px-3 py-2 text-[14px] focus:outline-none focus:border-sage-300"
                />
              </label>
              <div className="flex items-end">
                <button
                  onClick={() => post({ op: "seed", state: stateName, county }, "seed")}
                  disabled={!!busy || !stateName || !county}
                  className="btn-primary w-full"
                  style={{ paddingInline: "1.2rem", paddingBlock: "0.55rem" }}
                >
                  {busy === "seed" ? "Working…" : "Pull the requirements"}
                </button>
              </div>
            </div>
            <p className="text-[12px] text-ink-300 italic mt-3 leading-relaxed">
              Clerk will bring back exactly what your county needs and put the dates on a clean checklist.
            </p>
          </section>
        </Reveal>
      </div>
    );
  }

  // --------------- Licensed state ---------------
  const filed = Boolean(lic.filedAt);
  const stages: { key: StageKey; date?: string; onChange: (v: string) => void }[] = [
    {
      key: "appointment",
      date: lic.appointmentDate,
      onChange: (v) => post({ op: "update", patch: { appointmentDate: v } }, "appt"),
    },
    {
      key: "application",
      date: lic.applicationDate,
      onChange: (v) => post({ op: "update", patch: { applicationDate: v } }, "app"),
    },
    {
      key: "pickup",
      date: lic.pickedUpAt,
      onChange: (v) => post({ op: "update", patch: { pickedUpAt: v } }, "up"),
    },
    {
      key: "file",
      date: lic.filedAt,
      onChange: (v) => post({ op: "update", patch: { filedAt: v } }, "filed-date"),
    },
  ];

  return (
    <div className="flex flex-col gap-12 pb-12">
      {/* Hero */}
      <header>
        <p className="text-[10px] uppercase tracking-[0.26em] text-sage-500 font-mono mb-2">
          Marriage license · {lic.county}, {lic.state.toUpperCase()}
        </p>
        <div className="flex items-baseline justify-between gap-6 flex-wrap">
          <h1 className="display text-[36px] sm:text-[44px] lg:text-[52px] leading-[1.02] tracking-[-0.01em]">
            {filed ? (
              <>It's <span className="italic text-sage-500">filed</span>.</>
            ) : doneCount === 0 ? (
              <>Four small <span className="italic text-sage-500">official steps</span>.</>
            ) : (
              <>
                <CountUp value={doneCount} /> of 4 steps{" "}
                <span className="italic text-sage-500">done</span>.
              </>
            )}
          </h1>
          {!filed && (
            <div className="text-right">
              <div className="display text-[28px] tabular-nums leading-none text-sage-500">
                {progressPct}<span className="text-[18px] text-ink-300">%</span>
              </div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-ink-300 font-mono mt-1">
                through the paperwork
              </div>
            </div>
          )}
        </div>
        <p className="text-[14px] text-ink-300 mt-4 leading-relaxed max-w-[60ch]">
          {filed
            ? "The signed license is back with the county. Officially, on paper, you are married."
            : lic.expiresAt
              ? <>The pickup-to-wedding window is short — current expiration tracked at <span className="text-ink not-italic">{lic.expiresAt}</span>. Keep an eye on it; if it lapses you'll need to re-apply.</>
              : "Mark each milestone as it happens. Clerk will warn you if the window's about to close."}
        </p>
      </header>

      {/* Progress rail */}
      {!filed && (
        <div className="h-[3px] rounded-full bg-ink/8 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-sage-500 via-sage-400 to-sage-300 transition-[width] duration-1000"
            style={{ width: `${progressPct}%` }}
            aria-hidden
          />
        </div>
      )}

      {/* Requirements */}
      <Reveal>
        <section className="surface rounded-card card-shell overflow-hidden">
          <div className="px-5 pt-4 pb-3 border-b hairline">
            <p className="text-[10px] uppercase tracking-[0.22em] text-sage-500 font-mono">
              What the clerk needs
            </p>
            <p className="text-[11.5px] text-ink-300 italic mt-0.5">
              Bring this to the application appointment. Missing one item means a wasted trip.
            </p>
          </div>
          <ol className="px-5 py-4 list-decimal pl-9 text-[13.5px] space-y-1.5 text-ink-400 leading-relaxed">
            {lic.requirements.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ol>
        </section>
      </Reveal>

      {/* Stage timeline */}
      <Reveal>
        <section>
          <h2 className="display italic text-[22px] text-ink leading-tight mb-5">
            Mark dates as they happen
          </h2>
          <ol className="relative pl-6">
            {/* Sage rail */}
            <span
              aria-hidden
              className="absolute left-[7px] top-2 bottom-2 w-px bg-gradient-to-b from-sage-300 via-sage-200 to-transparent"
            />
            {stages.map((s, i) => {
              const isDone = Boolean(s.date);
              const isNext = !isDone && stages.slice(0, i).every((p) => Boolean(p.date));
              return (
                <li key={s.key} className="relative pb-5 last:pb-0">
                  {/* Node */}
                  <span
                    aria-hidden
                    className={`absolute -left-[22px] top-1.5 w-[15px] h-[15px] rounded-full border-2 ${
                      isDone
                        ? "bg-sage-500 border-sage-500"
                        : isNext
                          ? "bg-paper-50 border-sage-500"
                          : "bg-paper-50 border-ink/15"
                    }`}
                  />
                  <div className="flex items-baseline justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                      <p className={`text-[10px] uppercase tracking-[0.22em] font-mono ${
                        isDone ? "text-sage-500" : isNext ? "text-sage-500" : "text-ink-300"
                      }`}>
                        Step {i + 1} · {isDone ? "Done" : isNext ? "Up next" : "Later"}
                      </p>
                      <h3 className={`display italic text-[22px] leading-tight mt-0.5 ${
                        isDone ? "text-ink-300" : "text-ink"
                      }`}>
                        {STAGE_LABEL[s.key]}
                      </h3>
                      <p className="text-[12.5px] text-ink-300 mt-0.5 leading-relaxed max-w-[44ch]">
                        {STAGE_BLURB[s.key]}
                      </p>
                    </div>
                    <input
                      type="date"
                      defaultValue={s.date ?? ""}
                      onBlur={(e) => {
                        if (e.target.value !== (s.date ?? "")) s.onChange(e.target.value);
                      }}
                      disabled={s.key === "file"}
                      className="text-[12.5px] rounded-lg border hairline bg-paper-50 px-2.5 py-1.5 focus:outline-none focus:border-sage-300 disabled:opacity-70 shrink-0"
                    />
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      </Reveal>

      {/* File-it CTA */}
      {!filed && (
        <Reveal>
          <section className="rounded-card border hairline bg-white/85 px-5 py-5">
            <p className="text-[10px] uppercase tracking-[0.22em] text-sage-500 font-mono mb-2">
              The last step
            </p>
            <p className="text-[14px] text-ink leading-relaxed">
              Your officiant signs the license at the ceremony and returns it to the county clerk.
              Confirm that's happened to mark this thread closed.
            </p>
            <button
              onClick={() => post({ op: "propose_file" }, "file")}
              disabled={!!busy}
              className="btn-primary mt-4"
              style={{ paddingInline: "1.4rem", paddingBlock: "0.55rem" }}
            >
              {busy === "file" ? "Filing…" : "Confirm officiant filed it"}
            </button>
          </section>
        </Reveal>
      )}

      {/* Filed celebration */}
      {filed && (
        <Reveal>
          <section className="rounded-card bg-gradient-to-br from-sage-200/40 to-paper-50 border hairline px-7 py-9 max-w-2xl">
            <p className="text-[10px] uppercase tracking-[0.26em] text-sage-500 font-mono">
              On paper
            </p>
            <p className="display text-[34px] italic text-ink leading-tight mt-2">
              The county has it.
            </p>
            <p className="text-[14px] text-ink-300 mt-3 leading-relaxed">
              Filed <span className="text-ink not-italic">{lic.filedAt}</span> in {lic.county}, {lic.state.toUpperCase()}.
              Keep this date — you'll want it on hand for name-change paperwork, insurance updates,
              and the occasional anniversary.
            </p>
          </section>
        </Reveal>
      )}
    </div>
  );
}
