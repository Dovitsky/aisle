"use client";

// Magic-link login + Google OAuth. Server-side check: if Supabase isn't configured,
// the page tells the user the app is in offline single-tenant mode (no login needed).

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
    return <div className="pt-20 text-center text-ink-300">Loading…</div>;
  }

  if (!supabaseAvailable) {
    return (
      <div className="max-w-md mx-auto pt-16 text-center px-5">
        <h1 className="display text-3xl">Offline mode</h1>
        <p className="text-sm text-ink-300 mt-3 leading-relaxed">
          Supabase isn&apos;t configured, so AISLE is running in single-tenant local mode.
          Everything works — there&apos;s just no real login because there are no other users to log in as.
        </p>
        <p className="text-[12px] text-ink-300 mt-3">
          To enable real accounts: create a Supabase project, run <span className="font-mono">supabase/migrations/0001_initial.sql</span>,
          and set <span className="font-mono">SUPABASE_URL</span> + <span className="font-mono">SUPABASE_ANON_KEY</span> + <span className="font-mono">SUPABASE_SERVICE_ROLE_KEY</span> in <span className="font-mono">.env.local</span>.
        </p>
        <Link href="/" className="mt-6 inline-block rounded-2xl bg-ink text-paper-50 px-5 py-2.5 text-sm font-semibold hover:bg-ink-400 transition-colors">
          Back to app →
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto pt-16 px-5">
      <h1 className="display text-3xl text-center">Sign in</h1>
      <p className="text-sm text-ink-300 mt-2 text-center">
        New here? Same form — we&apos;ll create your project on first sign-in.
      </p>

      {sent ? (
        <div className="mt-8 surface rounded-card border border-risk-low/30 bg-risk-low/5 p-5 text-center animate-fade-in">
          <div className="display text-lg text-risk-low">Check your inbox</div>
          <p className="text-sm text-ink-400 mt-2">
            We sent a magic link to <span className="font-mono">{email}</span>. Click it to sign in.
          </p>
        </div>
      ) : (
        <div className="mt-8 surface rounded-card border hairline shadow-card p-5">
          <label className="block text-sm">
            <span className="text-ink-400">Email</span>
            <input
              type="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && email.includes("@") && sendLink()}
              placeholder="you@email.com"
              className="mt-1 w-full rounded-lg border hairline bg-white/80 px-3 py-2 text-[15px] focus:outline-none"
            />
          </label>
          <button
            onClick={sendLink}
            disabled={busy || !email.includes("@")}
            className="mt-4 w-full rounded-2xl bg-ink text-paper-50 hover:bg-ink-400 py-3 text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {busy ? "Sending…" : "Send magic link"}
          </button>

          <div className="my-4 text-center text-[11px] uppercase tracking-[0.2em] text-ink-300">or</div>

          <button
            onClick={signInWithGoogle}
            disabled={busy}
            className="w-full rounded-2xl border hairline bg-white/80 hover:bg-white py-3 text-sm font-medium transition-colors disabled:opacity-50"
          >
            Continue with Google
          </button>

          {error && <p className="mt-3 text-sm text-risk-high">{error}</p>}
        </div>
      )}
    </div>
  );
}
