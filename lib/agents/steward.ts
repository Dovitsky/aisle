// Steward — rentals agent (PRD §3.2). Builds the inventory from guest count
// + venue type + design direction.

import type Anthropic from "@anthropic-ai/sdk";
import { client, MODELS, hasApiKey } from "../anthropic";
import { Brief, RentalCategory, RentalItem } from "../types";

const CATEGORIES: RentalCategory[] = ["seating", "tables", "linens", "china", "glassware", "flatware", "dance_floor", "lighting", "tent", "heaters", "other"];

const SYSTEM = `You are Steward, AISLE's rentals agent.
Build the rental inventory required for the wedding.

Output JSON only:
{ "items": [
  { "category": "seating"|"tables"|"linens"|"china"|"glassware"|"flatware"|"dance_floor"|"lighting"|"tent"|"heaters"|"other",
    "item": "specific name (e.g., 'Chiavari chair, gold')",
    "quantity": int,
    "unitCost": int USD,
    "notes": "short" }
] }

Coverage:
- Seating: 1 chair per guest + 1 per ceremony seat (allow re-use if venue allows).
- Tables: 1 dinner table per ~8 guests + sweetheart/head table + cake table + welcome table + bar tables.
- Linens: count per table.
- China + glassware + flatware: 1 per guest, plus a service buffer.
- Dance floor sized for ~⅓ of guests at peak.
- Lighting: bistro string strands (count by linear feet) + uplights for each ceremony pillar.
- Tent if outdoor; heaters if shoulder-season.
Quantities should be specific integers, no ranges.`;

export async function stewardPropose(args: { brief: Brief; tableCount?: number }): Promise<Omit<RentalItem, "id">[]> {
  if (!hasApiKey()) return offline(args);

  const userPrompt = `Vibe: ${args.brief.vibe}
Region: ${args.brief.region}
Date window: ${args.brief.dateWindow}
Guest count: ${args.brief.guestCount}
Tables: ${args.tableCount ?? Math.ceil(args.brief.guestCount / 8)}

Build the rental inventory now.`;

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
    const parsed = JSON.parse(json) as { items: unknown[] };
    return (parsed.items ?? []).map(coerce).filter(Boolean) as Omit<RentalItem, "id">[];
  } catch {
    return offline(args);
  }
}

function coerce(raw: unknown): Omit<RentalItem, "id"> | null {
  const r = (raw ?? {}) as Record<string, unknown>;
  if (!CATEGORIES.includes(r.category as RentalCategory)) return null;
  return {
    category: r.category as RentalCategory,
    item: String(r.item ?? ""),
    quantity: Math.max(1, Math.round(Number(r.quantity) || 1)),
    unitCost: Math.max(0, Math.round(Number(r.unitCost) || 0)),
    notes: r.notes ? String(r.notes) : undefined,
  };
}

function offline(..._: unknown[]): Omit<RentalItem, "id">[] { return []; }
