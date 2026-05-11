import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { DayOfItem } from "@/lib/types";
import { readState, setDayOf, updateDayOfItem } from "@/lib/store";

export const dynamic = "force-dynamic";

const Body = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("seed_template"),
    template: z.enum(["classic", "intimate", "destination"]).optional(),
  }),
  z.object({
    op: z.literal("update"),
    id: z.string(),
    patch: z.object({
      status: z.enum(["pending", "in_progress", "done", "delayed", "skipped"]).optional(),
      note: z.string().optional(),
      time: z.string().optional(),
      title: z.string().optional(),
      owner: z.string().optional(),
    }),
  }),
  z.object({
    op: z.literal("add"),
    item: z.object({
      time: z.string(),
      title: z.string(),
      owner: z.string().optional(),
    }),
  }),
  z.object({ op: z.literal("delete"), id: z.string() }),
  z.object({ op: z.literal("reorder"), order: z.array(z.string()) }),
  z.object({ op: z.literal("clear") }),
]);

const TEMPLATES: Record<string, { time: string; title: string; owner: string }[]> = {
  classic: [
    { time: "08:00", title: "Vendor load-in begins",      owner: "Venue + Catering" },
    { time: "10:30", title: "Hair & makeup (organizer)",  owner: "H&M team" },
    { time: "11:00", title: "Hair & makeup (partner)",    owner: "H&M team" },
    { time: "12:30", title: "Florist on site, ceremony build", owner: "Florist" },
    { time: "14:00", title: "Photographer arrives, first looks", owner: "Photographer" },
    { time: "15:30", title: "Guest arrival window opens", owner: "Coordinator" },
    { time: "16:00", title: "Ceremony processional",      owner: "Officiant" },
    { time: "16:30", title: "Cocktail hour",              owner: "Bar + Catering" },
    { time: "17:30", title: "Reception seating",          owner: "Coordinator" },
    { time: "17:45", title: "First dance",                owner: "Band/DJ" },
    { time: "18:00", title: "Dinner service",             owner: "Catering" },
    { time: "19:30", title: "Toasts",                     owner: "Coordinator" },
    { time: "21:00", title: "Cake cutting",               owner: "Catering" },
    { time: "23:00", title: "Last call & send-off",       owner: "Bar + Coordinator" },
  ],
  intimate: [
    { time: "11:00", title: "Hair & makeup",              owner: "H&M team" },
    { time: "13:00", title: "First looks",                owner: "Photographer" },
    { time: "14:00", title: "Ceremony begins",            owner: "Officiant" },
    { time: "14:45", title: "Family portraits",           owner: "Photographer" },
    { time: "15:30", title: "Cocktails & canapés",        owner: "Bar + Catering" },
    { time: "17:00", title: "Long-table dinner",          owner: "Catering" },
    { time: "19:00", title: "Toasts",                     owner: "Coordinator" },
    { time: "20:00", title: "First dance & dancing",      owner: "Band/DJ" },
    { time: "22:30", title: "Send-off",                   owner: "Coordinator" },
  ],
  destination: [
    { time: "07:00", title: "Beach yoga (optional)",      owner: "Concierge" },
    { time: "10:00", title: "Hair & makeup",              owner: "H&M team" },
    { time: "12:00", title: "Welcome lunch for early arrivals", owner: "Catering" },
    { time: "14:00", title: "Photographer arrives",       owner: "Photographer" },
    { time: "16:30", title: "Guests transported to ceremony", owner: "Transportation" },
    { time: "17:00", title: "Sunset ceremony",            owner: "Officiant" },
    { time: "18:00", title: "Cocktail hour, sea view",    owner: "Bar" },
    { time: "19:30", title: "Family-style dinner",        owner: "Catering" },
    { time: "21:00", title: "Toasts & first dance",       owner: "Band/DJ" },
    { time: "23:00", title: "Late-night espresso bar",    owner: "Catering" },
    { time: "00:30", title: "After-party shuttle",        owner: "Transportation" },
  ],
};

function randomId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const data = parsed.data;
  switch (data.op) {
    case "seed_template": {
      const template = data.template ?? "classic";
      const tpl = TEMPLATES[template];
      if (!tpl) return NextResponse.json({ error: `Unknown template: ${template}` }, { status: 400 });
      const items = tpl.map((i, idx) => ({
        id: `d${idx + 1}_${randomId()}`,
        ...i,
        status: "pending" as const,
      }));
      const after = await setDayOf(items);
      return NextResponse.json({ state: after });
    }
    case "update": {
      const after = await updateDayOfItem(data.id, data.patch);
      return NextResponse.json({ state: after });
    }
    case "add": {
      const s = await readState();
      const newItem: DayOfItem = {
        id: `d_${randomId()}`,
        time: data.item.time,
        title: data.item.title,
        owner: data.item.owner ?? "",
        status: "pending",
      };
      const next = [...s.dayOf, newItem].sort((a, b) => a.time.localeCompare(b.time));
      const after = await setDayOf(next);
      return NextResponse.json({ state: after });
    }
    case "delete": {
      const s = await readState();
      const next = s.dayOf.filter((i) => i.id !== data.id);
      const after = await setDayOf(next);
      return NextResponse.json({ state: after });
    }
    case "reorder": {
      const s = await readState();
      const map = new Map(s.dayOf.map((i) => [i.id, i] as const));
      const reordered = data.order
        .map((id) => map.get(id))
        .filter((x): x is DayOfItem => !!x);
      const seen = new Set(data.order);
      const tail = s.dayOf.filter((i) => !seen.has(i.id));
      const after = await setDayOf([...reordered, ...tail]);
      return NextResponse.json({ state: after });
    }
    case "clear": {
      const after = await setDayOf([]);
      return NextResponse.json({ state: after });
    }
  }
}
