// POST /api/starter-brief  body: { id: string }
// Apply a STARTER_BRIEFS template to the project. Names are left blank so
// Maestro's onboarding chat can ask for them (and trigger the auto-lock once
// they land).

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { appendChat, readState, setBrief } from "@/lib/store";
import { findStarterBrief } from "@/lib/starterBriefs";

export const dynamic = "force-dynamic";

const Body = z.object({ id: z.string().min(1) });

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const tpl = findStarterBrief(parsed.data.id);
  if (!tpl) {
    return NextResponse.json({ error: "Unknown template" }, { status: 404 });
  }

  const cur = (await readState()).brief;

  await setBrief({
    organizerName: cur?.organizerName ?? "",
    partnerName:   cur?.partnerName ?? "",
    ...tpl.brief,
    locked: false,
  });

  await appendChat({
    role: "agent",
    agent: "Maestro",
    content: `Starting from "${tpl.title}". I've loaded the date window, region, guest count, budget, and vibe. The only thing missing is your names. what should I write into the cards?`,
  });

  const after = await readState();
  return NextResponse.json({ state: after, template: tpl.id });
}
