// Pins on a mood board — list + add.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listPinsForBoard, addPin } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const pins = await listPinsForBoard(id);
  return NextResponse.json({ pins });
}

const AddBody = z.object({
  source: z.enum(["discover", "upload", "generated", "url"]),
  imageUrl: z.string().min(1),
  caption: z.string().max(140).optional(),
  generatedPrompt: z.string().max(2000).optional(),
  sourceMetadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = AddBody.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  const pin = await addPin({
    boardId: id,
    source: parsed.data.source,
    imageUrl: parsed.data.imageUrl,
    caption: parsed.data.caption,
    generatedPrompt: parsed.data.generatedPrompt,
    sourceMetadata: parsed.data.sourceMetadata,
  });
  return NextResponse.json({ pin });
}
