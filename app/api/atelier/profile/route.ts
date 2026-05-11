// PATCH /api/atelier/profile — update the DressProfile (the private
// Couturier Interview output). Used by the atelier home setup flow.

import { NextResponse } from "next/server";
import { z } from "zod";
import { mutate } from "@/lib/store";

export const dynamic = "force-dynamic";

const schema = z.object({
  story: z.string().optional(),
  bodyNotes: z.string().optional(),
  venueSeasonNotes: z.string().optional(),
  referenceImageUrls: z.array(z.string()).optional(),
  nonNegotiables: z.array(z.string()).optional(),
  twoMoments: z
    .object({
      first: z.string().optional(),
      second: z.string().optional(),
    })
    .optional(),
});

export async function PATCH(req: Request) {
  let parsed;
  try {
    parsed = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const next = await mutate((s) => {
    if (!s.atelier) s.atelier = { concepts: [] };
    const existing = s.atelier.profile;
    s.atelier.profile = {
      story: parsed.story ?? existing?.story,
      bodyNotes: parsed.bodyNotes ?? existing?.bodyNotes,
      venueSeasonNotes: parsed.venueSeasonNotes ?? existing?.venueSeasonNotes,
      referenceImageUrls: parsed.referenceImageUrls ?? existing?.referenceImageUrls ?? [],
      nonNegotiables: parsed.nonNegotiables ?? existing?.nonNegotiables ?? [],
      twoMoments: parsed.twoMoments ?? existing?.twoMoments,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    return s;
  });
  return NextResponse.json({ state: next });
}
