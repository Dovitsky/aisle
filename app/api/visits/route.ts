import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addVisit, mutate, updateVisit } from "@/lib/store";

export const dynamic = "force-dynamic";

const Body = z.discriminatedUnion("op", [
  z.object({ op: z.literal("add"), kind: z.string(), vendorName: z.string(),
    date: z.string(), time: z.string().optional(), location: z.string().optional(),
    attendees: z.array(z.string()).optional(), notes: z.string().optional() }),
  z.object({ op: z.literal("update"), id: z.string(), patch: z.object({
    date: z.string().optional(), time: z.string().optional(),
    location: z.string().optional(), notes: z.string().optional(),
    done: z.boolean().optional(),
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
      const after = await addVisit({
        kind: data.kind as "tasting",
        vendorName: data.vendorName,
        date: data.date,
        time: data.time,
        location: data.location,
        attendees: data.attendees ?? [],
        notes: data.notes,
      });
      return NextResponse.json({ state: after });
    }
    case "update": {
      const after = await updateVisit(data.id, data.patch);
      return NextResponse.json({ state: after });
    }
    case "delete": {
      const after = await mutate((s) => { s.visits = s.visits.filter((v) => v.id !== data.id); return s; });
      return NextResponse.json({ state: after });
    }
  }
}
