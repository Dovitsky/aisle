// Locator. region/destination scout.
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

const SYSTEM = `You are Locator, Corsia's location agent.
You help couples pick WHERE to get married. before they pick venues, vendors, or anything else.

How you work:
- Use the web_search tool to ground recommendations in real places, real wedding-season practicalities, real travel logistics.
- Run 1-3 searches: "intimate destination wedding [vibe] [season]", "small wedding venues [region] [season] 2026", or similar.
- Mix obvious picks with a wildcard. Suggest distinct regions, not five towns in the same valley.

OUTPUT RULES (CRITICAL):
- Your final assistant message must end with a single JSON array. no trailing prose.
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
  if (!hasApiKey()) return offlineSuggestions(args.vibe, args.budgetUsd, args.guestCount);

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

// Offline location suggestions. vibe-shaded baseline so the location-first
// onboarding moment lights up without a key. Five distinct regions across
// price points so the choice card has real range.
function offlineSuggestions(vibe: string, budgetUsd?: number, guestCount?: number): LocatorSuggestion[] {
  const v = (vibe || "").toLowerCase();
  const isCoastal = /coast|sea|cliff|beach|island|salt|amalfi|capri/.test(v);
  const isMoody  = /candlelit|moody|editorial|jewel|noir|black\s*tie|deep|dark/.test(v);
  const isGarden = /garden|wildflower|botanical|barn|farm|countryside|rustic/.test(v);
  const isHistoric = /historic|stone|chapel|estate|villa|vintage/.test(v);
  const modest = budgetUsd !== undefined && budgetUsd < 60000;
  const small  = guestCount !== undefined && guestCount <= 50;

  const all: LocatorSuggestion[] = [
    { region: "Amalfi Coast, Italy",        hub: "Maiori / Ravello",    fitScore: isCoastal ? 96 : 78, bestSeason: "Late May or mid-September", estimatedTravelCost: "$$$$",
      rationale: "Cliffside ceremonies, pergola dinners, Mediterranean light. Reception venues like Belmond Caruso are limited and book 12-18 months out." },
    { region: "Hudson Valley, NY",          hub: "Hudson / Rhinebeck",  fitScore: isGarden ? 95 : 84, bestSeason: "Late September or early October", estimatedTravelCost: "$$",
      rationale: "Working farms, restored barns, easy access from NYC. Foliage peaks early October. book against that calendar carefully." },
    { region: "Tuscany, Italy",             hub: "Cortona / Pienza",    fitScore: isHistoric ? 96 : 82, bestSeason: "Mid-May or early September", estimatedTravelCost: "$$$$",
      rationale: "Olive-grove villas, long-table dinners under cypress, real stonework. Paolo Genovesi and Borgo Stomennano set the bar." },
    { region: "Joshua Tree, CA",            hub: "Joshua Tree / Pioneertown", fitScore: isMoody ? 90 : 80, bestSeason: "Late October or early March", estimatedTravelCost: "$$",
      rationale: "Boulder-and-yucca desert with high-contrast light. Sunsets photograph dramatically; nights are cool. Limited indoor backup options." },
    { region: "Charleston, SC",             hub: "Charleston historic district", fitScore: isHistoric ? 92 : 80, bestSeason: "Mid-March or early November", estimatedTravelCost: "$$",
      rationale: "Historic plantation-era venues are now reframed; Cannon Green and Magnolia Plantation are good modern picks. Hot in midsummer." },
    { region: "Napa Valley, CA",            hub: "St. Helena / Yountville", fitScore: isGarden ? 88 : 82, bestSeason: "Mid-May or late September", estimatedTravelCost: "$$$",
      rationale: "Vineyard ceremonies, in-house tasting menus. Higher-end pricing; weekday weddings unlock significant savings." },
    { region: "Big Sur, CA",                hub: "Big Sur / Carmel",     fitScore: isCoastal ? 92 : 78, bestSeason: "Mid-September or early October", estimatedTravelCost: "$$$",
      rationale: "Cliffside and redwood. Ventana Big Sur is the iconic option; permits for outdoor ceremony locations are tightly limited." },
    { region: "Lisbon + Comporta, Portugal", hub: "Lisbon → Comporta",   fitScore: isCoastal ? 90 : 80, bestSeason: "Mid-May or late September", estimatedTravelCost: "$$$",
      rationale: "Editorial weddings under-discovered relative to Italy. Rice fields, pine forests, beach cottages. Strong dollar to euro stretches budget." },
    { region: "Marfa, TX",                  hub: "Marfa",                fitScore: isMoody ? 88 : 70, bestSeason: "Late October or early November", estimatedTravelCost: "$$",
      rationale: "High-desert minimalism, art-world crowd, El Cosmico's tents and yurts. Travel logistics are real. guests need 2 days minimum." },
    { region: "Paris, France",              hub: "Paris (8th, 16th)",    fitScore: isHistoric ? 90 : 78, bestSeason: "Late May or early September", estimatedTravelCost: "$$$$",
      rationale: "City-hall civil + private hotel reception. Hôtel de Crillon, Shangri-La, or rented private mansions like Hôtel de l'Industrie." },
  ];

  // Score-and-sort, push budget-friendlier picks higher when budget is modest,
  // and small-format venues higher when guest count is small.
  const adjusted = all.map((s) => {
    let score = s.fitScore;
    if (modest && (s.estimatedTravelCost === "$$$$" || s.estimatedTravelCost === "$$$")) score -= 12;
    if (modest && s.estimatedTravelCost === "$$")  score += 6;
    if (small  && /Joshua|Marfa|Comporta|Big Sur/.test(s.region)) score += 4;
    return { ...s, fitScore: Math.max(0, Math.min(100, score)) };
  }).sort((a, b) => b.fitScore - a.fitScore);

  return adjusted.slice(0, 5);
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
