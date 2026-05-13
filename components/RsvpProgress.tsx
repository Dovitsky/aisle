"use client";

// RSVP progress widget. Drop into any planner-side view (e.g., Today,
// the dashboard, the guest-management page) to show a live count of
// yes / no / maybe / no-response, plus diet + song-request signals.
//
// Usage:
//   import { RsvpProgress } from "@/components/RsvpProgress";
//   <RsvpProgress />

import { useProject } from "./StateProvider";

export function RsvpProgress() {
  const { state, loading } = useProject();
  if (loading || !state) return null;

  const guests = state.guests;
  if (guests.length === 0) return null;

  const total = guests.length;
  const yes = guests.filter((g) => g.rsvp === "yes").length;
  const maybe = guests.filter((g) => g.rsvp === "maybe").length;
  const no = guests.filter((g) => g.rsvp === "no").length;
  const pending = total - yes - maybe - no;

  const yesPct = total > 0 ? (yes / total) * 100 : 0;
  const maybePct = total > 0 ? (maybe / total) * 100 : 0;
  const noPct = total > 0 ? (no / total) * 100 : 0;

  // Side signals — meals chosen, dietary entries, song requests.
  const mealsChosen = guests.filter((g) => g.rsvp === "yes" && (g.meal?.trim() ?? "") !== "").length;
  const dietaryFlagged = guests.filter((g) => (g.dietary?.trim() ?? "") !== "" || (g.allergens?.length ?? 0) > 0).length;
  const songRequests = guests.filter((g) => (g.songRequest?.trim() ?? "") !== "").length;

  return (
    <section className="surface rounded-card card-shell p-5 flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-sage-500 font-mono">
            RSVP progress
          </p>
          <p
            className="text-[24px] tabular-nums leading-none mt-1 text-ink"
            style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontWeight: 300 }}
          >
            {yes}<span className="text-ink-300 text-[18px]"> of {total}</span>{" "}
            <span className="italic text-sage-500 text-[20px]">yes</span>
          </p>
        </div>
        {pending > 0 && (
          <span className="text-[10.5px] uppercase tracking-[0.18em] font-mono text-ink-300">
            {pending} unanswered
          </span>
        )}
      </div>

      {/* Stacked bar */}
      <div className="flex h-2 rounded-full bg-ink/5 overflow-hidden">
        <div className="bg-sage-500 transition-all duration-500" style={{ width: `${yesPct}%` }} />
        <div className="bg-sage-200 transition-all duration-500" style={{ width: `${maybePct}%` }} />
        <div className="bg-ink-300 transition-all duration-500" style={{ width: `${noPct}%` }} />
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Pill label="Yes" value={yes} dot="bg-sage-500" />
        <Pill label="Maybe" value={maybe} dot="bg-sage-200" />
        <Pill label="No" value={no} dot="bg-ink-300" />
        <Pill label="Pending" value={pending} dot="bg-paper-200" />
      </div>

      <div className="border-t hairline pt-3 grid grid-cols-3 gap-3 text-[11px]">
        <Signal label="Meal chosen" value={mealsChosen} of={yes} />
        <Signal label="Dietary flagged" value={dietaryFlagged} of={total} />
        <Signal label="Song requests" value={songRequests} of={total} />
      </div>
    </section>
  );
}

function Pill({ label, value, dot }: { label: string; value: number; dot: string }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
      <span className="text-[10.5px] uppercase tracking-[0.18em] font-mono text-ink-300 truncate">
        {label}
      </span>
      <span className="text-[14px] tabular-nums text-ink ml-auto">{value}</span>
    </div>
  );
}

function Signal({ label, value, of }: { label: string; value: number; of: number }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-[0.18em] font-mono text-ink-300">{label}</p>
      <p className="text-[14px] tabular-nums text-ink mt-0.5">
        {value}
        {of > 0 && <span className="text-ink-300 text-[11px]"> / {of}</span>}
      </p>
    </div>
  );
}
