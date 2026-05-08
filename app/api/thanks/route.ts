import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readState, setThanks, updateThank } from "@/lib/store";

export const dynamic = "force-dynamic";

const Body = z.discriminatedUnion("op", [
  z.object({ op: z.literal("rebuild") }),
  z.object({ op: z.literal("update"), id: z.string(), patch: z.object({
    giftDescription: z.string().optional(),
    draftBody: z.string().optional(),
    status: z.enum(["no_gift", "drafting", "ready", "sent"]).optional(),
  }) }),
]);

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  if (parsed.data.op === "rebuild") {
    const s = await readState();
    const yes = s.guests.filter((g) => g.rsvp === "yes");
    const items = yes.map((g) => {
      const existing = s.thanks.find((t) => t.guestId === g.id);
      return existing ?? {
        id: Math.random().toString(36).slice(2, 12),
        guestId: g.id,
        guestName: g.fullName,
        status: "no_gift" as const,
      };
    });
    const after = await setThanks(items);
    return NextResponse.json({ state: after });
  }

  const after = await updateThank(parsed.data.id, parsed.data.patch);
  return NextResponse.json({ state: after });
}
