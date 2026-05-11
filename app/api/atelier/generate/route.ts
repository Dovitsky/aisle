// POST /api/atelier/generate
//
// Generate a 4-up grid of dress (or veil) variations from the user's
// taxonomy selections and natural language input. Calls the existing
// image-gen client which cascades gpt-image-1 → dall-e-3 → dall-e-2.
//
// The four images come back in parallel via Promise.allSettled. Each
// completion is independent so a partial failure still returns whatever
// rendered. Daily caps are enforced per-mode (sketch vs. editorial).

import { NextResponse } from "next/server";
import { z } from "zod";
import { readState, mutate } from "@/lib/store";
import { generateMoodBoardImage } from "@/lib/imagegen";
import { buildPrompt } from "@/lib/agents/couturier/promptBuilder";
import type { DressConcept, DressTaxonomy } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SKETCH_DAILY_CAP = 10; // 4-up grids
const EDITORIAL_DAILY_CAP = 4;

const taxonomySchema: z.ZodType<DressTaxonomy> = z.object({
  silhouette: z.string().optional(),
  neckline: z.string().optional(),
  sleeves: z.string().optional(),
  back: z.string().optional(),
  train: z.string().optional(),
  length: z.string().optional(),
  edge: z.string().optional(),
  tier: z.string().optional(),
  fabric: z.array(z.string()).optional(),
  embellishment: z.array(z.string()).optional(),
  color: z.string().optional(),
});

const bodySchema = z.object({
  kind: z.enum(["dress", "veil"]),
  mode: z.enum(["sketch", "editorial"]),
  taxonomy: taxonomySchema,
  naturalLanguage: z.string().optional(),
});

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function id(): string {
  return Math.random().toString(36).slice(2, 12);
}

export async function POST(req: Request) {
  let parsed;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const state = await readState();
  if (!state.brief) {
    return NextResponse.json(
      { error: "Lock a brief before generating dresses." },
      { status: 412 },
    );
  }

  // Daily cap check
  const day = todayKey();
  const caps = state.atelier?.dailyCaps;
  const fresh =
    !caps || caps.dateISO !== day
      ? { dateISO: day, sketchCount: 0, editorialCount: 0 }
      : caps;
  const used = parsed.mode === "sketch" ? fresh.sketchCount : fresh.editorialCount;
  const limit = parsed.mode === "sketch" ? SKETCH_DAILY_CAP : EDITORIAL_DAILY_CAP;
  if (used >= limit) {
    return NextResponse.json(
      {
        error:
          parsed.mode === "sketch"
            ? "You've sketched a lot today. Editorial generations are still available, or pin from Discover for now."
            : "You've rendered four editorial concepts today. Sketches are still open. Couturier will be back at midnight.",
        capped: true,
      },
      { status: 429 },
    );
  }

  // Build the prompt
  const prompt = buildPrompt({
    kind: parsed.kind,
    mode: parsed.mode,
    taxonomy: parsed.taxonomy,
    naturalLanguage: parsed.naturalLanguage,
    profile: state.atelier?.profile,
    dressContext: parsed.kind === "veil"
      ? composeDressContextFromTheOne(state.atelier?.concepts ?? [])
      : undefined,
  });

  // Fire 4 generations in parallel.
  const settled = await Promise.allSettled([
    generateMoodBoardImage({ fullPrompt: prompt }),
    generateMoodBoardImage({ fullPrompt: prompt + " Variation 2." }),
    generateMoodBoardImage({ fullPrompt: prompt + " Variation 3." }),
    generateMoodBoardImage({ fullPrompt: prompt + " Variation 4." }),
  ]);
  const images = settled
    .map((r) => (r.status === "fulfilled" ? r.value.url : null))
    .filter((u): u is string => !!u);

  if (images.length === 0) {
    return NextResponse.json(
      { error: "Image generation failed. Try again in a moment." },
      { status: 502 },
    );
  }

  // Persist as a draft concept (status: in_consideration).
  const concept: DressConcept = {
    id: id(),
    kind: parsed.kind,
    status: "in_consideration",
    mode: parsed.mode,
    taxonomy: parsed.taxonomy,
    naturalLanguage: parsed.naturalLanguage,
    generatedPrompt: prompt,
    images,
    heroImageUrl: images[0],
    versionNumber: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const next = await mutate((s) => {
    if (!s.atelier) {
      s.atelier = { concepts: [] };
    }
    s.atelier.concepts.push(concept);
    s.atelier.dailyCaps = {
      dateISO: day,
      sketchCount: fresh.sketchCount + (parsed.mode === "sketch" ? 1 : 0),
      editorialCount: fresh.editorialCount + (parsed.mode === "editorial" ? 1 : 0),
    };
    return s;
  });

  return NextResponse.json({
    state: next,
    concept,
    images,
    prompt,
  });
}

function composeDressContextFromTheOne(concepts: DressConcept[]): string | undefined {
  const theOne = concepts.find((c) => c.kind === "dress" && c.status === "the_one");
  if (!theOne) return undefined;
  return theOne.generatedPrompt;
}
