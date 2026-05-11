"use client";

// Pre-wedding events. engagement party, shower, bach/ette, rehearsal
// dinner, welcome drinks, after-party, morning-after brunch.
//
// Layout: hero with the count + total invited; chronological vertical
// timeline grouped by week relative to the wedding (this week / week of /
// next week / etc.); per-event cards with type chip, date, location, hosts,
// invited count; polished add-event composer.

import { useMemo, useState } from "react";
import Link from "next/link";
import type { PreEvent, PreEventKind, ProjectState } from "@/lib/types";
import { useProject } from "./StateProvider";
import { Reveal } from "./Atmosphere";

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

const KIND_BLURB: Record<PreEventKind, string> = {
  engagement_party: "First public celebration with friends and family",
  bridal_shower: "Daytime gathering, traditionally gifts and brunch",
  bachelor_party: "The send-off",
  bachelorette_party: "The send-off",
  rehearsal_dinner: "Night before. Wedding party + immediate family",
  welcome_drinks: "Out-of-town guests arrive. keep it casual",
  after_party: "When the reception ends and the dancing keeps going",
  morning_after_brunch: "Slow recovery, photos, see-off",
};

// Order pre-events tend to land in chronologically relative to the wedding.
const KIND_ORDER: PreEventKind[] = [
  "engagement_party",
  "bridal_shower",
  "bachelor_party",
  "bachelorette_party",
  "welcome_drinks",
  "rehearsal_dinner",
  "after_party",
  "morning_after_brunch",
];

