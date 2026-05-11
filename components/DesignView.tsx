"use client";

// Design. Designer's six mood-board directions; couple picks one to lock.
// Locking cascades to Stationer (suite), Botanist (florals), and Cake.

import { useMemo, useState } from "react";
import Link from "next/link";
import type { DesignAsset, ProjectState } from "@/lib/types";
import { useProject } from "./StateProvider";
import { useToast } from "./Toast";
import { Reveal } from "./Atmosphere";
import { ThoughtStream, ThoughtTileOverlay } from "./ThoughtStream";

export function DesignView() {
  const { state, setState, loading } = useProject();
  const { notify } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { locked, alternates } = useMemo(() => {
    if (!state) return { locked: null as DesignAsset | null, alternates: [] as DesignAsset[] };
    const moods = state.designs.filter((d) => d.kind === "moodboard");
    const locked = moods.find((d) => d.approved) ?? null;
    const alternates = moods
      .filter((d) => !d.approved)
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
    return { locked, alternates };
  }, [state]);

  if (loading || !state) return <div className="pt-10 text-center text-ink-300">Loading…</div>;
  const briefLocked = !!state.brief?.locked;

  const propose = async () => {
    setBusy("propose"); setError(null);
    try {
      const r = await fetch("/api/design", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "propose" }),
      });
      const j = (await r.json()) as { state?: ProjectState; error?: string };
      if (!r.ok) { setError(j.error ?? `Error ${r.status}`); return; }
      if (j.state) setState(j.state);
    } finally { setBusy(null); }
  };

  const publish = async (id: string, title: string) => {
    setBusy("publish-" + id); setError(null);
    try {
      const r = await fetch("/api/design", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "publish", assetId: id, title }),
      });
      const j = (await r.json()) as { state?: ProjectState; error?: string };
      if (!r.ok) setError(j.error ?? `Error ${r.status}`);
      if (j.state) setState(j.state);
    } finally { setBusy(null); }
  };

  const renderVisuals = async () => {
    setBusy("render-all"); setError(null);
    try {
      const r = await fetch("/api/design/render", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "render_all", kind: "moodboard" }),
      });
      const j = (await r.json().catch(() => ({}))) as { rendered?: number; failed?: number; mode?: "live" | "sample"; error?: string };
      if (!r.ok) {
        setError(j.error ?? `Error ${r.status}`);
        notify({ kind: "error", title: "Couldn't render visuals", detail: j.error ?? "Try again." });
        return;
      }
      // Re-fetch state so heroImage shows on the cards
      const sr = await fetch("/api/state", { cache: "no-store" });
      if (sr.ok) setState(await sr.json());
      notify({
        kind: "agent",
        agent: "Designer",
        title: `${j.rendered ?? 0} ${(j.rendered ?? 0) === 1 ? "image" : "images"} rendered`,
        detail: j.mode === "live"
          ? "Photographs from gpt-image-1 are now on each direction."
          : "Showing sage-pale samples. connect your OpenAI key in Settings to render real photos.",
      });
    } catch (e) {
      notify({ kind: "error", title: "Render failed", detail: e instanceof Error ? e.message : "Try again." });
    } finally { setBusy(null); }
  };

  return (
    <div className="flex flex-col gap-12 pb-12">
      {/* Hero */}
      <header>
        <p className="text-[10px] uppercase tracking-[0.26em] text-sage-500 font-mono mb-2">
          The look
        </p>
        <div className="flex items-baseline justify-between gap-6 flex-wrap">
          <h1 className="display text-[36px] sm:text-[44px] lg:text-[52px] leading-[1.02] tracking-[-0.01em]">
            {locked ? (
              <>Locked: {locked.title}.</>
            ) : alternates.length === 0 ? (
              <>The look.</>
            ) : (
              <>Pick a direction.</>
            )}
          </h1>
          {briefLocked && (
            <button
              onClick={propose}
              disabled={busy !== null}
              className="inline-flex items-center gap-2 rounded-full cta-sage px-5 py-2.5 text-[12px] uppercase tracking-[0.2em] font-semibold transition-all disabled:opacity-50 shadow-card hover:shadow-cardHover"
            >
              {busy === "propose"
                ? "Working…"
                : alternates.length === 0 && !locked
                  ? "Get options"
                  : "Show more options"}
              {busy !== "propose" && <span aria-hidden>→</span>}
            </button>
          )}
        </div>
        <p className="text-[14px] text-ink-300 mt-4 leading-relaxed max-w-[60ch]">
          A handful of mood directions to look at side by side. Pick one and
          the look carries through. flowers, paper, cake, signs.
        </p>
        {busy === "propose" && (
          <div className="mt-4">
            <ThoughtStream kind="design-render" tone="sage" size="sm" />
          </div>
        )}
      </header>

      {!briefLocked && (
        <div className="rounded-card border hairline bg-white/60 px-5 py-4 text-[14px]">
          Seal the dossier first.{" "}
          <Link href="/dossier" className="underline-offset-4 underline hover:text-sage-500">
            Open dossier
          </Link>
          .
        </div>
      )}

      {error && <p className="text-sm text-risk-high">{error}</p>}

      {/* LOCKED. hero spread */}
      {locked && (
        <Reveal>
          <LockedDirection asset={locked} />
        </Reveal>
      )}

      {/* EMPTY STATE */}
      {!locked && alternates.length === 0 && briefLocked && (
        <Reveal>
          <div className="rounded-card border hairline bg-white/55 px-7 py-12 max-w-xl">
            <p className="display text-[26px] text-ink leading-tight">Nothing here yet.</p>
            <p className="text-[14px] text-ink-300 mt-3 leading-relaxed">
              Designer pulls a few directions together so you can see them side
              by side. different feels, different colors. Then you pick one.
            </p>
            <button
              onClick={propose}
              disabled={busy !== null}
              className="btn-primary mt-5"
            >
              {busy === "propose" ? "Working…" : "Pull a few together"}
            </button>
            {busy === "propose" && (
              <div className="mt-4">
                <ThoughtStream kind="design-render" tone="sage" size="sm" />
              </div>
            )}
          </div>
        </Reveal>
      )}

      {/* ALTERNATES. grid of options */}
      {alternates.length > 0 && (
        <Reveal>
          <section>
            <div className="flex items-baseline justify-between mb-5 flex-wrap gap-3">
              <h2 className="display italic text-[22px] text-ink leading-tight">
                {locked ? "Other directions" : "Directions"}
                <span className="not-italic text-ink-300 ml-2 text-[14px]">{alternates.length}</span>
              </h2>
              <button
                onClick={renderVisuals}
                disabled={busy !== null}
                className="inline-flex items-center gap-2 rounded-full border hairline bg-white/85 hover:bg-white hover:border-ink/30 px-4 py-2 text-[11.5px] uppercase tracking-[0.2em] font-medium text-ink transition-all disabled:opacity-50"
                title="Generate a hero photograph for each direction"
              >
                {busy === "render-all"
                  ? "Rendering…"
                  : alternates.some((d) => d.heroImage)
                    ? "✦ Re-render visuals"
                    : "✦ Render visuals"}
              </button>
            </div>
            {busy === "render-all" && (
              <div className="mb-4">
                <ThoughtStream kind="design-render" tone="sage" size="sm" />
              </div>
            )}
            <div className="grid sm:grid-cols-2 gap-5">
              {alternates.map((d) => (
                <DirectionCard
                  key={d.id}
                  asset={d}
                  busy={busy === "publish-" + d.id}
                  disabled={!!busy || !!locked}
                  onLock={() => publish(d.id, d.title)}
                  dimmed={!!locked}
                  rendering={busy === "render-all" && !d.heroImage}
                />
              ))}
            </div>
          </section>
        </Reveal>
      )}
    </div>
  );
}

