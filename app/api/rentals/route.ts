import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readState, setRentals, updateRental } from "@/lib/store";
import { stewardPropose } from "@/lib/agents/steward";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Body = z.discriminatedUnion("op", [
  z.object({ op: z.literal("propose") }),
  z.object({ op: z.literal("update"), id: z.string(), patch: z.object({
    item: z.string().optional(), quantity: z.number().int().optional(),
    unitCost: z.number().int().optional(), notes: z.string().optional(),
  })}),
  z.object({ op: z.literal("clear") }),
]);

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const state = await readState();
  const data = parsed.data;

  switch (data.op) {
    case "propose": {
      if (!state.brief?.locked) return NextResponse.json({ error: "Lock the brief first." }, { status: 412 });
      const tableCount = state.seating.tables.length || Math.ceil(state.brief.guestCount / 8);
      const items = await stewardPropose({ brief: state.brief, tableCount });
      const withIds = items.map((a, i) => ({ id: "r" + (i + 1) + "_" + Date.now().toString(36), ...a }));
      const after = await setRentals(withIds);
      return NextResponse.json({ state: after, count: items.length });
    }
    case "update": {
      const after = await updateRental(data.id, data.patch);
      return NextResponse.json({ state: after });
    }
    case "clear": {
      const after = await setRentals([]);
      return NextResponse.json({ state: after });
    }
  }
}
