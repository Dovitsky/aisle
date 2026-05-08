import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  addRegistryItem, appendApproval, mutate, readState, updateRegistryItem,
} from "@/lib/store";
import { curatorPropose } from "@/lib/agents/curator";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Body = z.discriminatedUnion("op", [
  z.object({ op: z.literal("propose") }),
  z.object({ op: z.literal("add"), item: z.string(), vendor: z.string(), priceUsd: z.number().min(0), category: z.string() }),
  z.object({ op: z.literal("update"), id: z.string(), patch: z.record(z.unknown()) }),
  z.object({ op: z.literal("propose_purchase"), id: z.string() }),
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
      const items = await curatorPropose(state.brief);
      let last = state;
      for (const it of items) last = await addRegistryItem(it);
      return NextResponse.json({ state: last, count: items.length });
    }
    case "add": {
      const after = await addRegistryItem({
        item: data.item, vendor: data.vendor, priceUsd: data.priceUsd,
        category: data.category as "kitchen", status: "wanted",
      });
      return NextResponse.json({ state: after });
    }
    case "update": {
      const after = await updateRegistryItem(data.id, data.patch);
      return NextResponse.json({ state: after });
    }
    case "propose_purchase": {
      const it = state.registry.find((x) => x.id === data.id);
      if (!it) return NextResponse.json({ error: "Item not found" }, { status: 404 });
      const after = await appendApproval({
        agent: "Curator", phase: "post_event",
        title: `Mark "${it.item}" as purchased ($${it.priceUsd}) from ${it.vendor}?`,
        rationale: `Records the purchase against the registry. Used downstream by Thank-you Studio to draft the right note.`,
        risk: "low",
        action: { kind: "purchase_registry_item", item: it.item, vendor: it.vendor, amountUsd: it.priceUsd },
      });
      return NextResponse.json({ state: after });
    }
    case "clear": {
      const after = await mutate((s) => { s.registry = []; return s; });
      return NextResponse.json({ state: after });
    }
  }
}
