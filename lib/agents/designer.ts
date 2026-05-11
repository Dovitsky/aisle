// Designer — generates mood board concepts and color palettes (PRD §4.2).
// v0 returns named directions with palette swatches; real build calls image gen.

import type Anthropic from "@anthropic-ai/sdk";
import { client, MODELS, hasApiKey } from "../anthropic";
import { Brief } from "../types";

export interface MoodDirection {
  title: string;
  description: string;
  palette: string[];   // 5 hex colors
  refs: string[];      // 4 short reference labels
}

const SYSTEM = `You are Designer, AISLE's visual direction agent.
Given a brief, produce SIX distinct mood-board directions.

Each direction is one coherent aesthetic (not a "best of"). Differ in formality, density, color, and cultural reference.

Output JSON only:
{
  "directions": [
    {
      "title": "Editorial Provence",
      "description": "1-2 sentences naming the feel and the references.",
      "palette": ["#A8896C", ...],   // exactly 5 hex colors that work together as a wedding palette
      "refs": ["sun-faded linen", "pressed olive branches", "raw stone walls", "candlelit long tables"]   // 4 short noun-phrase references
    },
    ...6 total
  ]
}

Constraints: no orange/teal/gen-z palettes. No "boho" — that word is exhausted. Palettes should look like adults could live in them.`;

export async function designerDirections(brief: Brief): Promise<MoodDirection[]> {
  if (!hasApiKey()) return offline(brief);
  const prompt = `Brief vibe: ${brief.vibe}
Region: ${brief.region}
Date window: ${brief.dateWindow}
Guest count: ${brief.guestCount}

Produce six directions now.`;
  const resp = await client().messages.create({
    model: MODELS.specialist,
    max_tokens: 2500,
    system: SYSTEM,
    messages: [{ role: "user", content: prompt }],
  });
  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n").trim();
  const json = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    const parsed = JSON.parse(json);
    const dirs = (parsed?.directions ?? []) as unknown[];
    return dirs.slice(0, 6).map(coerce).filter(Boolean) as MoodDirection[];
  } catch {
    return offline(brief);
  }
}

function coerce(raw: unknown): MoodDirection | null {
  const r = (raw ?? {}) as Record<string, unknown>;
  const palette = Array.isArray(r.palette) ? (r.palette as unknown[]).map(String).slice(0, 5) : [];
  if (palette.length < 3) return null;
  return {
    title: String(r.title ?? "Untitled"),
    description: String(r.description ?? ""),
    palette,
    refs: (Array.isArray(r.refs) ? r.refs : []).map(String).slice(0, 4),
  };
}

// Offline mood directions — three taste-distinct palettes derived from the
// brief's vibe text. Lets /design and the dashboard cards populate without
// an API key. Each direction is a real-feeling design route, not a stub.
function offline(brief: Brief): MoodDirection[] {
  const v = (brief.vibe || "").toLowerCase();
  const region = brief.region || "your region";
  const isMoody = /candlelit|moody|editorial|dark|deep|jewel|black\s*tie|noir/.test(v);
  const isCoastal = /coast|sea|cliff|beach|amalfi|sand|salt/.test(v);
  const isGarden = /garden|botanical|wildflower|field|barn|farm|rustic/.test(v);
  return [
    {
      title: isMoody ? "Candlelit Editorial" : isCoastal ? "Sun-Bleached Linen" : "Heirloom Garden",
      description: isMoody
        ? `Dark wood, deep oxblood florals, ivory taper candles in clusters, vintage silver. Slow film photography. The room reads like a painting.`
        : isCoastal
        ? `Pale linen, weathered terracotta, dried grasses, oyster-shell accents. Open-air ceremony into a long communal dinner. Mediterranean restraint.`
        : `Cream and sage, bud vases of cosmos and ranunculus, beeswax tapers, white-painted chairs, grass underfoot. Photographs feel like a memory you almost have.`,
      palette: isMoody
        ? ["#1A1814", "#5B1A1A", "#7C5E3A", "#FBF8F1", "#A88E6A"]
        : isCoastal
        ? ["#F5EFDF", "#C9967A", "#7C8A6E", "#1A2A2E", "#E8DCC4"]
        : ["#FAF7EE", "#C8D2BB", "#8F9B7F", "#5B5034", "#E2D9C4"],
      refs: isMoody
        ? ["clustered ivory tapers", "oxblood ranunculus", "vintage silver flatware", "raw walnut tabletops"]
        : isCoastal
        ? ["sun-bleached oak chairs", "terracotta urns", "dried grass garlands", "open-air olive groves"]
        : ["cosmos in bud vases", "beeswax tapers", "white painted chairs", "linen napkins three tones"],
    },
    {
      title: isGarden ? "Wildflower Field & Linen" : "Modern Minimal",
      description: isGarden
        ? `Loose, organic florals — cosmos, queen anne's lace, dahlias direct from local farms. Long farmhouse tables, mismatched cane chairs, linen napkins in three soft tones. Unfussy, abundant.`
        : `Architectural floral installs, no centerpieces; sculptural taper candles; brushed-brass flatware; ivory linen with no overlay. Reception lit from above. ${region} feels reset.`,
      palette: isGarden
        ? ["#E8E5D8", "#D5BFA0", "#A88E6A", "#525443", "#FAF6E9"]
        : ["#F8F6F1", "#D6CFC2", "#3F3D38", "#1A1814", "#B5AB9A"],
      refs: isGarden
        ? ["farmhouse long tables", "cane chairs mismatched", "queen anne's lace", "linen in three tones"]
        : ["overhead floral install", "sculptural taper candles", "brushed-brass flatware", "ivory linen no overlay"],
    },
    {
      title: "Soft Romantic",
      description: `Pale blush and butter, soft pinks, garden roses with trailing greenery. Beeswax candles, gold-rim glassware, hand-calligraphed place cards. Reads warm in photos. Pairs well with sunset ceremonies.`,
      palette: ["#FCF4ED", "#F1D6C9", "#E0AC8A", "#9C7B57", "#5C4B36"],
      refs: ["garden roses + trailing greenery", "beeswax candles", "gold-rim glassware", "hand-calligraphed place cards"],
    },
  ];
}
