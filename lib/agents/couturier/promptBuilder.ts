// Couturier prompt builder.
//
// Takes the user's taxonomy selections + their natural language input +
// the saved DressProfile, and produces a single, coherent paragraph the
// image model can render from. The natural language always wins over
// the taxonomy when the two contradict — couture houses listen to the
// bride's voice first.

import type {
  DressGenerationMode,
  DressProfile,
  DressTaxonomy,
} from "@/lib/types";
import {
  BACK_TRANSLATIONS,
  COLOR_TRANSLATIONS,
  EMBELLISHMENT_TRANSLATIONS,
  FABRIC_TRANSLATIONS,
  NECKLINE_TRANSLATIONS,
  SILHOUETTE_TRANSLATIONS,
  SLEEVE_TRANSLATIONS,
  TRAIN_TRANSLATIONS,
  VEIL_EDGE_TRANSLATIONS,
  VEIL_FABRIC_TRANSLATIONS,
  VEIL_LENGTH_TRANSLATIONS,
  VEIL_TIER_TRANSLATIONS,
} from "./vocabulary";

const SKETCH_PREAMBLE =
  "A couture atelier design sketch, fashion illustration on warm cream paper. " +
  "Loose pencil and gouache, soft watercolor wash, hand-rendered. Full-figure " +
  "standing pose, slight three-quarter angle, head loosely indicated without " +
  "facial detail. Designer-style notations and fabric swatches in the margin. " +
  "No background — paper only. No text overlays.";

const EDITORIAL_PREAMBLE =
  "Editorial bridal photography, magazine-quality, calm luxury aesthetic. " +
  "Natural daylight from a tall window or open shade. Neutral cream paper " +
  "backdrop. Full-figure or three-quarter composition, model facing camera " +
  "with soft-focus or away from camera. Shot on medium format film, fine " +
  "grain, no digital sharpening. Composition is editorial, not commercial. " +
  "No text overlays, no watermarks. No jewelry unless specified. No bouquet. " +
  "The dress is the subject.";

const AESTHETIC_GUARDRAILS =
  "Photorealistic rendering of the dress as specified — every structural " +
  "element must match the specification precisely. The dress must look " +
  "constructed, not draped fabric. Seams, darts, and construction lines " +
  "should be implied. The dress must be wearable by a human body. No " +
  "fantasy elements unless explicitly requested. No recognizable faces, no " +
  "named celebrities, no copied designer signatures.";

interface BuildArgs {
  kind: "dress" | "veil";
  mode: DressGenerationMode;
  taxonomy: DressTaxonomy;
  naturalLanguage?: string;
  profile?: DressProfile;
  /** When generating a veil and a "the one" dress concept exists, the
   *  dress description gets composed in too so the veil reads on the
   *  actual gown. */
  dressContext?: string;
}

export function buildPrompt(args: BuildArgs): string {
  const parts: string[] = [];

  // 1. Style preamble first — sets the rendering register.
  parts.push(args.mode === "sketch" ? SKETCH_PREAMBLE : EDITORIAL_PREAMBLE);

  // 2. The composed taxonomy description.
  if (args.kind === "dress") {
    parts.push(composeDressDescription(args.taxonomy));
  } else {
    parts.push(composeVeilDescription(args.taxonomy, args.dressContext));
  }

  // 3. Natural language overlay (wins on contradictions).
  if (args.naturalLanguage && args.naturalLanguage.trim()) {
    parts.push(
      `Designer notes: ${args.naturalLanguage.trim()} ` +
        `If any of those notes contradict the structured choices above, the notes are correct.`,
    );
  }

  // 4. Constraints from the Couturier Interview.
  if (args.profile) {
    const constraints = composeProfileConstraints(args.profile);
    if (constraints) parts.push(constraints);
  }

  // 5. Aesthetic guardrails always last.
  parts.push(AESTHETIC_GUARDRAILS);

  return parts.join(" ");
}

// ---------------------------------------------------------------- compose ---

