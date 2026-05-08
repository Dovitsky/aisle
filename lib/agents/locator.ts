// Locator — region/destination scout.
//
// Takes a vibe + optional constraints (budget, guest count, season) and
// proposes 3-5 real-world locations using web search. Used during onboarding
// when the couple knows the FEEL they want but hasn't picked WHERE.

import type Anthropic from "@anthropic-ai/sdk";
import { MODELS, hasApiKey, createWithWebSearch } from "../anthropic";

export interface LocatorSuggestion {
  region: string;                // "Amalfi Coast, Italy"
  hub: string;                   // anchoring city/town: "Maiori"
  rationale: string;             // 1-2 sentences tying to the vibe
  fitScore: number;              // 0-100
  bestSeason?: string;           // "Late May or mid-September"
  estimatedTravelCost?: string;  // "$$" / "$$$"
}

const SYSTEM = `You are Locator, AISLE's location agent.
You help couples pick WHERE to get married — before they pick venues, vendors, or anything else.

How you work:
- Use the web_search tool to ground recommendations in real places, real wedding-season practicalities, real travel logistics.
- Run 1-3 searches: "intimate destination wedding [vibe] [season]", "small wedding venues [region] [season] 2026", or similar.
- Mix obvious picks with a wildcard. Suggest distinct regions, not five towns in the same valley.

OUTPUT RULES (CRITICAL):
- Your final assistant message must end with a single JSON array — no trailing prose.
- Wrap it in a \`\`\`json fenced block.
- The JSON shape is:
[
  {
    "region": "Amalfi Coast, Italy",
    "hub": "Maiori",
    "rationale": "1-2 sentence link to the vibe.",
    "fitScore": 92,
    "bestSeason": "Late May or mid-September",
    "estimatedTravelCost": "$$$"
  }
]

Rules:
- 3-5 distinct options.
- Honor budget hints. If modest, don't propose only top-tier destinations.
- Real towns/regions, not just countries.`;

export async function locatorPropose(args: {
  vibe: string;
  seasonHint?: string;
  budgetUsd?: number;
  guestCount?: number;
  partnerHints?: string;
}): Promise<LocatorSuggestion[]> {
  if (!hasApiKey()) return [];

  const userPrompt = [
    `Vibe: ${args.vibe}`,
    args.seasonHint ? `Season hint: ${args.seasonHint}` : null,
    args.budgetUsd ? `Total wedding budget: $${args.budgetUsd.toLocaleString()}` : null,
    args.guestCount ? `Guest count: ~${args.guestCount}` : null,
    args.partnerHints ? `Other notes: ${args.partnerHints}` : null,
    "",
    "Propose 3-5 locations.",
  ].filter(Boolean).join("\n");

  const resp = await createWithWebSearch({
    model: MODELS.orchestrator,
    max_tokens: 4000,
    system: SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
    maxSearches: 3,
  });

  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  const jsonText = extractJsonArray(text);
  try {
    const parsed = JSON.parse(jsonText);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, 5).map(coerce).filter((x): x is LocatorSuggestion => !!x);
  } catch {
    return [];
  }
}

function extractJsonArray(s: string): string {
  let cleaned = s.replace(/<cite[^>]*>([^<]*)<\/cite>/gi, "$1");
  const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) cleaned = fenced[1];
  const start = cleaned.indexOf("[");
  if (start < 0) return cleaned.trim();
  let depth = 0;
  for (let i = start; i < cleaned.length; i++) {
    const c = cleaned[i];
    if (c === "[") depth++;
    else if (c === "]") {
      depth--;
      if (depth === 0) return cleaned.slice(start, i + 1);
    }
  }
  return cleaned.slice(start).trim();
}

function coerce(raw: unknown): LocatorSuggestion | null {
  const r = (raw ?? {}) as Record<string, unknown>;
  const region = String(r.region ?? "").trim();
  if (!region) return null;
  return {
    region,
    hub: String(r.hub ?? "").trim(),
    rationale: String(r.rationale ?? "").trim(),
    fitScore: Math.max(0, Math.min(100, Math.round(Number(r.fitScore) || 0))),
    bestSeason: r.bestSeason ? String(r.bestSeason) : undefined,
    estimatedTravelCost: r.estimatedTravelCost ? String(r.estimatedTravelCost) : undefined,
  };
}
