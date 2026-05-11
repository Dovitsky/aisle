// Patissier — cake & dessert agent (PRD §3.2).

import type Anthropic from "@anthropic-ai/sdk";
import { client, MODELS, hasApiKey } from "../anthropic";
import { ALLERGEN_CODES, AllergenCode, Brief, CakeSpec } from "../types";

const SYSTEM = `You are Patissier, AISLE's cake & dessert agent.
Design a wedding cake spec.

Output JSON only:
{ "tiers": int 2-5, "flavors": ["per-tier flavor"], "fillings": ["per-tier filling"],
  "frostingStyle": "1 line", "decorationNotes": "1-2 sentences",
  "servings": int (compute from guest count + 10% buffer),
  "allergens": ["peanut" | "tree_nut" | "shellfish" | "fish" | "dairy" | "gluten" | "egg" | "soy" | "sesame" | "sulfites" | "mustard" | "celery" | "lupin" | "molluscs"],
  "allergenNotes": "free-text notes for the baker (cross-contamination, optional substitutions, etc.)" }

Match the brief's vibe and formality. Real flavors and frostings, not placeholders.
Every wedding cake almost certainly contains dairy, gluten, and egg unless explicitly substituted — include those in the allergens array unless the spec is vegan/GF.
If a flavor name implies an allergen (almond, hazelnut, pistachio → tree_nut; peanut → peanut), include it.`;

export async function patissierPropose(args: { brief: Brief }): Promise<Omit<CakeSpec, "id" | "vendorId" | "approved">> {
  if (!hasApiKey()) return offline(args);

  const userPrompt = `Vibe: ${args.brief.vibe}
Cultural: ${args.brief.cultural ?? "secular"}
Formality: ${args.brief.formalityTone ?? "modern"}
Guest count: ${args.brief.guestCount}

Design the cake now.`;

  const resp = await client().messages.create({
    model: MODELS.specialist,
    max_tokens: 1200,
    system: SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
  });
  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text).join("\n").trim();
  const json = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    const allergens = (Array.isArray(parsed.allergens) ? parsed.allergens : [])
      .map(String)
      .filter((a): a is AllergenCode => (ALLERGEN_CODES as readonly string[]).includes(a));
    return {
      tiers: Math.max(1, Math.min(5, Number(parsed.tiers) || 3)),
      flavors: (Array.isArray(parsed.flavors) ? parsed.flavors : []).map(String),
      fillings: (Array.isArray(parsed.fillings) ? parsed.fillings : []).map(String),
      frostingStyle: String(parsed.frostingStyle ?? "Italian buttercream"),
      decorationNotes: String(parsed.decorationNotes ?? ""),
      servings: Math.round(Number(parsed.servings) || args.brief.guestCount * 1.1),
      allergens: allergens.length ? allergens : inferAllergens([
        ...(Array.isArray(parsed.flavors) ? parsed.flavors.map(String) : []),
        ...(Array.isArray(parsed.fillings) ? parsed.fillings.map(String) : []),
        String(parsed.frostingStyle ?? ""),
      ]),
      allergenNotes: String(parsed.allergenNotes ?? ""),
    };
  } catch {
    return offline(args);
  }
}

// Infer allergens from free-text flavor / filling / frosting strings.
// Conservative — adds dairy + gluten + egg by default unless words exclude them.
export function inferAllergens(parts: string[]): AllergenCode[] {
  const text = parts.join(" ").toLowerCase();
  const out = new Set<AllergenCode>();

  const isVegan = /\bvegan\b/.test(text);
  const isGf = /gluten.?free|\bgf\b/.test(text);

  if (!isVegan) { out.add("dairy"); out.add("egg"); }
  if (!isGf) { out.add("gluten"); }

  if (/almond|hazelnut|pistachio|walnut|pecan|cashew|brazil nut|macadamia|tree nut/.test(text)) out.add("tree_nut");
  if (/\bpeanut/.test(text)) out.add("peanut");
  if (/sesame|tahini/.test(text)) out.add("sesame");
  if (/\bsoy\b/.test(text)) out.add("soy");

  return [...out];
}

function offline(args: { brief: Brief }): Omit<CakeSpec, "id" | "vendorId" | "approved"> {
  const guests = args.brief.guestCount || 100;
  const v = (args.brief.vibe || "").toLowerCase();
  const moody = /candlelit|moody|editorial|deep|jewel|noir|black\s*tie/.test(v);
  const garden = /garden|wildflower|botanical|barn|farm|rustic/.test(v);
  const tiers = guests >= 200 ? 5 : guests >= 120 ? 4 : guests >= 60 ? 3 : 2;
  const flavors = moody
    ? ["Chocolate stout (top)", "Salted caramel hazelnut", "Vanilla bean with raspberry"]
    : garden
    ? ["Lemon elderflower (top)", "Vanilla bean with strawberry", "Almond olive oil"]
    : ["Vanilla bean (top)", "Lemon raspberry", "Chocolate ganache"];
  const fillings = moody
    ? ["Stout buttercream", "Salted caramel + toasted hazelnut", "Raspberry conserve + Italian buttercream"]
    : garden
    ? ["Elderflower cream", "Macerated strawberry + crème fraîche", "Almond cream"]
    : ["Vanilla pastry cream", "Raspberry preserves", "Dark chocolate ganache"];
  const frostingStyle = garden
    ? "Soft-swirl Italian buttercream, off-white"
    : moody
    ? "Smooth Italian buttercream in deep ivory with restrained piping"
    : "Smooth Italian buttercream in ivory";
  const decorationNotes = garden
    ? "Fresh seasonal blooms applied morning-of (food-safe varieties only); cascading down one side."
    : moody
    ? "Single asymmetric drape of fresh oxblood-toned florals; dark wax seal accent."
    : "Hand-piped soft scallops with a small cluster of fresh garden roses on the top tier.";
  const allergens = inferAllergens(flavors.slice(0, tiers).concat(fillings.slice(0, tiers), frostingStyle));
  return {
    tiers,
    flavors: flavors.slice(0, tiers),
    fillings: fillings.slice(0, tiers),
    frostingStyle,
    decorationNotes,
    servings: Math.round(guests * 1.1),
    allergens,
    allergenNotes: "Cross-contamination protocol required; tree-nut and peanut prep stations must be separated from this cake.",
  };
}
