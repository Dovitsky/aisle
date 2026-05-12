// Single mood board. patch + delete.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { updateMoodBoard, deleteMoodBoard } from "@/lib/store";

export const dynamic = "force-dynamic";

const PatchBody = z.object({
  name: z.string().min(1).max(80).optional(),
  gateScope: z.enum(["dress", "partner_gift", "honeymoon", "speech", "vows_organizer", "vows_partner"]).nullable().optional(),
});

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = PatchBody.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  const board = await updateMoodBoard(id, parsed.data);
  if (!board) return NextResponse.json({ error: "Board not found." }, { status: 404 });
  return NextResponse.json({ board });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const ok = await deleteMoodBoard(id);
  if (!ok) {
    return NextResponse.json(
      { error: "Default boards can't be deleted, and the board may not exist." },
      { status: 400 },
    );
  }
  return NextResponse.json({ ok: true });
}
