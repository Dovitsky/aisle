"use client";

// Thanks. A card per attendee. Log the gift, draft a note, approve, send.
// Rebuilt from RSVP yeses; statuses progress: no gift → drafting →
// ready → sent.
//
// Layout: editorial hero with sent/total italic count + sent-% side stat,
// progress rail, status filter pills, then two-column card-shell grid of
// thank-you cards. Each card has guest name (italic Cormorant), gift
// description input, body textarea, and a 4-step status pill row.

import { useMemo, useState } from "react";
import type { ProjectState, ThankYou } from "@/lib/types";
import { useProject } from "./StateProvider";
import { useToast } from "./Toast";
import { Reveal, CountUp } from "./Atmosphere";

const STATUS_LABEL: Record<ThankYou["status"], string> = {
  no_gift: "No gift",
  drafting: "Drafting",
  ready: "Ready to send",
  sent: "Sent",
};

const STATUS_TONE: Record<ThankYou["status"], string> = {
  no_gift: "border-ink/15 text-ink-300 bg-paper-200/40",
  drafting: "border-accent/30 text-accent bg-accent-wash/40",
  ready: "border-risk-medium/30 text-risk-medium bg-risk-medium/5",
  sent: "border-sage-300 text-sage-500 bg-sage-200/40",
};

const STATUS_ORDER: ThankYou["status"][] = ["no_gift", "drafting", "ready", "sent"];

