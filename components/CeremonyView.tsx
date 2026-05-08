"use client";

// CeremonyView — tradition curator + Cleric drafter + ritual library + reorder.

import { useMemo, useState } from "react";
import {
  CEREMONY_TRADITIONS,
  type CeremonyTradition,
  type ProjectState,
} from "@/lib/types";
import { RITUAL_LIBRARY } from "@/lib/ceremony/rituals";
import { useProject } from "./StateProvider";

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

  const post = async (body: object, key: string) => {
    setBusy(key);
    try {
      const r = await fetch("/api/ceremony", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const j = (await r.json()) as { state?: ProjectState };
      if (j.state) setState(j.state);
    } finally { setBusy(null); }
  };

  const setTradition = (t: CeremonyTradition) => post({ op: "set_tradition", tradition: t }, "trad");
  const propose = () => post({ op: "propose", tradition, notes: notes || undefined }, "propose");
  const lock = () => post({ op: "propose_lock" }, "lock");
  const update = (id: string, patch: { title?: string; body?: string; reader?: string }) =>
    post({ op: "update", id, patch }, "u-" + id);
  const addRitual = (key: string) => post({ op: "add_ritual", ritualKey: key }, "add-" + key);
  const move = (id: string, direction: "up" | "down") => post({ op: "move", id, direction }, "m-" + id);
  const remove = (id: string) => post({ op: "delete_section", id }, "d-" + id);

  const tradMeta = CEREMONY_TRADITIONS.find((t) => t.id === tradition);

  return (
    <div className="flex flex-col gap-4 pt-2 lg:pt-0">
      <header>
        <p className="small-caps text-[11px]">Cleric</p>
        <h1 className="display text-3xl lg:text-4xl mt-1">Ceremony script</h1>
        <p className="text-sm text-ink-300 mt-2 max-w-prose">
          Pick a tradition or build one from scratch. Cleric drafts the script; you can swap individual rituals from the library, reorder, edit, or delete.
        </p>
      </header>

      {/* Tradition picker */}
      <section className="surface rounded-card border hairline shadow-card p-4 sm:p-5">
        <div className="flex items-baseline justify-between flex-wrap gap-2 mb-3">
          <h2 className="display text-xl">Tradition</h2>
          {tradMeta && <span className="text-[12px] text-ink-300 italic max-w-[60ch]">{tradMeta.blurb}</span>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CEREMONY_TRADITIONS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTradition(t.id)}
              disabled={!!busy}
              className={`chip ${tradition === t.id ? "chip-on" : "chip-off"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      {/* Cleric drafter */}
      <section className="surface rounded-card border hairline shadow-card p-4">
        <h2 className="display text-lg">Have Cleric draft a {tradMeta?.label ?? tradition} ceremony</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Optional notes for Cleric: 'skip kanyadaan', 'add hand-fasting after the vows', 'no full Mass', 'dual officiants — one Catholic, one Reform Jewish'…"
          className="mt-2 w-full rounded-lg border hairline bg-white/80 px-3 py-2 text-sm"
        />
        <div className="mt-3 flex gap-2 flex-wrap">
          <button
            onClick={propose}
            disabled={!!busy || !state.brief?.locked}
            className="rounded-2xl bg-ink text-paper-50 px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {busy === "propose" ? "Cleric drafting…" : state.ceremony.length ? "Re-draft" : "Draft script"}
          </button>
          <button
            onClick={() => setShowLibrary((s) => !s)}
            className="rounded-2xl border hairline bg-white/80 px-4 py-2 text-sm"
          >
            {showLibrary ? "Hide ritual library" : `Browse ritual library (${RITUAL_LIBRARY.length})`}
          </button>
          {state.ceremony.length > 0 && (
            <button onClick={lock} disabled={!!busy} className="rounded-2xl border hairline bg-white/80 px-4 py-2 text-sm">
              Propose lock
            </button>
          )}
        </div>
      </section>

      {/* Ritual library browser */}
      {showLibrary && (
        <section className="surface rounded-card border hairline shadow-card p-4">
          <div className="flex items-baseline justify-between gap-2 flex-wrap">
            <h2 className="display text-lg">Ritual library</h2>
            <select
              value={libraryFilter}
              onChange={(e) => setLibraryFilter(e.target.value as CeremonyTradition | "all")}
              className="text-sm rounded border hairline bg-white/80 px-2 py-1"
            >
              <option value="all">All traditions ({RITUAL_LIBRARY.length})</option>
              {CEREMONY_TRADITIONS.map((t) => {
                const count = RITUAL_LIBRARY.filter((r) => r.tradition === t.id).length;
                if (!count) return null;
                return <option key={t.id} value={t.id}>{t.label} ({count})</option>;
              })}
            </select>
          </div>
          <ul className="mt-3 grid sm:grid-cols-2 gap-2 max-h-[420px] overflow-y-auto pr-1">
            {filteredLibrary.map((r) => (
              <li key={r.key} className="rounded-card border hairline bg-white/60 p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="display text-base">{r.title}</h3>
                  <span className="small-caps text-[10px]">{r.tradition.replace(/_/g, " ")}</span>
                </div>
                <p className="text-[12px] text-ink-300 mt-1">{r.description}</p>
                <button
                  onClick={() => addRitual(r.key)}
                  disabled={!!busy}
                  className="mt-2 w-full rounded-2xl border hairline bg-white py-1.5 text-[12px] font-medium disabled:opacity-50"
                >
                  {busy === "add-" + r.key ? "Adding…" : "+ Add to ceremony"}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* The ceremony itself */}
      <ol className="flex flex-col gap-3">
        {state.ceremony.map((s, i) => (
          <li key={s.id} className="surface rounded-card border hairline shadow-card p-4">
            <div className="flex items-baseline justify-between gap-2 flex-wrap">
              <div className="flex items-baseline gap-2">
                <span className="display text-lg text-ink-300">{String(i + 1).padStart(2, "0")}</span>
                <input
                  defaultValue={s.title}
                  onBlur={(e) => update(s.id, { title: e.target.value })}
                  className="display text-lg bg-transparent border-b border-transparent hover:border-ink/15 focus:border-ink/30 focus:outline-none px-1"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="small-caps text-[10px]">{s.kind.replace(/_/g, " ")}{s.tradition ? ` · ${s.tradition.replace(/_/g, " ")}` : ""}</span>
                <button onClick={() => move(s.id, "up")} disabled={i === 0 || !!busy} className="text-[11px] uppercase tracking-widest text-ink-300 hover:text-ink disabled:opacity-30" aria-label="Move up">↑</button>
                <button onClick={() => move(s.id, "down")} disabled={i === state.ceremony.length - 1 || !!busy} className="text-[11px] uppercase tracking-widest text-ink-300 hover:text-ink disabled:opacity-30" aria-label="Move down">↓</button>
                <button onClick={() => remove(s.id)} disabled={!!busy} className="text-[11px] uppercase tracking-widest text-risk-high disabled:opacity-50" aria-label="Remove">×</button>
              </div>
            </div>
            <input
              defaultValue={s.reader ?? ""}
              onBlur={(e) => update(s.id, { reader: e.target.value })}
              placeholder="Reader / who delivers this"
              className="mt-2 w-full rounded border hairline bg-white/80 px-2 py-1 text-[12px]"
            />
            <textarea
              defaultValue={s.body}
              onBlur={(e) => update(s.id, { body: e.target.value })}
              rows={Math.max(3, Math.min(20, Math.ceil(s.body.length / 70)))}
              className="mt-2 w-full rounded-lg border hairline bg-white/80 px-3 py-2 text-[14px] font-display leading-relaxed"
            />
          </li>
        ))}
        {state.ceremony.length === 0 && (
          <li className="text-sm text-ink-300 italic">
            No ceremony yet. Pick a tradition above and click "Draft script", or browse the ritual library to compose your own.
          </li>
        )}
      </ol>
    </div>
  );
}
