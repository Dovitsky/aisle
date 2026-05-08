import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readState, setDayOf, updateDayOfItem } from "@/lib/store";

export const dynamic = "force-dynamic";

const Body = z.discriminatedUnion("op", [
  z.object({ op: z.literal("seed_template") }),
  z.object({ op: z.literal("update"), id: z.string(), patch: z.object({
    status: z.enum(["pending", "in_progress", "done", "delayed", "skipped"]).optional(),
    note: z.string().optional(),
    time: z.string().optional(),
  }) }),
  z.object({ op: z.literal("clear") }),
]);

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  if (parsed.data.op === "seed_template") {
    const s = await readState();
    if (s.dayOf.length) return NextResponse.json({ state: s });
    const items = [
      { time: "08:00", title: "Vendor load-in begins", owner: "Venue + Catering" },
      { time: "10:30", title: "Hair & makeup (organizer)", owner: "H&M team" },
      { time: "11:00", title: "Hair & makeup (partner)", owner: "H&M team" },
      { time: "12:30", title: "Florist on site, ceremony build", owner: "Florist" },
      { time: "14:00", title: "Photographer arrives — first looks", owner: "Photographer" },
      { time: "15:30", title: "Guest arrival window opens", owner: "Coordinator" },
      { time: "16:00", title: "Ceremony processional", owner: "Officiant" },
      { time: "16:30", title: "Cocktail hour", owner: "Bar + Catering" },
      { time: "17:30", title: "Reception seating", owner: "Coordinator" },
      { time: "17:45", title: "First dance", owner: "Band/DJ" },
      { time: "18:00", title: "Dinner service", owner: "Catering" },
      { time: "19:30", title: "Toasts", owner: "Coordinator" },
      { time: "21:00", title: "Cake cutting", owner: "Catering" },
      { time: "23:00", title: "Last call & send-off", owner: "Bar + Coordinator" },
    ].map((i, idx) => ({
      id: `d${idx + 1}`,
      ...i,
      status: "pending" as const,
    }));
    const after = await setDayOf(items);
    return NextResponse.json({ state: after });
  }

  if (parsed.data.op === "update") {
    const after = await updateDayOfItem(parsed.data.id, parsed.data.patch);
    return NextResponse.json({ state: after });
  }
  const after = await setDayOf([]);
  return NextResponse.json({ state: after });
}
