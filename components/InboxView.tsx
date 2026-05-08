"use client";

// Inbox — connect Gmail, scan vendor replies, see what Triage parsed and what
// AISLE did with each message.

import Link from "next/link";
import { useEffect, useState } from "react";
import { useProject } from "./StateProvider";
import { EmptyState, PageHeader, Stat } from "./ui";

interface InboxStatus {
  googleOauthConfigured: boolean;
  supabaseConfigured: boolean;
  connected: boolean;
  emailAddress: string | null;
  lastScanAt: string | null;
  scanFilter: string | null;
  messages: Array<{
    id: string;
    gmailMessageId: string;
    fromAddr: string;
    subject: string;
    snippet: string;
    receivedAt: string;
    parsedIntent?: string;
    quotedUsd?: number;
    matchedVendorId?: string;
    outcome?: string;
    approvalId?: string;
    scannedAt: string;
  }>;
}

const INTENT_TONE: Record<string, string> = {
  available: "border-risk-low/30 text-risk-low bg-risk-low/5",
  unavailable: "border-ink/15 text-ink-300 bg-paper-200/40",
  needs_info: "border-risk-medium/30 text-risk-medium bg-risk-medium/5",
  out_of_office: "border-ink/15 text-ink-300 bg-paper-200/40",
  unknown: "border-ink/15 text-ink-300 bg-paper-200/40",
};

const OUTCOME_TONE: Record<string, string> = {
  matched_to_vendor: "text-risk-low",
  unmatched: "text-risk-medium",
  spam: "text-ink-300",
  noise: "text-ink-300",
};

