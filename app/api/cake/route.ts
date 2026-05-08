import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { appendApproval, readState, setCake } from "@/lib/store";
import { patissierPropose } from "@/lib/agents/patissier";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Body = z.discriminatedUnion("op", [
  z.object({ op: z.literal("propose") }),
  z.object({ op: z.literal("update"), patch: z.object({
    tiers: z.number().int().optional(),
    flavors: z.array(z.string()).optional(),
    fillings: z.array(z.string()).optional(),
    frostingStyle: z.string().optional(),
    decorationNotes: z.string().optional(),
    servings: z.number().int().optional(),
    allergenNotes: z.string().optional(),
    allergens: z.array(z.enum(["peanut","tree_nut","shellfish","fish","dairy","gluten","egg","soy","sesame","sulfites","mustard","celery","lupin","molluscs"])).optional(),
  })}),
  z.object({ op: z.literal("propose_lock") }),
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
      const spec = await patissierPropose({ brief: state.brief });
      const after = await setCake({ id: "cake_" + Date.now().toString(36), ...spec });
      return NextResponse.json({ state: after });
    }
    case "update": {
      if (!state.cake) return NextResponse.json({ error: "No cake spec yet" }, { status: 412 });
      const after = await setCake({ ...state.cake, ...data.patch });
      return NextResponse.json({ state: after });
    }
    case "propose_lock": {
      if (!state.cake) return NextResponse.json({ error: "No cake spec yet" }, { status: 412 });
      const after = await appendApproval({
        agent: "Patissier", phase: "logistics",
        title: `Lock the cake spec (${state.cake.tiers} tiers, ${state.cake.servings} servings)?`,
        rationale: `Sends the spec to the contracted cake vendor. Allergens (${state.cake.allergenNotes}) flow into RSVP dietary cross-checks.`,
        risk: "low",
        action: { kind: "lock_cake", tiers: state.cake.tiers, servings: state.cake.servings },
      });
      return NextResponse.json({ state: after });
    }
    case "clear": {
      const after = await setCake(null);
      return NextResponse.json({ state: after });
    }
  }
}
