import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  addStationerySuite, appendApproval, readState, updateStationerySuite,
} from "@/lib/store";
import { regenerateMenuCard, stationerSuite, suiteItemSvg } from "@/lib/agents/stationer";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Body = z.discriminatedUnion("op", [
  z.object({ op: z.literal("propose"), direction: z.string().min(1) }),
  z.object({ op: z.literal("set_format"), suiteId: z.string(), format: z.enum(["paper", "digital", "hybrid"]) }),
  z.object({ op: z.literal("propose_lock_piece"), suiteId: z.string(), piece: z.string() }),
  z.object({ op: z.literal("propose_send_save_the_date"), suiteId: z.string() }),
  z.object({ op: z.literal("propose_send_invitations"), suiteId: z.string() }),
  z.object({ op: z.literal("refresh_menu_card"), suiteId: z.string() }),
]);

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const state = await readState();
  if (!state.brief?.locked) return NextResponse.json({ error: "Lock the brief first." }, { status: 412 });

  const data = parsed.data;
  switch (data.op) {
    case "propose": {
      const items = await stationerSuite({ brief: state.brief, direction: data.direction, menu: state.menu });
      const direction = state.designs.find((d) => d.title === data.direction);
      const palette = direction?.swatches ?? ["#FBF8F1", "#7C5E3A", "#1A1814"];
      const font = "Cormorant Garamond";
      const itemsWithSvg = items.map((it) => ({
        ...it,
        mockSvg: suiteItemSvg({ copy: it.copy, palette, piece: it.piece, font }),
      }));
      const after = await addStationerySuite({
        direction: data.direction, palette, font, format: "hybrid",
        items: itemsWithSvg,
      });
      return NextResponse.json({ state: after, count: items.length });
    }
    case "refresh_menu_card": {
      const suite = state.stationery.find((x) => x.id === data.suiteId);
      if (!suite) return NextResponse.json({ error: "Suite not found" }, { status: 404 });
      const item = regenerateMenuCard(state.brief, state.menu);
      const palette = suite.palette;
      const itemWithSvg = { ...item, mockSvg: suiteItemSvg({ copy: item.copy, palette, piece: item.piece, font: suite.font }) };
      const nextItems = suite.items.some((i) => i.piece === "menu_card")
        ? suite.items.map((i) => i.piece === "menu_card" ? { ...itemWithSvg, approved: i.approved } : i)
        : [...suite.items, itemWithSvg];
      const after = await updateStationerySuite(data.suiteId, { items: nextItems });
      return NextResponse.json({ state: after });
    }
    case "set_format": {
      const after = await updateStationerySuite(data.suiteId, { format: data.format });
      return NextResponse.json({ state: after });
    }
    case "propose_lock_piece": {
      const suite = state.stationery.find((x) => x.id === data.suiteId);
      if (!suite) return NextResponse.json({ error: "Suite not found" }, { status: 404 });
      const after = await appendApproval({
        agent: "Stationer", phase: "design",
        title: `Lock the ${data.piece.replace(/_/g, " ")} design?`,
        rationale: `Locking sets the typography, paper, and copy for this piece. Production will use this exact spec.`,
        risk: "low",
        action: { kind: "lock_stationery_suite", suiteId: data.suiteId, piece: data.piece },
      });
      return NextResponse.json({ state: after });
    }
    case "propose_send_save_the_date": {
      const recipients = state.households.length;
      const suite = state.stationery.find((x) => x.id === data.suiteId);
      const after = await appendApproval({
        agent: "Stationer", phase: "guest_management",
        title: `Send save-the-dates to ${recipients} households via ${suite?.format ?? "hybrid"}?`,
        rationale: `Save-the-dates go out 6-12 months pre-wedding (PRD §5.4.2). Approving this card schedules the print run / digital send. Households without a mailing address will be flagged.`,
        risk: "medium",
        action: { kind: "send_save_the_date", suiteId: data.suiteId, recipients, format: suite?.format ?? "hybrid" },
      });
      return NextResponse.json({ state: after });
    }
    case "propose_send_invitations": {
      const recipients = state.households.length;
      const after = await appendApproval({
        agent: "Stationer", phase: "guest_management",
        title: `Send invitations to ${recipients} households?`,
        rationale: `Invitations go out 8-10 weeks pre-wedding (12-14 for destination). Print run = guest count + 15% buffer.`,
        risk: "high",
        action: { kind: "send_invitations", recipients, format: state.stationery.find((x) => x.id === data.suiteId)?.format ?? "hybrid" },
      });
      return NextResponse.json({ state: after });
    }
  }
}
