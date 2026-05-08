import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addWeddingPartyMember, deleteWeddingPartyMember, updateWeddingPartyMember } from "@/lib/store";

export const dynamic = "force-dynamic";

const RoleEnum = z.enum(["maid_of_honor", "best_man", "bridesmaid", "groomsman", "officiant", "ring_bearer", "flower_kid", "usher", "officiant_witness", "other"]);
const SideEnum = z.enum(["organizer", "partner"]);

const Body = z.discriminatedUnion("op", [
  z.object({ op: z.literal("add"), name: z.string(), role: RoleEnum, side: SideEnum }),
  z.object({ op: z.literal("update"), id: z.string(), patch: z.object({
    name: z.string().optional(), role: RoleEnum.optional(), side: SideEnum.optional(),
    attireOrdered: z.boolean().optional(), attireSize: z.string().optional(),
    attireColor: z.string().optional(), giftIdea: z.string().optional(),
    email: z.string().optional(),
  })}),
  z.object({ op: z.literal("delete"), id: z.string() }),
]);

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const data = parsed.data;
  switch (data.op) {
    case "add": {
      const after = await addWeddingPartyMember({ name: data.name, role: data.role, side: data.side });
      return NextResponse.json({ state: after });
    }
    case "update": {
      const after = await updateWeddingPartyMember(data.id, data.patch);
      return NextResponse.json({ state: after });
    }
    case "delete": {
      const after = await deleteWeddingPartyMember(data.id);
      return NextResponse.json({ state: after });
    }
  }
}
