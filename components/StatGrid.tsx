"use client";

// StatGrid. four big number moments. Display Cormorant numerals with mono
// caps labels and a tiny sage progress bar where there's a target.

import type { ProjectState } from "@/lib/types";
import { CountUp } from "./Atmosphere";

export function StatGrid({ state }: { state: ProjectState }) {
  if (!state.brief) return null;

  // Days until
  const m = state.brief.dateWindow.match(/(\d{4})-(\d{2})-(\d{2})/);
  const dateMs = m ? new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00`).getTime() : NaN;
  const days = Number.isFinite(dateMs) ? Math.max(0, Math.round((dateMs - Date.now()) / (1000 * 60 * 60 * 24))) : null;

  // Vendors locked
  const allVendors = state.vendors.filter((v) => v.status !== "passed");
  const lockedVendors = state.vendors.filter((v) => v.status === "contracted" || v.status === "paid");

  // Decisions resolved
  const totalApprovals = state.approvals.length;
  const resolved = state.approvals.filter((a) => a.status !== "pending").length;

  // Budget committed
  const committed = state.budget.reduce((s, l) => s + l.committedUsd, 0);
  const envelope = state.brief.budgetUsd;

  return (
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-ink/8 rounded-card overflow-hidden border hairline">
      <Stat
        label={days === null ? "Date" : days === 0 ? "Today" : "Days until"}
        bigValue={days === null ? state.brief.dateWindow.split(" ").slice(-1)[0] : undefined}
        bigNumber={days !== null ? days : undefined}
        sub={days === null ? state.brief.dateWindow : undefined}
      />
      <Stat
        label="Vendors locked"
        bigNumber={lockedVendors.length}
        sub={`of ${allVendors.length} in the running`}
        progress={allVendors.length > 0 ? lockedVendors.length / allVendors.length : 0}
      />
      <Stat
        label="Decisions made"
        bigNumber={resolved}
        sub={totalApprovals > 0 ? `of ${totalApprovals}` : "queue empty"}
        progress={totalApprovals > 0 ? resolved / totalApprovals : 0}
      />
      <Stat
        label="Committed"
        bigValue={`$${(committed / 1000).toFixed(0)}k`}
        sub={`of $${(envelope / 1000).toFixed(0)}k envelope`}
        progress={envelope > 0 ? committed / envelope : 0}
        progressTone={committed > envelope ? "high" : "sage"}
      />
    </section>
  );
}

function Stat({
  label, bigNumber, bigValue, sub, progress, progressTone = "sage",
}: {
  label: string;
  bigNumber?: number;
  bigValue?: string;
  sub?: string;
  progress?: number;
  progressTone?: "sage" | "high";
}) {
  return (
    <div className="bg-paper-100 px-5 py-5 flex flex-col gap-2 relative overflow-hidden">
      <div className="text-[10px] uppercase tracking-[0.22em] text-sage-500 font-mono">
        {label}
      </div>
      <div className="display text-[44px] sm:text-[52px] leading-none tabular-nums tracking-tight">
        {bigNumber !== undefined ? <CountUp value={bigNumber} /> : bigValue}
      </div>
      {sub && (
        <div className="text-[12px] text-ink-300 mt-1 leading-snug">
          {sub}
        </div>
      )}
      {progress !== undefined && progress > 0 && (
        <div className="absolute left-0 right-0 bottom-0 h-[2px] bg-ink/5">
          <div
            className={`h-full transition-[width] duration-1000 ease-out ${
              progressTone === "high" ? "bg-risk-high" : "bg-sage-400"
            }`}
            style={{ width: `${Math.min(100, progress * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
