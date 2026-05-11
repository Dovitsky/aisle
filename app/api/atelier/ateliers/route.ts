// GET /api/atelier/ateliers — returns the ranked atelier shortlist.
// POST /api/atelier/ateliers — select an atelier.

import { NextResponse } from "next/server";
import { z } from "zod";
import { mutate, readState } from "@/lib/store";
import { buildFittingPlan, rankAteliers } from "@/lib/agents/couturier/ateliers";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = await readState();
  const theOne = state.atelier?.concepts.find(
    (c) => c.kind === "dress" && c.status === "the_one",
  );
  if (!theOne) {
    return NextResponse.json({
      ateliers: [],
      reason: "Mark a concept as the one to begin the atelier match.",
    });
  }
  const ranked = rankAteliers({
    silhouette: theOne.taxonomy.silhouette,
    fabric: theOne.taxonomy.fabric,
    back: theOne.taxonomy.back,
    embellishment: theOne.taxonomy.embellishment,
    weddingDateISO: state.brief?.dateWindow,
    region: state.brief?.region,
  });
  // Cache on the state so the fittings view can show consistent results.
  await mutate((s) => {
    if (!s.atelier) s.atelier = { concepts: [] };
    s.atelier.ateliers = ranked;
    return s;
  });
  return NextResponse.json({ ateliers: ranked });
}

const selectSchema = z.object({
  atelierId: z.string(),
});

export async function POST(req: Request) {
  let parsed;
  try {
    parsed = selectSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const next = await mutate((s) => {
    if (!s.atelier) s.atelier = { concepts: [] };
    const atelier = s.atelier.ateliers?.find((a) => a.id === parsed.atelierId);
    if (!atelier) return s;
    s.atelier.selectedAtelierId = parsed.atelierId;
    const theOne = s.atelier.concepts.find(
      (c) => c.kind === "dress" && c.status === "the_one",
    );
    if (!theOne) return s;

    // Build the fitting plan.
    const items = buildFittingPlan({
      weddingDateISO: s.brief?.dateWindow,
      leadTimeMonths: atelier.leadTimeMonths,
    });
    s.atelier.fittingPlan = {
      conceptId: theOne.id,
      atelierVendorId: atelier.id,
      items: items.map((it, idx) => ({
        id: `fp_${idx}`,
        kind: it.kind,
        label: it.label,
        scheduledFor: it.scheduledFor,
        bring: it.bring,
      })),
      createdAt: new Date().toISOString(),
    };
    return s;
  });
  return NextResponse.json({ state: next });
}
