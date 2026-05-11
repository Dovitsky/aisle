"use client";

// Guests. household-first list with RSVP segment overview, dietary chips,
// and inline RSVP edits. Feeds Larder (allergens), Cartographer (seating),
// Quartermaster (welcome bags), and the Cantor playlist (song requests).

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Guest, ProjectState, RsvpState, Side } from "@/lib/types";
import { useProject } from "./StateProvider";
import { Reveal, CountUp } from "./Atmosphere";

const RSVP_LABEL: Record<RsvpState, string> = {
  yes: "Yes",
  maybe: "Maybe",
  no: "No",
  no_response: "Awaiting",
};

const SIDE_LABEL: Record<Side, string> = {
  organizer: "Yours",
  partner: "Theirs",
  both: "Mutual",
  neither: "Other",
};

type Filter = "all" | "yes" | "maybe" | "no" | "no_response" | "dietary";

export function GuestsView() {
  const { state, setState, loading } = useProject();
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

  const totals = useMemo(() => {
    const t = { all: 0, yes: 0, no: 0, maybe: 0, pending: 0, dietary: 0, songs: 0 };
    if (!state) return t;
    t.all = state.guests.length;
    for (const g of state.guests) {
      if (g.rsvp === "yes") t.yes++;
      else if (g.rsvp === "no") t.no++;
      else if (g.rsvp === "maybe") t.maybe++;
      else t.pending++;
      if ((g.allergens?.length ?? 0) + (g.dietaryPreferences?.length ?? 0) > 0 || (g.dietary?.trim() ?? "")) t.dietary++;
      if (g.songRequest?.trim()) t.songs++;
    }
    return t;
  }, [state]);

  if (loading || !state) return <div className="pt-10 text-center text-ink-300">Loading…</div>;

  const updateRsvp = async (g: Guest, rsvp: RsvpState) => {
    const r = await fetch("/api/guests", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ op: "update_guest", id: g.id, patch: { rsvp } }),
    });
    const j = (await r.json()) as { state?: ProjectState };
    if (j.state) setState(j.state);
  };

  const seedDemo = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/guests", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "seed_demo" }),
      });
      const j = (await r.json()) as { state?: ProjectState };
      if (j.state) setState(j.state);
    } finally { setBusy(false); }
  };

  // Households containing at least one guest matching the filter.
  const visibleHouseholds = useMemo(() => {
    if (!state) return [];
    return state.households
      .map((h) => {
        const members = state.guests.filter((g) => g.householdId === h.id);
        const filteredMembers = members.filter((g) => {
          if (filter === "all") return true;
          if (filter === "dietary") {
            return (g.allergens?.length ?? 0) > 0 ||
                   (g.dietaryPreferences?.length ?? 0) > 0 ||
                   !!(g.dietary && g.dietary.trim());
          }
          return g.rsvp === filter;
        });
        return { household: h, members, filteredMembers };
      })
      .filter((h) => h.filteredMembers.length > 0);
  }, [state, filter]);

  const segmentTotal = Math.max(1, totals.all);

  return (
    <div className="flex flex-col gap-12 pb-12">
      {/* Hero */}
      <header>
        <p className="text-[10px] uppercase tracking-[0.26em] text-sage-500 font-mono mb-2">
          Guests
        </p>
        <div className="flex items-baseline justify-between gap-6 flex-wrap">
          <h1 className="display text-[36px] sm:text-[44px] lg:text-[52px] leading-[1.02] tracking-[-0.01em]">
            {totals.all === 0 ? (
              <>Guests.</>
            ) : (
              <>
                <CountUp value={totals.all} /> on the list.
              </>
            )}
          </h1>
          {totals.all > 0 && (
            <div className="text-right">
              <div className="display text-[28px] tabular-nums leading-none text-sage-500">
                {totals.yes}
              </div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-ink-300 font-mono mt-1">
                confirmed
              </div>
            </div>
          )}
        </div>
        <p className="text-[14px] text-ink-300 mt-4 leading-relaxed max-w-[60ch]">
          As guests RSVP, we update seating, catering, transport, and the thank-you list. Dietary needs feed the menu. Song requests feed the playlist.
        </p>
      </header>

      {/* Segmented RSVP bar */}
      {totals.all > 0 && (
        <Reveal>
          <section>
            <div className="text-[10px] uppercase tracking-[0.22em] text-sage-500 font-mono mb-3">
              Where they stand
            </div>
            <div
              className="relative h-3 rounded-full overflow-hidden bg-ink/8"
              role="img"
              aria-label={`${totals.yes} yes, ${totals.maybe} maybe, ${totals.no} no, ${totals.pending} awaiting`}
            >
              {totals.yes > 0 && (
                <span
                  className="absolute top-0 bottom-0 left-0 bg-sage-500 transition-[width] duration-700"
                  style={{ width: `${(totals.yes / segmentTotal) * 100}%` }}
                />
              )}
              {totals.maybe > 0 && (
                <span
                  className="absolute top-0 bottom-0 bg-sage-300 transition-[width] duration-700"
                  style={{
                    left: `${(totals.yes / segmentTotal) * 100}%`,
                    width: `${(totals.maybe / segmentTotal) * 100}%`,
                  }}
                />
              )}
              {totals.no > 0 && (
                <span
                  className="absolute top-0 bottom-0 bg-ink-300 transition-[width] duration-700"
                  style={{
                    left: `${((totals.yes + totals.maybe) / segmentTotal) * 100}%`,
                    width: `${(totals.no / segmentTotal) * 100}%`,
                  }}
                />
              )}
              {totals.pending > 0 && (
                <span
                  className="absolute top-0 bottom-0 bg-paper-300/80 transition-[width] duration-700"
                  style={{
                    left: `${((totals.yes + totals.maybe + totals.no) / segmentTotal) * 100}%`,
                    width: `${(totals.pending / segmentTotal) * 100}%`,
                  }}
                />
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Legend swatch="bg-sage-500"  label="Yes"      value={totals.yes} />
              <Legend swatch="bg-sage-300"  label="Maybe"    value={totals.maybe} />
              <Legend swatch="bg-ink-300"   label="No"       value={totals.no} />
              <Legend swatch="bg-paper-300" label="Awaiting" value={totals.pending} />
            </div>

            {(totals.dietary > 0 || totals.songs > 0) && (
              <div className="mt-5 flex items-baseline gap-x-6 gap-y-2 flex-wrap text-[12px] text-ink-300 font-mono">
                {totals.dietary > 0 && (
                  <Link href="/dietary" className="hover:text-sage-500 transition-colors">
                    {totals.dietary} with dietary needs →
                  </Link>
                )}
                {totals.songs > 0 && (
                  <Link href="/music" className="hover:text-sage-500 transition-colors">
                    {totals.songs} song requests →
                  </Link>
                )}
              </div>
            )}
          </section>
        </Reveal>
      )}

      {/* Action row + filters */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-1 p-1 rounded-full border hairline bg-white/40 overflow-x-auto no-scrollbar">
          {([
            ["all",         "All",      totals.all],
            ["yes",         "Yes",      totals.yes],
            ["maybe",       "Maybe",    totals.maybe],
            ["no",          "No",       totals.no],
            ["no_response", "Awaiting", totals.pending],
            ["dietary",     "Dietary",  totals.dietary],
          ] as [Filter, string, number][]).map(([f, label, count]) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-[11px] uppercase tracking-[0.18em] transition-colors ${
                filter === f ? "bg-ink text-paper-50" : "text-ink-300 hover:text-ink"
              }`}
            >
              {label}
              {count > 0 && <span className="ml-1.5 opacity-60 font-mono">{count}</span>}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setAdding((a) => !a)}
            className="text-[11px] uppercase tracking-[0.18em] text-ink hover:text-sage-500 transition-colors"
          >
            {adding ? "Cancel" : "+ Add household"}
          </button>
          {state.guests.length === 0 && (
            <button
              onClick={seedDemo}
              disabled={busy}
              className="text-[11px] uppercase tracking-[0.18em] text-ink-300 hover:text-ink transition-colors disabled:opacity-50"
            >
              {busy ? "Loading…" : "Or load a sample list →"}
            </button>
          )}
        </div>
      </div>

      {adding && <AddHousehold onAdded={() => setAdding(false)} />}

      {/* Households */}
      {state.households.length === 0 ? (
        <Reveal>
          <div className="rounded-card border hairline bg-white/55 px-7 py-12 max-w-xl">
            <p className="display text-[26px] text-ink leading-tight">
              No guests yet.
            </p>
            <p className="text-[14px] text-ink-300 mt-3 leading-relaxed">
              Add a household yourself. or load ten sample ones to play with the seating and RSVP flow first.
            </p>
            <div className="mt-5 flex items-center gap-4">
              <button onClick={() => setAdding(true)} className="btn-primary">+ Add household</button>
              <button
                onClick={seedDemo}
                disabled={busy}
                className="text-[11px] uppercase tracking-[0.2em] text-ink-300 hover:text-ink transition-colors disabled:opacity-50"
              >
                {busy ? "Loading…" : "Or load 10 samples →"}
              </button>
            </div>
          </div>
        </Reveal>
      ) : visibleHouseholds.length === 0 ? (
        <p className="text-[14px] text-ink-300 italic">
          No households match this filter.
        </p>
      ) : (
        <div className="flex flex-col gap-4 stagger">
          {visibleHouseholds.map(({ household, filteredMembers }) => (
            <HouseholdCard
              key={household.id}
              label={household.label}
              side={household.side as Side}
              members={filteredMembers}
              onUpdateRsvp={updateRsvp}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Legend({ swatch, label, value }: { swatch: string; label: string; value: number }) {
  return (
    <div className="flex items-baseline gap-2.5">
      <span className={`inline-block w-2 h-2 rounded-full ${swatch} mt-1`} aria-hidden />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-[0.22em] text-ink-300 font-mono">{label}</div>
        <div className="display text-[20px] tabular-nums leading-tight mt-0.5">{value}</div>
      </div>
    </div>
  );
}

function HouseholdCard({
  label, side, members, onUpdateRsvp,
}: {
  label: string;
  side: Side;
  members: Guest[];
  onUpdateRsvp: (g: Guest, rsvp: RsvpState) => void;
}) {
  return (
    <article className="surface rounded-card card-shell hover:shadow-cardHover transition-all overflow-hidden">
      <div className="px-5 pt-4 pb-2 flex items-baseline justify-between gap-3 border-b hairline">
        <h3 className="display italic text-[20px] leading-tight">{label}</h3>
        <span className="text-[10px] uppercase tracking-[0.22em] text-sage-500 font-mono">
          {SIDE_LABEL[side] ?? side}
        </span>
      </div>
      <ul className="flex flex-col">
        {members.map((g, i) => (
          <li
            key={g.id}
            className={`px-5 py-3 grid grid-cols-[1fr_auto] items-center gap-3 ${
              i < members.length - 1 ? "border-b hairline" : ""
            }`}
          >
            <div className="min-w-0 flex items-baseline gap-2 flex-wrap">
              <span className={`text-[14.5px] truncate ${g.rsvp === "no" ? "text-ink-300 line-through" : "text-ink"}`}>
                {g.preferredName || g.fullName}
              </span>
              <span className="text-[10.5px] uppercase tracking-[0.18em] text-ink-300">
                {g.relationship.replace(/_/g, " ")}
              </span>
              {g.plusOnePolicy !== "none" && (
                <span className="text-[10px] uppercase tracking-[0.18em] text-ink-200 font-mono">
                  +1 {g.plusOnePolicy}
                </span>
              )}
              {g.isChild && (
                <span className="text-[10px] uppercase tracking-[0.18em] text-ink-200 font-mono">
                  child
                </span>
              )}
              <DietaryBadge guest={g} />
              {g.songRequest && (
                <span
                  className="text-[10px] uppercase tracking-[0.18em] text-ink-300 font-mono italic"
                  title={`Song request: ${g.songRequest}`}
                >
                  ♪
                </span>
              )}
            </div>
            <div className="flex gap-1">
              {(["yes", "maybe", "no"] as RsvpState[]).map((r) => {
                const active = g.rsvp === r;
                return (
                  <button
                    key={r}
                    onClick={() => onUpdateRsvp(g, active ? "no_response" : r)}
                    aria-pressed={active}
                    className={`text-[10px] uppercase tracking-[0.18em] border rounded-full px-2.5 py-1 transition-all ${
                      active
                        ? r === "yes" ? "bg-sage-500 text-paper-50 border-sage-500" :
                          r === "maybe" ? "bg-sage-200 text-ink border-sage-300" :
                          "bg-ink-300 text-paper-50 border-ink-300"
                        : "border-ink/15 text-ink-300 hover:border-ink/30 hover:text-ink"
                    }`}
                  >
                    {RSVP_LABEL[r]}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ul>
    </article>
  );
}

function DietaryBadge({ guest }: { guest: Guest }) {
  const allergenCount = guest.allergens?.length ?? 0;
  const prefCount = guest.dietaryPreferences?.length ?? 0;
  const hasFreeText = !!(guest.dietary && guest.dietary.trim());
  if (allergenCount + prefCount === 0 && !hasFreeText) return null;
  const critical = guest.allergens?.some((a) => a.severity === "anaphylactic") ?? false;
  const cls = critical
    ? "bg-risk-high/10 text-risk-high border-risk-high/40"
    : "bg-sage-100/70 text-sage-500 border-sage-300/40";
  return (
    <Link
      href="/dietary"
      className={`text-[10px] uppercase tracking-[0.16em] border rounded-full px-2 py-0.5 ${cls} font-mono hover:underline`}
      title={
        critical
          ? "Anaphylactic allergen on file"
          : `Dietary needs: ${[allergenCount && `${allergenCount} allergens`, prefCount && `${prefCount} prefs`, hasFreeText && "notes"].filter(Boolean).join(" · ")}`
      }
    >
      {critical ? "Critical" : "Diet"}
    </Link>
  );
}

function AddHousehold({ onAdded }: { onAdded: () => void }) {
  const { setState } = useProject();
  const [label, setLabel] = useState("");
  const [side, setSide] = useState<Side>("both");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!label || !name) return;
    setBusy(true);
    try {
      const r = await fetch("/api/guests", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          op: "add_household",
          label, side,
          initialGuest: { fullName: name, side, relationship: "extended_family" },
        }),
      });
      const j = (await r.json()) as { state?: ProjectState };
      if (j.state) setState(j.state);
      onAdded();
    } finally { setBusy(false); }
  };

  return (
    <div className="rounded-card border hairline bg-white/85 p-4 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto_auto] gap-3 items-end animate-fade-in-soft">
      <Field label="Household label" value={label} onChange={setLabel} placeholder='e.g. "The Patel family"' />
      <Field label="First guest" value={name} onChange={setName} placeholder='e.g. "Anjali Patel"' />
      <label className="flex flex-col gap-1">
        <span className="text-[10px] uppercase tracking-[0.22em] text-ink-300 font-mono">Side</span>
        <select
          value={side}
          onChange={(e) => setSide(e.target.value as Side)}
          className="rounded-lg border hairline bg-paper-50 px-3 py-2 text-[14px] focus:outline-none focus:border-sage-300"
        >
          <option value="organizer">Yours</option>
          <option value="partner">Theirs</option>
          <option value="both">Mutual</option>
          <option value="neither">Other</option>
        </select>
      </label>
      <button
        onClick={submit}
        disabled={busy || !label || !name}
        className="btn-primary"
        style={{ paddingInline: "1.2rem", paddingBlock: "0.55rem" }}
      >
        {busy ? "…" : "Add"}
      </button>
    </div>
  );
}

function Field({
  label, value, onChange, placeholder,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1 min-w-0">
      <span className="text-[10px] uppercase tracking-[0.22em] text-ink-300 font-mono">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-lg border hairline bg-paper-50 px-3 py-2 text-[14px] focus:outline-none focus:border-sage-300"
      />
    </label>
  );
}
