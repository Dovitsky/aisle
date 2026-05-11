import { NextResponse } from "next/server";
import { readState, setBrief } from "@/lib/store";
import { generateMoodBoardImage, buildFullPrompt, hasOpenAIKey } from "@/lib/imagegen";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST /api/brief/render-hero
//
// Renders a custom hero image keyed to the brief's vibe + region + date.
// Idempotent. If a hero already exists and the brief hasn't changed, the
// existing image is returned. Pass `?force=1` to re-render.
export async function POST(req: Request) {
  const url = new URL(req.url);
  const force = url.searchParams.get("force") === "1";

  const state = await readState();
  const brief = state.brief;
  if (!brief) {
    return NextResponse.json({ error: "No brief on file." }, { status: 404 });
  }

  const prompt = buildHeroPrompt(brief);

  if (!force && brief.heroImage && brief.heroPrompt === prompt) {
    return NextResponse.json({ image: brief.heroImage, mode: "cached" });
  }

  const result = await generateMoodBoardImage({
    fullPrompt: buildFullPrompt(prompt),
  });

  await setBrief({
    ...brief,
    heroImage: result.url,
    heroPrompt: prompt,
    heroRenderedAt: new Date().toISOString(),
    heroError: result.mode === "placeholder" ? result.error : undefined,
    heroModel: result.mode === "live" ? result.model : undefined,
  });

  return NextResponse.json({
    image: result.url,
    mode: result.mode,
    model: result.model,
    error: result.error,
  });
}

function buildHeroPrompt(b: {
  region: string;
  dateWindow: string;
  vibe: string;
  guestCount: number;
  formalityTone?: string;
}): string {
  const season = parseSeason(b.dateWindow);
  const tone = b.formalityTone ?? "modern";
  const guestScale =
    b.guestCount >= 200 ? "a grand celebration" :
    b.guestCount >= 80  ? "a full reception" :
                          "an intimate gathering";

  return [
    `An establishing wide shot of ${guestScale} in ${b.region}`,
    `during ${season}.`,
    b.vibe ? `Vibe: ${b.vibe}.` : "",
    `Tone: ${tone}, luxury wedding editorial.`,
    `Composition shows the venue and table setting at golden hour, candles lit, no people in frame.`,
    `Mood: cinematic, atmospheric, soft warm light, shallow depth of field.`,
  ].filter(Boolean).join(" ");
}

function parseSeason(dateWindow: string): string {
  const m = dateWindow.match(/(\d{4})-(\d{2})/);
  if (!m) {
    const lower = dateWindow.toLowerCase();
    if (lower.includes("summer")) return "summer";
    if (lower.includes("spring")) return "spring";
    if (lower.includes("fall") || lower.includes("autumn")) return "autumn";
    if (lower.includes("winter")) return "winter";
    return "the soft hours";
  }
  const month = parseInt(m[2], 10);
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
}

// Force-import so the linter doesn't complain about the unused symbol when
// hasOpenAIKey is referenced from the client-side hint UI.
void hasOpenAIKey;
