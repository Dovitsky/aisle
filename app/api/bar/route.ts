import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readState, setBar } from "@/lib/store";
import { sommelierPropose } from "@/lib/agents/sommelier";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Body = z.discriminatedUnion("op", [
  z.object({ op: z.literal("propose") }),
  z.object({ op: z.literal("set_style"), style: z.enum(["open", "limited", "dry", "beer_wine_only"]) }),
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
      const program = await sommelierPropose({ brief: state.brief });
      const after = await setBar({ ...program, id: "bar_" + Date.now().toString(36) });
      return NextResponse.json({ state: after });
    }
    case "set_style": {
      if (!state.bar) return NextResponse.json({ error: "No bar program yet" }, { status: 412 });
      const after = await setBar({ ...state.bar, style: data.style });
      return NextResponse.json({ state: after });
    }
    case "clear": {
      const after = await setBar(null);
      return NextResponse.json({ state: after });
    }
  }
}
