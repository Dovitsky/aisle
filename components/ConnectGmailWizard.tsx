"use client";

// One-click Gmail connect wizard.
//
// Three steps:
//   1. Walk the user to the right Google Cloud Console pages and give them
//      the exact redirect URI to paste in.
//   2. Capture their client ID + secret and POST to /api/gmail/credentials.
//      That persists to data/gmail-credentials.json which the OAuth client
//      picks up immediately. no dev server restart required.
//   3. Hand off to /api/gmail/connect which triggers the Google consent page.
//
// On a fresh install this is ~90 seconds end-to-end.

import { useEffect, useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  onConnected?: () => void;
}

type WizardStep = "intro" | "credentials" | "ready";

interface CredentialsStatus {
  configured: boolean;
  source: "env" | "wizard" | null;
  redirectUri: string;
}

export function ConnectGmailWizard({ open, onClose, onConnected }: Props) {
  const [step, setStep] = useState<WizardStep>("intro");
  const [status, setStatus] = useState<CredentialsStatus | null>(null);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Load credential status when the wizard opens.
  useEffect(() => {
    if (!open) return;
    void fetch("/api/gmail/credentials")
      .then((r) => r.json() as Promise<CredentialsStatus>)
      .then((s) => {
        setStatus(s);
        setStep(s.configured ? "ready" : "intro");
      })
      .catch(() => setStatus({ configured: false, source: null, redirectUri: "" }));
  }, [open]);

  const copyRedirect = async () => {
    if (!status?.redirectUri) return;
    try {
      await navigator.clipboard.writeText(status.redirectUri);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked. that's fine */
    }
  };

  const saveCredentials = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const r = await fetch("/api/gmail/credentials", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clientId: clientId.trim(),
          clientSecret: clientSecret.trim(),
        }),
      });
      const j = (await r.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;
      if (!r.ok || !j?.ok) {
        throw new Error(j?.error ?? "Couldn't save those credentials. Double-check and try again.");
      }
      setStatus({ configured: true, source: "wizard", redirectUri: status?.redirectUri ?? "" });
      setStep("ready");
      // Clear the secret from memory once it's been persisted.
      setClientSecret("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const goToOAuth = () => {
    onConnected?.();
    window.location.href = "/api/gmail/connect";
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="fixed inset-0 z-50 bg-ink/35 backdrop-blur-[3px] animate-fade-in-soft"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="connect-gmail-title"
        className="fixed inset-0 z-[51] flex items-center justify-center p-4 pointer-events-none"
      >
        <div
          className="pointer-events-auto bg-white rounded-2xl shadow-2xl w-full max-w-[520px] max-h-[90vh] overflow-y-auto"
          style={{
            border: "1px solid rgba(14,15,13,0.08)",
            boxShadow:
              "0 30px 80px -20px rgba(14,15,13,0.30), 0 8px 24px -8px rgba(14,15,13,0.18)",
          }}
        >
          {/* Header */}
          <header className="px-7 pt-7 pb-5 border-b border-ink/5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <GmailGlyph />
                <div>
                  <h2
                    id="connect-gmail-title"
                    className="display text-[22px] leading-tight text-ink"
                    style={{ fontWeight: 400 }}
                  >
                    Connect Gmail
                  </h2>
                  <p className="text-[11px] uppercase tracking-[0.22em] font-mono text-sage-deep mt-1">
                    {step === "ready" ? "Step 3 of 3" : step === "credentials" ? "Step 2 of 3" : "Step 1 of 3"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="w-8 h-8 inline-flex items-center justify-center rounded-full text-ink/45 hover:text-ink hover:bg-ink/[0.04] transition-all"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                  <path d="M2 2 L10 10 M10 2 L2 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </header>

          {/* Step body */}
          <div className="px-7 py-6">
            {step === "intro" && status && (
              <IntroStep
                redirectUri={status.redirectUri}
                copied={copied}
                onCopy={copyRedirect}
                onContinue={() => setStep("credentials")}
              />
            )}

            {step === "credentials" && (
              <CredentialsStep
                clientId={clientId}
                clientSecret={clientSecret}
                saving={saving}
                error={error}
                onClientIdChange={setClientId}
                onClientSecretChange={setClientSecret}
                onBack={() => setStep("intro")}
                onSave={saveCredentials}
              />
            )}

            {step === "ready" && status && (
              <ReadyStep source={status.source} onConnect={goToOAuth} />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------- Step 1 ---

function IntroStep({
  redirectUri,
  copied,
  onCopy,
  onContinue,
}: {
  redirectUri: string;
  copied: boolean;
  onCopy: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="space-y-5">
      <p className="text-[14px] leading-relaxed text-ink-400">
        We need a Google OAuth client to read replies from your vendors and send
        emails on your behalf. Setup takes about 90 seconds and your tokens stay
        on this device.
      </p>

      <ol className="space-y-3">
        <Step
          num="1"
          title="Open the OAuth client page"
          body={
            <>
              In Google Cloud Console → APIs &amp; Services → Credentials. We'll
              open it in a new tab.
            </>
          }
          action={
            <a
              href="https://console.cloud.google.com/apis/credentials/oauthclient"
              target="_blank"
              rel="noreferrer"
              className="cta-sage inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12px] uppercase tracking-[0.20em] font-mono"
            >
              Open Google Cloud <span aria-hidden>↗</span>
            </a>
          }
        />
        <Step
          num="2"
          title="Choose Web application"
          body={
            <>
              Application type → <span className="font-medium">Web application</span>. Name it whatever you want.
            </>
          }
        />
        <Step
          num="3"
          title="Paste this redirect URI"
          body={
            <>
              Add it under <span className="font-medium">Authorized redirect URIs</span>.
              <div className="mt-2 flex items-stretch gap-2 rounded-lg bg-paper-200 border border-ink/8 overflow-hidden">
                <code className="flex-1 px-3 py-2 text-[12px] font-mono text-ink truncate">
                  {redirectUri}
                </code>
                <button
                  type="button"
                  onClick={onCopy}
                  className="px-3 text-[10.5px] uppercase tracking-[0.18em] font-mono border-l border-ink/8 hover:bg-ink/[0.04] text-ink transition-colors"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </>
          }
        />
        <Step
          num="4"
          title="Enable the Gmail API"
          body={
            <>
              One-time, in the same project.{" "}
              <a
                href="https://console.cloud.google.com/apis/library/gmail.googleapis.com"
                target="_blank"
                rel="noreferrer"
                className="text-sage-deep underline-offset-2 hover:underline"
              >
                Enable Gmail API ↗
              </a>
            </>
          }
        />
      </ol>

      <div className="pt-2 flex justify-end">
        <button
          type="button"
          onClick={onContinue}
          className="cta-sage inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-[12.5px] font-medium tracking-wide transition-all"
        >
          I've got my credentials <span aria-hidden>→</span>
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Step 2 ---

function CredentialsStep({
  clientId,
  clientSecret,
  saving,
  error,
  onClientIdChange,
  onClientSecretChange,
  onBack,
  onSave,
}: {
  clientId: string;
  clientSecret: string;
  saving: boolean;
  error: string | null;
  onClientIdChange: (v: string) => void;
  onClientSecretChange: (v: string) => void;
  onBack: () => void;
  onSave: () => void;
}) {
  const canSave =
    clientId.trim().endsWith(".apps.googleusercontent.com") &&
    clientSecret.trim().length > 10 &&
    !saving;
  return (
    <div className="space-y-5">
      <p className="text-[14px] leading-relaxed text-ink-400">
        Paste the two values from your new OAuth client. They live on this device only.
      </p>

      <Labeled label="Client ID">
        <input
          type="text"
          value={clientId}
          onChange={(e) => onClientIdChange(e.target.value)}
          placeholder="123…apps.googleusercontent.com"
          autoComplete="off"
          spellCheck={false}
          className="w-full rounded-lg border border-ink/12 bg-white px-3 py-2.5 text-[14px] font-mono focus:outline-none focus:border-sage-deep transition-colors"
        />
      </Labeled>

      <Labeled label="Client secret">
        <input
          type="password"
          value={clientSecret}
          onChange={(e) => onClientSecretChange(e.target.value)}
          placeholder="GOCSPX-…"
          autoComplete="off"
          spellCheck={false}
          className="w-full rounded-lg border border-ink/12 bg-white px-3 py-2.5 text-[14px] font-mono focus:outline-none focus:border-sage-deep transition-colors"
        />
      </Labeled>

      {error && (
        <div
          className="rounded-lg px-3 py-2 text-[12px] leading-relaxed"
          style={{
            background: "rgba(168,52,26,0.06)",
            border: "1px solid rgba(168,52,26,0.25)",
            color: "#8A2A14",
          }}
        >
          {error}
        </div>
      )}

      <div className="pt-2 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-[12px] uppercase tracking-[0.20em] font-mono text-ink-300 hover:text-ink transition-colors"
        >
          ← Back
        </button>
        <button
          type="button"
          disabled={!canSave}
          onClick={onSave}
          className="cta-sage inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-[12.5px] font-medium tracking-wide transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? "Saving…" : <>Save credentials <span aria-hidden>→</span></>}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Step 3 ---

function ReadyStep({
  source,
  onConnect,
}: {
  source: "env" | "wizard" | null;
  onConnect: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="inline-flex items-center justify-center w-9 h-9 rounded-full shrink-0 mt-0.5"
          style={{
            background: "linear-gradient(135deg, #C7D1BD 0%, #6E8068 100%)",
            color: "#0E110F",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12l5 5L20 7" />
          </svg>
        </span>
        <div className="min-w-0">
          <p className="text-[15px] leading-relaxed text-ink">
            Credentials saved. Last step. sign in to the Gmail account Corsia
            should watch and send from.
          </p>
          {source === "env" && (
            <p className="text-[11.5px] mt-1.5 text-ink-300 leading-relaxed">
              Reading credentials from your <span className="font-mono">.env.local</span> file.
            </p>
          )}
        </div>
      </div>

      <div className="bg-paper-200/70 border border-ink/8 rounded-lg p-4 text-[12.5px] leading-relaxed text-ink-400">
        <p className="font-medium text-ink mb-1">What happens when you sign in</p>
        <ul className="space-y-1 list-none pl-0">
          <li className="flex gap-2"><span className="text-sage-500">·</span> Google asks you to approve read + send access for Corsia.</li>
          <li className="flex gap-2"><span className="text-sage-500">·</span> We watch only vendor reply threads. Personal mail stays untouched.</li>
          <li className="flex gap-2"><span className="text-sage-500">·</span> Outgoing emails always pause for your approval first.</li>
        </ul>
      </div>

      <div className="pt-2 flex justify-end">
        <button
          type="button"
          onClick={onConnect}
          className="cta-sage inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-[12.5px] font-medium tracking-wide transition-all"
        >
          Sign in with Google <span aria-hidden>→</span>
        </button>
      </div>
    </div>
  );
}

// --------------------------------------------------------------- helpers ---

function Step({
  num,
  title,
  body,
  action,
}: {
  num: string;
  title: string;
  body: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden
        className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full bg-ink/[0.04] text-ink-400 font-mono text-[11px] mt-0.5"
      >
        {num}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] text-ink font-medium">{title}</p>
        <div className="text-[13px] text-ink-300 mt-1 leading-relaxed">{body}</div>
        {action && <div className="mt-2.5">{action}</div>}
      </div>
    </li>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10.5px] uppercase tracking-[0.20em] font-mono text-ink-300 mb-1.5 block">
        {label}
      </span>
      {children}
    </label>
  );
}

function GmailGlyph() {
  return (
    <span
      aria-hidden
      className="inline-flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
      style={{
        background: "linear-gradient(135deg, #FFFFFF 0%, #F7F2E8 100%)",
        border: "1px solid rgba(14,15,13,0.08)",
      }}
    >
      <svg width="20" height="14" viewBox="0 0 20 14" fill="none" aria-hidden>
        <path d="M2 1.5h16a.5.5 0 0 1 .5.5v10a.5.5 0 0 1-.5.5H2a.5.5 0 0 1-.5-.5V2a.5.5 0 0 1 .5-.5z" stroke="#6E8068" strokeWidth="1.2" />
        <path d="M2 2l8 6 8-6" stroke="#6E8068" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
