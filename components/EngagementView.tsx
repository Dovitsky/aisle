"use client";

// Engagement studio. Before there's a wedding to plan, there's a ring,
// a question, an announcement, a photoshoot. Concierge proposes milestones
// from a sentence or two of context.
//
// Layout: hero with progress, propose card, then milestones grouped by KIND
// (Ring / Proposal / Photos / Announcement / Party) so the five tracks read
// as a single arc rather than a flat list.

import { useMemo, useState } from "react";
import type { ProjectState, EngagementMilestone } from "@/lib/types";
import { useProject } from "./StateProvider";
import { Reveal, CountUp } from "./Atmosphere";

const KIND_LABEL: Record<EngagementMilestone["kind"], string> = {
  ring: "Ring",
  proposal_plan: "Proposal",
  engagement_photos: "Engagement photos",
  announcement: "Announcement",
  engagement_party: "Engagement party",
};

const KIND_BLURB: Record<EngagementMilestone["kind"], string> = {
  ring: "Setting, metal, source",
  proposal_plan: "Where, when, who's there",
  engagement_photos: "Photographer, location, look",
  announcement: "Phone-call list, the public post",
  engagement_party: "Casual at-home or restaurant buyout",
};

const KIND_ORDER: EngagementMilestone["kind"][] = [
  "ring", "proposal_plan", "engagement_photos", "announcement", "engagement_party",
];

const STATUS_LABEL: Record<EngagementMilestone["status"], string> = {
  idea: "Idea",
  planned: "Planned",
  done: "Done",
};

export function EngagementView() {
  const { state, setState, loading } = useProject();
  const [context, setContext] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const milestones = useMemo(() => state?.engagement ?? [], [state]);

  if (loading || !state) {
    return <div className="pt-10 text-center text-ink-300">Loading…</div>;
  }

  const propose = async () => {
    if (!context.trim()) return;
    setBusy(true); setError(null);
    try {
      const r = await fetch("/api/engagement", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "propose", context }),
      });
      const j = (await r.json()) as { state?: ProjectState; error?: string };
      if (!r.ok) { setError(j.error ?? `Error ${r.status}`); return; }
      if (j.state) setState(j.state);
      setContext("");
    } finally { setBusy(false); }
  };

  const update = async (
    id: string,
    patch: { status?: EngagementMilestone["status"]; scheduledFor?: string },
  ) => {
    const r = await fetch("/api/engagement", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ op: "update", id, patch }),
    });
    const j = (await r.json()) as { state?: ProjectState };
    if (j.state) setState(j.state);
  };

  // Group milestones by kind in canonical order.
  const byKind = useMemo(() => {
    const m: Record<EngagementMilestone["kind"], EngagementMilestone[]> = {
      ring: [], proposal_plan: [], engagement_photos: [], announcement: [], engagement_party: [],
    };
    for (const x of milestones) m[x.kind]?.push(x);
    return m;
  }, [milestones]);

  const total = milestones.length;
  const doneCount = milestones.filter((m) => m.status === "done").length;
  const plannedCount = milestones.filter((m) => m.status === "planned").length;

  return (
    <div className="flex flex-col gap-12 pb-12">
      {/* Hero */}
      <header>
        <p className="text-[10px] uppercase tracking-[0.26em] text-sage-500 font-mono mb-2">
          Concierge · Before the brief
        </p>
        <div className="flex items-baseline justify-between gap-6 flex-wrap">
          <h1 className="display text-[36px] sm:text-[44px] lg:text-[52px] leading-[1.02] tracking-[-0.01em]">
            {total === 0 ? (
              <>Five ways <span className="italic text-sage-500">into the engagement</span>.</>
            ) : (
              <>
                <CountUp value={doneCount} /> of {total}{" "}
                <span className="italic text-sage-500">in the bag</span>.
              </>
            )}
          </h1>
          {total > 0 && plannedCount > 0 && (
            <div className="text-right">
              <div className="display text-[28px] tabular-nums leading-none text-sage-500">
                {plannedCount}
              </div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-ink-300 font-mono mt-1">
                in motion
              </div>
            </div>
          )}
        </div>
        <p className="text-[14px] text-ink-300 mt-4 leading-relaxed max-w-[60ch]">
          Before there's a wedding to plan, there's a ring, a question, an announcement, photos, a party.
          Tell Concierge a sentence or two and we'll line them up.
        </p>
      </header>

      {/* PROPOSE */}
      <Reveal>
        <section className="rounded-card border hairline bg-white/85 px-5 py-5">
          <p className="text-[10px] uppercase tracking-[0.22em] text-sage-500 font-mono mb-3">
            {total === 0 ? "Tell us where you're at" : "Re-do, with new context"}
          </p>
          <textarea
            value={context}
            onChange={(e) => setContext(e.target.value)}
            rows={3}
            placeholder="A few sentences. How long you've been together, what you're thinking for the proposal, ring preferences, anything you'd like to nail down before going public…"
            className="w-full rounded-lg border hairline bg-paper-50 px-3 py-2.5 text-[14px] leading-relaxed focus:outline-none focus:border-sage-300 resize-none"
          />
          {error && <p className="text-sm text-risk-high mt-3">{error}</p>}
          <div className="mt-4 flex items-center gap-4">
            <button
              onClick={propose}
              disabled={busy || !context.trim()}
              className="btn-primary"
              style={{ paddingInline: "1.4rem", paddingBlock: "0.55rem" }}
            >
              {busy ? "Concierge working…" : "Pull together a plan"}
            </button>
            {!busy && !context.trim() && (
              <span className="text-[11px] uppercase tracking-[0.18em] text-ink-300">
                A few sentences is plenty
              </span>
            )}
          </div>
        </section>
      </Reveal>

      {/* MILESTONES — grouped by kind */}
      {total === 0 ? (
        <Reveal>
          <div className="rounded-card border hairline bg-white/55 px-7 py-12 max-w-xl">
            <p className="display text-[26px] text-ink leading-tight">Nothing here yet.</p>
            <p className="text-[14px] text-ink-300 mt-3 leading-relaxed">
              Concierge proposes milestones across five tracks at once — ring, proposal, photos, announcement, party.
              You decide which to keep, which to plan, which to skip.
            </p>
          </div>
        </Reveal>
      ) : (
        <Reveal>
          <section>
            <h2 className="display italic text-[22px] text-ink leading-tight mb-5">
              The five tracks
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {KIND_ORDER.map((k) => (
                <KindColumn
                  key={k}
                  kind={k}
                  items={byKind[k] ?? []}
                  onUpdate={update}
                />
              ))}
            </div>
          </section>
        </Reveal>
      )}
    </div>
  );
}

