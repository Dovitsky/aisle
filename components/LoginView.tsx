"use client";

// LoginView. magic-link or Google OAuth. When Supabase isn't configured
// the app runs in offline single-tenant mode and this page softly says so.

import { useEffect, useState } from "react";
import Link from "next/link";

export function LoginView() {
  const [supabaseAvailable, setSupabaseAvailable] = useState<null | boolean>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/auth/status")
      .then((r) => r.json())
      .then((j) => setSupabaseAvailable(Boolean(j.supabase)));
  }, []);

  const sendLink = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const j = (await r.json()) as { ok?: boolean; error?: string };
      if (!r.ok) {
        setError(j.error ?? `Error ${r.status}`);
        return;
      }
      setSent(true);
    } finally {
      setBusy(false);
    }
  };

  const signInWithGoogle = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/auth/google");
      const j = (await r.json()) as { url?: string; error?: string };
      if (j.url) window.location.href = j.url;
      else setError(j.error ?? "Could not start Google sign-in");
    } finally {
      setBusy(false);
    }
  };

  if (supabaseAvailable === null) {
    return <div className="pt-24 text-center text-ink-300">Loading…</div>;
  }

  // Offline single-tenant mode. nothing to sign into; soft welcome.
  if (!supabaseAvailable) {
    return (
      <div className="max-w-md mx-auto pt-24 text-center px-6 animate-fade-in-soft">
        <p className="text-[10px] uppercase tracking-[0.32em] text-sage-500 font-mono mb-5">
          Corsia
        </p>
        <h1 className="display text-[34px] sm:text-[40px] leading-[1.05] tracking-[-0.01em]">
          Just you, for now.
        </h1>
        <p className="text-[14.5px] text-ink-300 mt-5 leading-relaxed">
          Corsia is running locally on this device. Every flow, every specialist,
          every decision works. There's one wedding here. and it's yours.
        </p>
        <p className="text-[13px] text-ink-300 mt-3 leading-relaxed italic">
          When you're ready for accounts, partner access, and live sync across
          phones, your team can flip that on for you.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block rounded-2xl bg-ink text-paper-50 px-5 py-2.5 text-[13px] font-semibold hover:bg-ink-400 transition-colors"
        >
          Take me back →
        </Link>
      </div>
    );
  }

  // Online (Supabase). magic link or Google OAuth.
  return (
    <div className="max-w-md mx-auto pt-20 px-6 animate-fade-in-soft">
      <p className="text-[10px] uppercase tracking-[0.32em] text-sage-500 font-mono text-center mb-4">
        Corsia
      </p>
      <h1 className="display text-[34px] sm:text-[40px] text-center leading-[1.05] tracking-[-0.01em]">
        Sign in.
      </h1>
      <p className="text-[13px] text-ink-300 mt-3 text-center leading-relaxed">
        Same form either way. we'll set up your project on first sign-in.
      </p>

      {sent ? (
        <div className="mt-10 surface rounded-card border border-sage-300/40 bg-sage-50/60 p-6 text-center animate-fade-in">
          <p className="text-[10px] uppercase tracking-[0.26em] text-sage-500 font-mono mb-2">
            Sent
          </p>
          <h2 className="display italic text-[22px] leading-tight">
            Check your inbox
          </h2>
          <p className="text-[13.5px] text-ink-400 mt-3 leading-relaxed">
            We sent a magic link to <span className="font-mono">{email}</span>.
            Click it from the same browser to come back here signed in.
          </p>
          <button
            onClick={() => {
              setSent(false);
              setEmail("");
            }}
            className="mt-5 text-[11px] uppercase tracking-[0.18em] text-ink-300 hover:text-ink transition-colors"
          >
            Use a different email
          </button>
        </div>
      ) : (
        <div className="mt-10 surface rounded-card border hairline shadow-card p-6">
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.18em] text-ink-300 font-mono">
              Email
            </span>
            <input
              type="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && email.includes("@") && sendLink()
              }
              placeholder="you@email.com"
              className="mt-2 w-full rounded-lg border hairline bg-white/85 px-3 py-2.5 text-[15px] focus:outline-none focus:border-sage-300 transition-colors"
            />
          </label>
          <button
            onClick={sendLink}
            disabled={busy || !email.includes("@")}
            className="mt-4 w-full rounded-2xl cta-sage py-3 text-[13.5px] font-semibold transition-colors disabled:opacity-50"
          >
            {busy ? "Sending…" : "Send a magic link"}
          </button>

          <div className="my-5 flex items-center gap-3">
            <span className="flex-1 h-px bg-ink/10" aria-hidden />
            <span className="text-[10px] uppercase tracking-[0.22em] text-ink-300 font-mono">
              or
            </span>
            <span className="flex-1 h-px bg-ink/10" aria-hidden />
          </div>

          <button
            onClick={signInWithGoogle}
            disabled={busy}
            className="w-full rounded-2xl border hairline bg-white/85 hover:bg-white hover:border-sage-300 py-3 text-[13.5px] font-medium transition-all disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            <GoogleGlyph />
            Continue with Google
          </button>

          {error && <p className="mt-4 text-[13px] text-risk-high">{error}</p>}
        </div>
      )}

      <p className="mt-8 text-[11.5px] text-ink-300 text-center leading-relaxed">
        Magic links arrive within a minute and expire after thirty.
      </p>
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.79 2.71v2.26h2.9c1.7-1.56 2.69-3.87 2.69-6.6z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.81.54-1.83.86-3.06.86-2.36 0-4.36-1.59-5.07-3.74H.96v2.33A8.99 8.99 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.93 10.69a5.41 5.41 0 0 1 0-3.39V4.97H.96a8.99 8.99 0 0 0 0 8.06l2.97-2.34z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.46 3.45 1.35l2.58-2.58A8.99 8.99 0 0 0 .96 4.97l2.97 2.33C4.64 5.16 6.64 3.58 9 3.58z"
      />
    </svg>
  );
}
