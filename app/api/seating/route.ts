import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { appendApproval, mutate, readState, setSeating } from "@/lib/store";
import { explainSeat, parseInstruction, solveSeating } from "@/lib/agents/cartographer";
import type { SeatingTable } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Body = z.discriminatedUnion("op", [
  z.object({ op: z.literal("init_tables"), tableSize: z.number().int().min(2).max(20) }),
  z.object({ op: z.literal("solve") }),
  z.object({ op: z.literal("instruction"), text: z.string().min(1) }),
  z.object({ op: z.literal("explain"), guestId: z.string() }),
  z.object({ op: z.literal("clear_constraints") }),
  z.object({ op: z.literal("propose_lock") }),
  // Manual mode (drag-drop).
  z.object({ op: z.literal("assign"), guestId: z.string(), tableId: z.string().nullable() }),
  z.object({ op: z.literal("add_table"), shape: z.enum(["round", "rectangle"]), capacity: z.number().int().min(2).max(20) }),
  z.object({ op: z.literal("remove_table"), tableId: z.string() }),
  z.object({ op: z.literal("update_table"), tableId: z.string(), patch: z.object({
    shape: z.enum(["round", "rectangle"]).optional(),
    capacity: z.number().int().min(2).max(20).optional(),
    label: z.string().optional(),
  }) }),
  z.object({ op: z.literal("clear_assignments") }),
]);

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  switch (parsed.data.op) {
    case "init_tables": {
      const seats = parsed.data.tableSize;
      const after = await mutate((s) => {
        const yesGuests = s.guests.filter((g) => g.rsvp === "yes");
        const guestCount = yesGuests.length || s.guests.length;
        const tableCount = Math.max(1, Math.ceil(guestCount / seats));
        const tables: SeatingTable[] = [];
        const cols = Math.ceil(Math.sqrt(tableCount));
        for (let i = 0; i < tableCount; i++) {
          const r = Math.floor(i / cols);
          const c = i % cols;
          tables.push({
            id: `t${i + 1}`,
            label: `Table ${i + 1}`,
            capacity: seats,
            shape: "round",
            x: 12 + c * (76 / Math.max(1, cols - 1 || 1)),
            y: 14 + r * (72 / Math.max(1, Math.ceil(tableCount / cols) - 1 || 1)),
          });
        }
        s.seating = { ...s.seating, tables, assignments: {}, cost: 0, locked: false };
        return s;
      });
      return NextResponse.json({ state: after });
    }
    case "solve": {
      const s = await readState();
      if (!s.seating.tables.length) {
        return NextResponse.json({ error: "Initialize tables first." }, { status: 412 });
      }
      const guests = s.guests.filter((g) => g.rsvp !== "no");
      const { assignments, cost } = solveSeating(guests, s.seating.tables, s.seating.constraints);
      const after = await setSeating((c) => ({ ...c, assignments, cost, lastSolveAt: new Date().toISOString() }));
      return NextResponse.json({ state: after, cost });
    }
    case "instruction": {
      const s = await readState();
      const guests = s.guests;
      const tables = s.seating.tables;
      const constraints = await parseInstruction({ text: parsed.data.text, guests, tables });
      const after = await setSeating((c) => ({ ...c, constraints: [...c.constraints, ...constraints] }));
      return NextResponse.json({ state: after, added: constraints.length });
    }
    case "explain": {
      const s = await readState();
      return NextResponse.json({ explanation: explainSeat(parsed.data.guestId, s.seating, s.guests) });
    }
    case "clear_constraints": {
      const after = await setSeating((c) => ({ ...c, constraints: [] }));
      return NextResponse.json({ state: after });
    }
    case "propose_lock": {
      const s = await readState();
      const guestCount = Object.keys(s.seating.assignments).length;
      await appendApproval({
        agent: "Cartographer",
        phase: "guest_management",
        title: `Lock the seating chart for ${guestCount} guests across ${s.seating.tables.length} tables?`,
        rationale: `Solver returned a cost of ${s.seating.cost}. Locking will freeze placement; subsequent RSVP changes will surface a card if they break the lock.`,
        risk: "medium",
        action: { kind: "lock_seating", tableCount: s.seating.tables.length, guestCount },
      });
      const after = await readState();
      return NextResponse.json({ state: after });
    }
    case "assign": {
      const { guestId, tableId } = parsed.data;
      const after = await setSeating((c) => {
        const next = { ...c.assignments };
        if (tableId === null) delete next[guestId];
        else next[guestId] = tableId;
        return { ...c, assignments: next };
      });
      return NextResponse.json({ state: after });
    }
    case "add_table": {
      const { shape, capacity } = parsed.data;
      const after = await setSeating((c) => {
        const nextId = `t${c.tables.length + 1}${Math.floor(Math.random() * 1000)}`;
        const idx = c.tables.length;
        const cols = Math.max(3, Math.ceil(Math.sqrt(idx + 1)));
        const r = Math.floor(idx / cols);
        const col = idx % cols;
        const table: SeatingTable = {
          id: nextId,
          label: `Table ${idx + 1}`,
          capacity,
          shape,
          x: 12 + col * (76 / Math.max(1, cols - 1)),
          y: 14 + r * 18,
        };
        return { ...c, tables: [...c.tables, table] };
      });
      return NextResponse.json({ state: after });
    }
    case "remove_table": {
      const { tableId } = parsed.data;
      const after = await setSeating((c) => {
        const tables = c.tables.filter((t) => t.id !== tableId);
        const assignments: Record<string, string> = {};
        for (const [gid, tid] of Object.entries(c.assignments)) {
          if (tid !== tableId) assignments[gid] = tid;
        }
        return { ...c, tables, assignments };
      });
      return NextResponse.json({ state: after });
    }
    case "update_table": {
      const { tableId, patch } = parsed.data;
      const after = await setSeating((c) => ({
        ...c,
        tables: c.tables.map((t) => (t.id === tableId ? { ...t, ...patch } : t)),
      }));
      return NextResponse.json({ state: after });
    }
    case "clear_assignments": {
      const after = await setSeating((c) => ({ ...c, assignments: {} }));
      return NextResponse.json({ state: after });
    }
  }
}
