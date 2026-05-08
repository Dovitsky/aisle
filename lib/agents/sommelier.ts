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
    model: MODELS.orchestrator,
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

function offline(..._: unknown[]): BarProgram {
  return { style: "limited", signatureCount: 0, itemMenu: [], estimatedAlcoholBudget: 0, notes: "" };
}
