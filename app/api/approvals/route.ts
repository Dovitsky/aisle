import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveApproval } from "@/lib/store";

export const dynamic = "force-dynamic";

const Body = z.object({
  id: z.string().min(1),
  decision: z.enum(["approved", "rejected", "edited"]),
  note: z.string().max(2000).optional(),
});

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const after = await resolveApproval(
    parsed.data.id,
    parsed.data.decision,
    parsed.data.note,
  );
  return NextResponse.json({ state: after });
}