// --------------------------------------------------------------------

function LockedDirection({ asset }: { asset: DesignAsset }) {
  const swatches = (asset.swatches ?? []).slice(0, 6);
  return (
    <article className="relative rounded-card overflow-hidden border hairline bg-white/85 shadow-card">
      {/* Hero image when rendered, else tall swatch band */}
      {asset.heroImage ? (
        <div className="relative aspect-[21/9] overflow-hidden bg-paper-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={asset.heroImage}
            alt={asset.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
          {swatches.length > 0 && (
            <div
              className="absolute bottom-0 left-0 right-0 grid h-2.5"
              style={{ gridTemplateColumns: `repeat(${swatches.length}, 1fr)` }}
            >
              {swatches.map((c, i) => <div key={i} style={{ background: c }} />)}
            </div>
          )}
        </div>
      ) : (
        <div className="grid h-32 sm:h-40 lg:h-48" style={{ gridTemplateColumns: `repeat(${Math.max(swatches.length, 1)}, 1fr)` }}>
          {swatches.length > 0
            ? swatches.map((c, i) => (
                <div key={i} className="relative" style={{ background: c }}>
                  <span className="absolute bottom-2 left-2 text-[9px] uppercase tracking-[0.22em] text-paper-50/85 font-mono mix-blend-difference">
                    {c.toUpperCase()}
                  </span>
                </div>
              ))
            : <div className="bg-paper-200" />}
        </div>
      )}
      <div className="px-6 py-6">
        <div className="flex items-baseline justify-between gap-3 mb-2">
          <p className="text-[10px] uppercase tracking-[0.22em] text-sage-500 font-mono">
            Locked direction
          </p>
          <p className="text-[10px] uppercase tracking-[0.22em] text-sage-500 font-mono">
            {asset.agent}
          </p>
        </div>
        <h2 className="display text-[34px] sm:text-[40px] leading-[1.02] tracking-[-0.01em]">
          {asset.title}
        </h2>
        <p className="text-[14.5px] text-ink-400 mt-3 leading-relaxed max-w-[64ch]">
          {asset.description}
        </p>
        {asset.refs && asset.refs.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {asset.refs.map((r, i) => (
              <li
                key={i}
                className="text-[10.5px] uppercase tracking-[0.18em] border hairline rounded-full px-2.5 py-1 text-ink-400 bg-white/70 font-mono"
              >
                {r}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] uppercase tracking-[0.18em]">
          <Link href="/stationery" className="text-ink hover:text-sage-500 transition-colors">
            Stationer suite →
          </Link>
          <Link href="/florals" className="text-ink hover:text-sage-500 transition-colors">
            Florals →
          </Link>
          <Link href="/cake" className="text-ink hover:text-sage-500 transition-colors">
            Cake →
          </Link>
          <Link href="/website" className="text-ink hover:text-sage-500 transition-colors">
            Website →
          </Link>
        </div>
      </div>
    </article>
  );
}

function DirectionCard({
  asset, busy, disabled, dimmed, onLock, rendering = false,
}: {
  asset: DesignAsset;
  busy: boolean;
  disabled: boolean;
  dimmed: boolean;
  onLock: () => void;
  rendering?: boolean;
}) {
  const swatches = (asset.swatches ?? []).slice(0, 5);
  return (
    <article
      className={`group surface rounded-card card-shell hover:shadow-cardHover transition-all overflow-hidden ${
        dimmed ? "opacity-65" : ""
      }`}
    >
      {/* Hero image when rendered, otherwise swatch band (with rendering overlay if a render is in flight) */}
      {asset.heroImage ? (
        <div className="relative aspect-[16/10] overflow-hidden bg-paper-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={asset.heroImage}
            alt={asset.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          />
          {/* swatch strip overlay at bottom */}
          {swatches.length > 0 && (
            <div className="absolute bottom-0 left-0 right-0 grid h-3" style={{ gridTemplateColumns: `repeat(${swatches.length}, 1fr)` }}>
              {swatches.map((c, i) => <div key={i} style={{ background: c }} />)}
            </div>
          )}
        </div>
      ) : rendering ? (
        <div className="relative aspect-[16/10] overflow-hidden bg-sage-100 animate-pulse-soft">
          <ThoughtTileOverlay kind="design-render" />
        </div>
      ) : (
        <div
          className="grid h-20 sm:h-24 transition-transform duration-500 group-hover:scale-[1.015] origin-top"
          style={{ gridTemplateColumns: `repeat(${Math.max(swatches.length, 1)}, 1fr)` }}
        >
          {swatches.length > 0
            ? swatches.map((c, i) => (<div key={i} style={{ background: c }} />))
            : <div className="bg-paper-200" />}
        </div>
      )}

      <div className="px-5 py-5">
        <h3 className="display text-[22px] leading-tight tracking-[-0.005em] group-hover:text-sage-500 transition-colors">
          {asset.title}
        </h3>
        <p className="text-[13.5px] text-ink-400 mt-2 leading-relaxed line-clamp-3">
          {asset.description}
        </p>
        {asset.refs && asset.refs.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1">
            {asset.refs.slice(0, 5).map((r, i) => (
              <li
                key={i}
                className="text-[10px] uppercase tracking-[0.18em] border hairline rounded-full px-2 py-0.5 text-ink-300 bg-white/60 font-mono"
              >
                {r}
              </li>
            ))}
          </ul>
        )}
        {!dimmed && (
          <button
            onClick={onLock}
            disabled={disabled}
            className="mt-5 w-full rounded-full cta-sage disabled:opacity-50 py-2.5 text-[12px] uppercase tracking-[0.2em] font-medium transition-all"
          >
            {busy ? "Locking…" : "Lock this direction"}
          </button>
        )}
        {dimmed && (
          <p className="mt-5 text-[11px] uppercase tracking-[0.18em] text-ink-300">
            Alternate
          </p>
        )}
      </div>
    </article>
  );
}
