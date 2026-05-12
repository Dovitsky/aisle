// Botanist — floral arrangement designer.
//
// Lives the "app grows with you" principle: by the time the couple
// reaches florals, the app already knows their region, month, vibe,
// contracted venue, locked palette. The Botanist weaves ALL of it into
// its prompt so the recommendations feel like they were made for THIS
// couple, THIS venue, THIS season — not a generic floral catalog.

import type Anthropic from "@anthropic-ai/sdk";
import { client, MODELS, hasApiKey } from "../anthropic";
import { Brief, FloralArrangement, FloralPiece } from "../types";
import type { WeddingContext } from "./context";
import { contextSummaryForPrompt } from "./context";

const PIECES: FloralPiece[] = [
  "ceremony_arch", "ceremony_aisle", "centerpiece",
  "bouquet_organizer", "bouquet_partner", "bouquet_party",
  "boutonniere", "corsage", "cake_florals", "head_table",
  "welcome_floral", "petals",
];

const SYSTEM = `You are Botanist, Corsia's floral agent.
Design the full floral program: arches, aisle, centerpieces, bouquets, boutonnières, corsages, cake florals.

CRITICAL: Use what the app already knows about THIS wedding — the season, the region's climate, the contracted venue's style, the locked palette. Pick stems that are in peak season for the wedding month in that region. If the venue is a barn, lean rustic-elegant. If it's a coastal villa, lean airy and Mediterranean. Match the palette swatches.

Output JSON only:
{ "arrangements": [
  { "piece": "<one of the listed pieces>",
    "quantity": int, "primary": ["primary stems"], "secondary": ["filler"],
    "vesselNotes": "1 line", "unitCost": int USD }
] }

Quantities should match a wedding of the given guest count (e.g., 1 centerpiece per table of 8-10, 1 boutonnière per groomsman, 2 bouquets organizer/partner, etc.).
Use real flower names tied to the season + region. No "miscellaneous greens" — be specific.`;

export async function botanistPropose(args: {
  brief: Brief;
  context?: WeddingContext;
  tableCount?: number;
  weddingPartySize?: number;
  palette?: string[];
}): Promise<Omit<FloralArrangement, "id">[]> {
  if (!hasApiKey()) return offline(args);

  // Build the prompt's "what we know" header from the full context when
  // available; fall back to the brief-only header otherwise.
  const ctxHeader = args.context
    ? contextSummaryForPrompt(args.context)
    : [
        `Region: ${args.brief.region}`,
        `When: ${args.brief.dateWindow}`,
        `Guest count: ${args.brief.guestCount}`,
        `Vibe: ${args.brief.vibe}`,
        `Cultural: ${args.brief.cultural ?? "secular"}`,
      ].join("\n");

  const userPrompt = `${ctxHeader}
Tables (estimate): ${args.tableCount ?? Math.ceil(args.brief.guestCount / 8)}
Wedding party size (estimate): ${args.weddingPartySize ?? 8}
${args.palette?.length ? `Palette swatches: ${args.palette.join(", ")}` : ""}

Design the florals now — stems in peak season for the month + region, anchored to the venue and palette above.`;

  const resp = await client().messages.create({
    model: MODELS.specialist,
    max_tokens: 2000,
    system: SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
  });
  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text).join("\n").trim();
  const json = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    const parsed = JSON.parse(json) as { arrangements: unknown[] };
    return (parsed.arrangements ?? []).map(coerce).filter(Boolean) as Omit<FloralArrangement, "id">[];
  } catch {
    return offline(args);
  }
}

function coerce(raw: unknown): Omit<FloralArrangement, "id"> | null {
  const r = (raw ?? {}) as Record<string, unknown>;
  if (!PIECES.includes(r.piece as FloralPiece)) return null;
  return {
    piece: r.piece as FloralPiece,
    quantity: Math.max(1, Math.round(Number(r.quantity) || 1)),
    primary: (Array.isArray(r.primary) ? r.primary : []).map(String),
    secondary: (Array.isArray(r.secondary) ? r.secondary : []).map(String),
    vesselNotes: r.vesselNotes ? String(r.vesselNotes) : undefined,
    unitCost: Math.max(0, Math.round(Number(r.unitCost) || 0)),
  };
}