export function PreEventsView() {
  const { state, setState, loading } = useProject();
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sorted = useMemo(() => {
    if (!state) return [] as PreEvent[];
    return [...state.preEvents].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  }, [state]);

  const totalInvited = useMemo(
    () => sorted.reduce((s, e) => s + (e.invitedCount || 0), 0),
    [sorted],
  );

  if (loading || !state) return <div className="pt-10 text-center text-ink-300">Loading…</div>;

  // Wedding date for relative bucketing
  const weddingMs = parseWeddingDateMs(state.brief?.dateWindow ?? "", state.brief?.weddingDate);

  const post = async (body: object) => {
    setError(null);
    try {
      const r = await fetch("/api/pre-events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await r.json()) as { state?: ProjectState; error?: string };
      if (!r.ok) { setError(j.error ?? `Error ${r.status}`); return; }
      if (j.state) setState(j.state);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  // Group events by their relative-to-wedding bucket.
  const buckets = useMemo(() => {
    const result: Record<string, PreEvent[]> = {};
    for (const e of sorted) {
      const label = relativeBucket(e.date, weddingMs);
      (result[label] ??= []).push(e);
    }
    return result;
  }, [sorted, weddingMs]);
  const bucketOrder = useMemo(() => Object.keys(buckets), [buckets]);

  return (
    <div className="flex flex-col gap-12 pb-12">
      {/* Hero */}
      <header>
        <p className="text-[10px] uppercase tracking-[0.26em] text-sage-500 font-mono mb-2">
          Around the wedding
        </p>
        <div className="flex items-baseline justify-between gap-6 flex-wrap">
          <h1 className="display text-[36px] sm:text-[44px] lg:text-[52px] leading-[1.02] tracking-[-0.01em]">
            {sorted.length === 0 ? (
              <>Events around the wedding.</>
            ) : (
              <>
                {sorted.length} {sorted.length === 1 ? "event" : "events"} around the wedding.
              </>
            )}
          </h1>
          {sorted.length > 0 && (
            <div className="text-right">
              <div className="display text-[28px] tabular-nums leading-none">
                {totalInvited}
              </div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-ink-300 font-mono mt-1">
                seats across all
              </div>
            </div>
          )}
        </div>
        <p className="text-[14px] text-ink-300 mt-4 leading-relaxed max-w-[60ch]">
          The shoulder weekend matters more than couples expect. Welcome drinks anchor out-of-town guests, the rehearsal dinner sets the tone, the morning-after brunch is where photos actually happen.
        </p>
      </header>

      {/* Add CTA */}
      <div className="flex items-baseline gap-3">
        <button
          onClick={() => setAdding((a) => !a)}
          className="text-[11px] uppercase tracking-[0.18em] text-ink hover:text-sage-500 transition-colors"
        >
          {adding ? "Cancel" : "+ Add an event"}
        </button>
        {sorted.length === 0 && (
          <span className="text-[11px] uppercase tracking-[0.18em] text-ink-300">
            Start with the rehearsal dinner
          </span>
        )}
      </div>

      {error && <p className="text-sm text-risk-high">{error}</p>}

      {adding && (
        <AddEvent
          onSubmit={(payload) => {
            void post({ op: "add", ...payload });
            setAdding(false);
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      {/* Empty / list */}
      {sorted.length === 0 ? (
        <Reveal>
          <div className="rounded-card border hairline bg-white/55 px-7 py-12 max-w-xl">
            <p className="display text-[26px] text-ink leading-tight">No events yet.</p>
            <p className="text-[14px] text-ink-300 mt-3 leading-relaxed">
              The rehearsal dinner is usually the first to schedule. wedding party plus immediate family.
              Welcome drinks and a morning-after brunch matter most for out-of-town guests.
            </p>
            <div className="mt-5 flex gap-3 flex-wrap">
              {(["rehearsal_dinner", "welcome_drinks", "morning_after_brunch"] as PreEventKind[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setAdding(true)}
                  className="text-[11px] uppercase tracking-[0.2em] border hairline rounded-full px-4 py-2 text-ink hover:bg-paper-200/60 transition-colors"
                >
                  + {KIND_LABEL[k]}
                </button>
              ))}
            </div>
            <p className="text-[12px] text-ink-300 mt-5">
              Once events land here they appear on{" "}
              <Link href="/website" className="underline-offset-4 underline hover:text-sage-500">your wedding website</Link>{" "}
              and the{" "}
              <Link href="/timeline" className="underline-offset-4 underline hover:text-sage-500">12-month checklist</Link>.
            </p>
          </div>
        </Reveal>
      ) : (
        <Reveal>
          <section>
            <h2 className="display italic text-[22px] text-ink leading-tight mb-5">
              The weekend, in order
            </h2>
            <div className="flex flex-col gap-8">
              {bucketOrder.map((label) => (
                <div key={label}>
                  <p className="text-[10px] uppercase tracking-[0.24em] text-sage-500 font-mono mb-3">
                    {label}
                  </p>
                  <ul className="flex flex-col">
                    {buckets[label].map((e, i) => (
                      <EventRow
                        key={e.id}
                        event={e}
                        divider={i < buckets[label].length - 1}
                        onDelete={() => void post({ op: "delete", id: e.id })}
                      />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        </Reveal>
      )}
    </div>
  );
}

// --------------------------------------------------------------------

function EventRow({
  event, divider, onDelete,
}: {
  event: PreEvent;
  divider: boolean;
  onDelete: () => void;
}) {
  const dateObj = parseISODate(event.date);
  const dateLabel = dateObj
    ? dateObj.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
    : event.date;
  return (
    <li
      className={`group py-4 grid grid-cols-[110px_1fr_auto] sm:grid-cols-[140px_1fr_auto] gap-4 items-baseline ${
        divider ? "border-b hairline" : ""
      }`}
    >
      <div className="text-[10.5px] uppercase tracking-[0.18em] text-ink-300 font-mono tabular-nums">
        {dateLabel}
      </div>
      <div className="min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <h3 className="display italic text-[20px] text-ink leading-tight group-hover:text-sage-500 transition-colors">
            {KIND_LABEL[event.kind]}
          </h3>
          <span className="text-[10px] uppercase tracking-[0.18em] text-ink-300 font-mono">
            {event.invitedCount} invited
          </span>
        </div>
        <p className="text-[13px] text-ink-400 mt-0.5 leading-snug">
          {event.location}
          {event.hostNames.length > 0 && (
            <>
              <span className="text-ink-200 mx-1.5">·</span>
              hosted by {event.hostNames.join(", ")}
            </>
          )}
        </p>
        {event.notes && (
          <p className="text-[12.5px] text-ink-300 mt-1 leading-snug italic">
            {event.notes}
          </p>
        )}
      </div>
      <button
        onClick={onDelete}
        className="text-[10px] uppercase tracking-[0.18em] text-ink-300 hover:text-risk-high opacity-0 group-hover:opacity-100 transition-all"
      >
        Remove
      </button>
    </li>
  );
}

// --------------------------------------------------------------------

function AddEvent({
  onSubmit, onCancel,
}: {
  onSubmit: (payload: { kind: PreEventKind; date: string; location: string; hostNames: string[]; invitedCount: number; notes?: string }) => void;
  onCancel: () => void;
}) {
  const [kind, setKind] = useState<PreEventKind>("rehearsal_dinner");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [hostNamesRaw, setHostNamesRaw] = useState("");
  const [invitedCount, setInvitedCount] = useState(20);
  const [notes, setNotes] = useState("");

  const submit = () => {
    if (!date || !location) return;
    onSubmit({
      kind, date, location,
      hostNames: hostNamesRaw.split(",").map((s) => s.trim()).filter(Boolean),
      invitedCount,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Reveal>
      <section className="rounded-card border hairline bg-white/85 p-5 grid gap-4 animate-fade-in-soft">
        <div className="text-[10px] uppercase tracking-[0.22em] text-sage-500 font-mono">
          New event
        </div>

        {/* Kind chips */}
        <div className="flex flex-wrap gap-1.5">
          {KIND_ORDER.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`text-[11px] uppercase tracking-[0.16em] border rounded-full px-3 py-1 transition-colors ${
                kind === k
                  ? "bg-ink text-paper-50 border-ink"
                  : "border-ink/15 text-ink-400 hover:border-ink/30 hover:text-ink"
              }`}
            >
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>
        <p className="text-[12px] text-ink-300 -mt-1 leading-snug italic">{KIND_BLURB[kind]}</p>

        <div className="grid sm:grid-cols-[1fr_2fr_1fr] gap-3">
          <Field label="Date">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg border hairline bg-paper-50 px-3 py-2 text-[14px] focus:outline-none focus:border-sage-300 w-full"
            />
          </Field>
          <Field label="Location">
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder='e.g. "Lilia, Williamsburg"'
              className="rounded-lg border hairline bg-paper-50 px-3 py-2 text-[14px] focus:outline-none focus:border-sage-300 w-full"
            />
          </Field>
          <Field label="Invited">
            <input
              type="number"
              min={1}
              value={invitedCount}
              onChange={(e) => setInvitedCount(Number(e.target.value) || 0)}
              className="rounded-lg border hairline bg-paper-50 px-3 py-2 text-[14px] tabular-nums focus:outline-none focus:border-sage-300 w-full"
            />
          </Field>
        </div>

        <Field label="Hosts (comma-separated)">
          <input
            value={hostNamesRaw}
            onChange={(e) => setHostNamesRaw(e.target.value)}
            placeholder='e.g. "Maya & Jordan", "The Patel family"'
            className="rounded-lg border hairline bg-paper-50 px-3 py-2 text-[14px] focus:outline-none focus:border-sage-300 w-full"
          />
        </Field>

        <Field label="Notes (optional)">
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder='e.g. "Cocktail attire, 6:30pm"'
            className="rounded-lg border hairline bg-paper-50 px-3 py-2 text-[14px] focus:outline-none focus:border-sage-300 w-full"
          />
        </Field>

        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={submit}
            disabled={!date || !location}
            className="btn-primary"
            style={{ paddingInline: "1.4rem", paddingBlock: "0.55rem" }}
          >
            Add event
          </button>
          <button
            onClick={onCancel}
            className="text-[11px] uppercase tracking-[0.2em] text-ink-300 hover:text-ink"
          >
            Cancel
          </button>
        </div>
      </section>
    </Reveal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 min-w-0">
      <span className="text-[10px] uppercase tracking-[0.22em] text-ink-300 font-mono">{label}</span>
      {children}
    </label>
  );
}

// --------------------------------------------------------------------
// Helpers

function parseISODate(s: string): Date | null {
  if (!s) return null;
  const m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00`);
}

function parseWeddingDateMs(dateWindow: string, weddingDate?: string): number | null {
  const m = (weddingDate?.match(/(\d{4})-(\d{2})-(\d{2})/)) ?? dateWindow.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00`).getTime();
}

// Bucket label like "WEDDING WEEK", "MONTH BEFORE", "AFTER", "EARLIER"
function relativeBucket(eventDate: string, weddingMs: number | null): string {
  const ed = parseISODate(eventDate);
  if (!ed) return "Unscheduled";
  if (weddingMs === null) return "Scheduled";

  const days = Math.round((ed.getTime() - weddingMs) / (1000 * 60 * 60 * 24));
  if (days >= -1 && days <= 1) return "Wedding weekend";
  if (days >= -7 && days < -1) return "Week of the wedding";
  if (days > 1 && days <= 3) return "Days after";
  if (days > 3 && days <= 30) return "Month after";
  if (days >= -30 && days < -7) return "Month before";
  if (days >= -180 && days < -30) return "Months before";
  if (days < -180) return "Earlier";
  return "Later";
}
