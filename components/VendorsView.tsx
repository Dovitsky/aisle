"use client";

// Vendors — left category rail + status-grouped pipeline.
//
// Categories live in a fixed left rail with live counts. The main pane shows
// the active category's pipeline broken into stages:
//   1. AI's recommended pick (top-fit shortlisted)
//   2. Shortlist
//   3. Outreach drafted (contacted, no reply yet)
//   4. Awaiting reply (contacted, outbound but stale)
//   5. Quoting
//   6. Negotiating
//   7. Booked
//   8. Passed
// Empty stages are hidden so the page stays tight.

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ProjectState, Vendor, VendorShortlistItem } from "@/lib/types";
import { useProject } from "./StateProvider";

const CATEGORIES = [
  "Venue", "Photographer", "Florist", "Caterer", "Officiant",
  "Band", "DJ", "Stationer", "Hair & Makeup", "Videographer",
  "Cake", "Calligrapher", "Bartending", "Rentals", "Transportation",
];

type Stage = {
  key: string;
  label: string;
  hint: string;
  match: (v: Vendor) => boolean;
  tone: "sage" | "ink" | "amber" | "muted" | "low";
};

const STAGES: Stage[] = [
  {
    key: "shortlist",
    label: "On the shortlist",
    hint: "Scout's picks waiting for outreach",
    match: (v) => v.status === "shortlisted",
    tone: "ink",
  },
  {
    key: "outreach",
    label: "Outreach drafted",
    hint: "Email queued — approve in Decisions",
    match: (v) =>
      v.status === "contacted" &&
      hasOutbound(v) &&
      !hasInbound(v),
    tone: "sage",
  },
  {
    key: "awaiting",
    label: "Awaiting reply",
    hint: "We've reached out — waiting on the vendor",
    match: (v) =>
      v.status === "contacted" &&
      hasOutbound(v) &&
      !hasInboundSince(v, lastOutboundAt(v)),
    tone: "amber",
  },
  {
    key: "quoting",
    label: "Quoting",
    hint: "Vendor sent a price — review and counter",
    match: (v) => v.status === "quoting",
    tone: "amber",
  },
  {
    key: "negotiating",
    label: "Negotiating",
    hint: "Counter in flight",
    match: (v) => v.status === "negotiating",
    tone: "amber",
  },
  {
    key: "booked",
    label: "Booked",
    hint: "Contracted or paid — locked in",
    match: (v) => v.status === "contracted" || v.status === "paid",
    tone: "low",
  },
  {
    key: "passed",
    label: "Passed",
    hint: "Set aside",
    match: (v) => v.status === "passed",
    tone: "muted",
  },
];

const TONE_CLASSES: Record<Stage["tone"], { dot: string; label: string }> = {
  ink:    { dot: "bg-ink",          label: "text-ink" },
  sage:   { dot: "bg-sage-400",     label: "text-sage-500" },
  amber:  { dot: "bg-risk-medium",  label: "text-risk-medium" },
  low:    { dot: "bg-sage-500",     label: "text-sage-500" },
  muted:  { dot: "bg-ink-200",      label: "text-ink-300" },
};

