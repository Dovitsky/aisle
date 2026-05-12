"use client";

// Manual drag-and-drop seating. Sidebar of unseated guests + table cards
// as drop zones. Sits below the solver UI in /seating — couples can use
// either or both. Round + rectangular tables, color-coded by side, dietary
// badges on each guest chip, print-friendly view.

import { useMemo, useState } from "react";
import type { Guest, ProjectState, SeatingTable } from "@/lib/types";
import { DIETARY_PREF_LABEL, ALLERGEN_LABEL } from "@/lib/types";
import { useProject } from "./StateProvider";

export function SeatingDragDrop() {
  const { state, setState, loading } = useProject();
  const [busy, setBusy] = useState<string | null>(null);
  const [dragGuest, setDragGuest] = useState<string | null>(null);
  const [hoverTable, setHoverTable] = useState<string | null>(null);
  const [sidebarHover, setSidebarHover] = useState(false);

  const post = async (body: object, key: string) => {
    setBusy(key);
    try {
      const r = await fetch("/api/seating", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await r.json()) as { state?: ProjectState; error?: string };
      if (j.state) setState(j.state);
    } finally {
      setBusy(null);
    }
  };

  const assign = (guestId: string, tableId: string | null) =>
    post({ op: "assign", guestId, tableId }, `assign-${guestId}`);
  const addTable = (shape: "round" | "rectangle") =>
    post({ op: "add_table", shape, capacity: 8 }, `add-${shape}`);
  const removeTable = (tableId: string) => post({ op: "remove_table", tableId }, `rm-${tableId}`);
  const updateTable = (
    tableId: string,
    patch: { shape?: "round" | "rectangle"; capacity?: number },
  ) => post({ op: "update_table", tableId, patch }, `upd-${tableId}`);
  const clearAssignments = () => post({ op: "clear_assignments" }, "clear");

  const { unseated, seatedByTable } = useMemo(() => {
    const seatedByTable: Record<string, Guest[]> = {};
    const unseated: Guest[] = [];
    if (!state) return { unseated, seatedByTable };
    for (const g of state.guests) {
      if (g.rsvp === "no") continue;
      const tid = state.seating.assignments[g.id];
      if (!tid) unseated.push(g);
      else {
        seatedByTable[tid] = seatedByTable[tid] || [];
        seatedByTable[tid].push(g);
      }
    }
    return { unseated, seatedByTable };
  }, [state]);

  if (loading || !state) return null;
  if (state.guests.length === 0) return null;

  const onDropOnTable = (tableId: string) => {
    if (!dragGuest) return;
    assign(dragGuest, tableId);
    setDragGuest(null);
    setHoverTable(null);
  };

  const onDropOnSidebar = () => {
    if (!dragGuest) return;
    assign(dragGuest, null);
    setDragGuest(null);
    setSidebarHover(false);
  };

  const seatedCount = Object.keys(state.seating.assignments).length;
  const yesCount = state.guests.filter((g) => g.rsvp === "yes").length;

  return (
    <section className="seating-dnd flex flex-col gap-6">
      <div className="flex items-baseline justify-between gap-3 flex-wrap seating-print-hidden">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-sage-500 font-mono mb-1">
            Manual mode
          </p>
          <h2 className="display italic text-[22px] text-ink leading-tight">
            Drag guests onto tables.
          </h2>
          <p className="text-[13px] text-ink-300 mt-1">
            {seatedCount} of {yesCount} seated · {state.seating.tables.length} tables
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => addTable("round")}
            disabled={!!busy}
            className="text-[11px] uppercase tracking-[0.18em] border border-ink/15 hover:border-ink/30 rounded-full px-3.5 py-1.5 text-ink-400 hover:text-ink transition-colors disabled:opacity-50"
          >
            + Round table
          </button>
          <button
            onClick={() => addTable("rectangle")}
            disabled={!!busy}
            className="text-[11px] uppercase tracking-[0.18em] border border-ink/15 hover:border-ink/30 rounded-full px-3.5 py-1.5 text-ink-400 hover:text-ink transition-colors disabled:opacity-50"
          >
            + Rectangle table
          </button>
          <button
            onClick={() => clearAssignments()}
            disabled={!!busy || seatedCount === 0}
            className="text-[11px] uppercase tracking-[0.18em] border border-ink/15 hover:border-risk-high/40 rounded-full px-3.5 py-1.5 text-ink-300 hover:text-risk-high transition-colors disabled:opacity-50"
          >
            Clear seats
          </button>
          <button
            onClick={() => window.print()}
            className="text-[11px] uppercase tracking-[0.18em] border border-sage-300 text-sage-500 hover:border-sage-500 rounded-full px-3.5 py-1.5 transition-colors"
          >
            Print
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[260px_1fr] gap-4 items-start">
        {/* Sidebar: unseated guests */}
        <aside
          onDragOver={(e) => {
            if (dragGuest) {
              e.preventDefault();
              setSidebarHover(true);
            }
          }}
          onDragLeave={() => setSidebarHover(false)}
          onDrop={onDropOnSidebar}
          className={`surface rounded-card card-shell p-4 max-h-[640px] overflow-y-auto seating-print-hidden transition-colors ${
            sidebarHover ? "bg-sage-100/60" : ""
          }`}
        >
          <p className="text-[10px] uppercase tracking-[0.22em] text-sage-500 font-mono mb-3">
            Unseated · {unseated.length}
          </p>
          {unseated.length === 0 ? (
            <p className="text-[12px] italic text-ink-300">Everyone's at a table.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {unseated.map((g) => (
                <GuestChip key={g.id} guest={g} onDragStart={() => setDragGuest(g.id)} draggable />
              ))}
            </ul>
          )}
          <p className="text-[10px] uppercase tracking-[0.18em] text-ink-300 font-mono mt-4 italic">
            Drop here to unseat a guest.
          </p>
        </aside>

        {/* Tables */}
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3 seating-tables-grid">
          {state.seating.tables.length === 0 ? (
            <div className="col-span-full rounded-card border hairline bg-white/55 px-6 py-10 max-w-xl">
              <p className="display text-[22px] text-ink leading-tight">No tables yet.</p>
              <p className="text-[13px] text-ink-300 mt-2 leading-relaxed">
                Use the buttons above to add a round or rectangular table, then drag
                guests onto it.
              </p>
            </div>
          ) : (
            state.seating.tables.map((t) => {
              const guests = seatedByTable[t.id] ?? [];
              const over = guests.length > t.capacity;
              return (
                <TableCard
                  key={t.id}
                  table={t}
                  guests={guests}
                  over={over}
                  hovering={hoverTable === t.id && !!dragGuest}
                  onDragOver={(e) => {
                    if (dragGuest) {
                      e.preventDefault();
                      setHoverTable(t.id);
                    }
                  }}
                  onDragLeave={() => setHoverTable(null)}
                  onDrop={() => onDropOnTable(t.id)}
                  onGuestDragStart={(id) => setDragGuest(id)}
                  onRemove={() => removeTable(t.id)}
                  onToggleShape={() =>
                    updateTable(t.id, { shape: t.shape === "round" ? "rectangle" : "round" })
                  }
                  onChangeCapacity={(cap) => updateTable(t.id, { capacity: cap })}
                />
              );
            })
          )}
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .seating-print-hidden { display: none !important; }
          body { background: white !important; }
          .seating-dnd { padding: 0 !important; }
          .seating-tables-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 12px !important; }
        }
      `}</style>
    </section>
  );
}

// ---- Pieces ------------------------------------------------------------

function GuestChip({
  guest,
  onDragStart,
  draggable = false,
  onDoubleClick,
}: {
  guest: Guest;
  onDragStart?: () => void;
  draggable?: boolean;
  onDoubleClick?: () => void;
}) {
  const sideClass = sideColor(guest.side);
  const name = guest.preferredName ?? guest.fullName;
  const badges = dietaryBadges(guest);

  return (
    <li
      draggable={draggable}
      onDragStart={() => onDragStart?.()}
      onDoubleClick={onDoubleClick}
      className={`group relative flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 cursor-grab active:cursor-grabbing border text-[12.5px] transition-colors ${sideClass}`}
      title={dietaryTooltip(guest)}
    >
      <span className="truncate flex-1">{name}</span>
      {badges.length > 0 && (
        <span className="flex gap-1 shrink-0">
          {badges.map((b, i) => (
            <span
              key={i}
              className={`text-[9px] uppercase tracking-[0.1em] rounded-full px-1.5 py-0.5 ${b.tone}`}
              title={b.title}
            >
              {b.label}
            </span>
          ))}
        </span>
      )}
    </li>
  );
}

function TableCard({
  table, guests, over, hovering,
  onDragOver, onDragLeave, onDrop,
  onGuestDragStart, onRemove, onToggleShape, onChangeCapacity,
}: {
  table: SeatingTable;
  guests: Guest[];
  over: boolean;
  hovering: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: () => void;
  onGuestDragStart: (id: string) => void;
  onRemove: () => void;
  onToggleShape: () => void;
  onChangeCapacity: (cap: number) => void;
}) {
  const empty = guests.length === 0;
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`surface rounded-card card-shell px-4 py-3 flex flex-col gap-2 transition-all min-h-[160px] ${
        over ? "ring-1 ring-risk-high/40" : ""
      } ${hovering ? "ring-2 ring-sage-400 bg-sage-100/40" : ""}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2 min-w-0">
          <h3 className="display italic text-[17px] text-ink leading-tight truncate">
            {table.label}
          </h3>
          <span className="text-[9px] uppercase tracking-[0.18em] text-ink-300 font-mono">
            {table.shape === "round" ? "○ round" : "▭ rect"}
          </span>
        </div>
        <span className={`text-[10px] uppercase tracking-[0.18em] font-mono tabular-nums shrink-0 ${
          over ? "text-risk-high" : empty ? "text-ink-300" : "text-sage-500"
        }`}>
          {guests.length}<span className="text-ink-300">/</span>{table.capacity}
        </span>
      </div>

      {/* Drop slot or guest chips */}
      {empty ? (
        <div className="flex-1 flex items-center justify-center rounded-md border border-dashed border-ink/12 text-[11.5px] italic text-ink-300 min-h-[80px]">
          Drag a guest here
        </div>
      ) : (
        <ul className="flex flex-col gap-1 flex-1">
          {guests.map((g) => (
            <GuestChip
              key={g.id}
              guest={g}
              onDragStart={() => onGuestDragStart(g.id)}
              draggable
            />
          ))}
        </ul>
      )}

      <div className="flex items-center justify-between gap-2 pt-2 border-t hairline seating-print-hidden">
        <button
          onClick={onToggleShape}
          className="text-[10px] uppercase tracking-[0.16em] text-ink-300 hover:text-ink transition-colors"
        >
          → {table.shape === "round" ? "rect" : "round"}
        </button>
        <input
          type="number"
          min={2}
          max={20}
          value={table.capacity}
          onChange={(e) => {
            const v = Math.max(2, Math.min(20, parseInt(e.target.value || "0", 10)));
            if (!Number.isNaN(v) && v !== table.capacity) onChangeCapacity(v);
          }}
          className="w-12 rounded border hairline bg-paper-50 px-2 py-0.5 text-[11px] tabular-nums focus:outline-none focus:border-sage-300"
        />
        <button
          onClick={onRemove}
          className="text-[10px] uppercase tracking-[0.16em] text-ink-300 hover:text-risk-high transition-colors"
        >
          Remove
        </button>
      </div>
    </div>
  );
}

