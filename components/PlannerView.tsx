"use client";

// Planner dashboard — the planner CRM view (PRD §2.1, §9.1 Planner tier).

import Link from "next/link";
import { useEffect, useState } from "react";
import { useProject } from "./StateProvider";
import { PageHeader, Stat } from "./ui";

interface WatcherFlag { level: "info" | "warn" | "critical"; topic: string; message: string; module: string }

export function PlannerView() {
  const { state, loading } = useProject();
  const [flags, setFlags] = useState<WatcherFlag[]>([]);

  useEffect(() => {
    void fetch("/api/watcher").then((r) => r.json()).then((j) => setFlags(j.flags ?? []));
  }, [state?.brief?.locked, state?.approvals.length]);

  if (loading || !state) return <div className="pt-10 text-center text-ink-300">Loading…</div>;

  const pending = state.approvals.filter((a) => a.status === "pending");
  const yes = state.guests.filter((g) => g.rsvp === "yes").length;
  const planSum = state.budget.reduce((s, l) => s + l.planUsd, 0);
  const committedSum = state.budget.reduce((s, l) => s + l.committedUsd, 0);
  const venueContracted = state.vendors.find((v) => v.category === "Venue" && (v.status === "contracted" || v.status === "paid"));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Planner CRM"
        title={state.brief ? <>{state.brief.organizerName} <span className="text-ink-300">&</span> {state.brief.partnerName}</> : "Planner dashboard"}
        subtitle="The planner override view. Drop straight into any module from here."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger">
        <Stat label="Pending" value={pending.length} tone={pending.length > 5 ? "high" : "ink"} />
        <Stat label="Confirmed RSVPs" value={yes} />
        <Stat label="Plan / Committed" value={`$${(planSum / 1000).toFixed(0)}k / $${(committedSum / 1000).toFixed(0)}k`} />
        <Stat label="Venue" value={venueContracted ? "Contracted" : "Open"} tone={venueContracted ? "low" : "medium"} />
      </div>

      <section>
        <h2 className="eyebrow mb-2">Watcher</h2>
        <ul className="grid sm:grid-cols-2 gap-2 stagger">
          {flags.map((f, i) => (
            <li key={i} className={`surface rounded-card border shadow-card px-3 py-2.5 text-sm ${
              f.level === "critical" ? "border-risk-high/30 bg-risk-high/5" :
              f.level === "warn" ? "border-risk-medium/30 bg-risk-medium/5" :
              "hairline"
            }`}>
              <div className="eyebrow">{f.topic}</div>
              <div className="text-[13px] mt-0.5 leading-snug">{f.message}</div>
            </li>
          ))}
          {flags.length === 0 && <li className="text-sm text-ink-300 italic surface rounded-card border hairline shadow-card px-3 py-2.5">All clear.</li>}
        </ul>
      </section>

      <section>
        <h2 className="eyebrow mb-2">Jump to</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 stagger">
          {[
            ["/", "Today"], ["/timeline", "Plan"], ["/approvals", "Queue"],
            ["/vendors", "Vendors"], ["/budget", "Budget"], ["/guests", "Guests"],
            ["/wedding-party", "Wedding party"],
            ["/design", "Design"], ["/florals", "Florals"], ["/seating", "Seating"],
            ["/stationery", "Stationery"], ["/website", "Website"],
            ["/logistics", "Logistics"], ["/rentals", "Rentals"],
            ["/personal-prep", "Personal prep"], ["/dress", "Dress"],
            ["/ceremony", "Ceremony"], ["/music", "Music"], ["/cake", "Cake"], ["/bar", "Bar"],
            ["/beauty", "Hair & makeup"], ["/visits", "Visits"], ["/license", "License"],
            ["/day-of", "Day-of"], ["/tips", "Tips"], ["/thanks", "Thank-yous"],
            ["/registry", "Registry"], ["/honeymoon", "Honeymoon"], ["/engagement", "Engagement"],
            ["/pre-events", "Pre-events"], ["/memorials", "Memorials"],
          ].map(([href, label]) => (
            <Link key={href} href={href} className="surface rounded-card border hairline shadow-card p-3 text-sm hover:shadow-cardHover hover:text-accent transition-all">
              {label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
