// POST /api/atelier/tech-pack. generate the atelier handoff payload.
//
// For v1, returns the structured TechPackPayload JSON and a printable
// HTML render. A full @react-pdf/renderer PDF build is post-MVP. the
// HTML is print-stylesheet-ready so the user can hit Cmd+P and get the
// same artifact today.

import { NextResponse } from "next/server";
import { z } from "zod";
import { mutate, readState } from "@/lib/store";
import { buildDesignerBrief } from "@/lib/agents/couturier/promptBuilder";
import { buildConstructionNotes } from "@/lib/agents/couturier/ateliers";
import type { TechPackPayload } from "@/lib/types";

export const dynamic = "force-dynamic";

const schema = z.object({
  conceptId: z.string(),
});

export async function POST(req: Request) {
  let parsed;
  try {
    parsed = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const state = await readState();
  const concept = state.atelier?.concepts.find((c) => c.id === parsed.conceptId);
  if (!concept) {
    return NextResponse.json({ error: "Concept not found." }, { status: 404 });
  }
  if (concept.status !== "the_one") {
    return NextResponse.json(
      { error: "Only the chosen concept can produce a tech pack." },
      { status: 412 },
    );
  }

  const veil = state.atelier?.concepts.find(
    (c) => c.kind === "veil" && c.status === "the_one",
  );

  const designerBrief = buildDesignerBrief({
    kind: "dress",
    taxonomy: concept.taxonomy,
    naturalLanguage: concept.naturalLanguage,
  });

  const payload: TechPackPayload = {
    brideName: state.brief?.organizerName ?? "the bride",
    partnerName: state.brief?.partnerName,
    weddingDate: state.brief?.dateWindow,
    venue: state.brief?.region,
    designerBrief,
    taxonomy: concept.taxonomy,
    veilTaxonomy: veil?.taxonomy,
    referenceImageUrls: state.atelier?.profile?.referenceImageUrls ?? [],
    constructionNotes: buildConstructionNotes(concept.taxonomy),
    bodyNotes: state.atelier?.profile?.bodyNotes,
    twoMoments: state.atelier?.profile?.twoMoments,
    fittings: state.atelier?.fittingPlan?.items,
    heroImageUrl: concept.heroImageUrl,
  };

  const techPackId = Math.random().toString(36).slice(2, 12);

  await mutate((s) => {
    if (!s.atelier) s.atelier = { concepts: [] };
    if (!s.atelier.techPacks) s.atelier.techPacks = [];
    s.atelier.techPacks.push({
      id: techPackId,
      conceptId: concept.id,
      atelierVendorId: state.atelier?.selectedAtelierId,
      generatedAt: new Date().toISOString(),
      payload,
    });
    return s;
  });

  return NextResponse.json({ techPackId, payload });
}
