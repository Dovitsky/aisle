"use client";

// CeremonyView. The actual script of the moment two people get married.
// Tradition curator + Cleric drafter + ritual library + reorder + lock.
//
// Layout: editorial hero adapts to state (no script / N sections drafted
// in <tradition>). Tradition picker as elegant chip grid with contextual
// blurb. Cleric drafter with sage-mono prelude. Ritual library as a
// collapsible browser grouped by tradition. Ceremony sections as
// numbered cards with italic-Cormorant titles, sage-mono kind/reader,
// and a generous Cormorant-display body textarea so the script reads
// like a script.

import { useMemo, useState } from "react";
import {
  CEREMONY_TRADITIONS,
  type CeremonyTradition,
  type ProjectState,
} from "@/lib/types";
import { RITUAL_LIBRARY } from "@/lib/ceremony/rituals";
import { useProject } from "./StateProvider";
import { Reveal, CountUp } from "./Atmosphere";

export function CeremonyView() {
  const { state, setState, loading } = useProject();
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [libraryFilter, setLibraryFilter] = useState<CeremonyTradition | "all">("all");
  const [showLibrary, setShowLibrary] = useState(false);

  const filteredLibrary = useMemo(() => {
    if (libraryFilter === "all") return RITUAL_LIBRARY;
    return RITUAL_LIBRARY.filter((r) => r.tradition === libraryFilter);
  }, [libraryFilter]);

  if (loading || !state) return <div className="pt-10 text-center text-ink-300">Loading…</div>;

  const tradition = state.ceremonyTradition;
  const tradMeta = CEREMONY_TRADITIONS.find((t) => t.id === tradition);
  const sections = state.ceremony;
  const total = sections.length;
  const approved = sections.filter((s) => s.approved).length;
  const briefLocked = Boolean(state.brief?.locked);

  const post = async (body: object, key: string) => {
    setBusy(key);
    try {
      const r = await fetch("/api/ceremony", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await r.json()) as { state?: ProjectState };
      if (j.state) setState(j.state);
    } finally { setBusy(null); }
  };

  const setTradition = (t: CeremonyTradition) => post({ op: "set_tradition", tradition: t }, "trad");
  const propose = () => post({ op: "propose", tradition, notes: notes || undefined }, "propose");
  const lock = () => post({ op: "propose_lock" }, "lock");
  const update = (id: string, patch: { title?: string; body?: string; reader?: string; approved?: boolean }) =>
    post({ op: "update", id, patch }, "u-" + id);
  const addRitual = (key: string) => post({ op: "add_ritual", ritualKey: key }, "add-" + key);
  const move = (id: string, direction: "up" | "down") => post({ op: "move", id, direction }, "m-" + id);
  const remove = (id: string) => post({ op: "delete_section", id }, "d-" + id);

  return (
    <div className="flex flex-col gap-12 pb-12">
      {/* Hero */}
      <header>
        <p className="text-[10px] uppercase tracking-[0.26em] text-sage-500 font-mono mb-2">
          Cleric · The ceremony script
        </p>
        <div className="flex items-baseline justify-between gap-6 flex-wrap">
          <h1 className="display text-[36px] sm:text-[44px] lg:text-[52px] leading-[1.02] tracking-[-0.01em]">
            {total === 0 ? (
              <>The <span className="italic text-sage-500">script</span> of the moment.</>
            ) : (
              <>
                <CountUp value={total} /> sections,{" "}
                <span className="italic text-sage-500">{tradMeta?.label.toLowerCase() ?? tradition}</span>.
              </>
            )}
          </h1>
          {total > 0 && (
            <div className="text-right">
              <div className="display text-[28px] tabular-nums leading-none text-sage-500">
                {approved}
                <span className="text-ink-300 mx-1">/</span>
                {total}
              </div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-ink-300 font-mono mt-1">
                approved
              </div>
            </div>
          )}
        </div>
        <p className="text-[14px] text-ink-300 mt-4 leading-relaxed max-w-[60ch]">
          Pick a tradition or build one from scratch. Cleric drafts the lines using real liturgical
          language — swap individual rituals from the library, reorder, edit, until the script
          reads the way the day will feel.
        </p>
      </header>

      {/* Tradition picker */}
      <Reveal>
        <section className="rounded-card border hairline bg-white/85 px-5 py-5">
          <div className="flex items-baseline justify-between flex-wrap gap-3 mb-4">
            <p className="text-[10px] uppercase tracking-[0.22em] text-sage-500 font-mono">
              Tradition
            </p>
            {tradMeta && (
              <span className="text-[12px] text-ink-300 italic max-w-[60ch] text-right">
                {tradMeta.blurb}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CEREMONY_TRADITIONS.map((t) => {
              const active = tradition === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTradition(t.id)}
                  disabled={!!busy}
                  className={`text-[11px] uppercase tracking-[0.16em] border rounded-full px-3 py-1 transition-colors ${
                    active
                      ? "bg-ink text-paper-50 border-ink"
                      : "border-ink/15 text-ink-400 hover:border-ink/30 hover:text-ink"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </section>
      </Reveal>

      {/* Cleric drafter */}
      <Reveal>
        <section className="rounded-card border hairline bg-white/85 px-5 py-5">
          <p className="text-[10px] uppercase tracking-[0.22em] text-sage-500 font-mono mb-3">
            {total === 0 ? "Draft a script" : "Re-draft with new notes"}
          </p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Optional notes for Cleric: 'skip kanyadaan', 'add hand-fasting after the vows', 'no full Mass', 'dual officiants — one Catholic, one Reform Jewish'…"
            className="w-full rounded-lg border hairline bg-paper-50 px-3 py-2.5 text-[14px] leading-relaxed focus:outline-none focus:border-sage-300 resize-none"
          />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={propose}
              disabled={!!busy || !briefLocked}
              className="btn-primary"
              style={{ paddingInline: "1.4rem", paddingBlock: "0.55rem" }}
            >
              {busy === "propose"
                ? "Cleric working…"
                : total > 0 ? "Re-draft" : "Draft a script"}
            </button>
            <button
              onClick={() => setShowLibrary((s) => !s)}
              className="text-[11px] uppercase tracking-[0.18em] border border-ink/15 hover:border-ink/30 rounded-full px-3.5 py-1.5 transition-colors text-ink-400 hover:text-ink"
            >
              {showLibrary ? "Hide ritual library" : `Browse library · ${RITUAL_LIBRARY.length}`}
            </button>
            {total > 0 && (
              <button
                onClick={lock}
                disabled={!!busy}
                className="text-[11px] uppercase tracking-[0.18em] border border-sage-300 hover:border-sage-500 text-sage-500 rounded-full px-3.5 py-1.5 transition-colors"
              >
                Propose lock
              </button>
            )}
            {!briefLocked && (
              <span className="text-[11px] uppercase tracking-[0.16em] text-ink-300">
                Seal the dossier first
              </span>
            )}
          </div>
        </section>
      </Reveal>

      {/* Ritual library */}
      {showLibrary && (
        <Reveal>
          <section className="rounded-card border hairline bg-white/85 px-5 py-5">
            <div className="flex items-baseline justify-between gap-3 flex-wrap mb-4">
              <p className="text-[10px] uppercase tracking-[0.22em] text-sage-500 font-mono">
                Ritual library
              </p>
              <select
                value={libraryFilter}
                onChange={(e) => setLibraryFilter(e.target.value as CeremonyTradition | "all")}
                className="text-[12px] rounded-lg border hairline bg-paper-50 px-2.5 py-1.5 focus:outline-none focus:border-sage-300"
              >
                <option value="all">All traditions · {RITUAL_LIBRARY.length}</option>
                {CEREMONY_TRADITIONS.map((t) => {
                  const count = RITUAL_LIBRARY.filter((r) => r.tradition === t.id).length;
                  if (!count) return null;
                  return <option key={t.id} value={t.id}>{t.label} · {count}</option>;
                })}
              </select>
            </div>
            <ul className="grid sm:grid-cols-2 gap-3 max-h-[480px] overflow-y-auto pr-1">
              {filteredLibrary.map((r) => (
                <li key={r.key} className="surface rounded-card card-shell overflow-hidden">
                  <div className="px-4 pt-3 pb-3 border-b hairline">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="display italic text-[18px] leading-tight">{r.title}</h3>
                      <span className="text-[10px] uppercase tracking-[0.18em] text-sage-500 font-mono shrink-0">
                        {r.tradition.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="text-[11.5px] text-ink-300 italic leading-relaxed mt-1">
                      {r.description}
                    </p>
                  </div>
                  <button
                    onClick={() => addRitual(r.key)}
                    disabled={!!busy}
                    className="w-full py-2.5 text-[11px] uppercase tracking-[0.18em] text-sage-500 hover:bg-sage-200/30 transition-colors disabled:opacity-50"
                  >
                    {busy === "add-" + r.key ? "Adding…" : "+ Add to ceremony"}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </Reveal>
      )}

      {/* The script */}
      {total === 0 ? (
        <Reveal>
          <div className="rounded-card border hairline bg-white/55 px-7 py-12 max-w-xl">
            <p className="display text-[26px] text-ink leading-tight">No script yet.</p>
            <p className="text-[14px] text-ink-300 mt-3 leading-relaxed">
              Pick a tradition above and click <span className="text-ink not-italic">Draft a script</span>,
              or browse the ritual library to assemble your own from individual elements.
            </p>
          </div>
        </Reveal>
      ) : (
        <Reveal>
          <section>
            <h2 className="display italic text-[22px] text-ink leading-tight mb-5">
              The script
            </h2>
            <ol className="flex flex-col gap-4">
              {sections.map((s, i) => (
                <li
                  key={s.id}
                  className={`surface rounded-card card-shell overflow-hidden ${
                    s.approved ? "ring-1 ring-sage-300/60" : ""
                  }`}
                >
                  <header className="px-5 pt-4 pb-3 border-b hairline">
                    <div className="flex items-baseline justify-between gap-3 flex-wrap">
                      <div className="flex items-baseline gap-3 min-w-0">
                        <span className="display tabular-nums text-[22px] text-ink-300 leading-none">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <input
                          defaultValue={s.title}
                          onBlur={(e) => {
                            if (e.target.value !== s.title) update(s.id, { title: e.target.value });
                          }}
                          className="display italic text-[22px] leading-tight bg-transparent border-b border-transparent hover:border-ink/15 focus:border-ink/30 focus:outline-none px-0.5 min-w-0 flex-1"
                        />
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] uppercase tracking-[0.18em] text-sage-500 font-mono">
                          {s.kind.replace(/_/g, " ")}{s.tradition && s.tradition !== tradition ? ` · ${s.tradition.replace(/_/g, " ")}` : ""}
                        </span>
                        <button
                          onClick={() => move(s.id, "up")}
                          disabled={i === 0 || !!busy}
                          className="text-[12px] text-ink-300 hover:text-ink disabled:opacity-30 px-1"
                          aria-label="Move up"
                        >↑</button>
                        <button
                          onClick={() => move(s.id, "down")}
                          disabled={i === total - 1 || !!busy}
                          className="text-[12px] text-ink-300 hover:text-ink disabled:opacity-30 px-1"
                          aria-label="Move down"
                        >↓</button>
                        <button
                          onClick={() => remove(s.id)}
                          disabled={!!busy}
                          className="text-[11px] uppercase tracking-[0.18em] text-risk-high hover:opacity-70 disabled:opacity-30 px-1"
                          aria-label="Remove"
                        >×</button>
                      </div>
                    </div>
                  </header>
                  <div className="px-5 py-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] uppercase tracking-[0.18em] text-ink-300 font-mono shrink-0">
                        Reader
                      </span>
                      <input
                        defaultValue={s.reader ?? ""}
                        onBlur={(e) => {
                          if ((e.target.value ?? "") !== (s.reader ?? "")) update(s.id, { reader: e.target.value });
                        }}
                        placeholder="Celebrant, Priest, Couple, Maid of honor…"
                        className="flex-1 rounded-lg border hairline bg-paper-50 px-2.5 py-1 text-[12.5px] focus:outline-none focus:border-sage-300"
                      />
                    </div>
                    <textarea
                      defaultValue={s.body}
                      onBlur={(e) => {
                        if (e.target.value !== s.body) update(s.id, { body: e.target.value });
                      }}
                      rows={Math.max(4, Math.min(20, Math.ceil(s.body.length / 70)))}
                      className="mt-2 w-full rounded-lg border hairline bg-paper-50 px-3 py-2.5 text-[15px] font-display leading-[1.7] focus:outline-none focus:border-sage-300 resize-y"
                    />
                    <div className="mt-3 flex items-center justify-end">
                      <button
                        onClick={() => update(s.id, { approved: !s.approved })}
                        className={`text-[10.5px] uppercase tracking-[0.18em] border rounded-full px-2.5 py-1 transition-colors ${
                          s.approved
                            ? "bg-sage-500 text-paper-50 border-sage-500"
                            : "border-ink/15 text-ink-300 hover:border-sage-300 hover:text-sage-500"
                        }`}
                      >
                        {s.approved ? "Approved" : "Mark approved"}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </Reveal>
      )}
    </div>
  );
}
