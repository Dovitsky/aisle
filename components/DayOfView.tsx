"use client";

// Day-Of console. Editable live timeline (drag-reorder, inline time
// edit, add new item, template picker) + contingency plans + day-of
// mode toggle.

import { useState } from "react";
import type { DayOfStatus, ProjectState } from "@/lib/types";
import { useProject } from "./StateProvider";
import { useDialog } from "./Dialog";
import { EmptyState, PageHeader } from "./ui";

const STATUS_ORDER: DayOfStatus[] = ["pending", "in_progress", "done", "delayed", "skipped"];
const STATUS_TONE: Record<DayOfStatus, string> = {
  pending: "border-ink/15 text-ink-300 bg-paper-200/40",
  in_progress: "border-accent/30 text-accent bg-accent-wash/40",
  done: "border-risk-low/30 text-risk-low bg-risk-low/5",
  delayed: "border-risk-high/30 text-risk-high bg-risk-high/5 animate-pulse-soft",
  skipped: "border-ink/10 text-ink-300 bg-paper-200/30 line-through",
};

const TOPIC_LABEL: Record<string, string> = {
  weather: "Weather",
  timeline_slip: "Timeline slip",
  vendor_late: "Vendor late",
  vendor_no_show: "Vendor no-show",
  guest_medical: "Guest medical",
  intoxication: "Intoxication near bar",
};

