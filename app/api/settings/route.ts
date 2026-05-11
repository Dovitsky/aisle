import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resetAll, setGates, setMaestroName, setPaused, setPlan, writeState, readState } from "@/lib/store";
import { buildDemoState } from "@/lib/demo";

export const dynamic = "force-dynamic";

const Body = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("pause"),
    paused: z.boolean(),
    reason: z.string().max(500).optional(),
  }),
  z.object({ op: z.literal("reset") }),
  z.object({ op: z.literal("load_demo") }),
  z.object({ op: z.literal("exit_demo") }),
  z.object({
    op: z.literal("gates"),
    gates: z.object({
      dress: z.boolean().optional(),
      partner_gift: z.boolean().optional(),
      honeymoon: z.boolean().optional(),
      speech: z.boolean().optional(),
    }),
  }),
  z.object({
    op: z.literal("maestro_name"),
    name: z.string().max(80).nullable(),
  }),
  z.object({
    op: z.literal("plan"),
    plan: z.enum(["free", "couple_plus", "planner", "studio"]),
  }),
]);

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (parsed.data.op === "pause") {
    const after = await setPaused(parsed.data.paused, parsed.data.reason);
    return NextResponse.json({ state: after });
  }
  if (parsed.data.op === "gates") {
    const after = await setGates(parsed.data.gates);
    return NextResponse.json({ state: after });
  }
  if (parsed.data.op === "maestro_name") {
    const after = await setMaestroName(parsed.data.name);
    return NextResponse.json({ state: after });
  }
  if (parsed.data.op === "plan") {
    const after = await setPlan(parsed.data.plan);
    return NextResponse.json({ state: after });
  }
  if (parsed.data.op === "load_demo") {
    // Replace the entire store with a fully-populated demo state.
    // buildDemoState() chains 18 specialist agents — wrap in try/catch so a
    // single agent failure doesn't 500 the whole load with a blank message.
    try {
      const demo = await buildDemoState();
      await writeState(demo);
      return NextResponse.json({ state: demo });
    } catch (e) {
      console.error("load_demo failed:", e);
      return NextResponse.json({
        error: e instanceof Error ? e.message : "Couldn't build the example wedding. Try again.",
      }, { status: 500 });
    }
  }
  if (parsed.data.op === "exit_demo") {
    // Drop demo flag but keep the rest of the state — couple may want to
    // continue from the demo seed as if it were their own.
    try {
      const cur = await readState();
      const cleaned = { ...cur, demoMode: false };
      await writeState(cleaned);
      return NextResponse.json({ state: cleaned });
    } catch (e) {
      console.error("exit_demo failed:", e);
      return NextResponse.json({ error: "Couldn't update settings. Try again." }, { status: 500 });
    }
  }
  const after = await resetAll();
  return NextResponse.json({ state: after });
}
