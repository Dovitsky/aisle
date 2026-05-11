"use client";

// PlannerView. the override CRM for the human planner. Quick glance at
// the couple's state, current Watcher flags, and one-tap jumps into any
// module to override what AISLE proposed.

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useProject } from "./StateProvider";
import { PageHeader, Stat } from "./ui";
import { Reveal } from "./Atmosphere";

interface WatcherFlag {
  level: "info" | "warn" | "critical";
  topic: string;
  message: string;
  module: string;
}

const ROOMS: { href: string; label: string; group: "core" | "build" | "day" | "personal" | "after" }[] = [
  { href: "/", label: "Today", group: "core" },
  { href: "/timeline", label: "Plan", group: "core" },
  { href: "/approvals", label: "Queue", group: "core" },
  { href: "/inbox", label: "Inbox", group: "core" },

  { href: "/vendors", label: "Vendors", group: "build" },
  { href: "/budget", label: "Budget", group: "build" },
  { href: "/guests", label: "Guests", group: "build" },
  { href: "/wedding-party", label: "Wedding party", group: "build" },
  { href: "/design", label: "Design", group: "build" },
  { href: "/florals", label: "Florals", group: "build" },
  { href: "/cake", label: "Cake", group: "build" },
  { href: "/bar", label: "Bar", group: "build" },
  { href: "/music", label: "Music", group: "build" },
  { href: "/beauty", label: "Hair & makeup", group: "build" },
  { href: "/seating", label: "Seating", group: "build" },
  { href: "/stationery", label: "Stationery", group: "build" },
  { href: "/website", label: "Website", group: "build" },
  { href: "/logistics", label: "Logistics", group: "build" },
  { href: "/rentals", label: "Rentals", group: "build" },

  { href: "/ceremony", label: "Ceremony", group: "day" },
  { href: "/pre-events", label: "Other events", group: "day" },
  { href: "/memorials", label: "Memorials", group: "day" },
  { href: "/day-of", label: "Day-of", group: "day" },

  { href: "/personal-prep", label: "Vows", group: "personal" },
  { href: "/dress", label: "Dress", group: "personal" },
  { href: "/speeches", label: "Speeches", group: "personal" },
  { href: "/honeymoon", label: "Honeymoon", group: "personal" },
  { href: "/engagement", label: "Engagement", group: "personal" },
  { href: "/visits", label: "Visits", group: "personal" },
  { href: "/license", label: "License", group: "personal" },
  { href: "/registry", label: "Registry", group: "personal" },

  { href: "/tips", label: "Tips", group: "after" },
  { href: "/thanks", label: "Thank-yous", group: "after" },
];

const GROUP_LABEL: Record<typeof ROOMS[number]["group"], string> = {
  core: "Core",
  build: "Build",
  day: "The day",
  personal: "Personal",
  after: "After",
};

