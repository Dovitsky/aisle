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
  }
}