export function ThanksView() {
  const { state, setState, loading } = useProject();
  const { notify } = useToast();
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<ThankYou["status"] | "all">("all");

  const yesCount = useMemo(
    () => (state ? state.guests.filter((g) => g.rsvp === "yes").length : 0),
    [state],
  );

  const counts = useMemo(() => {
    const c: Record<ThankYou["status"], number> = { no_gift: 0, drafting: 0, ready: 0, sent: 0 };
    if (state) for (const t of state.thanks) c[t.status]++;
    return c;
  }, [state]);

  if (loading || !state) {
    return <div className="pt-10 text-center text-ink-300">Loading…</div>;
  }

  const rebuild = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/thanks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "rebuild" }),
      });
      const j = (await r.json()) as { state?: ProjectState };
      if (j.state) {
        setState(j.state);
        notify({
          kind: "agent",
          agent: "Concierge",
          title: `${j.state.thanks.length} cards lined up`,
          detail: "One per attendee. fill in gifts as they arrive.",
        });
      }
    } finally {
      setBusy(false);
    }
  };

  const update = async (id: string, patch: Partial<ThankYou>) => {
    const r = await fetch("/api/thanks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ op: "update", id, patch }),
    });
    const j = (await r.json()) as { state?: ProjectState };
    if (j.state) setState(j.state);
  };

  const visible = filter === "all"
    ? state.thanks
    : state.thanks.filter((t) => t.status === filter);

  const sentCount = counts.sent;
  const totalCount = state.thanks.length;
  const readyCount = counts.ready;
  const pct = totalCount ? Math.round((sentCount / totalCount) * 100) : 0;

  return (
    <div className="flex flex-col gap-12 pb-12">
      {/* Hero */}
      <header>
        <p className="text-[10px] uppercase tracking-[0.26em] text-sage-500 font-mono mb-2">
          Concierge · After the day
        </p>
        <div className="flex items-baseline justify-between gap-6 flex-wrap">
          <h1 className="display text-[36px] sm:text-[44px] lg:text-[52px] leading-[1.02] tracking-[-0.01em]">
            {totalCount === 0 ? (
              <>The cards <span className="italic text-sage-500">they&rsquo;re waiting on</span>.</>
            ) : sentCount === totalCount ? (
              <>All <span className="italic text-sage-500">sent</span>.</>
            ) : (
              <>
                <CountUp value={sentCount} /> of {totalCount}{" "}
                <span className="italic text-sage-500">in the mail</span>.
              </>
            )}
          </h1>
          {totalCount > 0 && (
            <div className="text-right">
              <div className="display text-[28px] tabular-nums leading-none text-sage-500">
                {pct}<span className="text-[18px] text-ink-300">%</span>
              </div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-ink-300 font-mono mt-1">
                done · {readyCount} ready to send
              </div>
            </div>
          )}
        </div>
        <p className="text-[14px] text-ink-300 mt-4 leading-relaxed max-w-[60ch]">
          A card per attendee, with a draft started so you don&rsquo;t stare at a blank page.
          Log the gift, edit the words, mark it sent. Etiquette says within three months.
          we&rsquo;ll quietly keep score.
        </p>
      </header>

      {/* Rebuild card */}
      <Reveal>
        <section className="rounded-card border hairline bg-white/85 px-5 py-5">
          <p className="text-[10px] uppercase tracking-[0.22em] text-sage-500 font-mono mb-3">
            {totalCount === 0 ? "Pull the list" : "Re-pull from RSVPs"}
          </p>
          <p className="text-[14px] text-ink-300 leading-relaxed max-w-[60ch]">
            {totalCount === 0
              ? `${yesCount || 0} guests have said yes. Click below and Concierge lines up a thank-you card for each. pre-drafted, ready for you to personalize.`
              : "Rebuilds the list against current RSVPs. Existing drafts and sent statuses are preserved."}
          </p>
          <div className="mt-4 flex items-center gap-4">
            <button
              onClick={rebuild}
              disabled={busy}
              className="btn-primary"
              style={{ paddingInline: "1.4rem", paddingBlock: "0.55rem" }}
            >
              {busy
                ? "Concierge working…"
                : totalCount === 0
                  ? `Build from ${yesCount} yeses`
                  : `Rebuild · ${yesCount} yeses`}
            </button>
          </div>
        </section>
      </Reveal>

      {/* Progress + filter */}
      {totalCount > 0 && (
        <Reveal>
          <section>
            {/* Progress rail */}
            <div className="h-[3px] rounded-full bg-ink/8 overflow-hidden mb-4">
              <div
                className="h-full bg-gradient-to-r from-sage-500 via-sage-400 to-sage-300 transition-[width] duration-1000"
                style={{ width: `${pct}%` }}
                aria-hidden
              />
            </div>

            {/* Filter chips */}
            <div className="flex gap-1.5 flex-wrap">
              {(["all", ...STATUS_ORDER] as const).map((f) => {
                const isActive = filter === f;
                const label = f === "all" ? "All" : STATUS_LABEL[f];
                const count = f === "all" ? totalCount : counts[f];
                return (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`text-[10.5px] uppercase tracking-[0.18em] border rounded-full px-3 py-1 transition-all ${
                      isActive
                        ? "bg-ink text-paper-50 border-ink"
                        : "border-ink/15 text-ink-300 hover:border-ink/30 hover:text-ink"
                    }`}
                  >
                    {label}
                    {count > 0 && (
                      <span className={`ml-2 ${isActive ? "text-paper-50/70" : "text-ink-300"} tabular-nums`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        </Reveal>
      )}

      {/* Cards */}
      {totalCount === 0 ? (
        <Reveal>
          <div className="rounded-card border hairline bg-white/55 px-7 py-12 max-w-xl">
            <p className="display text-[26px] text-ink leading-tight">Nothing here yet.</p>
            <p className="text-[14px] text-ink-300 mt-3 leading-relaxed">
              Once you have RSVP yeses, click <span className="text-ink not-italic">Build</span> above
              and we&rsquo;ll line up a thank-you card for everyone who came. one per name, all
              pre-drafted in your voice.
            </p>
          </div>
        </Reveal>
      ) : visible.length === 0 ? (
        <p className="text-[14px] text-ink-300 italic">
          Nothing in that status yet.
        </p>
      ) : (
        <Reveal>
          <section>
            <h2 className="display italic text-[22px] text-ink leading-tight mb-5">
              {filter === "all" ? "Every card" : STATUS_LABEL[filter]}
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {visible.map((t) => (
                <ThankCard key={t.id} t={t} onUpdate={(patch) => update(t.id, patch)} />
              ))}
            </div>
          </section>
        </Reveal>
      )}
    </div>
  );
}

// --------------------------------------------------------------------

function ThankCard({
  t, onUpdate,
}: {
  t: ThankYou;
  onUpdate: (patch: Partial<ThankYou>) => void;
}) {
  const sent = t.status === "sent";
  return (
    <article className={`surface rounded-card card-shell hover:shadow-cardHover transition-all overflow-hidden ${
      sent ? "ring-1 ring-sage-300/50" : ""
    }`}>
      <header className="px-5 pt-4 pb-3 border-b hairline flex items-baseline justify-between gap-3">
        <h3 className={`display italic text-[20px] leading-tight ${sent ? "text-ink-300" : "text-ink"}`}>
          {t.guestName}
        </h3>
        <span
          className={`text-[10px] uppercase tracking-[0.18em] border rounded-full px-2 py-0.5 shrink-0 ${STATUS_TONE[t.status]}`}
        >
          {STATUS_LABEL[t.status]}
        </span>
      </header>

      <div className="px-5 py-4">
        <label className="block">
          <span className="text-[10px] uppercase tracking-[0.18em] text-ink-300 font-mono">Gift</span>
          <input
            defaultValue={t.giftDescription ?? ""}
            onBlur={(e) => {
              if ((e.target.value ?? "") !== (t.giftDescription ?? "")) onUpdate({ giftDescription: e.target.value });
            }}
            placeholder="What did they give? Optional"
            className="mt-1 w-full rounded-lg border hairline bg-paper-50 px-3 py-1.5 text-[13px] focus:outline-none focus:border-sage-300"
          />
        </label>

        <label className="block mt-3">
          <span className="text-[10px] uppercase tracking-[0.18em] text-ink-300 font-mono">Note</span>
          <textarea
            defaultValue={t.draftBody ?? ""}
            onBlur={(e) => {
              if ((e.target.value ?? "") !== (t.draftBody ?? "")) onUpdate({ draftBody: e.target.value });
            }}
            rows={3}
            placeholder="Draft a note in your voice…"
            className="mt-1 w-full rounded-lg border hairline bg-paper-50 px-3 py-2 text-[13.5px] leading-relaxed focus:outline-none focus:border-sage-300 resize-none font-display"
            style={{ fontFamily: '"Cormorant","Cormorant Garamond",Georgia,serif' }}
          />
        </label>

        <div className="mt-3 flex gap-1 flex-wrap">
          {STATUS_ORDER.map((s) => (
            <button
              key={s}
              onClick={() => onUpdate({ status: s })}
              aria-pressed={t.status === s}
              className={`text-[10px] uppercase tracking-[0.14em] border rounded-full px-2.5 py-1 transition-colors ${
                t.status === s
                  ? STATUS_TONE[s]
                  : "border-ink/10 text-ink-300 hover:border-ink/30 hover:text-ink"
              }`}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>
    </article>
  );
}