export function PlannerView() {
  const { state, loading } = useProject();
  const [flags, setFlags] = useState<WatcherFlag[]>([]);
  const [flagsLoading, setFlagsLoading] = useState(false);

  useEffect(() => {
    setFlagsLoading(true);
    void fetch("/api/watcher")
      .then((r) => r.json())
      .then((j) => setFlags(j.flags ?? []))
      .finally(() => setFlagsLoading(false));
  }, [state?.brief?.locked, state?.approvals.length]);

  const grouped = useMemo(() => {
    const g: Record<string, typeof ROOMS> = {};
    for (const r of ROOMS) (g[r.group] ??= [] as typeof ROOMS).push(r);
    return g;
  }, []);

  if (loading || !state) {
    return <div className="pt-10 text-center text-ink-300">Loading…</div>;
  }

  const pending = state.approvals.filter((a) => a.status === "pending");
  const yes = state.guests.filter((g) => g.rsvp === "yes").length;
  const totalInvited = state.guests.length;
  const planSum = state.budget.reduce((s, l) => s + l.planUsd, 0);
  const committedSum = state.budget.reduce((s, l) => s + l.committedUsd, 0);
  const venueContracted = state.vendors.find(
    (v) => v.category === "Venue" && (v.status === "contracted" || v.status === "paid"),
  );
  const photogContracted = state.vendors.find(
    (v) => v.category === "Photographer" && (v.status === "contracted" || v.status === "paid"),
  );

  const criticalCount = flags.filter((f) => f.level === "critical").length;
  const warnCount = flags.filter((f) => f.level === "warn").length;

  return (
    <div className="flex flex-col gap-10 pb-12">
      <PageHeader
        eyebrow="Planner override"
        title={
          state.brief ? (
            <>
              {state.brief.organizerName}
              <span className="text-ink-300 mx-2">&</span>
              <span className="italic text-sage-500">{state.brief.partnerName}</span>
            </>
          ) : (
            "Planner dashboard"
          )
        }
        subtitle="A planner-only override view of this wedding. Glance at the state, see what's been flagged, drop into any module to take the wheel."
      />

      {/* Stat row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger">
        <Stat
          label="Pending decisions"
          value={pending.length}
          tone={pending.length > 5 ? "high" : pending.length > 0 ? "medium" : "low"}
          sub={pending.length === 0 ? "All clear" : "Waiting on the couple"}
        />
        <Stat
          label="RSVPs"
          value={`${yes} / ${totalInvited}`}
          sub={totalInvited > 0 ? `${Math.round((yes / totalInvited) * 100)}% yes` : ","}
        />
        <Stat
          label="Budget"
          value={`$${(committedSum / 1000).toFixed(0)}k`}
          sub={`of $${(planSum / 1000).toFixed(0)}k planned`}
        />
        <Stat
          label="Foundation"
          value={`${(venueContracted ? 1 : 0) + (photogContracted ? 1 : 0)} / 2`}
          tone={venueContracted && photogContracted ? "low" : "medium"}
          sub={venueContracted ? (photogContracted ? "Locked" : "Photog open") : "Venue open"}
        />
      </div>

      {/* Watcher flags */}
      <Reveal>
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="display italic text-[20px]">What's flagged</h2>
            <p className="text-[10px] uppercase tracking-[0.18em] text-ink-300 font-mono tabular-nums">
              {criticalCount > 0 && (
                <span className="text-risk-high mr-2">{criticalCount} critical</span>
              )}
              {warnCount > 0 && (
                <span className="text-risk-medium mr-2">{warnCount} warning</span>
              )}
              {flags.length === 0 && !flagsLoading && (
                <span className="text-sage-500">All clear</span>
              )}
            </p>
          </div>
          {flagsLoading ? (
            <p className="text-[13px] text-ink-300 italic">Checking…</p>
          ) : flags.length === 0 ? (
            <p className="text-[14px] text-ink-300 italic">
              Nothing to flag right now. Quiet wedding.
            </p>
          ) : (
            <ul className="grid sm:grid-cols-2 gap-2 stagger">
              {flags.map((f, i) => (
                <li
                  key={i}
                  className={`surface rounded-card border shadow-card px-4 py-3 hover:shadow-cardHover transition-shadow ${
                    f.level === "critical"
                      ? "border-risk-high/30 bg-risk-high/5"
                      : f.level === "warn"
                      ? "border-risk-medium/30 bg-risk-medium/5"
                      : "hairline"
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[10px] uppercase tracking-[0.22em] font-mono text-ink-300">
                      {f.topic}
                    </span>
                    <span
                      className={`text-[10px] uppercase tracking-[0.18em] font-mono ${
                        f.level === "critical"
                          ? "text-risk-high"
                          : f.level === "warn"
                          ? "text-risk-medium"
                          : "text-sage-500"
                      }`}
                    >
                      {f.level}
                    </span>
                  </div>
                  <p className="text-[13.5px] mt-1 leading-snug text-ink">
                    {f.message}
                  </p>
                  <Link
                    href={`/${f.module}`}
                    className="text-[11px] uppercase tracking-[0.18em] text-ink-300 hover:text-sage-500 transition-colors mt-2 inline-block"
                  >
                    Open {f.module} →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </Reveal>

      {/* Jump-to grid, grouped */}
      <section>
        <h2 className="display italic text-[20px] mb-5">Jump to any room</h2>
        <div className="flex flex-col gap-6">
          {(Object.keys(grouped) as (keyof typeof GROUP_LABEL)[]).map((g) => (
            <div key={g}>
              <p className="text-[10px] uppercase tracking-[0.26em] text-sage-500 font-mono mb-3">
                {GROUP_LABEL[g]}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 stagger">
                {grouped[g].map((r) => (
                  <Link
                    key={r.href}
                    href={r.href}
                    className="surface rounded-card border hairline shadow-card p-3 text-[13px] hover:shadow-cardHover hover:border-sage-300 hover:text-sage-500 transition-all"
                  >
                    {r.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
