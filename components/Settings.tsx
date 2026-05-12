"use client";

// Settings. Pull the Plug, Gates, Project metrics, Recent Ledger.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MAESTRO_NAMES, type GateConfig, type ProjectState } from "@/lib/types";
import { useProject } from "./StateProvider";
import { useToast } from "./Toast";
import { maestroName } from "@/lib/displayName";
import { PageHeader } from "./ui";
import { ConnectGmailWizard } from "./ConnectGmailWizard";

export function Settings() {
  const { state, setState, loading } = useProject();
  const { notify } = useToast();
  const router = useRouter();
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

  const loadDemo = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/settings", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "load_demo" }),
      });
      const j = (await r.json().catch(() => ({}))) as { state?: ProjectState; error?: string };
      if (!r.ok || !j.state) {
        notify({
          kind: "error",
          title: "Couldn't load the example",
          detail: j.error ?? `The server returned ${r.status}. Reload the page and try again.`,
        });
        return;
      }
      setState(j.state);
      notify({
        kind: "approval",
        agent: "Maestro",
        title: "The example wedding is loaded",
        detail: "Maya & Sam, September 2026 in the Hudson Valley.",
        duration: 6000,
      });
      // Take the user to the dashboard so they immediately see the populated
      // state. without this, they'd stay on /settings and wonder if it
      // worked.
      router.push("/");
    } catch (e) {
      notify({
        kind: "error",
        title: "Couldn't reach the agents",
        detail: e instanceof Error ? e.message : "Check your connection and try again.",
      });
    } finally { setBusy(false); }
  };

  const exitDemo = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/settings", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "exit_demo" }),
      });
      const j = (await r.json().catch(() => ({}))) as { state?: ProjectState; error?: string };
      if (!r.ok || !j.state) {
        notify({ kind: "error", title: "Couldn't update settings", detail: j.error ?? "Try again." });
        return;
      }
      setState(j.state);
      notify({ kind: "info", title: "This is yours now", detail: "Edit anything; Maestro will follow." });
    } catch (e) {
      notify({ kind: "error", title: "Couldn't update settings", detail: e instanceof Error ? e.message : "Try again." });
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

      {/* Demo Mode. load a fully populated state for end-to-end app demo. */}
      <section className="surface rounded-card border hairline shadow-card p-5 relative overflow-hidden">
        {state.demoMode && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "linear-gradient(135deg, rgba(168,181,160,0.08), transparent 60%)" }}
            aria-hidden
          />
        )}
        <div className="relative">
          <div className="flex items-baseline justify-between">
            <h2 className="display text-xl">See an example wedding</h2>
            <span className={`small-caps text-[11px] ${state.demoMode ? "text-sage-500" : "text-ink-300"}`}>
              {state.demoMode ? "viewing example" : "your wedding"}
            </span>
          </div>
          <p className="text-[13.5px] text-ink-300 mt-2 leading-relaxed">
            See Corsia the way it looks once it&apos;s really humming. We&apos;ll drop you into a finished example. Maya & Sam, a barn wedding in the Hudson Valley, a hundred and twenty guests, a fully booked vendor team, mood directions picked, the budget allocated, the ceremony script written, the menu set, the seating ready to chart, vows and speeches drafted, the day-of timeline laid out. Wander any room, click any button, see how it all moves together.
          </p>
          <p className="text-[12.5px] text-ink-400 mt-3 italic">
            This replaces what&apos;s currently here. You can reset to an empty start any time.
          </p>
          <div className="mt-3 flex gap-2">
            {!state.demoMode ? (
              <button
                onClick={loadDemo}
                disabled={busy}
                className="rounded-2xl cta-sage px-5 py-3 text-sm font-semibold disabled:opacity-50 transition-colors"
                style={{ boxShadow: "0 8px 22px -10px rgba(79,93,68,0.55)" }}
              >
                {busy ? "Setting it up…" : "Show me the example wedding →"}
              </button>
            ) : (
              <>
                <button
                  onClick={exitDemo}
                  disabled={busy}
                  className="rounded-2xl bg-paper-200/70 text-ink hover:bg-paper-200 px-5 py-3 text-sm font-semibold disabled:opacity-50 transition-colors"
                >
                  Make this mine
                </button>
                <button
                  onClick={loadDemo}
                  disabled={busy}
                  className="rounded-2xl border hairline bg-white/70 text-ink-400 hover:text-ink px-5 py-3 text-sm font-medium disabled:opacity-50 transition-colors"
                >
                  Start the example over
                </button>
              </>
            )}
          </div>
        </div>
      </section>

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
                <div className="text-[11px] text-ink-300">{state.gates[g.id] ? "On. partner cannot see" : "Off. partner sees everything in this scope"}</div>
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
          <dt className="text-ink-300">Dossier</dt>
          <dd>{state.brief?.locked ? "sealed" : state.brief ? "draft" : "not started"}</dd>
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
          Wipes the dossier, vendors, guests, designs, seating, day-of, thank-yous, chat, approvals, and ledger.
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
        Corsia v0 · {process.env.NEXT_PUBLIC_BUILD ?? "local build"}
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
          className="cta-sage rounded-2xl px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          Set
        </button>
      </div>
    </div>
  );
}

