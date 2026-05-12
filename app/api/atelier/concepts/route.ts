// PATCH /api/atelier/concepts
//
// Update a concept. typically the status (in_consideration → shortlist
// → the_one). Promoting a new concept to "the_one" demotes the current
// one to "shortlist".

import { NextResponse } from "next/server";
import { z } from "zod";
import { mutate } from "@/lib/store";

export const dynamic = "force-dynamic";

const schema = z.object({
  conceptId: z.string(),
  status: z.enum(["in_consideration", "shortlist", "the_one"]).optional(),
  heroImageUrl: z.string().url().optional(),
  remove: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  let parsed;
  try {
    parsed = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const next = await mutate((s) => {
    if (!s.atelier) s.atelier = { concepts: [] };
    const c = s.atelier.concepts.find((x) => x.id === parsed.conceptId);
    if (!c) return s;

    if (parsed.remove) {
      s.atelier.concepts = s.atelier.concepts.filter(
        (x) => x.id !== parsed.conceptId,
      );
      return s;
    }

    if (parsed.status) {
      // Promote: demote the prior "the_one" of the same kind.
      if (parsed.status === "the_one") {
        for (const other of s.atelier.concepts) {
          if (
            other.id !== c.id &&
            other.kind === c.kind &&
            other.status === "the_one"
          ) {
            other.status = "shortlist";
            other.updatedAt = new Date().toISOString();
          }
        }
      }
      c.status = parsed.status;
    }
    if (parsed.heroImageUrl && c.images.includes(parsed.heroImageUrl)) {
      c.heroImageUrl = parsed.heroImageUrl;
    }
    c.updatedAt = new Date().toISOString();
    return s;
  });

  return NextResponse.json({ state: next });
}
