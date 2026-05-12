import { NextResponse } from "next/server";
import { generateMoodBoardImage, buildFullPrompt, hasOpenAIKey } from "@/lib/imagegen";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// /api/brand/generate-logo
//
// Returns three candidate AI-generated wordmarks for the Corsia brand
// as base64 PNGs. The caller (an admin tool or the Chrome MCP harness)
// downloads the best one and commits it to /public/logo-corsia.png.
//
// We don't auto-save here because the curation is a human call —
// "calligraphic gold on cream" vs "embossed serif" vs "minimal modern
// logotype" all read differently in context, and the brand identity
// should be picked, not random-sampled.
//
// Requires OPENAI_API_KEY in env. Without it the function returns
// placeholder SVGs so the route is exercisable in offline mode.
//
// GET /api/brand/generate-logo            → 3 variations
// GET /api/brand/generate-logo?style=N    → just that variation (0/1/2)

const PROMPTS = [
  // 0. Hand-lettered calligraphic, gold on cream — luxury wedding house
  "Luxury brand logotype reading the single word 'Corsia' in elegant, refined modern calligraphy — hand-lettered, slight swash on the C, balanced letterforms, exquisite letter-spacing. Gold ink on cream paper. Minimal, no decorative elements, no flowers, no borders, no other text — just the wordmark. Centered, generous white space, looks like Hermès or Aman Resorts editorial.",

  // 1. Editorial serif, black on white — fashion house
  "Premium wedding brand wordmark spelling 'Corsia' in distinctive editorial serif typography — refined, slightly condensed, high-contrast strokes, deliberate letter-spacing. Pure black ink on a pure white background. Clean minimal design, no decorative elements, no flourishes, looks like a Vogue masthead or a Loewe logotype. Just the single word, centered.",

  // 2. Engraved / embossed on textured paper — couture house
  "Couture brand logotype reading 'Corsia' in a custom modern serif, debossed/engraved on warm ivory cotton-rag textured paper. Subtle shadow gives slight three-dimensional depth. Single word only, no other text, no borders, no decorative elements. Photographed flat-lay, soft natural light. Looks like the cover of a luxury wedding invitation or a Chanel atelier card.",
];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const styleParam = url.searchParams.get("style");
  const requested =
    styleParam !== null
      ? [Math.max(0, Math.min(PROMPTS.length - 1, Number(styleParam) || 0))]
      : PROMPTS.map((_, i) => i);

  if (!hasOpenAIKey()) {
    return NextResponse.json({
      error:
        "OPENAI_API_KEY not set. Set it in Vercel env vars and redeploy to generate live logos.",
      mode: "missing-key",
    }, { status: 412 });
  }

  // Generate the requested variations in parallel.
  const results = await Promise.all(
    requested.map(async (i) => {
      const prompt = PROMPTS[i];
      const r = await generateMoodBoardImage({
        fullPrompt: buildFullPrompt(prompt),
      });
      return {
        style: i,
        prompt,
        url: r.url,
        mode: r.mode,
        model: r.model,
        error: r.error,
      };
    }),
  );

  return NextResponse.json({
    candidates: results,
  });
}
