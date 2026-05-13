"use client";

// Invitations. Template picker + live customization + send-to-guest-list
// + open tracking. Mirrors the Stationery suite for the planner side, but
// dedicated to the formal invitation (vs. Save-the-Dates, place cards, etc.)

import { useEffect, useMemo, useState } from "react";
import type { Household, InvitationsConfig, InvitationTemplateId, ProjectState } from "@/lib/types";
import { useProject } from "./StateProvider";
import { Reveal, CountUp } from "./Atmosphere";
import { InvitationCard, InvitationCopy, TEMPLATE_META } from "./invitations/templates";

const DEFAULT_ACCENT = "#7A8270"; // sage-ish

export function InvitationsView() {
  const { state, setState, loading } = useProject();
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unsent" | "sent" | "opened">("all");

  const post = async (body: object, key: string) => {
    setBusy(key);
    try {
      const r = await fetch("/api/invitations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await r.json()) as { state?: ProjectState };
      if (j.state) setState(j.state);
    } finally {
      setBusy(null);
    }
  };

  const copy: InvitationCopy = useMemo(() => resolveCopy(state), [state]);
  const config: InvitationsConfig = state?.invitations ?? { templateId: "editorial" };

  if (loading || !state) {
    return <div className="pt-10 text-center text-ink-300">Loading…</div>;
  }

  const update = (patch: Partial<InvitationsConfig>) => post({ op: "update", patch }, "update");
  const selectTemplate = (id: InvitationTemplateId) => update({ templateId: id });
  const sendAll = () => {
    const unsentIds = state.households.filter((h) => !h.invitationSentAt).map((h) => h.id);
    if (unsentIds.length === 0) return;
    post({ op: "send", householdIds: unsentIds }, "send");
  };
  const sendOne = (id: string) => post({ op: "send", householdIds: [id] }, `send-${id}`);
  const markOpened = (id: string) => post({ op: "mark_opened", householdId: id }, `open-${id}`);
  const reset = (id: string) => post({ op: "reset_send", householdId: id }, `rs-${id}`);

  // Aggregates
  const sentCount = state.households.filter((h) => h.invitationSentAt).length;
  const openedCount = state.households.filter((h) => h.invitationOpenedAt).length;
  const totalHouseholds = state.households.length;
  const unsentCount = totalHouseholds - sentCount;

  const filteredHouseholds = state.households.filter((h) => {
    if (filter === "all") return true;
    if (filter === "unsent") return !h.invitationSentAt;
    if (filter === "sent") return !!h.invitationSentAt && !h.invitationOpenedAt;
    if (filter === "opened") return !!h.invitationOpenedAt;
    return true;
  });

  return (
    <div className="flex flex-col gap-12 pb-12">
      {/* Hero */}
      <header>
        <p className="text-[10px] uppercase tracking-[0.26em] text-sage-500 font-mono mb-2">
          Stationer · Invitations
        </p>
        <div className="flex items-baseline justify-between gap-6 flex-wrap">
          <h1 className="display text-[36px] sm:text-[44px] lg:text-[52px] leading-[1.02] tracking-[-0.01em]">
            {totalHouseholds === 0 ? (
              <>Pick a <span className="italic text-sage-500">template</span>.</>
            ) : sentCount === 0 ? (
              <><CountUp value={totalHouseholds} /> households to <span className="italic text-sage-500">invite</span>.</>
            ) : sentCount < totalHouseholds ? (
              <><CountUp value={sentCount} /> of {totalHouseholds} <span className="italic text-sage-500">sent</span>.</>
            ) : (
              <>All invitations <span className="italic text-sage-500">out</span>.</>
            )}
          </h1>
          {totalHouseholds > 0 && (
            <div className="text-right flex gap-6">
              <Stat label="sent" value={sentCount} />
              <Stat label="opened" value={openedCount} accent />
            </div>
          )}
        </div>
        <p className="text-[14px] text-ink-300 mt-4 leading-relaxed max-w-[60ch]">
          Six house templates. Customise the copy, preview live, then send to the
          guest list. Opens are tracked when guests visit the RSVP page from their
          invitation link.
        </p>
      </header>

      {/* Template grid */}
      <Reveal>
        <section>
          <p className="text-[10px] uppercase tracking-[0.22em] text-sage-500 font-mono mb-4">
            The six templates
          </p>
          <ul className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {TEMPLATE_META.map((t) => {
              const active = config.templateId === t.id;
              return (
                <li key={t.id}>
                  <button
                    onClick={() => selectTemplate(t.id)}
                    disabled={!!busy}
                    className={`group w-full text-left rounded-card border transition-all p-3 ${
                      active
                        ? "border-sage-500 bg-sage-100/30 ring-1 ring-sage-400/60"
                        : "border-ink/10 bg-white/70 hover:border-ink/25"
                    }`}
                  >
                    <div className="overflow-hidden rounded-md bg-paper-50 mb-2" style={{ aspectRatio: "5 / 7" }}>
                      <div style={{ transform: "scale(0.235)", transformOrigin: "top left", width: 600, height: 840 }}>
                        <InvitationCard template={t.id} copy={copy} />
                      </div>
                    </div>
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="display italic text-[16px] text-ink leading-tight">{t.label}</p>
                      {active && (
                        <span className="text-[9px] uppercase tracking-[0.18em] text-sage-500 font-mono">✓ chosen</span>
                      )}
                    </div>
                    <p className="text-[11px] text-ink-300 italic mt-0.5 leading-snug">{t.vibe}</p>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      </Reveal>

      {/* Customizer + Preview */}
      <Reveal>
        <section className="grid lg:grid-cols-[360px_1fr] gap-8 items-start">
          {/* Customizer */}
          <div className="surface rounded-card card-shell p-5 flex flex-col gap-4">
            <p className="text-[10px] uppercase tracking-[0.22em] text-sage-500 font-mono">
              Customise
            </p>
            <Input label="Header line" value={config.headerLine ?? ""} placeholder={copy.headerLine} onCommit={(v) => update({ headerLine: v })} />
            <Input label="Date line" value={config.dateLine ?? ""} placeholder={copy.dateLine} onCommit={(v) => update({ dateLine: v })} />
            <Input label="Year line" value={config.yearLine ?? ""} placeholder={copy.yearLine} onCommit={(v) => update({ yearLine: v })} />
            <Input label="Ceremony time" value={config.ceremonyTime ?? ""} placeholder={copy.ceremonyTime} onCommit={(v) => update({ ceremonyTime: v })} />
            <Input label="Venue" value={config.venueLine ?? ""} placeholder={copy.venueLine} onCommit={(v) => update({ venueLine: v })} />
            <Input label="Venue address" value={config.venueAddress ?? ""} placeholder={copy.venueAddress} onCommit={(v) => update({ venueAddress: v })} />
            <Input label="Reception line" value={config.receptionLine ?? ""} placeholder={copy.receptionLine} onCommit={(v) => update({ receptionLine: v })} />
            <Input label="RSVP URL" value={config.rsvpUrl ?? ""} placeholder={copy.rsvpUrl} onCommit={(v) => update({ rsvpUrl: v })} />
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] uppercase tracking-[0.18em] text-ink-300 font-mono">
                Accent colour
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={config.accentColor ?? DEFAULT_ACCENT}
                  onChange={(e) => update({ accentColor: e.target.value })}
                  className="h-9 w-12 rounded border hairline bg-white cursor-pointer"
                />
                <input
                  type="text"
                  value={config.accentColor ?? DEFAULT_ACCENT}
                  onChange={(e) => update({ accentColor: e.target.value })}
                  className="flex-1 rounded border hairline bg-paper-50 px-2 py-1.5 text-[12px] font-mono focus:outline-none focus:border-sage-300"
                />
              </div>
            </label>
          </div>

          {/* Preview */}
          <div className="flex flex-col gap-3">
            <p className="text-[10px] uppercase tracking-[0.22em] text-sage-500 font-mono">
              Live preview
            </p>
            <div className="rounded-card border hairline bg-paper-200/30 p-6 flex items-center justify-center">
              <InvitationCard template={config.templateId} copy={copy} scale={0.7} />
            </div>
          </div>
        </section>
      </Reveal>

      {/* Send + tracking */}
      <Reveal>
        <section>
          <div className="flex items-baseline justify-between gap-3 flex-wrap mb-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-sage-500 font-mono mb-1">
                Send + track
              </p>
              <h2 className="display italic text-[22px] text-ink leading-tight">
                Your guest list.
              </h2>
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label={`All ${totalHouseholds}`} />
              <FilterChip active={filter === "unsent"} onClick={() => setFilter("unsent")} label={`Unsent ${unsentCount}`} />
              <FilterChip active={filter === "sent"} onClick={() => setFilter("sent")} label={`Sent ${sentCount - openedCount}`} />
              <FilterChip active={filter === "opened"} onClick={() => setFilter("opened")} label={`Opened ${openedCount}`} />
              <button
                onClick={sendAll}
                disabled={!!busy || unsentCount === 0}
                className="btn-primary disabled:opacity-50"
                style={{ paddingInline: "1.2rem", paddingBlock: "0.5rem" }}
              >
                {busy === "send" ? "Sending…" : `Send to ${unsentCount} unsent`}
              </button>
            </div>
          </div>

          {totalHouseholds === 0 ? (
            <div className="rounded-card border hairline bg-white/55 px-6 py-10 max-w-xl">
              <p className="display text-[22px] text-ink leading-tight">No households yet.</p>
              <p className="text-[13px] text-ink-300 mt-2 leading-relaxed">
                Add households on <a href="/guests" className="underline text-sage-500">Guests</a> first.
                Then come back here to pick a template and send.
              </p>
            </div>
          ) : (
            <ul className="surface rounded-card card-shell overflow-hidden">
              {filteredHouseholds.map((h, i) => (
                <HouseholdRow
                  key={h.id}
                  household={h}
                  isLast={i === filteredHouseholds.length - 1}
                  busy={busy}
                  onSend={() => sendOne(h.id)}
                  onMarkOpened={() => markOpened(h.id)}
                  onReset={() => reset(h.id)}
                />
              ))}
              {filteredHouseholds.length === 0 && (
                <li className="px-5 py-6 text-[13px] text-ink-300 italic text-center">
                  No households match this filter.
                </li>
              )}
            </ul>
          )}
        </section>
      </Reveal>
    </div>
  );
}

// ---- Pieces ------------------------------------------------------------

function HouseholdRow({
  household, isLast, busy, onSend, onMarkOpened, onReset,
}: {
  household: Household;
  isLast: boolean;
  busy: string | null;
  onSend: () => void;
  onMarkOpened: () => void;
  onReset: () => void;
}) {
  const sent = !!household.invitationSentAt;
  const opened = !!household.invitationOpenedAt;
  return (
    <li className={`px-5 py-3.5 grid grid-cols-[1fr_auto_auto] items-baseline gap-4 hover:bg-paper-100/40 transition-colors ${
      isLast ? "" : "border-b hairline"
    }`}>
      <div className="min-w-0">
        <div className="text-[15px] text-ink leading-tight truncate">{household.label}</div>
        <div className="text-[11.5px] text-ink-300 mt-0.5 italic">
          {household.email ?? household.mailingAddress ?? "no contact"}
          {sent && ` · sent ${relativeDate(household.invitationSentAt!)}`}
          {opened && ` · opened ${relativeDate(household.invitationOpenedAt!)}`}
        </div>
      </div>
      <div className="text-[10.5px] uppercase tracking-[0.18em] font-mono shrink-0">
        {opened ? (
          <span className="text-sage-500">Opened ✓</span>
        ) : sent ? (
          <span className="text-ink-400">Sent</span>
        ) : (
          <span className="text-ink-300">Unsent</span>
        )}
      </div>
      <div className="shrink-0 flex gap-2">
        {!sent && (
          <button
            onClick={onSend}
            disabled={!!busy}
            className="text-[10.5px] uppercase tracking-[0.18em] text-ink-300 hover:text-sage-500 transition-colors disabled:opacity-50"
          >
            Send
          </button>
        )}
        {sent && !opened && (
          <button
            onClick={onMarkOpened}
            disabled={!!busy}
            className="text-[10.5px] uppercase tracking-[0.18em] text-ink-300 hover:text-sage-500 transition-colors disabled:opacity-50"
          >
            Mark opened
          </button>
        )}
        {sent && (
          <button
            onClick={onReset}
            disabled={!!busy}
            className="text-[10.5px] uppercase tracking-[0.18em] text-ink-300 hover:text-risk-high transition-colors disabled:opacity-50"
          >
            Reset
          </button>
        )}
      </div>
    </li>
  );
}

function Input({
  label, value, placeholder, onCommit,
}: {
  label: string;
  value: string;
  placeholder: string;
  onCommit: (v: string) => void;
}) {
  const [local, setLocal] = useState(value);
  // Pull upstream changes into local state. Local edits aren't pushed back
  // until blur/Enter, so this only fires when the parent value changes
  // (e.g., the user switches template or another field commits).
  useEffect(() => { setLocal(value); }, [value]);
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] uppercase tracking-[0.18em] text-ink-300 font-mono">{label}</span>
      <input
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => { if (local !== value) onCommit(local); }}
        onKeyDown={(e) => { if (e.key === "Enter" && local !== value) { onCommit(local); (e.target as HTMLInputElement).blur(); } }}
        placeholder={placeholder}
        className="rounded-md border hairline bg-paper-50 px-3 py-1.5 text-[13.5px] focus:outline-none focus:border-sage-300"
      />
    </label>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="text-right">
      <div className={`display text-[28px] tabular-nums leading-none ${accent ? "text-sage-500" : "text-ink"}`}>
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-[0.22em] text-ink-300 font-mono mt-1">
        {label}
      </div>
    </div>
  );
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`text-[10.5px] uppercase tracking-[0.18em] rounded-full px-3 py-1.5 border transition-colors ${
        active
          ? "bg-ink text-paper-50 border-ink"
          : "bg-white border-ink/12 text-ink-300 hover:border-ink/30"
      }`}
    >
      {label}
    </button>
  );
}

// ---- Helpers -----------------------------------------------------------

function resolveCopy(state: ProjectState | null): InvitationCopy {
  const b = state?.brief;
  const cfg = state?.invitations ?? null;
  const organizer = b?.organizerName || "Organiser";
  const partner = b?.partnerName || "Partner";
  return {
    organizerName: organizer,
    partnerName: partner,
    headerLine: cfg?.headerLine || "Together with their families",
    dateLine: cfg?.dateLine || b?.dateWindow || "Saturday, the fourteenth of September",
    yearLine: cfg?.yearLine || "Two thousand twenty-six",
    ceremonyTime: cfg?.ceremonyTime || "Four o'clock in the afternoon",
    venueLine: cfg?.venueLine || b?.region || "The Old Olive Mill",
    venueAddress: cfg?.venueAddress || "Provence, France",
    receptionLine: cfg?.receptionLine || "Reception to follow",
    rsvpUrl: cfg?.rsvpUrl || (state?.site?.slug ? `/wed/${state.site.slug}/rsvp` : "corsia.app/rsvp"),
    accentColor: cfg?.accentColor || DEFAULT_ACCENT,
  };
}

function relativeDate(iso: string): string {
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return d.toLocaleDateString();
}
