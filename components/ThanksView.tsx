"use client";

// Thank-you Studio — PRD §5.4.6 / §3 phase 9.

import { useState } from "react";
import type { ProjectState, ThankYou } from "@/lib/types";
import { useProject } from "./StateProvider";
import { EmptyState, PageHeader } from "./ui";

const STATUS_TONE: Record<ThankYou["status"], string> = {
  no_gift: "border-ink/15 text-ink-300 bg-paper-200/40",
  drafting: "border-accent/30 text-accent bg-accent-wash/40",
  ready: "border-risk-medium/30 text-risk-medium bg-risk-medium/5",
  sent: "border-risk-low/30 text-risk-low bg-risk-low/5",
};

export function ThanksView() {
  const { state, setState, loading } = useProject();
  const [busy, setBusy] = useState(false);

  if (loading || !state) return <div className="pt-10 text-center text-ink-300">Loading…</div>;

  const rebuild = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/thanks", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "rebuild" }),
      });
      const j = (await r.json()) as { state?: ProjectState };
      if (j.state) setState(j.state);
    } finally { setBusy(false); }
  };

  const update = async (id: string, patch: Partial<ThankYou>) => {
    const r = await fetch("/api/thanks", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ op: "update", id, patch }),
    });
    const j = (await r.json()) as { state?: ProjectState };
    if (j.state) setState(j.state);
  };

  const yesCount = state.guests.filter((g) => g.rsvp === "yes").length;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Post-event"
        title="Thank-yous"
        subtitle="One record per attendee. Log the gift, draft, approve, send."
        action={
          <button
            onClick={rebuild}
            disabled={busy}
            className="rounded-2xl bg-ink text-paper-50 hover:bg-ink-400 px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {busy ? "Rebuilding…" : `Rebuild from RSVP yes (${yesCount})`}
          </button>
        }
      />

      {state.thanks.length === 0 ? (
        <EmptyState title="No records yet" hint="Click rebuild once you have RSVP yeses to seed thank-you cards for each attendee." />
      ) : (
        <div className="grid sm:grid-cols-2 gap-3 stagger">
          {state.thanks.map((t) => (
            <article key={t.id} className="surface rounded-card border hairline shadow-card hover:shadow-cardHover transition-shadow p-4">
              <div className="flex items-baseline justify-between">
                <h3 className="display text-base">{t.guestName}</h3>
                <span className={`text-[10px] uppercase tracking-[0.14em] border rounded-full px-2 py-0.5 ${STATUS_TONE[t.status]}`}>
                  {t.status.replace("_", " ")}
                </span>
              </div>
              <input
                defaultValue={t.giftDescription ?? ""}
                onBlur={(e) => update(t.id, { giftDescription: e.target.value })}
                placeholder="Gift (optional)"
                className="mt-2 w-full rounded-lg border hairline bg-white/80 px-2.5 py-1.5 text-sm focus:outline-none"
              />
              <textarea
                defaultValue={t.draftBody ?? ""}
                onBlur={(e) => update(t.id, { draftBody: e.target.value })}
                rows={3}
                placeholder="Draft note…"
                className="mt-2 w-full rounded-lg border hairline bg-white/80 px-2.5 py-1.5 text-sm focus:outline-none"
              />
              <div className="mt-2 flex gap-1 flex-wrap">
                {(["no_gift", "drafting", "ready", "sent"] as ThankYou["status"][]).map((s) => (
                  <button
                    key={s}
                    onClick={() => update(t.id, { status: s })}
                    className={`text-[10px] uppercase tracking-[0.14em] border rounded-full px-2 py-1 transition-colors ${
                      t.status === s ? STATUS_TONE[s] : "border-ink/10 text-ink-300 hover:border-ink/30"
                    }`}
                  >
                    {s.replace("_", " ")}
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
