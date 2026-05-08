import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { mutate, readState, setTips, updateTip } from "@/lib/store";

export const dynamic = "force-dynamic";

const Body = z.discriminatedUnion("op", [
  z.object({ op: z.literal("seed_from_vendors") }),
  z.object({ op: z.literal("update"), id: z.string(), patch: z.object({
    amountUsd: z.number().int().optional(),
    cashDelivered: z.boolean().optional(),
    handedToOnDay: z.string().optional(),
  })}),
  z.object({ op: z.literal("clear") }),
]);

// Industry-norm tip percentages by category. These are guidance, not commitments.
const TIP_RULES: Record<string, { pct: number; flatMin: number; flatMax: number }> = {
  Photographer: { pct: 0, flatMin: 100, flatMax: 200 },
  Videographer: { pct: 0, flatMin: 100, flatMax: 200 },
  Florist: { pct: 0, flatMin: 50, flatMax: 100 },
  Caterer: { pct: 0.18, flatMin: 0, flatMax: 0 },
  Band: { pct: 0, flatMin: 25, flatMax: 50 },
  DJ: { pct: 0, flatMin: 50, flatMax: 150 },
  Officiant: { pct: 0, flatMin: 50, flatMax: 100 },
  "Hair & Makeup": { pct: 0.20, flatMin: 0, flatMax: 0 },
  Bartending: { pct: 0.10, flatMin: 0, flatMax: 0 },
  Transportation: { pct: 0.15, flatMin: 0, flatMax: 0 },
};

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const state = await readState();
  const data = parsed.data;

  switch (data.op) {
    case "seed_from_vendors": {
      const tips = state.vendors
        .filter((v) => v.status === "contracted" || v.status === "paid")
        .map((v) => {
          const rule = TIP_RULES[String(v.category)];
          const base = v.contractedUsd ?? v.estimateUsd ?? 0;
          let amount = 0;
          if (rule) {
            if (rule.pct) amount = Math.round(base * rule.pct);
            else amount = Math.round((rule.flatMin + rule.flatMax) / 2);
          }
          return {
            id: "tip_" + v.id,
            vendorId: v.id,
            recipient: v.name,
            amountUsd: amount,
          };
        });
      const after = await setTips(tips);
      return NextResponse.json({ state: after, count: tips.length });
    }
    case "update": {
      const after = await updateTip(data.id, data.patch);
      return NextResponse.json({ state: after });
    }
    case "clear": {
      const after = await mutate((s) => { s.tips = []; return s; });
      return NextResponse.json({ state: after });
    }
  }
}