// Connections status panel. Gmail, Sync, AI keys.
function IntegrationsPanel() {
  const [status, setStatus] = useState<{
    googleOauthConfigured: boolean;
    supabaseConfigured: boolean;
    anthropicConfigured: boolean;
    openaiConfigured: boolean;
    connected: boolean;
    emailAddress: string | null;
  } | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const refresh = () =>
    fetch("/api/gmail/status").then((r) => r.json()).then((j) => setStatus(j));

  useEffect(() => {
    void refresh();
  }, []);

  const handleDisconnect = async () => {
    if (disconnecting) return;
    setDisconnecting(true);
    try {
      await fetch("/api/gmail/disconnect", { method: "POST" });
      await refresh();
    } finally {
      setDisconnecting(false);
    }
  };

  if (!status) return null;

  return (
    <section className="surface rounded-card border hairline shadow-card p-5 sm:p-6">
      <h2 className="display text-xl">Connections</h2>
      <p className="text-[13px] text-ink-300 mt-1 leading-relaxed">
        Tools we connect to on your behalf. None of these are required. Corsia works perfectly without any of them, with everything you do staying private to your device.
      </p>
      <div className="grid sm:grid-cols-2 gap-3 mt-4">
        <div className="rounded-card border hairline bg-white/60 p-4 flex flex-col">
          <div className="flex items-baseline justify-between">
            <div className="display text-base">Email. Gmail</div>
            <span className={`eyebrow ${status.connected ? "text-sage-500" : "text-ink-300"}`}>
              {status.connected ? "connected" : status.googleOauthConfigured ? "ready" : "not set up"}
            </span>
          </div>
          <p className="text-[12.5px] text-ink-300 mt-2 leading-relaxed flex-1">
            {status.connected
              ? <>Watching <span className="italic">{status.emailAddress}</span> for vendor replies and sending your approved drafts.</>
              : "Connect once. We'll watch for vendor replies, match them to your shortlist, and draft your follow-ups for approval. Send only ever happens after you say yes."}
          </p>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            {status.connected ? (
              <>
                <a
                  href="/inbox"
                  className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-white hover:bg-ink/[0.03] px-3.5 py-1.5 text-[11.5px] uppercase tracking-[0.20em] font-mono text-ink transition-colors"
                >
                  Open inbox <span aria-hidden>→</span>
                </a>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="inline-flex items-center rounded-full px-3 py-1.5 text-[11.5px] uppercase tracking-[0.20em] font-mono text-ink-300 hover:text-ink transition-colors disabled:opacity-50"
                >
                  {disconnecting ? "Disconnecting…" : "Disconnect"}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setWizardOpen(true)}
                className="cta-sage inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[11.5px] uppercase tracking-[0.20em] font-mono transition-all"
              >
                Connect Gmail <span aria-hidden>→</span>
              </button>
            )}
          </div>
        </div>
        <div className="rounded-card border hairline bg-white/60 p-4">
          <div className="flex items-baseline justify-between">
            <div className="display text-base">Sync across devices</div>
            <span className={`eyebrow ${status.supabaseConfigured ? "text-sage-500" : "text-ink-300"}`}>
              {status.supabaseConfigured ? "live" : "this device only"}
            </span>
          </div>
          <p className="text-[12.5px] text-ink-300 mt-2 leading-relaxed">
            {status.supabaseConfigured
              ? "Your wedding syncs to your partner's phone in real time. Privacy gates (the dress, surprise gifts) stay enforced from the database itself. your partner can't see what you've gated even if they look."
              : "Your wedding lives on this device for now. When you're ready to bring your partner in or use it from your phone, your Corsia team can flip syncing on."}
          </p>
        </div>
        <div className="rounded-card border hairline bg-white/60 p-4">
          <div className="flex items-baseline justify-between">
            <div className="display text-base">Anthropic. agent reasoning</div>
            <span className={`eyebrow ${status.anthropicConfigured ? "text-sage-500" : "text-ink-300"}`}>
              {status.anthropicConfigured ? "connected" : "not connected"}
            </span>
          </div>
          <p className="text-[12.5px] text-ink-300 mt-2 leading-relaxed">
            {status.anthropicConfigured
              ? "Maestro and the specialists are using Anthropic's models for chat, drafting, and analysis. All 26 agents online."
              : "Without an Anthropic key, the agents fall back to deterministic rule-based outputs. still functional for the demo flow, just less nuanced. Add ANTHROPIC_API_KEY to .env.local to unlock the full agent intelligence."}
          </p>
        </div>
        <div className="rounded-card border hairline bg-white/60 p-4">
          <div className="flex items-baseline justify-between">
            <div className="display text-base">OpenAI. image generation</div>
            <span className={`eyebrow ${status.openaiConfigured ? "text-sage-500" : "text-ink-300"}`}>
              {status.openaiConfigured ? "connected" : "not connected"}
            </span>
          </div>
          <p className="text-[12.5px] text-ink-300 mt-2 leading-relaxed">
            {status.openaiConfigured
              ? "Mood-board generation, design hero renders, and dress-concept visuals all use OpenAI gpt-image-1. Daily cap of 40 images per project applies."
              : <>Without an OpenAI key, the Mood Board generator and the &quot;Render visuals&quot; buttons on /design and /dress show sage-pale samples instead of real photographs. Add <span className="font-mono">OPENAI_API_KEY</span> to <span className="font-mono">.env.local</span> to flip on real renders.</>}
          </p>
        </div>
      </div>

      <ConnectGmailWizard
        open={wizardOpen}
        onClose={() => {
          setWizardOpen(false);
          void refresh();
        }}
      />
    </section>
  );
}
