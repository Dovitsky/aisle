import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  appendApproval, appendCeremonySection, deleteCeremonySection,
  moveCeremonySection, mutate, readState, setCeremony,
  setCeremonyTradition, updateCeremonySection,
} from "@/lib/store";
import { clericPropose } from "@/lib/agents/cleric";
import { getRitual, substituteNames } from "@/lib/ceremony/rituals";
import type { CeremonyTradition } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const TraditionEnum = z.enum([
  "humanist", "civil", "catholic", "protestant", "orthodox_christian",
  "jewish", "hindu", "muslim", "buddhist", "sikh",
  "quaker", "celtic_handfasting", "interfaith", "custom",
]);

const Body = z.discriminatedUnion("op", [
  z.object({ op: z.literal("set_tradition"), tradition: TraditionEnum }),
  z.object({ op: z.literal("propose"), tradition: TraditionEnum.optional(), notes: z.string().optional() }),
  z.object({ op: z.literal("update"), id: z.string(), patch: z.object({
    title: z.string().optional(), body: z.string().optional(),
    reader: z.string().optional(), approved: z.boolean().optional(),
  })}),
  z.object({ op: z.literal("add_ritual"), ritualKey: z.string() }),
  z.object({ op: z.literal("move"), id: z.string(), direction: z.enum(["up", "down"]) }),
  z.object({ op: z.literal("delete_section"), id: z.string() }),
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
    case "set_tradition": {
      const after = await setCeremonyTradition(data.tradition);
      return NextResponse.json({ state: after });
    }
    case "propose": {
      if (!state.brief?.locked) return NextResponse.json({ error: "Lock the brief first." }, { status: 412 });
      const tradition: CeremonyTradition = data.tradition ?? state.ceremonyTradition ?? "humanist";
      const sections = await clericPropose({ brief: state.brief, tradition, notes: data.notes });
      const after = await setCeremony(sections.map((s, i) => ({ id: "cs" + (i + 1) + "_" + Date.now().toString(36), ...s })));
      if (data.tradition) await setCeremonyTradition(data.tradition);
      return NextResponse.json({ state: after, count: sections.length });
    }
    case "update": {
      const after = await updateCeremonySection(data.id, data.patch);
      return NextResponse.json({ state: after });
    }
    case "add_ritual": {
      const r = getRitual(data.ritualKey);
      if (!r) return NextResponse.json({ error: "Ritual not found" }, { status: 404 });
      const o = state.brief?.organizerName ?? "";
      const p = state.brief?.partnerName ?? "";
      const after = await appendCeremonySection({
        id: "cs_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6),
        kind: r.kind, title: r.title,
        body: substituteNames(r.body, o, p),
        reader: r.reader, tradition: r.tradition, ritualKey: r.key,
      });
      return NextResponse.json({ state: after });
    }
    case "move": {
      const after = await moveCeremonySection(data.id, data.direction);
      return NextResponse.json({ state: after });
    }
    case "delete_section": {
      const after = await deleteCeremonySection(data.id);
      return NextResponse.json({ state: after });
    }
    case "propose_lock": {
      const after = await appendApproval({
        agent: "Cleric", phase: "personal_prep",
        title: `Lock the ${state.ceremonyTradition} ceremony script (${state.ceremony.length} sections)?`,
        rationale: `Locking sends the script to the officiant. Vows pulled from /personal-prep are inserted at the vows section automatically.`,
        risk: "medium",
        action: { kind: "lock_ceremony", sectionCount: state.ceremony.length },
      });
      return NextResponse.json({ state: after });
    }
    case "clear": {
      const after = await mutate((s) => { s.ceremony = []; return s; });
      return NextResponse.json({ state: after });
    }
  }
}