// --------------------------------------------------------------------

function KindColumn({
  kind, items, onUpdate,
}: {
  kind: EngagementMilestone["kind"];
  items: EngagementMilestone[];
  onUpdate: (id: string, patch: { status?: EngagementMilestone["status"]; scheduledFor?: string }) => void;
}) {
  const empty = items.length === 0;
  const allDone = !empty && items.every((m) => m.status === "done");

  return (
    <article
      className={`surface rounded-card card-shell hover:shadow-cardHover transition-all overflow-hidden ${
        empty ? "opacity-65" : ""
      }`}
    >
      <div className="px-5 pt-4 pb-3 border-b hairline flex items-baseline justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-sage-500 font-mono">
            {KIND_LABEL[kind]}
          </p>
          <p className="text-[11.5px] text-ink-300 italic mt-0.5">{KIND_BLURB[kind]}</p>
        </div>
        {allDone && (
          <span className="text-[10px] uppercase tracking-[0.2em] text-sage-500 font-mono">
            done
          </span>
        )}
        {empty && (
          <span className="text-[10px] uppercase tracking-[0.2em] text-ink-300 font-mono">
            no idea yet
          </span>
        )}
      </div>

      {empty ? (
        <div className="px-5 py-5 text-[12.5px] text-ink-300 italic leading-snug">
          Re-run Concierge above and a {KIND_LABEL[kind].toLowerCase()} idea will land here.
        </div>
      ) : (
        <ul className="flex flex-col">
          {items.map((m, i) => (
            <MilestoneRow
              key={m.id}
              m={m}
              divider={i < items.length - 1}
              onUpdate={(patch) => onUpdate(m.id, patch)}
            />
          ))}
        </ul>
      )}
    </article>
  );
}

function MilestoneRow({
  m, divider, onUpdate,
}: {
  m: EngagementMilestone;
  divider: boolean;
  onUpdate: (patch: { status?: EngagementMilestone["status"]; scheduledFor?: string }) => void;
}) {
  const dimmed = m.status === "done";
  return (
    <li className={`px-5 py-4 ${divider ? "border-b hairline" : ""}`}>
      <h3 className={`display italic text-[18px] leading-tight ${dimmed ? "text-ink-300" : "text-ink"}`}>
        {m.title}
      </h3>
      {m.description && (
        <p className={`text-[13px] leading-relaxed mt-1.5 ${dimmed ? "text-ink-300" : "text-ink-400"}`}>
          {m.description}
        </p>
      )}
      <div className="mt-3 flex items-center gap-2 flex-wrap">
        {(["idea", "planned", "done"] as EngagementMilestone["status"][]).map((s) => {
          const active = m.status === s;
          return (
            <button
              key={s}
              onClick={() => onUpdate({ status: s })}
              aria-pressed={active}
              className={`text-[10.5px] uppercase tracking-[0.18em] border rounded-full px-2.5 py-1 transition-all ${
                active
                  ? s === "done" ? "bg-sage-500 text-paper-50 border-sage-500" :
                    s === "planned" ? "bg-sage-200 text-ink border-sage-300" :
                    "bg-ink text-paper-50 border-ink"
                  : "border-ink/15 text-ink-300 hover:border-ink/30 hover:text-ink"
              }`}
            >
              {STATUS_LABEL[s]}
            </button>
          );
        })}
        <input
          type="date"
          defaultValue={m.scheduledFor ?? ""}
          onBlur={(e) => onUpdate({ scheduledFor: e.target.value })}
          className="text-[12px] rounded-lg border hairline bg-paper-50 px-2 py-1 ml-auto focus:outline-none focus:border-sage-300"
        />
      </div>
    </li>
  );
}
