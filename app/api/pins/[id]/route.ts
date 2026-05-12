// Pin operations. remove + move + reorder.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { removePin, movePin, reorderPin } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const ok = await removePin(id);
  if (!ok) return NextResponse.json({ error: "Pin not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

const PatchBody = z.object({
  toBoardId: z.string().min(1).optional(),
  position: z.number().int().nonnegative().optional(),
});

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = PatchBody.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  if (parsed.data.toBoardId) {
    const ok = await movePin(id, parsed.data.toBoardId);
    if (!ok) return NextResponse.json({ error: "Move failed." }, { status: 400 });
  }
  if (typeof parsed.data.position === "number") {
    const ok = await reorderPin(id, parsed.data.position);
    if (!ok) return NextResponse.json({ error: "Reorder failed." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