export function DayOfView() {
  const { state, setState, loading } = useProject();
  const dialog = useDialog();
  const [busy, setBusy] = useState<string | null>(null);

  if (loading || !state) return <div className="pt-10 text-center text-ink-300">Loading…</div>;

  const seedItems = async (template?: "classic" | "intimate" | "destination") => {
    setBusy("seed");
    try {
      const r = await fetch("/api/dayof", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "seed_template", template }),
      });
      const j = (await r.json()) as { state?: ProjectState };
      if (j.state) setState(j.state);
    } finally { setBusy(null); }
  };

  const updateItem = async (id: string, patch: { time?: string; title?: string; owner?: string }) => {
    const r = await fetch("/api/dayof", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ op: "update", id, patch }),
    });
    const j = (await r.json()) as { state?: ProjectState };
    if (j.state) setState(j.state);
  };

  const deleteItem = async (id: string) => {
    const r = await fetch("/api/dayof", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ op: "delete", id }),
    });
    const j = (await r.json()) as { state?: ProjectState };
    if (j.state) setState(j.state);
  };

  const addItem = async () => {
    const data = await dialog.form({
      title: "Add to the timeline",
      body: "We'll slot it in by time.",
      fields: [
        { id: "time",  label: "Time",  type: "text", default: "18:30", required: true, placeholder: "18:30" },
        { id: "title", label: "What",  type: "text", default: "", required: true, placeholder: "Toasts" },
        { id: "owner", label: "Owner", type: "text", default: "", placeholder: "Coordinator" },
      ],
      confirmLabel: "Add",
    });
    if (!data) return;
    await fetch("/api/dayof", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ op: "add", item: { time: String(data.time), title: String(data.title), owner: String(data.owner ?? "") } }),
    }).then((r) => r.json()).then((j) => { if (j.state) setState(j.state); });
  };

  const reorder = async (newOrder: string[]) => {
    // Optimistic local update so the drag feels snappy
    if (state) {
      const map = new Map(state.dayOf.map((i) => [i.id, i] as const));
      const next = newOrder.map((id) => map.get(id)).filter((x): x is NonNullable<typeof x> => !!x);
      setState({ ...state, dayOf: next });
    }
    await fetch("/api/dayof", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ op: "reorder", order: newOrder }),
    });
  };

  const seedBands = async () => {
    setBusy("bands");
    try {
      const r = await fetch("/api/contingencies", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "seed_default" }),
      });
      const j = (await r.json()) as { state?: ProjectState };
      if (j.state) setState(j.state);
    } finally { setBusy(null); }
  };

  const cycle = async (id: string, current: DayOfStatus) => {
    const idx = STATUS_ORDER.indexOf(current);
    const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
    const r = await fetch("/api/dayof", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ op: "update", id, patch: { status: next } }),
    });
    const j = (await r.json()) as { state?: ProjectState };
    if (j.state) setState(j.state);
  };

  const trigger = async (id: string) => {
    const note = await dialog.prompt({
      title: "Trigger this plan",
      label: "What's happening?",
      body: "We'll log it and run the playbook for this scenario.",
      placeholder: "Light rain at noon. moving ceremony into the barn.",
      type: "textarea",
      confirmLabel: "Trigger",
    });
    if (!note) return;
    const r = await fetch("/api/contingencies", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ op: "trigger", id, note }),
    });
    const j = (await r.json()) as { state?: ProjectState };
    if (j.state) setState(j.state);
  };

  const toggleMode = async () => {
    setBusy("mode");
    try {
      const r = await fetch("/api/contingencies", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "toggle_day_of_mode", on: !state.dayOfMode }),
      });
      const j = (await r.json()) as { state?: ProjectState };
      if (j.state) setState(j.state);
    } finally { setBusy(null); }
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Wedding Day"
        title="Day-of console"
        subtitle="On the day, the chat goes quiet. Small calls inside your playbook get handled automatically. anything bigger goes to your planner first, then to you only if it has to."
      />

      <section className="surface rounded-card border hairline shadow-card p-4 sm:p-5 flex items-center justify-between gap-3">
        <div>
          <div className="display text-lg">Day-of mode</div>
          <div className="text-[12px] text-ink-300">{state.dayOfMode ? "On. Small day-of calls handled for you." : "Off. Decisions are coming to you as usual."}</div>
        </div>
        <button
          onClick={toggleMode}
          disabled={!!busy}
          className={`rounded-2xl px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${state.dayOfMode ? "bg-risk-high text-paper-50 hover:opacity-90" : "cta-sage"}`}
        >
          {state.dayOfMode ? "Turn off" : "Turn on"}
        </button>
      </section>

      <section className="surface rounded-card border hairline shadow-card p-4 sm:p-5">
        <div className="flex items-baseline justify-between gap-2 flex-wrap mb-3">
          <h2 className="display text-xl">If-this-then-that plans</h2>
          {state.contingencies.length === 0 && (
            <button onClick={seedBands} disabled={!!busy} className="rounded-2xl border hairline bg-white/80 hover:bg-white px-3 py-1.5 text-sm transition-colors disabled:opacity-50">
              {busy === "bands" ? "…" : "Add the standard set"}
            </button>
          )}
        </div>
        {state.contingencies.length === 0 ? (
          <p className="text-sm text-ink-300 italic">Nothing yet. Add a few before the day so we have a playbook to fall back on.</p>
        ) : (
          <ul className="grid sm:grid-cols-2 gap-2 stagger">
            {state.contingencies.map((b) => (
              <li key={b.id} className={`rounded-card border ${b.triggered ? "border-risk-high/30 bg-risk-high/5" : "hairline bg-white/60 hover:bg-white"} p-3 transition-colors`}>
                <div className="flex items-baseline justify-between">
                  <h3 className="display text-base">{TOPIC_LABEL[b.topic]}</h3>
                  <span className="eyebrow">→ {b.escalation}</span>
                </div>
                <p className="text-[12px] text-ink-400 mt-1.5 leading-relaxed">{b.preApproved}</p>
                {b.triggered ? (
                  <p className="text-[12px] text-risk-high mt-2 italic">⚠ Triggered: {b.triggerNote}</p>
                ) : (
                  <button onClick={() => trigger(b.id)} disabled={!state.dayOfMode} className="mt-2 chip chip-off disabled:opacity-50">
                    Trigger
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="surface rounded-card border hairline shadow-card p-4 sm:p-5">
        <div className="flex items-baseline justify-between gap-3 mb-3 flex-wrap">
          <h2 className="display text-xl">Timeline</h2>
          <div className="flex items-center gap-2 flex-wrap">
            {state.dayOf.length > 0 && (
              <button
                onClick={addItem}
                disabled={!!busy}
                className="inline-flex items-center gap-1.5 rounded-full cta-sage px-4 py-1.5 text-[11.5px] uppercase tracking-[0.2em] font-semibold transition-colors disabled:opacity-50"
              >
                + Add
              </button>
            )}
            <TemplateMenu
              busy={busy === "seed"}
              hasItems={state.dayOf.length > 0}
              onChoose={(t) => seedItems(t)}
            />
          </div>
        </div>
        {state.dayOf.length === 0 ? (
          <EmptyState
            title="No timeline yet."
            hint="Pick a template to start with, or add your first item. Drag to reorder, click any time to edit."
          />
        ) : (
          <DraggableTimeline
            items={state.dayOf}
            onReorder={reorder}
            onCycle={cycle}
            onUpdate={updateItem}
            onDelete={deleteItem}
          />
        )}
      </section>
    </div>
  );
}

// =====================================================================
// TemplateMenu. dropdown of starter templates
// =====================================================================

function TemplateMenu({
  busy,
  hasItems,
  onChoose,
}: {
  busy: boolean;
  hasItems: boolean;
  onChoose: (template: "classic" | "intimate" | "destination") => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-full border hairline bg-white/85 hover:bg-white hover:border-ink/25 px-4 py-1.5 text-[11.5px] uppercase tracking-[0.2em] font-medium transition-colors disabled:opacity-50"
      >
        {busy ? "Loading…" : hasItems ? "Replace with template" : "Use a template"}
        <svg width="9" height="9" viewBox="0 0 12 12" fill="none" aria-hidden className={open ? "rotate-180 transition-transform" : "transition-transform"}>
          <path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 top-full mt-2 z-40 surface rounded-2xl border hairline shadow-cardHover py-2 min-w-[260px] animate-fade-in-soft">
            {(
              [
                { key: "classic",     name: "Classic",     blurb: "8am load-in, 4pm ceremony, 11pm send-off" },
                { key: "intimate",    name: "Intimate",    blurb: "11am start, 2pm ceremony, 10:30 send-off" },
                { key: "destination", name: "Destination", blurb: "Sunset ceremony, late-night espresso bar" },
              ] as const
            ).map((t) => (
              <button
                key={t.key}
                onClick={() => { setOpen(false); onChoose(t.key); }}
                className="w-full text-left px-4 py-2.5 hover:bg-paper-200/60 transition-colors"
              >
                <div
                  className="italic text-[16px] leading-tight text-ink"
                  style={{
                    fontFamily: '"Cormorant","Cormorant Garamond",Georgia,serif',
                    letterSpacing: "-0.005em",
                  }}
                >
                  {t.name}
                </div>
                <div className="text-[11.5px] text-ink-300 mt-0.5">{t.blurb}</div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// =====================================================================
// DraggableTimeline. native HTML5 drag-and-drop, inline editing, delete
// =====================================================================

interface DraggableTimelineProps {
  items: import("@/lib/types").DayOfItem[];
  onReorder: (order: string[]) => void;
  onCycle: (id: string, current: DayOfStatus) => void;
  onUpdate: (id: string, patch: { time?: string; title?: string; owner?: string }) => void;
  onDelete: (id: string) => void;
}

function DraggableTimeline({ items, onReorder, onCycle, onUpdate, onDelete }: DraggableTimelineProps) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  const handleDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) {
      setDragId(null);
      setDropTargetId(null);
      return;
    }
    const ids = items.map((i) => i.id);
    const fromIdx = ids.indexOf(dragId);
    const toIdx = ids.indexOf(targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    const next = [...ids];
    next.splice(fromIdx, 1);
    next.splice(toIdx, 0, dragId);
    setDragId(null);
    setDropTargetId(null);
    onReorder(next);
  };

  return (
    <ol className="flex flex-col">
      {items.map((item) => {
        const isDragging = dragId === item.id;
        const isDropTarget = dropTargetId === item.id && dragId !== item.id;
        return (
          <li
            key={item.id}
            draggable
            onDragStart={(e) => {
              setDragId(item.id);
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              if (dropTargetId !== item.id) setDropTargetId(item.id);
            }}
            onDragLeave={() => {
              if (dropTargetId === item.id) setDropTargetId(null);
            }}
            onDrop={(e) => { e.preventDefault(); handleDrop(item.id); }}
            onDragEnd={() => { setDragId(null); setDropTargetId(null); }}
            className={`group grid grid-cols-[20px_72px_1fr_auto_auto] items-center gap-3 border-t hairline py-3 first:border-t-0 first:pt-0 last:pb-0 transition-all ${
              isDragging ? "opacity-40" : ""
            } ${isDropTarget ? "bg-sage-50/60 rounded-md -mx-2 px-2" : ""}`}
          >
            {/* Drag handle */}
            <span
              className="cursor-grab active:cursor-grabbing text-ink-200 group-hover:text-ink-300 transition-colors select-none"
              aria-label="Drag to reorder"
              title="Drag to reorder"
            >
              ⋮⋮
            </span>

            {/* Time. inline editable */}
            <input
              type="time"
              defaultValue={item.time}
              onBlur={(e) => {
                if (e.target.value !== item.time) onUpdate(item.id, { time: e.target.value });
              }}
              className="display text-lg leading-none text-ink tabular-nums bg-transparent border-b border-transparent hover:border-ink/15 focus:border-sage-400 focus:outline-none w-[70px]"
            />

            {/* Title + owner. inline editable */}
            <div className="min-w-0">
              <input
                defaultValue={item.title}
                onBlur={(e) => {
                  if (e.target.value !== item.title) onUpdate(item.id, { title: e.target.value });
                }}
                className="w-full text-[14px] bg-transparent border-b border-transparent hover:border-ink/15 focus:border-sage-400 focus:outline-none"
              />
              <input
                defaultValue={item.owner}
                onBlur={(e) => {
                  if (e.target.value !== item.owner) onUpdate(item.id, { owner: e.target.value });
                }}
                placeholder="Owner"
                className="mt-0.5 w-full text-[11px] text-ink-300 bg-transparent border-b border-transparent hover:border-ink/15 focus:border-sage-400 focus:outline-none placeholder:text-ink-200"
              />
            </div>

            {/* Status pill */}
            <button
              onClick={() => onCycle(item.id, item.status)}
              className={`text-[10px] uppercase tracking-[0.14em] border rounded-full px-2.5 py-1 transition-colors ${STATUS_TONE[item.status]}`}
            >
              {item.status.replace("_", " ")}
            </button>

            {/* Delete (visible on hover) */}
            <button
              onClick={() => onDelete(item.id)}
              className="text-[10px] uppercase tracking-[0.18em] text-ink-300 hover:text-risk-high opacity-0 group-hover:opacity-100 transition-all"
              title="Remove"
              aria-label="Remove item"
            >
              ✕
            </button>
          </li>
        );
      })}
    </ol>
  );
}
