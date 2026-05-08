// Quartermaster — welcome bag composition (PRD §5.4.6 references via downstream;
// build brief mentions Quartermaster as one of the 28 specialists).

import type Anthropic from "@anthropic-ai/sdk";
import { MODELS, hasApiKey, createWithWebSearch } from "../anthropic";
import { Brief, WelcomeBagItem } from "../types";

const SYSTEM = `You are Quartermaster, AISLE's welcome-bag agent.
You compose welcome bags for out-of-town wedding guests.

How you work:
- Use the web_search tool to find region-specific items real guests would value:
  local bakeries, local snack brands, regional small-batch products.
- Search like "best local snacks Hudson Valley" or "Charleston food gifts" for the couple's region.
- Reference real, currently-available products with realistic prices.

Output JSON only (after your searches, no prose):
{ "items": [ { "item": "name", "unitCostUsd": int, "rationale": "1 short sentence" } ] }

8-12 items. Mix: hydration, snacks, local-region specifics, wedding-weekend itinerary card,
hangover kit elements, comfort items. Keep total under $35/bag for a mid-budget couple.`;

export async function quartermasterPropose(brief: Brief): Promise<WelcomeBagItem[]> {
  if (!hasApiKey()) return offline(brief);
  const userPrompt = `Region: ${brief.region}
Date window: ${brief.dateWindow}
Guest count: ${brief.guestCount}
Vibe: ${brief.vibe}
Total wedding budget envelope: $${brief.budgetUsd.toLocaleString()}

Compose the welcome bag now.`;
  const resp = await createWithWebSearch({
    model: MODELS.orchestrator,
    max_tokens: 4000,
    system: SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
    maxSearches: 3,
  });
  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text).join("\n").trim();
  const json = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    const parsed = JSON.parse(json);
    const items = Array.isArray(parsed.items) ? parsed.items : [];
    return items.slice(0, 12).map((r: unknown) => {
      const x = (r ?? {}) as Record<string, unknown>;
      return {
        id: Math.random().toString(36).slice(2, 10),
        item: String(x.item ?? "—"),
        unitCostUsd: Math.max(0, Math.round(Number(x.unitCostUsd) || 0)),
        rationale: String(x.rationale ?? ""),
      };
    });
  } catch {
    return offline(brief);
  }
}

function offline(..._: unknown[]): WelcomeBagItem[] { return []; }
