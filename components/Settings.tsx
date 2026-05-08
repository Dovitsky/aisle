"use client";

// Settings — Pull the Plug, Gates, Project metrics, Recent Ledger.

import { useEffect, useState } from "react";
import { MAESTRO_NAMES, type GateConfig, type ProjectState } from "@/lib/types";
import { useProject } from "./StateProvider";
import { maestroName } from "@/lib/displayName";
import { PageHeader } from "./ui";

export function Settings() {
  const { state, setState, loading } = useProject();
  const [busy, setBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [reason, setReason] = useState("");

  if (loading || !state) return <div className="pt-10 text-center text-ink-300">Loading…</div>;

  const togglePause = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/settings", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "pause", paused: !state.paused, reason: !state.paused ? reason || "Manual pause" : undefined }),
      });
      const j = (await r.json()) as { state?: ProjectState };
      if (j.state) setState(j.state);
    } finally { setBusy(false); }
  };

  const reset = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/settings", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "reset" }),
      });
      const j = (await r.json()) as { state?: ProjectState };
      if (j.state) setState(j.state);
      setConfirmReset(false);
    } finally { setBusy(false); }
  };

  const setGate = async (gate: keyof GateConfig, value: boolean) => {
    const r = await fetch("/api/settings", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ op: "gates", gates: { [gate]: value } }),
    });
    const j = (await r.json()) as { state?: ProjectState };
    if (j.state) setState(j.state);
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader eyebrow="Controls" title="Settings" />
      <IntegrationsPanel />
      <div className="grid lg:grid-cols-2 gap-5">

      <section className="surface rounded-card border hairline shadow-card p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="display text-xl">Pull the plug</h2>
          <span className={`small-caps text-[11px] ${state.paused ? "text-risk-high" : "text-risk-low"}`}>
            {state.paused ? "paused" : "live"}
          </span>
        </div>
        <p className="text-[13px] text-ink-300 mt-1 leading-relaxed">
          Suspend every agent. The chat surface stays available; outbound actions stop.
          {state.paused && state.pausedReason && (<><br />Reason: <span className="italic">{state.pausedReason}</span></>)}
        </p>
        {!state.paused && (
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (optional)"
            className="mt-3 w-full rounded-lg border hairline bg-white/80 px-3 py-2 text-sm"
          />
        )}
        <button
          onClick={togglePause}
          disabled={busy}
          className={`mt-3 w-full rounded-2xl py-3 text-sm font-semibold disabled:opacity-50 ${
            state.paused ? "bg-ink text-paper-50" : "bg-risk-high text-paper-50"
          }`}
        >
          {state.paused ? "Resume agents" : "Pause all agents"}
        </button>
      </section>

      <section className="surface rounded-card border hairline shadow-card p-4">
        <h2 className="display text-xl">Gated workflows</h2>
        <p className="text-[13px] text-ink-300 mt-1">
          Each gate hides a subgraph of the project from the partner&apos;s view (PRD §2.3).
        </p>
        <ul className="mt-3 flex flex-col gap-2">
          {([
            { id: "dress" as const, label: "Dress" },
            { id: "partner_gift" as const, label: "Partner gift" },
            { id: "honeymoon" as const, label: "Honeymoon segments" },
            { id: "speech" as const, label: "Speeches & toasts" },
          ]).map((g) => (
            <li key={g.id} className="flex items-center justify-between border-t hairline pt-2 first:border-t-0 first:pt-0">
              <div>
                <div className="text-sm">{g.label}</div>
                <div className="text-[11px] text-ink-300">{state.gates[g.id] ? "On — partner cannot see" : "Off — partner sees everything in this scope"}</div>
              </div>
              <button
                onClick={() => setGate(g.id, !state.gates[g.id])}
                className={`text-[11px] uppercase tracking-widest border rounded-full px-3 py-1 ${
                  state.gates[g.id] ? "bg-ink text-paper-50 border-ink" : "border-ink/15 text-ink-300"
                }`}
              >
                {state.gates[g.id] ? "On" : "Off"}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="surface rounded-card border hairline shadow-card p-4">
        <h2 className="display text-xl">Rename Maestro</h2>
        <p className="text-[13px] text-ink-300 mt-1">
          Currently <span className="display text-ink">{maestroName(state)}</span>. Pick a name your couple actually wants to talk to.
        </p>
        <MaestroNamer />
      </section>

      <section className="surface rounded-card border hairline shadow-card p-4">
        <h2 className="display text-xl">Project</h2>
        <dl className="mt-2 grid grid-cols-[140px_1fr] gap-y-1 text-[13px]">
          <dt className="text-ink-300">Brief</dt>
          <dd>{state.brief?.locked ? "locked" : state.brief ? "draft" : "not started"}</dd>
          <dt className="text-ink-300">Vendors</dt><dd>{state.vendors.length}</dd>
          <dt className="text-ink-300">Households / Guests</dt><dd>{state.households.length} / {state.guests.length}</dd>
          <dt className="text-ink-300">Budget lines</dt><dd>{state.budget.length}</dd>
          <dt className="text-ink-300">Designs</dt><dd>{state.designs.length}</dd>
          <dt className="text-ink-300">Seating tables</dt><dd>{state.seating.tables.length}</dd>
          <dt className="text-ink-300">Approvals</dt>
          <dd>{state.approvals.filter((a) => a.status === "pending").length} pending · {state.approvals.length} total</dd>
          <dt className="text-ink-300">Ledger events</dt><dd>{state.ledger.length}</dd>
          <dt className="text-ink-300">Viewer</dt><dd>{state.viewer}</dd>
        </dl>
      </section>

      <section className="surface rounded-card border border-risk-high/20 shadow-card p-4">
        <h2 className="display text-xl text-risk-high">Reset everything</h2>
        <p className="text-[13px] text-ink-300 mt-1">
          Wipes the brief, vendors, guests, designs, seating, day-of, thank-yous, chat, approvals, and ledger.
        </p>
        {confirmReset ? (
          <div className="mt-3 flex gap-2">
            <button onClick={() => setConfirmReset(false)} disabled={busy} className="flex-1 rounded-2xl border hairline bg-white/80 py-3 text-sm font-medium disabled:opacity-50">Cancel</button>
            <button onClick={reset} disabled={busy} className="flex-1 rounded-2xl bg-risk-high text-paper-50 py-3 text-sm font-semibold disabled:opacity-50">{busy ? "Resetting…" : "Yes, reset"}</button>
          </div>
        ) : (
          <button onClick={() => setConfirmReset(true)} className="mt-3 w-full rounded-2xl border border-risk-high/30 text-risk-high py-3 text-sm font-medium">
            Reset project
          </button>
        )}
      </section>

      <section className="surface rounded-card border hairline shadow-card p-4 lg:col-span-2">
        <h2 className="display text-xl">Recent ledger</h2>
        <p className="text-[13px] text-ink-300 mt-1">
          Append-only audit. Every agent action and human decision lands here (PRD §6.2).
        </p>
        <ul className="mt-3 flex flex-col gap-2 max-h-[360px] overflow-y-auto">
          {state.ledger.slice().reverse().slice(0, 30).map((e) => (
            <li key={e.id} className="text-[12px] border-t hairline pt-2 first:border-t-0 first:pt-0">
              <div className="flex justify-between text-ink-300">
                <span className="small-caps">{e.kind}{e.gateScope ? ` · gate:${e.gateScope}` : ""}</span>
                <time>{new Date(e.at).toLocaleString()}</time>
              </div>
              <div className="text-[13px] text-ink mt-0.5">{e.summary}</div>
            </li>
          ))}
          {state.ledger.length === 0 && (
            <li className="text-[13px] text-ink-300 italic">Ledger is empty.</li>
          )}
        </ul>
      </section>

      <p className="lg:col-span-2 text-[11px] text-ink-300 text-center">
        AISLE v0 · {process.env.NEXT_PUBLIC_BUILD ?? "local build"}
      </p>
      </div>
    </div>
  );
}

function MaestroNamer() {
  const { state, setState } = useProject();
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);
  const current = maestroName(state);

  const setName = async (name: string | null) => {
    setBusy(true);
    try {
      const r = await fetch("/api/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "maestro_name", name }),
      });
      const j = (await r.json()) as { state?: ProjectState };
      if (j.state) setState(j.state);
      setCustom("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-[260px] overflow-y-auto pr-1">
        {MAESTRO_NAMES.map((n) => {
          const active = n === current;
          return (
            <button
              key={n}
              onClick={() => setName(n === "Maestro" ? null : n)}
              disabled={busy}
              className={`text-left text-[12px] rounded-lg border px-2.5 py-1.5 transition-colors ${
                active
                  ? "bg-ink text-paper-50 border-ink"
                  : "border-ink/15 text-ink-400 hover:border-ink/30 bg-white/60"
              } disabled:opacity-50`}
            >
              {n}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex gap-2">
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && custom.trim() && setName(custom.trim())}
          placeholder="Custom name…"
          maxLength={80}
          className="flex-1 rounded-lg border hairline bg-white/80 px-3 py-2 text-sm"
        />
        <button
          onClick={() => custom.trim() && setName(custom.trim())}
          disabled={busy || !custom.trim()}
          className="rounded-2xl bg-ink text-paper-50 px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          Set
        </button>
      </div>
    </div>
  );
}

// Gmail + Supabase status panel.
function IntegrationsPanel() {
  const [status, setStatus] = useState<{
    googleOauthConfigured: boolean;
    supabaseConfigured: boolean;
    connected: boolean;
    emailAddress: string | null;
  } | null>(null);

  useEffect(() => {
    void fetch("/api/gmail/status").then((r) => r.json()).then((j) => setStatus(j));
  }, []);

  if (!status) return null;

  return (
    <section className="surface rounded-card border hairline shadow-card p-4 sm:p-5">
      <h2 className="display text-xl mb-3">Integrations</h2>
      <div className="grid sm:grid-cols-2 gap-3 text-sm">
        <div className="rounded-card border hairline bg-white/60 p-3">
          <div className="flex items-baseline justify-between">
            <div className="display text-base">Gmail</div>
            <span className={`eyebrow ${status.connected ? "text-risk-low" : "text-ink-300"}`}>
              {status.connected ? "✓ connected" : status.googleOauthConfigured ? "ready" : "demo mode"}
            </span>
          </div>
          <p className="text-[12px] text-ink-300 mt-1">
            {status.connected
              ? <>Connected as <span className="font-mono">{status.emailAddress}</span></>
              : status.googleOauthConfigured
                ? "OAuth configured. Open Inbox to connect."
                : "Set GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET + GOOGLE_REDIRECT_URI to enable. Demo mode runs against a simulated inbox."}
          </p>
          <a href="/inbox" className="mt-3 inline-block text-[12px] text-accent hover:text-accent-soft transition-colors">
            Open Inbox →
          </a>
        </div>
        <div className="rounded-card border hairline bg-white/60 p-3">
          <div className="flex items-baseline justify-between">
            <div className="display text-base">Database</div>
            <span className={`eyebrow ${status.supabaseConfigured ? "text-risk-low" : "text-ink-300"}`}>
              {status.supabaseConfigured ? "✓ Postgres" : "JSON file"}
            </span>
          </div>
          <p className="text-[12px] text-ink-300 mt-1">
            {status.supabaseConfigured
              ? "Connected to Supabase. RLS enforces the dress firewall at the row level."
              : "Using data/store.json. To switch to Postgres: create a Supabase project, run supabase/migrations/0001_initial.sql, set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local."}
          </p>
        </div>
      </div>
    </section>
  );
}