export function VendorsView() {
  const { state, setState, loading } = useProject();
  const [activeCategory, setActiveCategory] = useState<string>("Venue");
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const countsByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    if (!state) return map;
    for (const v of state.vendors) map[String(v.category)] = (map[String(v.category)] ?? 0) + 1;
    return map;
  }, [state]);

  const inCategory = useMemo(() => {
    if (!state) return [] as Vendor[];
    return state.vendors
      .filter((v) => v.category === activeCategory)
      .sort((a, b) => b.fitScore - a.fitScore);
  }, [state, activeCategory]);

  // Recommended pick: highest fitScore among shortlisted in active category.
  const recommended = useMemo(() => {
    return inCategory.find((v) => v.status === "shortlisted") ?? null;
  }, [inCategory]);

  // Group remaining vendors by stage. Recommended pick is excluded from the
  // "shortlist" stage so it doesn't appear twice.
  const groups = useMemo(() => {
    const remaining = inCategory.filter((v) => v.id !== recommended?.id);
    return STAGES.map((s) => ({
      stage: s,
      items: remaining.filter((v) => s.match(v)),
    })).filter((g) => g.items.length > 0);
  }, [inCategory, recommended]);

  if (loading || !state) return <div className="pt-10 text-center text-ink-300">Loading…</div>;
  const briefLocked = !!state.brief?.locked;
  const open = (openId && state.vendors.find((v) => v.id === openId)) || null;

  const post = async (body: object, key: string) => {
    setBusy(key); setError(null);
    try {
      const r = await fetch("/api/vendors", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
      });
      const j = (await r.json()) as { state?: ProjectState; error?: string };
      if (!r.ok) { setError(j.error ?? `Error ${r.status}`); return; }
      if (j.state) setState(j.state);
    } finally { setBusy(null); }
  };

  const runScout = async (cat: string) => {
    setBusy("scout-" + cat); setError(null);
    try {
      const r = await fetch("/api/scout", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ category: cat }),
      });
      const j = (await r.json()) as { state?: ProjectState; items?: VendorShortlistItem[]; error?: string };
      if (!r.ok) { setError(j.error ?? `Error ${r.status}`); return; }
      if (j.state) setState(j.state);
    } finally { setBusy(null); }
  };

  const draftCounter = async (v: Vendor) => {
    const goal = window.prompt("Negotiation goal", "Ask for 10% off in exchange for a non-peak Friday.");
    if (!goal) return;
    await post({ op: "draft_counter", vendorId: v.id, goal }, "counter-" + v.id);
  };

  return (
    <div className="grid lg:grid-cols-[200px_minmax(0,1fr)] gap-8 lg:gap-12">
      {/* Left rail — categories */}
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <div className="text-[10px] uppercase tracking-[0.26em] text-sage-500 font-mono mb-4">
          Categories
        </div>
        <ul className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible no-scrollbar -mx-2 px-2 lg:mx-0 lg:px-0 pb-2 lg:pb-0">
          {CATEGORIES.map((c) => {
            const count = countsByCategory[c] ?? 0;
            const active = activeCategory === c;
            return (
              <li key={c} className="shrink-0">
                <button
                  onClick={() => { setActiveCategory(c); setOpenId(null); }}
                  className={`group w-full flex items-baseline justify-between gap-3 rounded-md px-2.5 py-1.5 transition-colors text-left ${
                    active ? "bg-ink text-paper-50" : "text-ink hover:bg-paper-200/60"
                  }`}
                  style={{
                    fontFamily: '"Cormorant","Cormorant Garamond",Georgia,serif',
                    fontWeight: 300,
                    fontStyle: "italic",
                    fontSize: "18px",
                    lineHeight: 1.15,
                  }}
                >
                  <span>{c}</span>
                  {count > 0 && (
                    <span className={`text-[10px] font-mono not-italic ${
                      active ? "text-paper-50/70" : "text-ink-300"
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* Main pane */}
      <section className="min-w-0">
        <header className="mb-8">
          <p className="text-[10px] uppercase tracking-[0.26em] text-sage-500 font-mono mb-2">
            {activeCategory}
          </p>
          <div className="flex items-baseline justify-between gap-4 flex-wrap">
            <h1 className="display text-[36px] sm:text-[44px] lg:text-[52px] leading-[1.02] tracking-[-0.01em]">
              {inCategory.length === 0
                ? `Find a ${activeCategory.toLowerCase()}`
                : `${inCategory.length} ${activeCategory.toLowerCase()}${inCategory.length === 1 ? "" : "s"}`}
            </h1>
            {briefLocked && (
              <button
                onClick={() => runScout(activeCategory)}
                disabled={busy?.startsWith("scout-")}
                className="text-[11px] uppercase tracking-[0.18em] text-ink hover:text-sage-500 transition-colors disabled:opacity-50"
              >
                {busy === "scout-" + activeCategory
                  ? "Scout searching…"
                  : inCategory.length === 0 ? "Run Scout →" : "Re-run Scout →"}
              </button>
            )}
          </div>
        </header>

        {!briefLocked && (
          <div className="rounded-card border hairline bg-white/60 px-5 py-4 text-[14px] mb-6">
            Lock the brief first. <Link href="/brief" className="underline-offset-4 underline hover:text-sage-500">Open brief</Link>.
          </div>
        )}

        {error && <p className="text-sm text-risk-high mb-4">{error}</p>}

        {/* Recommended pick — single hero card */}
        {recommended && (
          <div className="mb-12">
            <div className="flex items-baseline justify-between mb-3">
              <p className="text-[10px] uppercase tracking-[0.26em] text-sage-500 font-mono">
                Our pick
              </p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-ink-300">
                Highest fit
              </p>
            </div>
            <RecommendedCard
              v={recommended}
              busy={busy}
              onOpen={() => setOpenId(recommended.id)}
              onOutreach={() => post({ op: "draft_outreach", vendorId: recommended.id }, "outreach-" + recommended.id)}
            />
          </div>
        )}

        {/* Stage groups */}
        {groups.length === 0 && !recommended && briefLocked && inCategory.length === 0 && (
          <div className="rounded-card border hairline bg-white/60 px-6 py-10 text-center max-w-lg">
            <p className="display text-xl text-ink leading-tight">No {activeCategory.toLowerCase()}s yet.</p>
            <p className="text-[14px] text-ink-300 mt-3 leading-relaxed">
              Tap "Run Scout" above and we'll find five matches against your brief.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-12">
          {groups.map(({ stage, items }) => (
            <section key={stage.key}>
              <div className="flex items-baseline justify-between mb-4">
                <div className="flex items-baseline gap-3">
                  <span
                    className={`inline-block w-1.5 h-1.5 rounded-full ${TONE_CLASSES[stage.tone].dot}`}
                    aria-hidden
                  />
                  <h2 className="display italic text-[20px] text-ink leading-tight">
                    {stage.label}
                    <span className="text-ink-300 not-italic ml-2 text-[14px]">{items.length}</span>
                  </h2>
                </div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-ink-300 hidden sm:block">
                  {stage.hint}
                </p>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {items.map((v) => (
                  <VendorCard
                    key={v.id}
                    v={v}
                    onClick={() => setOpenId(v.id)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Detail drawer (anchored below the stages) */}
        {open && (
          <aside className="mt-12 surface rounded-card border hairline shadow-card p-5 animate-fade-in">
            <div className="flex items-baseline justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.22em] text-sage-500 font-mono mb-1">
                  {String(open.category)} · {open.priceBracket} · fit {open.fitScore}/100
                </p>
                <h3 className="display text-[28px] leading-tight">{open.name}</h3>
                <p className="text-[13px] text-ink-300 mt-0.5">{open.city}</p>
              </div>
              <button
                onClick={() => setOpenId(null)}
                className="text-[11px] uppercase tracking-[0.18em] text-ink-300 hover:text-ink"
              >
                Close
              </button>
            </div>
            <p className="text-[14px] mt-4 leading-relaxed text-ink-400">{open.notes}</p>

            <div className="grid grid-cols-3 gap-3 mt-5">
              <Pill label="Estimate" value={open.estimateUsd ? `$${open.estimateUsd.toLocaleString()}` : "—"} />
              <Pill label="Contracted" value={open.contractedUsd ? `$${open.contractedUsd.toLocaleString()}` : "—"} />
              <Pill label="Paid" value={open.paidUsd ? `$${open.paidUsd.toLocaleString()}` : "—"} />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <ActionButton onClick={() => post({ op: "draft_outreach", vendorId: open.id }, "outreach-" + open.id)} disabled={!!busy} busy={busy === "outreach-" + open.id}>
                Draft outreach
              </ActionButton>
              <ActionButton onClick={() => post({ op: "simulate_inbound", vendorId: open.id }, "inbound-" + open.id)} disabled={!!busy} busy={busy === "inbound-" + open.id}>
                Simulate reply
              </ActionButton>
              <ActionButton onClick={() => draftCounter(open)} disabled={!!busy} busy={busy === "counter-" + open.id}>
                Counter via Negotiator
              </ActionButton>
              <ActionButton onClick={() => post({ op: "review_contract", vendorId: open.id }, "counsel-" + open.id)} disabled={!!busy} busy={busy === "counsel-" + open.id}>
                Review contract
              </ActionButton>
              <ActionButton onClick={() => {
                const guess = open.estimateUsd ?? Math.round(((state.brief?.budgetUsd ?? 50000) * 0.1));
                const raw = window.prompt(`Estimated contract value for ${open.name}`, String(guess));
                if (!raw) return;
                const n = Number(raw.replace(/[^0-9.]/g, ""));
                if (!Number.isFinite(n) || n <= 0) return;
                post({ op: "propose_signing", vendorId: open.id, estimate: n }, "sign-" + open.id);
              }} disabled={!!busy} busy={busy === "sign-" + open.id}>
                Propose signing
              </ActionButton>
              <ActionButton onClick={() => {
                const guess = Math.round(((open.contractedUsd ?? open.estimateUsd ?? 5000) * 0.5));
                const raw = window.prompt(`Payment amount for ${open.name}`, String(guess));
                if (!raw) return;
                const n = Number(raw.replace(/[^0-9.]/g, ""));
                if (!Number.isFinite(n) || n <= 0) return;
                const due = window.prompt("Due date (YYYY-MM-DD)", new Date().toISOString().slice(0, 10));
                if (!due) return;
                post({ op: "schedule_payment", vendorId: open.id, amountUsd: n, dueDate: due }, "pay-" + open.id);
              }} disabled={!!busy} busy={busy === "pay-" + open.id}>
                Schedule payment
              </ActionButton>
            </div>

            {open.thread && open.thread.length > 0 && (
              <div className="mt-6 border-t hairline pt-4">
                <h4 className="text-[10px] uppercase tracking-[0.22em] text-sage-500 font-mono mb-3">
                  Thread
                </h4>
                <ul className="flex flex-col gap-2 max-h-[280px] overflow-y-auto">
                  {open.thread.map((m) => (
                    <li
                      key={m.id}
                      className={`text-[13px] rounded-2xl px-3 py-2 max-w-[90%] ${
                        m.direction === "outbound"
                          ? "self-end bg-ink text-paper-50 rounded-br-md ml-auto"
                          : "self-start bg-paper-200/70"
                      }`}
                    >
                      <div className="text-[10px] uppercase tracking-[0.16em] mb-1 opacity-75">
                        {m.direction === "outbound" ? "AISLE → vendor" : "Vendor → AISLE"}
                        {m.parsedIntent && ` · ${m.parsedIntent}`}
                        {m.quotedUsd && ` · $${m.quotedUsd.toLocaleString()}`}
                      </div>
                      <div className="whitespace-pre-wrap">{m.body}</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        )}
      </section>
    </div>
  );
}

// --------------------------------------------------------------------

function RecommendedCard({
  v, busy, onOpen, onOutreach,
}: {
  v: Vendor;
  busy: string | null;
  onOpen: () => void;
  onOutreach: () => void;
}) {
  return (
    <article className="relative surface rounded-card card-shell shadow-card hover:shadow-cardHover transition-all overflow-hidden">
      <div className="px-6 py-6 flex flex-col sm:flex-row sm:items-end gap-5">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-[0.22em] text-sage-500 font-mono mb-1.5">
            Top fit · {v.fitScore}/100 · {v.priceBracket}
          </p>
          <h3 className="display text-[34px] sm:text-[40px] leading-[1.02] tracking-[-0.01em]">
            {v.name}
          </h3>
          <p className="text-[13.5px] text-ink-300 mt-1">{v.city}</p>
          <p className="text-[14px] text-ink-400 mt-3 leading-relaxed line-clamp-2">{v.notes}</p>
        </div>
        <div className="flex flex-col gap-2 shrink-0 sm:items-end">
          <button
            onClick={onOutreach}
            disabled={!!busy}
            className="btn-primary"
            style={{ paddingInline: "1.4rem" }}
          >
            {busy === "outreach-" + v.id ? "Drafting…" : "Open outreach"}
          </button>
          <button
            onClick={onOpen}
            className="text-[11px] uppercase tracking-[0.18em] text-ink-300 hover:text-ink transition-colors"
          >
            See details →
          </button>
        </div>
      </div>
    </article>
  );
}

function VendorCard({ v, onClick }: { v: Vendor; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`group text-left surface rounded-card border hairline shadow-card hover:shadow-cardHover transition-all hover:-translate-y-0.5 px-4 py-4 ${
        v.status === "passed" ? "opacity-55" : ""
      }`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="display text-[19px] leading-tight truncate group-hover:text-sage-500 transition-colors">
          {v.name}
        </h3>
        <span className="text-[10px] uppercase tracking-[0.18em] text-ink-300 font-mono shrink-0">
          {v.priceBracket}
        </span>
      </div>
      <div className="text-[12px] text-ink-300 mt-1 truncate">
        {v.city} · fit {v.fitScore}/100
      </div>
      {v.notes && (
        <p className="text-[12.5px] text-ink-400 mt-2 leading-snug line-clamp-2">
          {v.notes}
        </p>
      )}
    </button>
  );
}

function ActionButton({
  onClick, disabled, busy, children,
}: {
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-full border hairline bg-white/70 hover:bg-white hover:border-ink/20 py-2 px-3 text-[12.5px] text-ink-400 hover:text-ink transition-all disabled:opacity-50"
    >
      {busy ? "…" : children}
    </button>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border hairline bg-white/70 p-3">
      <div className="text-[10px] uppercase tracking-[0.22em] text-ink-300 font-mono">{label}</div>
      <div className="display text-[18px] mt-0.5">{value}</div>
    </div>
  );
}

// --------------------------------------------------------------------
// Pipeline-state helpers

function hasOutbound(v: Vendor): boolean {
  return (v.thread ?? []).some((m) => m.direction === "outbound");
}
function hasInbound(v: Vendor): boolean {
  return (v.thread ?? []).some((m) => m.direction === "inbound");
}
function lastOutboundAt(v: Vendor): string {
  const out = (v.thread ?? []).filter((m) => m.direction === "outbound");
  return out.length ? out[out.length - 1].at : "";
}
function hasInboundSince(v: Vendor, iso: string): boolean {
  if (!iso) return false;
  return (v.thread ?? []).some((m) => m.direction === "inbound" && m.at > iso);
}
