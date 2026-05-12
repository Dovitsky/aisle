// Mood Board CRUD. list + create.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listMoodBoards, createMoodBoard } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const boards = await listMoodBoards();
  return NextResponse.json({ boards });
}

const CreateBody = z.object({
  name: z.string().min(1).max(80),
  gateScope: z.enum(["dress", "partner_gift", "honeymoon", "speech", "vows_organizer", "vows_partner"]).nullable().optional(),
});

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = CreateBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Name is required (1–80 chars)." }, { status: 400 });
  }
  const board = await createMoodBoard(parsed.data.name, parsed.data.gateScope ?? null);
  return NextResponse.json({ board });
}
