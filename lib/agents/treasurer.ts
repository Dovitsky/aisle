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
    model: MODELS.specialist,
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

// Offline allocation — apply industry-standard percentage splits so the
// /budget page is populated and Treasurer's invariants are exercised even
// without an API key. Percentages mirror Knot/WeddingWire averages and the
// guidance in the build brief; sum is forced to brief.budgetUsd exactly.
function offline(brief?: Brief): BudgetProposal {
  if (!brief || !brief.budgetUsd) return { lines: [], total: 0 };
  const T = brief.budgetUsd;
  const guests = brief.guestCount || 100;
  const splits: { category: string; pct: number; rationale: string }[] = [
    { category: "Venue",         pct: 0.30, rationale: `Venue + site fee (~30% of envelope) for ~${guests} guests in ${brief.region}.` },
    { category: "Catering",      pct: 0.22, rationale: `Catering at ~$${Math.round((T * 0.22) / guests)}/guest for ${guests} headcount.` },
    { category: "Photography",   pct: 0.10, rationale: `Editorial photography for the full day.` },
    { category: "Florals",       pct: 0.08, rationale: `Ceremony arch, aisle, centerpieces, bouquets, boutonnières.` },
    { category: "Music",         pct: 0.06, rationale: `Ceremony cues + cocktail + reception band/DJ.` },
    { category: "Attire",        pct: 0.05, rationale: `Both partners' attire + alterations.` },
    { category: "Stationery",    pct: 0.03, rationale: `Save-the-dates, invitations, day-of paper goods.` },
    { category: "Hair & Makeup", pct: 0.03, rationale: `On-site team for both partners + wedding party.` },
    { category: "Cake",          pct: 0.02, rationale: `Tiered cake or dessert table for ${guests}.` },
    { category: "Transportation",pct: 0.02, rationale: `Shuttles between hotel block and venue.` },
    { category: "Rentals",       pct: 0.04, rationale: `Tables, chairs, linens, glassware beyond venue inventory.` },
    { category: "Beauty",        pct: 0.01, rationale: `Skin and hair prep in the weeks before.` },
    { category: "Officiant",     pct: 0.01, rationale: `Officiant or celebrant fee.` },
    { category: "Misc",          pct: 0.03, rationale: `Tips, marriage license, welcome bags, contingency.` },
  ];
  const lines = splits.map((s) => ({
    category: s.category,
    planUsd: Math.round(T * s.pct),
    rationale: s.rationale,
  }));
  // Force exact sum (rounding drift).
  const sum = lines.reduce((a, l) => a + l.planUsd, 0);
  if (sum !== T && lines.length) {
    const largest = lines.reduce((a, b) => (a.planUsd >= b.planUsd ? a : b));
    largest.planUsd = Math.max(0, largest.planUsd + (T - sum));
  }
  return { lines, total: T };
}


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
