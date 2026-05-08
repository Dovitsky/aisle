"use client";

import { useState } from "react";
import Link from "next/link";
import type { ProjectState } from "@/lib/types";
import { useProject } from "./StateProvider";
import { EmptyState, PageHeader } from "./ui";

export function StationeryView() {
  const { state, setState, loading } = useProject();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (loading || !state) return <div className="pt-10 text-center text-ink-300">Loading…</div>;

  const propose = async (direction: string) => {
    setBusy("propose"); setError(null);
    try {
      const r = await fetch("/api/stationery", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "propose", direction }),
      });
      const j = (await r.json()) as { state?: ProjectState; error?: string };
      if (!r.ok) { setError(j.error ?? `Error ${r.status}`); return; }
      if (j.state) setState(j.state);
    } finally { setBusy(null); }
  };

  const lockPiece = async (suiteId: string, piece: string) => {
    setBusy("lock"); setError(null);
    try {
      const r = await fetch("/api/stationery", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "propose_lock_piece", suiteId, piece }),
      });
      const j = (await r.json()) as { state?: ProjectState };
      if (j.state) setState(j.state);
    } finally { setBusy(null); }
  };

  const setFormat = async (suiteId: string, format: "paper" | "digital" | "hybrid") => {
    const r = await fetch("/api/stationery", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ op: "set_format", suiteId, format }),
    });
    const j = (await r.json()) as { state?: ProjectState };
    if (j.state) setState(j.state);
  };

  const sendStd = async (suiteId: string) => {
    setBusy("std");
    try {
      const r = await fetch("/api/stationery", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "propose_send_save_the_date", suiteId }),
      });
      const j = (await r.json()) as { state?: ProjectState };
      if (j.state) setState(j.state);
    } finally { setBusy(null); }
  };
  const sendInv = async (suiteId: string) => {
    setBusy("inv");
    try {
      const r = await fetch("/api/stationery", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "propose_send_invitations", suiteId }),
      });
      const j = (await r.json()) as { state?: ProjectState };
      if (j.state) setState(j.state);
    } finally { setBusy(null); }
  };

  const moodboards = state.designs.filter((d) => d.kind === "moodboard");

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Stationer"
        title="Stationery suite"
        subtitle="Save-the-dates, invitations, response cards, details, menus, programs, place cards, thank-yous — one coherent suite from your locked design direction."
      />

      {!state.brief?.locked && (
        <div className="rounded-card border hairline bg-paper-200/40 px-4 py-3 text-sm">
          Lock the brief first. <Link href="/brief" className="underline-offset-4 underline">Brief</Link>.
        </div>
      )}

      {state.brief?.locked && state.stationery.length === 0 && (
        moodboards.length === 0 ? (
          <EmptyState
            title="Need a design direction first"
            hint="Stationer extends a locked mood-board direction. Have Designer propose six, lock one, then come back."
            action={{ label: "Open Design", href: "/design", primary: true }}
          />
        ) : (
          <section className="surface rounded-card border hairline shadow-card p-4 sm:p-5">
            <h2 className="display text-xl mb-3">Pick a direction to base the suite on</h2>
            <div className="grid sm:grid-cols-2 gap-2 stagger">
              {moodboards.map((d) => (
                <button
                  key={d.id}
                  onClick={() => propose(d.title)}
                  disabled={!!busy}
                  className="text-left surface rounded-card border hairline shadow-card p-3 hover:shadow-cardHover transition-shadow"
                >
                  <div className="grid grid-cols-5 h-6 mb-2 rounded overflow-hidden">
                    {(d.swatches ?? []).slice(0, 5).map((c, i) => <div key={i} style={{ background: c }} />)}
                  </div>
                  <div className="display text-base">{d.title}</div>
                  <div className="text-[12px] text-ink-300 mt-1">{d.description}</div>
                </button>
              ))}
            </div>
          </section>
        )
      )}

      {error && <p className="text-sm text-risk-high">{error}</p>}

      {state.stationery.map((suite) => (
        <section key={suite.id} className="surface rounded-card border hairline shadow-card p-4 sm:p-5 animate-fade-in">
          <div className="flex items-baseline justify-between gap-2 flex-wrap">
            <div>
              <h2 className="display text-xl">{suite.direction} suite</h2>
              <div className="text-[12px] text-ink-300">
                {suite.items.length} pieces · {suite.format} format
                {suite.saveTheDateSentAt && " · save-the-dates sent"}
                {suite.invitationsSentAt && " · invitations sent"}
              </div>
            </div>
            <div className="flex gap-1">
              {(["paper", "digital", "hybrid"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(suite.id, f)}
                  className={`chip ${suite.format === f ? "chip-on" : "chip-off"}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3 stagger">
            {suite.items.map((it) => (
              <article key={it.piece} className="rounded-card border hairline overflow-hidden bg-white/60 hover:shadow-card transition-shadow">
                <div className="aspect-[3/4] bg-paper-100 border-b hairline" dangerouslySetInnerHTML={{ __html: it.mockSvg ?? "" }} />
                <div className="p-3">
                  <div className="flex items-baseline justify-between">
                    <h3 className="display text-base capitalize">{it.piece.replace(/_/g, " ")}</h3>
                    {it.approved && <span className="eyebrow text-risk-low">locked</span>}
                  </div>
                  <pre className="mt-1 text-[11px] text-ink-400 whitespace-pre-wrap font-sans leading-relaxed max-h-32 overflow-hidden">
                    {it.copy}
                  </pre>
                  {!it.approved && (
                    <button
                      onClick={() => lockPiece(suite.id, it.piece)}
                      disabled={!!busy}
                      className="mt-2 w-full rounded-2xl border hairline bg-white/80 hover:bg-white py-1.5 text-[12px] transition-colors disabled:opacity-50"
                    >
                      Propose lock
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={() => sendStd(suite.id)} disabled={!!busy || Boolean(suite.saveTheDateSentAt)} className="rounded-2xl bg-ink text-paper-50 px-4 py-2 text-sm font-medium hover:bg-ink-400 transition-colors disabled:opacity-50">
              {suite.saveTheDateSentAt ? "Save-the-dates sent" : "Send save-the-dates"}
            </button>
            <button onClick={() => sendInv(suite.id)} disabled={!!busy || Boolean(suite.invitationsSentAt)} className="rounded-2xl border hairline bg-white/80 hover:bg-white px-4 py-2 text-sm transition-colors disabled:opacity-50">
              {suite.invitationsSentAt ? "Invitations sent" : "Send invitations"}
            </button>
            <button
              onClick={async () => {
                setBusy("refresh-" + suite.id);
                try {
                  const r = await fetch("/api/stationery", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ op: "refresh_menu_card", suiteId: suite.id }) });
                  const j = (await r.json()) as { state?: ProjectState };
                  if (j.state) setState(j.state);
                } finally { setBusy(null); }
              }}
              disabled={!!busy || state.menu.length === 0}
              className="rounded-2xl border hairline bg-white/80 hover:bg-white px-4 py-2 text-sm transition-colors disabled:opacity-50"
              title={state.menu.length === 0 ? "No menu yet — load one in /dietary first" : "Re-render the menu card from the locked menu, including allergen icons"}
            >
              {busy === "refresh-" + suite.id ? "Refreshing…" : "Refresh menu card from /dietary"}
            </button>
          </div>
        </section>
      ))}
    </div>
  );
}
