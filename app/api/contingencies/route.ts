import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readState, setContingencies, setDayOfMode, triggerContingency } from "@/lib/store";

export const dynamic = "force-dynamic";

const Body = z.discriminatedUnion("op", [
  z.object({ op: z.literal("seed_default") }),
  z.object({ op: z.literal("trigger"), id: z.string(), note: z.string().min(1) }),
  z.object({ op: z.literal("toggle_day_of_mode"), on: z.boolean() }),
]);

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  if (parsed.data.op === "seed_default") {
    const s = await readState();
    if (s.contingencies.length) return NextResponse.json({ state: s });
    const after = await setContingencies([
      { id: "c1", topic: "weather", preApproved: "If rain probability > 60% by 9am, switch ceremony to indoor alternate; notify guests via SMS broadcast.", escalation: "couple" },
      { id: "c2", topic: "timeline_slip", preApproved: "Tolerate ±15 minutes on every line item. Beyond that, planner makes the call.", escalation: "planner" },
      { id: "c3", topic: "vendor_late", preApproved: "If vendor is 10 min late vs ETA, planner contacts; 30 min, escalate to couple; 45 min, activate vendor's named backup.", escalation: "planner" },
      { id: "c4", topic: "vendor_no_show", preApproved: "Engage backup from contracted backup roster. If no backup contracted, planner calls owner; couple notified immediately.", escalation: "couple" },
      { id: "c5", topic: "guest_medical", preApproved: "EMS dispatched immediately. Coordinator escorts. Couple is notified after the situation is contained.", escalation: "planner" },
      { id: "c6", topic: "intoxication", preApproved: "Bartender enforces refusal. Coordinator arranges ride. Couple is not interrupted unless the guest is family.", escalation: "planner" },
    ]);
    return NextResponse.json({ state: after });
  }

  if (parsed.data.op === "trigger") {
    const after = await triggerContingency(parsed.data.id, parsed.data.note);
    return NextResponse.json({ state: after });
  }

  const after = await setDayOfMode(parsed.data.on);
  return NextResponse.json({ state: after });
}
