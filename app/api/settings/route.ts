import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resetAll, setGates, setMaestroName, setPaused, setPlan } from "@/lib/store";

export const dynamic = "force-dynamic";

const Body = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("pause"),
    paused: z.boolean(),
    reason: z.string().max(500).optional(),
  }),
  z.object({ op: z.literal("reset") }),
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
  const after = await resetAll();
  return NextResponse.json({ state: after });
}
