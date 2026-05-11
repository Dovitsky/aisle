// Mood-board image generation — the marquee feature.
//
// POST { boardId, prompt }
//   → Calls OpenAI gpt-image-1 four times in parallel.
//   → Records the generation in state.generations.
//   → Returns { images: string[]; generationId; remaining }.
//   → Daily cap of 40 (10 generations × 4 images) per project.
//
// When OPENAI_API_KEY is absent, returns four sage-pale placeholder SVGs so
// the demo flow is fully exercisable without keys.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { recordGeneration, bumpGenerationCount } from "@/lib/store";
import { generateMoodBoardImage, buildFullPrompt, hasOpenAIKey } from "@/lib/imagegen";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

const Body = z.object({
  boardId: z.string().min(1),
  prompt: z.string().min(3).max(2000),
});

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Tell Maestro what you'd like to see." }, { status: 400 });
  }

  const cap = await bumpGenerationCount(4);
  if (!cap.allowed) {
    return NextResponse.json({
      error: "You've generated 40 images today. Maestro will be back tomorrow. In the meantime, pin from Discover or upload your own.",
      remaining: cap.remaining,
    }, { status: 429 });
  }

  const fullPrompt = buildFullPrompt(parsed.data.prompt);

  // Generate four in parallel. Promise.allSettled means partial failures
  // still return whatever succeeded.
  const results = await Promise.allSettled([
    generateMoodBoardImage({ fullPrompt }),
    generateMoodBoardImage({ fullPrompt }),
    generateMoodBoardImage({ fullPrompt }),
    generateMoodBoardImage({ fullPrompt }),
  ]);
  const urls: string[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") urls.push(r.value.url);
  }
  if (urls.length === 0) {
    return NextResponse.json({ error: "Image generation failed. Please try again." }, { status: 502 });
  }

  const gen = await recordGeneration({
    boardId: parsed.data.boardId,
    prompt: parsed.data.prompt,
    fullPromptWithPreamble: fullPrompt,
    imageUrls: urls,
    savedPinIds: [],
  });

  return NextResponse.json({
    images: urls,
    generationId: gen.id,
    remaining: cap.remaining,
    mode: hasOpenAIKey() ? "live" : "sample",
  });
}
