"use client";

// Session pill shown in the sidebar / mobile header. Sign-in link or email + sign-out.

import Link from "next/link";
import { useEffect, useState } from "react";

interface AuthStatus {
  supabase: boolean;
  signedIn: boolean;
  email: string | null;
}

export function SessionWidget() {
  const [status, setStatus] = useState<AuthStatus | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const r = await fetch("/api/auth/status");
    setStatus(await r.json());
  };
  useEffect(() => { void load(); }, []);

  if (!status) return null;
  if (!status.supabase) {
    // Quietly nothing — don't surface infra state to the couple.
    return null;
  }
  if (!status.signedIn) {
    return (
      <Link href="/login" className="text-[11px] uppercase tracking-[0.16em] text-ink hover:text-sage-500 transition-colors">
        Sign in
      </Link>
    );
  }
  return (
    <div className="text-[11px] text-ink-300 truncate flex items-center gap-2">
      <span className="truncate">{status.email}</span>
      <button
        onClick={async () => {
          setBusy(true);
          try {
            await fetch("/api/auth/logout", { method: "POST" });
            window.location.href = "/login";
          } finally { setBusy(false); }
        }}
        disabled={busy}
        className="btn-ghost shrink-0"
      >
        {busy ? "…" : "sign out"}
      </button>
    </div>
  );
}
