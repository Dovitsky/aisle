// Botanist — floral arrangement designer (PRD §3.2). Translates the locked
// design palette into actual stems, vessel notes, and per-piece quantities.

import type Anthropic from "@anthropic-ai/sdk";
import { client, MODELS, hasApiKey } from "../anthropic";
import { Brief, FloralArrangement, FloralPiece } from "../types";

const PIECES: FloralPiece[] = [
  "ceremony_arch", "ceremony_aisle", "centerpiece",
  "bouquet_organizer", "bouquet_partner", "bouquet_party",
  "boutonniere", "corsage", "cake_florals", "head_table",
  "welcome_floral", "petals",
];

const SYSTEM = `You are Botanist, AISLE's floral agent.
Design the full floral program: arches, aisle, centerpieces, bouquets, boutonnières, corsages, cake florals.

Output JSON only:
{ "arrangements": [
  { "piece": "<one of the listed pieces>",
    "quantity": int, "primary": ["primary stems"], "secondary": ["filler"],
    "vesselNotes": "1 line", "unitCost": int USD }
] }

Quantities should match a wedding of the given guest count (e.g., 1 centerpiece per table of 8-10, 1 boutonnière per groomsman, 2 bouquets organizer/partner, etc.).
Use real flower names tied to the season + region. No "miscellaneous greens" — be specific.`;

export async function botanistPropose(args: { brief: Brief; tableCount?: number; weddingPartySize?: number; palette?: string[] }): Promise<Omit<FloralArrangement, "id">[]> {
  if (!hasApiKey()) return offline(args);

  const userPrompt = `Vibe: ${args.brief.vibe}
Cultural: ${args.brief.cultural ?? "secular"}
Region: ${args.brief.region}
Date window: ${args.brief.dateWindow}
Guest count: ${args.brief.guestCount}
Tables (estimate): ${args.tableCount ?? Math.ceil(args.brief.guestCount / 8)}
Wedding party size (estimate): ${args.weddingPartySize ?? 8}
Palette: ${args.palette?.join(", ") ?? "(use the brief's vibe)"}

Design the florals now.`;

  const resp = await client().messages.create({
    model: MODELS.orchestrator,
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

function offline(..._: unknown[]): Omit<FloralArrangement, "id">[] { return []; }