export function InboxView() {
  const { state } = useProject();
  const [status, setStatus] = useState<InboxStatus | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<{ scanned: number; matched: number; unmatched: number; approvalsQueued: number } | null>(null);

  const load = async () => {
    const r = await fetch("/api/gmail/status");
    const j = (await r.json()) as InboxStatus;
    setStatus(j);
  };

  useEffect(() => { void load(); }, []);

  const scan = async () => {
    setBusy("scan"); setError(null); setScanResult(null);
    try {
      const r = await fetch("/api/gmail/scan", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
      const j = await r.json() as { ok: boolean; scanned: number; matched: number; unmatched: number; approvalsQueued: number; errors?: string[]; error?: string };
      if (!r.ok) { setError(j.error ?? `Error ${r.status}`); return; }
      setScanResult({ scanned: j.scanned, matched: j.matched, unmatched: j.unmatched, approvalsQueued: j.approvalsQueued });
      if (j.errors && j.errors.length) setError(j.errors.join("; "));
      await load();
    } finally { setBusy(null); }
  };

  const disconnect = async () => {
    if (!confirm("Disconnect Gmail? You can reconnect anytime.")) return;
    setBusy("disc");
    try {
      await fetch("/api/gmail/disconnect", { method: "POST" });
      await load();
    } finally { setBusy(null); }
  };

  if (!status) return <div className="pt-10 text-center text-ink-300">Loading inbox…</div>;

  const vendorsById = new Map((state?.vendors ?? []).map((v) => [v.id, v]));
  const fmtAgo = (iso: string) => {
    const d = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(d / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  const matchedCount = status.messages.filter((m) => m.outcome === "matched_to_vendor").length;
  const unmatchedCount = status.messages.filter((m) => m.outcome === "unmatched").length;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Triage · Gmail"
        title="Inbox"
        subtitle={
          status.connected
            ? <>Connected to <span className="font-mono text-ink">{status.emailAddress}</span>. Scans pull vendor replies, run them through Triage, match to your vendor records, and draft responses you can approve.</>
            : <>Connect your Gmail and AISLE will scan vendor replies for you, parse intent and pricing, draft responses, and surface Approval Cards.</>
        }
      />

      {/* Connection panel */}
      <section className="surface rounded-card border hairline shadow-card p-4 sm:p-5">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <div>
            <div className="display text-lg">{status.connected ? "Gmail connected" : "Connect Gmail"}</div>
            <div className="text-[12px] text-ink-300 mt-0.5">
              {status.connected
                ? <>Filter: <span className="font-mono">{status.scanFilter}</span>{status.lastScanAt && <> · last scan {fmtAgo(status.lastScanAt)} ago</>}</>
                : status.googleOauthConfigured
                  ? "Google OAuth is configured. Click connect to grant gmail.readonly + gmail.send + gmail.modify."
                  : "Demo mode — no Google credentials configured. Scan still works against a simulated inbox so you can see the flow."}
            </div>
          </div>
          {status.connected ? (
            <button
              onClick={disconnect}
              disabled={!!busy}
              className="rounded-2xl border border-risk-high/30 text-risk-high hover:bg-risk-high/5 px-4 py-2 text-sm transition-colors disabled:opacity-50"
            >
              {busy === "disc" ? "…" : "Disconnect"}
            </button>
          ) : status.googleOauthConfigured ? (
            <a
              href="/api/gmail/connect"
              className="rounded-2xl bg-ink text-paper-50 hover:bg-ink-400 px-4 py-2 text-sm font-medium transition-colors"
            >
              Connect Gmail →
            </a>
          ) : null}
        </div>
      </section>

      {/* Scan trigger */}
      <section className="surface rounded-card border hairline shadow-card p-4 sm:p-5 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="display text-lg">{status.connected ? "Scan inbox" : "Scan simulated inbox"}</div>
          <div className="text-[12px] text-ink-300 mt-0.5">
            Pulls up to 25 new messages, runs Triage on each, matches to vendors, and queues follow-up Approval Cards.
          </div>
        </div>
        <button
          onClick={scan}
          disabled={!!busy}
          className="rounded-2xl bg-ink text-paper-50 hover:bg-ink-400 px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {busy === "scan" ? "Scanning…" : "Scan now"}
        </button>
      </section>

      {scanResult && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 stagger animate-fade-in-soft">
          <Stat label="Scanned" value={scanResult.scanned} />
          <Stat label="Matched" value={scanResult.matched} tone="low" />
          <Stat label="Unmatched" value={scanResult.unmatched} tone="medium" />
          <Stat label="Cards queued" value={scanResult.approvalsQueued} tone="low" />
        </div>
      )}

      {error && <div className="rounded-card border border-risk-high/30 bg-risk-high/5 px-4 py-3 text-sm text-risk-high">{error}</div>}

      {/* Stats */}
      {status.messages.length > 0 && !scanResult && (
        <div className="grid grid-cols-3 gap-3 max-w-md stagger">
          <Stat label="Messages" value={status.messages.length} />
          <Stat label="Matched" value={matchedCount} tone="low" />
          <Stat label="Unmatched" value={unmatchedCount} tone="medium" />
        </div>
      )}

      {/* Messages */}
      {status.messages.length === 0 ? (
        <EmptyState
          title="No messages yet"
          hint={status.connected ? "Click 'Scan now' to pull recent vendor replies." : status.googleOauthConfigured ? "Connect Gmail above to start scanning." : "Click 'Scan now' to demo with a simulated inbox of 5 vendor replies."}
        />
      ) : (
        <ul className="flex flex-col gap-2 stagger">
          {status.messages.map((m) => {
            const vendor = m.matchedVendorId ? vendorsById.get(m.matchedVendorId) : null;
            return (
              <li key={m.id} className="surface rounded-card border hairline shadow-card hover:shadow-cardHover transition-shadow p-4">
                <div className="flex items-baseline justify-between gap-2 flex-wrap">
                  <div className="min-w-0">
                    <div className="text-[14px] font-medium truncate">{m.subject || "(no subject)"}</div>
                    <div className="text-[12px] text-ink-300 truncate">{m.fromAddr}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {m.parsedIntent && (
                      <span className={`text-[10px] uppercase tracking-[0.14em] border rounded-full px-2 py-0.5 ${INTENT_TONE[m.parsedIntent] ?? INTENT_TONE.unknown}`}>
                        {m.parsedIntent.replace(/_/g, " ")}
                      </span>
                    )}
                    {m.quotedUsd && (
                      <span className="text-[11px] text-accent font-medium tabular-nums">${m.quotedUsd.toLocaleString()}</span>
                    )}
                    <span className="text-[11px] text-ink-300 tabular-nums">{fmtAgo(m.receivedAt)}</span>
                  </div>
                </div>
                <p className="text-[13px] text-ink-400 mt-2 leading-relaxed">{m.snippet}</p>
                <div className="mt-3 flex items-center justify-between gap-2 flex-wrap text-[12px]">
                  <div className="flex items-center gap-3">
                    <span className={OUTCOME_TONE[m.outcome ?? "unmatched"] ?? ""}>
                      {m.outcome === "matched_to_vendor" && vendor && <>✓ matched to <Link href={`/vendors`} className="underline-offset-4 hover:underline">{vendor.name}</Link></>}
                      {m.outcome === "matched_to_vendor" && !vendor && "✓ matched"}
                      {m.outcome === "unmatched" && "Unmatched — manually associate or ignore"}
                      {m.outcome === "noise" && "✕ filtered as marketing/noise"}
                      {m.outcome === "spam" && "✕ filtered as spam"}
                    </span>
                  </div>
                  {m.approvalId && (
                    <Link href="/approvals" className="text-accent hover:text-accent-soft transition-colors">
                      Card queued →
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
