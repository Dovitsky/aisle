import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addMemorial, mutate, updateMemorial } from "@/lib/store";

export const dynamic = "force-dynamic";

const SideEnum = z.enum(["organizer", "partner", "both"]);
const TreatmentEnum = z.enum(["memorial_table", "ceremony_mention", "candle", "reserved_seat", "boutonniere_charm"]);

const Body = z.discriminatedUnion("op", [
  z.object({ op: z.literal("add"), name: z.string(), relationship: z.string(), side: SideEnum, treatment: TreatmentEnum, notes: z.string().optional() }),
  z.object({ op: z.literal("update"), id: z.string(), patch: z.object({
    name: z.string().optional(), relationship: z.string().optional(),
    side: SideEnum.optional(), treatment: TreatmentEnum.optional(),
    notes: z.string().optional(),
  })}),
  z.object({ op: z.literal("delete"), id: z.string() }),
]);

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const data = parsed.data;
  switch (data.op) {
    case "add": {
      const after = await addMemorial({
        name: data.name, relationship: data.relationship,
        side: data.side, treatment: data.treatment, notes: data.notes,
      });
      return NextResponse.json({ state: after });
    }
    case "update": {
      const after = await updateMemorial(data.id, data.patch);
      return NextResponse.json({ state: after });
    }
    case "delete": {
      const after = await mutate((s) => { s.memorials = s.memorials.filter((m) => m.id !== data.id); return s; });
      return NextResponse.json({ state: after });
    }
  }
}
