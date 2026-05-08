// Curator — registry agent (PRD §3.2 phase 9; build brief implies via Treasurer adjacency).

import type Anthropic from "@anthropic-ai/sdk";
import { MODELS, hasApiKey, createWithWebSearch } from "../anthropic";
import { Brief, RegistryItem } from "../types";

const SYSTEM = `You are Curator, AISLE's registry agent.
Propose a registry of 12-18 items spanning kitchen, bedroom, bath, dining,
experience funds, cash funds, and at least one charity option.

How you work:
- Use the web_search tool to verify the products are currently sold and prices are recent.
- Search like "Heath Ceramics dinner plates 2026 price" or "best linen sheets queen 2026".
- Reference real brands (Le Creuset, Heath, Parachute, etc.) at real current prices.

Output JSON only (after your searches, no prose):
{ "items": [
  { "item": "name", "vendor": "vendor name", "priceUsd": int,
    "category": "kitchen" | "bedroom" | "bath" | "dining" | "experience" | "cash_fund" | "charity" | "other" }
] }

Spread price across $40-$800. Real, specific, livable. No "personalized cutting board with the wedding date".`;

export async function curatorPropose(brief: Brief): Promise<Omit<RegistryItem, "id">[]> {
  if (!hasApiKey()) return offline();
  const resp = await createWithWebSearch({
    model: MODELS.orchestrator,
    max_tokens: 4000,
    system: SYSTEM,
    messages: [{ role: "user", content: `Couple vibe: ${brief.vibe}\nGuest count: ${brief.guestCount}\n\nPropose the registry now.` }],
    maxSearches: 4,
  });
  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text).join("\n").trim();
  const json = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    const parsed = JSON.parse(json);
    const items = Array.isArray(parsed.items) ? parsed.items : [];
    return items.slice(0, 18).map((r: unknown) => {
      const x = (r ?? {}) as Record<string, unknown>;
      const validCats = ["kitchen", "bedroom", "bath", "dining", "experience", "cash_fund", "charity", "other"];
      const category = validCats.includes(String(x.category)) ? (x.category as RegistryItem["category"]) : "other";
      return {
        item: String(x.item ?? ""),
        vendor: String(x.vendor ?? ""),
        priceUsd: Math.max(0, Math.round(Number(x.priceUsd) || 0)),
        category,
        status: "wanted" as const,
      };
    });
  } catch {
    return offline();
  }
}

function offline(..._: unknown[]): Omit<RegistryItem, "id">[] { return []; }