// Offline floral program — generates a complete, realistic spec keyed off the
// brief so /florals is populated and the cascade approval looks credible.
// When no Anthropic key is set we still try to honor the season hint from the
// context object: autumn → dahlias + amaranth, winter → ranunculus + evergreens, etc.
function offline(args: {
  brief: Brief;
  context?: WeddingContext;
  tableCount?: number;
  weddingPartySize?: number;
}): Omit<FloralArrangement, "id">[] {
  const tables = args.tableCount ?? Math.ceil(args.brief.guestCount / 8);
  const partySize = args.weddingPartySize ?? Math.min(8, Math.max(4, Math.round(args.brief.guestCount / 20)));
  const v = (args.brief.vibe || "").toLowerCase();
  const season = args.context?.season ?? "the soft hours";
  const moody = /candlelit|moody|editorial|deep|jewel|noir/.test(v);
  const garden = /garden|wildflower|botanical|barn|farm|rustic/.test(v);
  const coastal = /coast|sea|cliff|beach|amalfi/.test(v);
  const autumn = season === "autumn";
  const winter = season === "winter";

  const primary = autumn && garden
    ? ["Café au Lait dahlias", "Burgundy amaranth", "Garden roses (toffee)"]
    : autumn
    ? ["Dahlias (autumn palette)", "Garden roses", "Hypericum berries"]
    : winter
    ? ["White ranunculus", "Anemones", "Hellebores"]
    : moody
    ? ["Black Magic roses", "Café au Lait dahlias", "Burgundy ranunculus"]
    : coastal
    ? ["White ranunculus", "Jasmine vine", "Olive branches"]
    : garden
    ? ["Cosmos", "Queen Anne's lace", "Garden roses"]
    : ["Garden roses", "Eucalyptus", "Lisianthus"];
  const secondary = autumn
    ? ["Dried wheat", "Pampas accents", "Smoked eucalyptus"]
    : winter
    ? ["Cedar", "Silver dollar eucalyptus", "Privet berries"]
    : moody
    ? ["Smokebush", "Dusty miller", "Privet berries"]
    : coastal
    ? ["Sea grass", "Eucalyptus", "Statice"]
    : garden
    ? ["Snapdragons", "Cosmos seed pods", "Trailing ivy"]
    : ["Italian ruscus", "Astilbe", "Dusty miller"];
  return [
    { piece: "ceremony_arch",      quantity: 1,         primary, secondary, vesselNotes: "Asymmetric installation along one ceremony arch corner; trails to the floor.", unitCost: 1400 },
    { piece: "ceremony_aisle",     quantity: 6,         primary, secondary: ["Bud cups", "Eucalyptus"],   vesselNotes: "Bud-cup arrangements line the aisle every 4 ft.", unitCost: 60 },
    { piece: "centerpiece",        quantity: tables,    primary, secondary, vesselNotes: "Low compote bowls; no foam; mixed heights with taper candles.", unitCost: 145 },
    { piece: "bouquet_organizer",  quantity: 1,         primary, secondary: ["Garden roses", "Trailing greenery"], vesselNotes: "Hand-tied with silk ribbon; loose garden style.", unitCost: 240 },
    { piece: "bouquet_partner",    quantity: 1,         primary, secondary: ["Garden roses", "Trailing greenery"], vesselNotes: "Hand-tied; matches organizer palette but smaller.", unitCost: 220 },
    { piece: "bouquet_party",      quantity: partySize, primary, secondary: ["Eucalyptus"],               vesselNotes: "Smaller posy version of the organizer bouquet.", unitCost: 95 },
    { piece: "boutonniere",        quantity: partySize, primary: ["Single bloom"], secondary: ["Olive sprig"], vesselNotes: "Pinned to lapels; spare set kept with planner.", unitCost: 22 },
    { piece: "corsage",            quantity: 6,         primary: ["Spray rose"],   secondary: ["Eucalyptus"],     vesselNotes: "For mothers, grandmothers, special guests.", unitCost: 38 },
    { piece: "cake_florals",       quantity: 1,         primary, secondary,                          vesselNotes: "Fresh florals applied morning-of; food-safe blooms only.", unitCost: 75 },
    { piece: "head_table",         quantity: 1,         primary, secondary,                          vesselNotes: "Loose runner garland down center of head table.", unitCost: 320 },
    { piece: "welcome_floral",     quantity: 2,         primary: ["Branches", "Garden roses"], secondary, vesselNotes: "Tall urns flanking the venue entrance.", unitCost: 180 },
    { piece: "petals",             quantity: 4,         primary: ["Loose petals"], secondary: [],     vesselNotes: "For the recessional toss; biodegradable only.", unitCost: 25 },
  ];
}
