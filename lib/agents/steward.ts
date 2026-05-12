// Steward. rentals agent (PRD §3.2). Builds the inventory from guest count
// + venue type + design direction.

import type Anthropic from "@anthropic-ai/sdk";
import { client, MODELS, hasApiKey } from "../anthropic";
import { Brief, RentalCategory, RentalItem } from "../types";

const CATEGORIES: RentalCategory[] = ["seating", "tables", "linens", "china", "glassware", "flatware", "dance_floor", "lighting", "tent", "heaters", "other"];

const SYSTEM = `You are Steward, Corsia's rentals agent.
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

function offline(args: { brief: Brief; tableCount?: number }): Omit<RentalItem, "id">[] {
  const guests = args.brief.guestCount || 100;
  const tables = args.tableCount ?? Math.ceil(guests / 8);
  const buffer = Math.ceil(guests * 0.1);
  return [
    { category: "seating",     item: "Chiavari chair, ivory",          quantity: guests,             unitCost: 11, notes: "Reception. Reuse for ceremony if venue permits." },
    { category: "seating",     item: "Folding chair, white wood",      quantity: guests,             unitCost: 6,  notes: "Ceremony only. saves a flip if reception is in a separate space." },
    { category: "tables",      item: "Round dinner table, 60in",       quantity: tables,             unitCost: 14, notes: "Seats 8 each." },
    { category: "tables",      item: "Sweetheart table, 48in",         quantity: 1,                  unitCost: 14, notes: "Couple's table." },
    { category: "tables",      item: "Cocktail high-top",              quantity: Math.ceil(guests / 20), unitCost: 18, notes: "Cocktail hour." },
    { category: "tables",      item: "Cake / dessert table",           quantity: 1,                  unitCost: 14, notes: "Display." },
    { category: "tables",      item: "Welcome / escort table",         quantity: 1,                  unitCost: 14, notes: "Place cards + welcome book." },
    { category: "linens",      item: "Linen tablecloth, ivory",        quantity: tables + 4,          unitCost: 18, notes: "Includes spares for bar/cake/welcome." },
    { category: "linens",      item: "Linen napkin, sage",             quantity: guests + buffer,    unitCost: 1.5, notes: "Service buffer included." },
    { category: "china",       item: "Coupe dinner plate, off-white",  quantity: guests + buffer,    unitCost: 1.2, notes: "" },
    { category: "china",       item: "Salad / appetizer plate",        quantity: guests + buffer,    unitCost: 0.9, notes: "" },
    { category: "china",       item: "Bread plate",                    quantity: guests,             unitCost: 0.7, notes: "" },
    { category: "glassware",   item: "Wine glass, stemmed",            quantity: guests * 2,         unitCost: 0.8, notes: "Two per guest for service rotation." },
    { category: "glassware",   item: "Champagne flute",                quantity: guests + buffer,    unitCost: 0.7, notes: "Toasts." },
    { category: "glassware",   item: "Water goblet",                   quantity: guests + buffer,    unitCost: 0.6, notes: "" },
    { category: "flatware",    item: "Salad fork",                     quantity: guests + buffer,    unitCost: 0.5, notes: "" },
    { category: "flatware",    item: "Dinner fork",                    quantity: guests + buffer,    unitCost: 0.5, notes: "" },
    { category: "flatware",    item: "Dinner knife",                   quantity: guests + buffer,    unitCost: 0.5, notes: "" },
    { category: "flatware",    item: "Dessert fork",                   quantity: guests + buffer,    unitCost: 0.5, notes: "" },
    { category: "dance_floor", item: "Wood parquet dance floor",       quantity: 1,                  unitCost: 800, notes: `Sized for ~${Math.round(guests / 3)} dancers at peak.` },
    { category: "lighting",    item: "Bistro string lights, 25ft",     quantity: 12,                 unitCost: 35, notes: "Tent or pergola coverage." },
    { category: "lighting",    item: "Uplight, warm white",            quantity: 8,                  unitCost: 45, notes: "Architectural pillars + ceremony arch." },
    { category: "tent",        item: "Pole tent, 40x60",               quantity: 1,                  unitCost: 2400, notes: "Backup / covered reception." },
    { category: "heaters",     item: "Patio heater, propane",          quantity: 4,                  unitCost: 95, notes: "Cocktail hour exterior." },
    { category: "other",       item: "Bar back inventory + ice",       quantity: 1,                  unitCost: 250, notes: "Per Sommelier program; 1.25 lb ice / guest." },
  ];
}
