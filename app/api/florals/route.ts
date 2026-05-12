import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readState, setFlorals, updateFloral } from "@/lib/store";
import { botanistPropose } from "@/lib/agents/botanist";
import { weddingContext } from "@/lib/agents/context";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Body = z.discriminatedUnion("op", [
  z.object({ op: z.literal("propose") }),
  z.object({ op: z.literal("update"), id: z.string(), patch: z.object({
    quantity: z.number().int().optional(),
    primary: z.array(z.string()).optional(),
    secondary: z.array(z.string()).optional(),
    vesselNotes: z.string().optional(),
    unitCost: z.number().int().optional(),
    approved: z.boolean().optional(),
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
      const palette = state.designs.find((d) => d.kind === "moodboard" && d.approved)?.swatches;
      const tableCount = state.seating.tables.length || Math.ceil(state.brief.guestCount / 8);
      // Pass the full WeddingContext so Botanist sees region+season+
      // venue+palette+design direction — not just the brief in isolation.
      const ctx = weddingContext(state) ?? undefined;
      const arr = await botanistPropose({
        brief: state.brief,
        context: ctx,
        tableCount,
        weddingPartySize: state.weddingParty.length,
        palette,
      });
      const withIds = arr.map((a, i) => ({ id: "fl" + (i + 1) + "_" + Date.now().toString(36), ...a }));
      const after = await setFlorals(withIds);
      return NextResponse.json({ state: after, count: arr.length });
    }
    case "update": {
      const after = await updateFloral(data.id, data.patch);
      return NextResponse.json({ state: after });
    }
    case "clear": {
      const after = await setFlorals([]);
      return NextResponse.json({ state: after });
    }
  }
}