// ---- Styling helpers ---------------------------------------------------

function sideColor(side: Guest["side"]): string {
  switch (side) {
    case "organizer":
      return "border-accent/30 bg-accent-wash/50 hover:bg-accent-wash/80";
    case "partner":
      return "border-sage-300 bg-sage-100/50 hover:bg-sage-100/80";
    case "both":
      return "border-ink/15 bg-paper-200/40 hover:bg-paper-200/70";
    case "neither":
    default:
      return "border-ink/10 bg-white/70 hover:bg-white";
  }
}

interface Badge {
  label: string;
  tone: string;
  title: string;
}

function dietaryBadges(g: Guest): Badge[] {
  const out: Badge[] = [];
  if (g.allergens && g.allergens.length > 0) {
    const top = g.allergens[0];
    const isSevere = top.severity === "anaphylactic" || top.severity === "severe";
    out.push({
      label: isSevere ? "⚠" : "•",
      tone: isSevere
        ? "bg-risk-high/15 text-risk-high"
        : "bg-amber-200/40 text-ink-400",
      title: `${ALLERGEN_LABEL[top.code] ?? top.code} (${top.severity})${
        g.allergens.length > 1 ? ` +${g.allergens.length - 1}` : ""
      }`,
    });
  }
  if (g.dietaryPreferences && g.dietaryPreferences.length > 0) {
    const p = g.dietaryPreferences[0];
    out.push({
      label: shortDiet(p),
      tone: "bg-sage-100 text-sage-500",
      title: DIETARY_PREF_LABEL[p] ?? p,
    });
  }
  return out;
}

function shortDiet(p: string): string {
  switch (p) {
    case "vegan": return "vg";
    case "vegetarian": return "veg";
    case "pescatarian": return "psc";
    case "kosher": return "ksh";
    case "halal": return "hlal";
    case "gluten_free": return "gf";
    case "dairy_free": return "df";
    case "kids_menu": return "kid";
    default: return p.slice(0, 3);
  }
}

function dietaryTooltip(g: Guest): string {
  const parts: string[] = [];
  if (g.allergens?.length) {
    parts.push(
      "Allergens: " +
        g.allergens
          .map((a) => `${ALLERGEN_LABEL[a.code] ?? a.code} (${a.severity})`)
          .join(", "),
    );
  }
  if (g.dietaryPreferences?.length) {
    parts.push(
      "Diet: " + g.dietaryPreferences.map((p) => DIETARY_PREF_LABEL[p] ?? p).join(", "),
    );
  }
  if (g.dietaryNotes) parts.push("Notes: " + g.dietaryNotes);
  return parts.join(" · ");
}
