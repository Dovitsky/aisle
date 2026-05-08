import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readState, setBeauty, updateBeauty } from "@/lib/store";
import { atelierPropose } from "@/lib/agents/atelier";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Body = z.discriminatedUnion("op", [
  z.object({ op: z.literal("propose"), ceremonyTime: z.string(), weddingDate: z.string() }),
  z.object({ op: z.literal("update"), id: z.string(), patch: z.object({
    startTime: z.string().optional(), durationMin: z.number().int().optional(),
    notes: z.string().optional(),
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
      const appts = await atelierPropose({
        brief: state.brief, weddingDate: data.weddingDate, ceremonyTime: data.ceremonyTime,
        party: state.weddingParty,
      });
      const withIds = appts.map((a, i) => ({ id: "b" + (i + 1) + "_" + Date.now().toString(36), ...a }));
      const after = await setBeauty(withIds);
      return NextResponse.json({ state: after, count: appts.length });
    }
    case "update": {
      const after = await updateBeauty(data.id, data.patch);
      return NextResponse.json({ state: after });
    }
    case "clear": {
      const after = await setBeauty([]);
      return NextResponse.json({ state: after });
    }
  }
}
