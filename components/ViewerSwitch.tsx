"use client";

import { useProject } from "./StateProvider";
import type { ProjectState, ViewerRole } from "@/lib/types";

const LABEL: Record<ViewerRole, string> = {
  organizer: "Organizer",
  partner: "Partner",
  planner: "Planner",
  vendor: "Vendor",
};

export function ViewerSwitch({ compact = false }: { compact?: boolean }) {
  const { state, setState } = useProject();
  if (!state) return null;

  const switchTo = async (role: ViewerRole) => {
    const r = await fetch("/api/viewer", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const j = (await r.json()) as { state?: ProjectState };
    if (j.state) setState(j.state);
  };

  if (compact) {
    return (
      <select
        value={state.viewer}
        onChange={(e) => switchTo(e.target.value as ViewerRole)}
        className="text-[11px] uppercase tracking-widest bg-transparent border hairline rounded-full px-2 py-1"
      >
        {(["organizer", "partner", "planner", "vendor"] as ViewerRole[]).map((r) => (
          <option key={r} value={r}>{LABEL[r]}</option>
        ))}
      </select>
    );
  }

  return (
    <div>
      <div className="small-caps text-[10px] mb-1.5">Viewing as</div>
      <div className="grid grid-cols-4 gap-1 rounded-full border hairline p-0.5 bg-white/60">
        {(["organizer", "partner", "planner", "vendor"] as ViewerRole[]).map((r) => (
          <button
            key={r}
            onClick={() => switchTo(r)}
            className={`text-[11px] uppercase tracking-widest py-1.5 rounded-full ${
              state.viewer === r ? "bg-ink text-paper-50" : "text-ink-300"
            }`}
          >
            {LABEL[r]}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-ink-300 mt-2 leading-snug">
        Demo helper. The Partner view enforces the dress firewall (PRD §2.3).
      </p>
    </div>
  );
}
