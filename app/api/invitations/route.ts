// Invitations module API. Update the template + customizations, send to
// households (marks invitationSentAt), and record opens.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { mutate, readState } from "@/lib/store";
import type { InvitationsConfig } from "@/lib/types";

export const dynamic = "force-dynamic";

const TemplateId = z.enum(["editorial", "monogram", "asymmetric", "pressed", "botanical", "modern"]);

const Body = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("update"),
    patch: z.object({
      templateId: TemplateId.optional(),
      headerLine: z.string().optional(),
      dateLine: z.string().optional(),
      yearLine: z.string().optional(),
      ceremonyTime: z.string().optional(),
      venueLine: z.string().optional(),
      venueAddress: z.string().optional(),
      receptionLine: z.string().optional(),
      rsvpUrl: z.string().optional(),
      accentColor: z.string().optional(),
    }),
  }),
  z.object({ op: z.literal("send"), householdIds: z.array(z.string()).optional() }),
  z.object({ op: z.literal("mark_opened"), householdId: z.string() }),
  z.object({ op: z.literal("reset_send"), householdId: z.string() }),
]);

export async function GET() {
  const s = await readState();
  return NextResponse.json({ state: s });
}

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const data = parsed.data;

  switch (data.op) {
    case "update": {
      const after = await mutate((s) => {
        const prev: InvitationsConfig =
          s.invitations ?? { templateId: "editorial" };
        s.invitations = {
          ...prev,
          ...data.patch,
          updatedAt: new Date().toISOString(),
        };
        return s;
      });
      return NextResponse.json({ state: after });
    }
    case "send": {
      const after = await mutate((s) => {
        const at = new Date().toISOString();
        const ids = data.householdIds ?? s.households.map((h) => h.id);
        const set = new Set(ids);
        s.households = s.households.map((h) =>
          set.has(h.id) && !h.invitationSentAt ? { ...h, invitationSentAt: at } : h,
        );
        return s;
      });
      return NextResponse.json({ state: after });
    }
    case "mark_opened": {
      const after = await mutate((s) => {
        const at = new Date().toISOString();
        s.households = s.households.map((h) =>
          h.id === data.householdId && h.invitationSentAt && !h.invitationOpenedAt
            ? { ...h, invitationOpenedAt: at }
            : h,
        );
        return s;
      });
      return NextResponse.json({ state: after });
    }
    case "reset_send": {
      const after = await mutate((s) => {
        s.households = s.households.map((h) => {
          if (h.id !== data.householdId) return h;
          const { invitationSentAt: _s, invitationOpenedAt: _o, ...rest } = h;
          return rest;
        });
        return s;
      });
      return NextResponse.json({ state: after });
    }
  }
}
