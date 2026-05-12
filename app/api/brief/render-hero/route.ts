import { NextResponse } from "next/server";
import { readState, setBrief } from "@/lib/store";
import { generateMoodBoardImage, buildFullPrompt, hasOpenAIKey } from "@/lib/imagegen";
import type { ProjectState, Brief } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// =====================================================================
// /api/brief/render-hero — the dashboard hero image.
//
// FOUNDATIONAL DESIGN PRINCIPLE: the app grows with you.
//
// The hero photo is not a stock asset — it's an AI-generated scene that
// matches the EXACT details in the dossier. The longer the couple uses
// Corsia, the more theirs the app becomes. As decisions lock in, this
// prompt picks them up and we re-render:
//
//   At lock              → region + season + vibe + guest scale
//   After venue books    → + actual venue name and style cue
//   After design locks   → + chosen colorways + palette nouns
//   After florals lock   → + the specific stems and arrangement style
//   After ceremony locks → + cultural setting (Catholic/Jewish/etc.)
//
// Each time `buildHeroPrompt` returns a NEW prompt string (because new
// details landed), the CommandCenter's auto-render effect sees the
// mismatch and fires this endpoint again. The fresh image fades over
// the old one. The dashboard slowly becomes a portrait of THIS wedding,
// not a generic dashboard.
//
// This same principle should inform every other surface over time:
// typography that warms as the date approaches, palettes that match
// florals once locked, headers that name the actual venue, etc.
// =====================================================================

// Idempotent. If a hero exists and the prompt hasn't changed, the
// existing image is returned. Pass `?force=1` to re-render.
export async function POST(req: Request) {
  const url = new URL(req.url);
  const force = url.searchParams.get("force") === "1";

  const state = await readState();
  const brief = state.brief;
  if (!brief) {
    return NextResponse.json({ error: "No brief on file." }, { status: 404 });
  }

  // Prompt grows as more details lock. Region + season + vibe at first;
  // once a venue is contracted, the venue's name and category enter the
  // prompt; once a design locks, the colorway and palette nouns land;
  // and so on.
  const prompt = buildHeroPrompt(brief, state);

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

// =====================================================================
// PROMPT BUILDER
//
// Reads the full project state, not just the brief, so locked decisions
// (venue, design palette, florals, ceremony) automatically enrich the
// prompt as they land. Returns a stable deterministic string so the
// cache-check above only re-renders when something actually changed.
// =====================================================================

function buildHeroPrompt(brief: Brief, state?: ProjectState): string {
  const season = parseSeason(brief.dateWindow);
  const tone = brief.formalityTone ?? "modern";
  const guestScale =
    brief.guestCount >= 200 ? "a grand celebration" :
    brief.guestCount >= 80  ? "a full reception" :
                              "an intimate gathering";

  // BASE LAYER — always present.
  const base = [
    `An establishing wide shot of ${guestScale} in ${brief.region}`,
    `during ${season}.`,
  ];

  // VIBE LAYER — the couple's own words.
  if (brief.vibe) base.push(`Vibe: ${brief.vibe}.`);

  // CULTURAL LAYER — affects ceremony staging cues.
  if (brief.cultural && brief.cultural !== "secular") {
    base.push(
      `Cultural setting: ${culturalCue(brief.cultural)}.`,
    );
  }

  // VENUE LAYER — locks in once the couple has contracted a venue.
  // The venue's name + city give the AI a real, specific place to
  // anchor to, which is the single biggest jump in image quality.
  const venue = state?.vendors.find(
    (v) =>
      v.category === "Venue" &&
      (v.status === "contracted" || v.status === "paid"),
  );
  if (venue) {
    base.push(
      `Venue: ${venue.name} in ${venue.city || brief.region} — feature its architectural character.`,
    );
  }

  // DESIGN LAYER — chosen colorway + design direction once approved.
  // We prefer the moodboard since it carries the overall colorway, and
  // we read swatches[] for the actual hex codes the couple chose.
  const approvedDesign =
    state?.designs?.find((d) => d.approved && d.kind === "moodboard") ??
    state?.designs?.find((d) => d.approved);
  if (approvedDesign) {
    const swatches = (approvedDesign.swatches ?? []).slice(0, 4).join(", ");
    if (swatches) base.push(`Palette (hex): ${swatches}.`);
    if (approvedDesign.title)
      base.push(`Design direction: ${approvedDesign.title}.`);
  }

  // FLORALS LAYER — once a floral program has approved arrangements,
  // the actual stems enter the frame. We pull primary stems from up to
  // three approved pieces so the AI gets the dominant floral story
  // without drowning in detail.
  const florals = state?.florals?.filter((f) => f.approved) ?? [];
  if (florals.length > 0) {
    const stems = Array.from(
      new Set(
        florals
          .flatMap((f) => f.primary ?? [])
          .filter(Boolean)
          .slice(0, 6),
      ),
    );
    if (stems.length)
      base.push(`Florals on the tables: ${stems.join(", ")}.`);
  }

  // FORMALITY + TECHNICAL FRAME — always last so the editorial
  // composition rules don't get overwritten by later details.
  base.push(`Tone: ${tone}, luxury wedding editorial.`);
  base.push(
    `Composition shows the venue and table setting at golden hour, candles lit, no people in frame.`,
  );
  base.push(`Mood: cinematic, atmospheric, soft warm light, shallow depth of field.`);

  return base.filter(Boolean).join(" ");
}

function culturalCue(c: string): string {
  switch (c) {
    case "catholic":   return "a Catholic ceremony setting with subtle reverence";
    case "jewish":     return "a Jewish ceremony setting under a chuppah";
    case "hindu":      return "a Hindu ceremony setting under a mandap with marigolds";
    case "muslim":     return "a Nikah setting, calm and elegant";
    case "interfaith": return "an interfaith ceremony, multiple traditions woven gently";
    case "civil":      return "a civil ceremony, modern and unadorned";
    default:           return c;
  }
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
