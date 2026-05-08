// Treasurer — proposes a budget allocation against a brief and watches variance.
// Builds an industry-standard percentage allocation, then adapts to the vibe.

import type Anthropic from "@anthropic-ai/sdk";
import { client, MODELS, hasApiKey } from "../anthropic";
import { Brief, BudgetLine } from "../types";

export interface BudgetProposal {
  lines: { category: string; planUsd: number; rationale: string }[];
  total: number;
}

const SYSTEM = `You are Treasurer, AISLE's budget agent.
Given a couple's brief, propose an allocation across the standard wedding categories.

Categories to cover: Venue, Catering, Photographer, Florist, Music (Band/DJ), Stationery, Attire, Hair & Makeup, Rentals, Transportation, Officiant, Cake, Videographer, Welcome bags, Tips & service charges, Contingency.

Output JSON only:
{
  "lines": [
    { "category": "Venue", "planUsd": 25000, "rationale": "one short sentence tied to the brief" },
    ...
  ]
}

Rules:
- Sum of planUsd MUST equal the brief budget exactly. Adjust the largest line to absorb rounding.
- Keep contingency at 5-8% of total.
- Adjust based on vibe: editorial photography → larger photo line; intimate dinner → smaller music line; destination → larger transportation line.
- Use realistic absolute numbers, not just percentages.`;

export async function treasurerProposal(brief: Brief): Promise<BudgetProposal> {
  if (!hasApiKey()) return offline(brief);

  const prompt = `Brief:
- Region: ${brief.region}
- Date window: ${brief.dateWindow}
- Guest count: ${brief.guestCount}
- Total budget: $${brief.budgetUsd.toLocaleString()}
- Vibe: ${brief.vibe}
- Planner: ${brief.plannerStatus}

Produce the allocation now.`;

  const resp = await client().messages.create({
    model: MODELS.orchestrator,
    max_tokens: 2000,
    system: SYSTEM,
    messages: [{ role: "user", content: prompt }],
  });
  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n").trim();
  const json = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    const parsed = JSON.parse(json);
    return coerce(parsed, brief.budgetUsd);
  } catch {
    return offline(brief);
  }
}

function coerce(raw: unknown, target: number): BudgetProposal {
  const r = (raw ?? {}) as Record<string, unknown>;
  const lines = Array.isArray(r.lines) ? r.lines : [];
  const out = lines.map((l) => {
    const x = (l ?? {}) as Record<string, unknown>;
    return {
      category: String(x.category ?? "Other"),
      planUsd: Math.max(0, Math.round(Number(x.planUsd) || 0)),
      rationale: String(x.rationale ?? ""),
    };
  });
  // Force exact sum.
  const sum = out.reduce((s, l) => s + l.planUsd, 0);
  if (sum !== target && out.length) {
    const diff = target - sum;
    const largest = out.reduce((a, b) => (a.planUsd >= b.planUsd ? a : b));
    largest.planUsd = Math.max(0, largest.planUsd + diff);
  }
  return { lines: out, total: target };
}

function offline(..._: unknown[]): BudgetProposal { return { lines: [], total: 0 }; }


export function assertBudgetInvariant(lines: BudgetLine[]): { ok: boolean; violation?: string } {
  for (const l of lines) {
    if (l.committedUsd > l.planUsd) {
      return { ok: false, violation: `${l.category} committed ($${l.committedUsd}) exceeds plan ($${l.planUsd}).` };
    }
    if (l.paidUsd > l.committedUsd) {
      return { ok: false, violation: `${l.category} paid ($${l.paidUsd}) exceeds committed ($${l.committedUsd}).` };
    }
  }
  return { ok: true };
}
