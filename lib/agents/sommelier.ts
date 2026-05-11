// Sommelier — bar program agent (PRD §3.2 Bartending).

import type Anthropic from "@anthropic-ai/sdk";
import { client, MODELS, hasApiKey } from "../anthropic";
import { Brief, BarMenuItem, BarProgram } from "../types";

const SYSTEM = `You are Sommelier, AISLE's bar agent.
Design a bar program for the wedding.

Output JSON only:
{
  "style": "open" | "limited" | "dry" | "beer_wine_only",
  "signatureCount": int 0-3,
  "itemMenu": [
    { "kind": "signature"|"wine"|"beer"|"spirit"|"non_alcoholic",
      "name": "specific drink",
      "description": "1-line",
      "servings": int (estimated for the guest count) }
  ],
  "estimatedAlcoholBudget": int USD,
  "notes": "2-3 sentences with why this works"
}

Defaults: 2 signature cocktails (one named per partner), curated wine list (1 white / 1 red / 1 sparkling), 2 beer options, full spirits if open. Estimate ~1.5 drinks/guest/hour for a 5-hour reception.`;

export async function sommelierPropose(args: { brief: Brief; alcoholBudget?: number }): Promise<BarProgram> {
  if (!hasApiKey()) return offline(args);

  const userPrompt = `Vibe: ${args.brief.vibe}
Guest count: ${args.brief.guestCount}
Total wedding budget: $${args.brief.budgetUsd.toLocaleString()}
${args.alcoholBudget ? `\nAllocated alcohol line: $${args.alcoholBudget}` : ""}

Design the bar now.`;

  const resp = await client().messages.create({
    model: MODELS.specialist,
    max_tokens: 1500,
    system: SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
  });
  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text).join("\n").trim();
  const json = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    const items = Array.isArray(parsed.itemMenu) ? parsed.itemMenu : [];
    return {
      style: (["open", "limited", "dry", "beer_wine_only"] as const).includes(parsed.style as "open")
        ? (parsed.style as "open") : "open",
      signatureCount: Math.max(0, Math.min(3, Number(parsed.signatureCount) || 2)),
      itemMenu: items.map((r: unknown): BarMenuItem => {
        const x = (r ?? {}) as Record<string, unknown>;
        const valid = ["signature", "wine", "beer", "spirit", "non_alcoholic"];
        return {
          id: Math.random().toString(36).slice(2, 10),
          kind: valid.includes(String(x.kind)) ? (x.kind as BarMenuItem["kind"]) : "spirit",
          name: String(x.name ?? ""),
          description: x.description ? String(x.description) : undefined,
          servings: typeof x.servings === "number" ? x.servings : undefined,
        };
      }),
      estimatedAlcoholBudget: Math.round(Number(parsed.estimatedAlcoholBudget) || (args.brief.budgetUsd * 0.1)),
      notes: String(parsed.notes ?? ""),
    };
  } catch {
    return offline(args);
  }
}

function offline(args: { brief: Brief; alcoholBudget?: number }): BarProgram {
  const guests = args.brief.guestCount || 100;
  const budget = args.alcoholBudget ?? Math.round(args.brief.budgetUsd * 0.06);
  const v = (args.brief.vibe || "").toLowerCase();
  const moody = /candlelit|moody|editorial|black\s*tie/.test(v);
  const id = () => Math.random().toString(36).slice(2, 10);
  return {
    style: "open",
    signatureCount: 2,
    itemMenu: [
      { id: id(), kind: "wine",          name: "Sparkling — Crémant de Loire",                                                                      description: "Toast service + cocktail hour. Drier than Prosecco." },
      { id: id(), kind: "wine",          name: "White — Sancerre or Albariño",                                                                       description: `Crisp food-friendly white for ${guests} guests.` },
      { id: id(), kind: "wine",          name: "Red — Pinot Noir, Sonoma Coast",                                                                     description: "Light-medium body; pairs across the menu." },
      { id: id(), kind: "wine",          name: "Dessert — Sauternes (half bottles)",                                                                description: "Optional cake pour. Budget for 1 half-bottle / 10 guests." },
      { id: id(), kind: "beer",          name: "Local IPA + Pilsner (kegs)",                                                                          description: "Two-tap mobile setup; reduces glassware load." },
      { id: id(), kind: "spirit",        name: "Vodka — Grey Goose",                                                                                  description: "Workhorse for both signature cocktails." },
      { id: id(), kind: "spirit",        name: "Gin — Hendrick's",                                                                                    description: "For cucumber G&T on the rotation." },
      { id: id(), kind: "spirit",        name: "Bourbon — Buffalo Trace",                                                                             description: "Old-fashioneds + whiskey-Coke for the late set." },
      { id: id(), kind: "signature",     name: moody ? "Smoked Old Fashioned"           : "French 75 with Elderflower",                              description: moody ? "Set the tone; smoked at the bar with applewood." : "Bright and easy; pairs with first hour of dancing." },
      { id: id(), kind: "signature",     name: moody ? "Boulevardier"                  : "Cucumber Spritz",                                          description: moody ? "Bittersweet alternative for the second hour."   : "Lower-ABV option; popular with non-spirit drinkers." },
      { id: id(), kind: "non_alcoholic", name: "Sparkling water + still water",                                                                       description: "Always free, always cold, always visible." },
      { id: id(), kind: "non_alcoholic", name: "House non-alc spritz (Lyre's + tonic)",                                                              description: "Celebratory option for non-drinkers and pregnant guests." },
      { id: id(), kind: "non_alcoholic", name: "Espresso bar (after dinner)",                                                                         description: "9pm coffee + biscotti station; pre-empts the energy dip." },
    ],
    estimatedAlcoholBudget: budget,
    notes: `Estimated ${Math.round(guests * 1.5)} drinks served (1.5/guest avg). Bar staffed at 1:60. Ice budget: ${Math.round(guests * 1.25)} lb. Last call 30 min before scheduled exit.`,
  };
}