function composeDressDescription(t: DressTaxonomy): string {
  const opens: string[] = [];

  if (t.silhouette && SILHOUETTE_TRANSLATIONS[t.silhouette]) {
    opens.push(`The silhouette is ${SILHOUETTE_TRANSLATIONS[t.silhouette]}.`);
  }
  if (t.neckline && NECKLINE_TRANSLATIONS[t.neckline]) {
    opens.push(`The neckline is ${NECKLINE_TRANSLATIONS[t.neckline]}.`);
  }
  if (t.sleeves && SLEEVE_TRANSLATIONS[t.sleeves]) {
    opens.push(`At the shoulders, ${SLEEVE_TRANSLATIONS[t.sleeves]}.`);
  }
  if (t.back && BACK_TRANSLATIONS[t.back]) {
    opens.push(`The back: ${BACK_TRANSLATIONS[t.back]}.`);
  }
  if (t.fabric && t.fabric.length > 0) {
    const fabrics = t.fabric
      .map((f) => FABRIC_TRANSLATIONS[f])
      .filter((s) => !!s);
    if (fabrics.length === 1) {
      opens.push(`Constructed in ${fabrics[0]}.`);
    } else if (fabrics.length > 1) {
      opens.push(`Constructed in a combination of ${fabrics.join("; and ")}.`);
    }
  }
  if (t.train && TRAIN_TRANSLATIONS[t.train]) {
    opens.push(`Finished with ${TRAIN_TRANSLATIONS[t.train]}.`);
  }
  if (t.embellishment && t.embellishment.length > 0) {
    const embellishments = t.embellishment
      .map((e) => EMBELLISHMENT_TRANSLATIONS[e])
      .filter((s) => !!s);
    if (embellishments.length > 0) {
      opens.push(
        `Detailing: ${embellishments.join(". ")}.`,
      );
    }
  }
  if (t.color && COLOR_TRANSLATIONS[t.color]) {
    opens.push(`The color is ${COLOR_TRANSLATIONS[t.color]}.`);
  }

  if (opens.length === 0) {
    return "A wedding dress, couture-grade construction, the silhouette and details to be determined by the designer.";
  }
  return opens.join(" ");
}

function composeVeilDescription(
  t: DressTaxonomy,
  dressContext?: string,
): string {
  const opens: string[] = [];
  opens.push("A bridal veil to be worn with the dress.");

  if (t.length && VEIL_LENGTH_TRANSLATIONS[t.length]) {
    opens.push(`Length: ${VEIL_LENGTH_TRANSLATIONS[t.length]}.`);
  }
  if (t.tier && VEIL_TIER_TRANSLATIONS[t.tier]) {
    opens.push(`Tier construction: ${VEIL_TIER_TRANSLATIONS[t.tier]}.`);
  }
  if (t.fabric && t.fabric.length > 0) {
    const fabrics = t.fabric
      .map((f) => VEIL_FABRIC_TRANSLATIONS[f])
      .filter((s) => !!s);
    if (fabrics.length > 0) {
      opens.push(`Fabric: ${fabrics.join("; ")}.`);
    }
  }
  if (t.edge && VEIL_EDGE_TRANSLATIONS[t.edge]) {
    opens.push(`Edge finish: ${VEIL_EDGE_TRANSLATIONS[t.edge]}.`);
  }
  if (t.embellishment && t.embellishment.length > 0) {
    opens.push(`Embellishment: ${t.embellishment.join(", ").toLowerCase()}.`);
  }
  if (t.color) {
    opens.push(`Color: ${t.color.toLowerCase()}.`);
  }

  if (dressContext) {
    opens.push(`Shown worn with: ${dressContext}`);
  }
  return opens.join(" ");
}

function composeProfileConstraints(profile: DressProfile): string {
  const lines: string[] = [];
  if (profile.bodyNotes && profile.bodyNotes.trim()) {
    lines.push(
      `Body notes from the bride (frame as celebration, never as flaws): ${profile.bodyNotes.trim()}`,
    );
  }
  if (profile.venueSeasonNotes && profile.venueSeasonNotes.trim()) {
    lines.push(
      `Venue and season: ${profile.venueSeasonNotes.trim()} — let this inform fabric weight and ceremonial formality.`,
    );
  }
  if (profile.nonNegotiables && profile.nonNegotiables.length > 0) {
    lines.push(
      `Non-negotiables that must hold: ${profile.nonNegotiables.join("; ")}.`,
    );
  }
  if (profile.twoMoments?.first || profile.twoMoments?.second) {
    const moments = [profile.twoMoments?.first, profile.twoMoments?.second]
      .filter(Boolean)
      .join(" and ");
    if (moments) {
      lines.push(`The two moments she wants the dress to land: ${moments}.`);
    }
  }
  if (lines.length === 0) return "";
  return lines.join(" ");
}

// ----------------------------------------------------------- designer brief

/** A short paragraph in Couturier's voice for the tech pack title page.
 *  Composed deterministically from the same inputs as the image prompt,
 *  but rendered as a single editorial paragraph (no preamble). */
export function buildDesignerBrief(args: {
  kind: "dress" | "veil";
  taxonomy: DressTaxonomy;
  naturalLanguage?: string;
}): string {
  const body =
    args.kind === "dress"
      ? composeDressDescription(args.taxonomy)
      : composeVeilDescription(args.taxonomy);
  if (args.naturalLanguage && args.naturalLanguage.trim()) {
    return `${body} ${args.naturalLanguage.trim()}`;
  }
  return body;
}
