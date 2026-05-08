import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addPreEvent, mutate, updatePreEvent } from "@/lib/store";

export const dynamic = "force-dynamic";

const KindEnum = z.enum(["engagement_party", "bridal_shower", "bachelor_party", "bachelorette_party", "rehearsal_dinner", "welcome_drinks", "after_party", "morning_after_brunch"]);

const Body = z.discriminatedUnion("op", [
  z.object({ op: z.literal("add"), kind: KindEnum, date: z.string(), location: z.string(),
    hostNames: z.array(z.string()), invitedCount: z.number().int(),
    notes: z.string().optional(), budgetUsd: z.number().int().optional() }),
  z.object({ op: z.literal("update"), id: z.string(), patch: z.object({
    date: z.string().optional(), location: z.string().optional(),
    invitedCount: z.number().int().optional(), notes: z.string().optional(),
    budgetUsd: z.number().int().optional(),
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
      const after = await addPreEvent({
        kind: data.kind, date: data.date, location: data.location,
        hostNames: data.hostNames, invitedCount: data.invitedCount,
        notes: data.notes, budgetUsd: data.budgetUsd,
      });
      return NextResponse.json({ state: after });
    }
    case "update": {
      const after = await updatePreEvent(data.id, data.patch);
      return NextResponse.json({ state: after });
    }
    case "delete": {
      const after = await mutate((s) => { s.preEvents = s.preEvents.filter((e) => e.id !== data.id); return s; });
      return NextResponse.json({ state: after });
    }
  }
}
