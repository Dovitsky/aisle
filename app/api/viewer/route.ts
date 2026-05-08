import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { setViewer, filterForViewer } from "@/lib/store";

export const dynamic = "force-dynamic";

const Body = z.object({ role: z.enum(["organizer", "partner", "planner"]) });

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const after = await setViewer(parsed.data.role);
  return NextResponse.json({ state: filterForViewer(after) });
}
