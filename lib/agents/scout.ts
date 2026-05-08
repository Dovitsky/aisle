// Scout — discovery & shortlisting specialist (PRD §4.2).
// Produces a ranked shortlist for a vendor category against the brief.
// Output is surfaced as Approval Cards via Maestro.
//
// Live mode (default when ANTHROPIC_API_KEY is set): Scout uses Anthropic's
// built-in `web_search` server tool to find real, currently-operating vendors
// in the couple's region. Falls back to the offline seed list otherwise.

import type Anthropic from "@anthropic-ai/sdk";
import { MODELS, hasApiKey, createWithWebSearch } from "../anthropic";
import { Brief, VendorShortlistItem } from "../types";

const SYSTEM = `You are Scout, the discovery agent inside AISLE.
You produce ranked vendor shortlists for a given category against a couple's brief.

How you work:
- Use the web_search tool to find real, currently-operating vendors in the couple's region.
- Run 1-3 targeted searches (e.g., "wedding photographers Hudson Valley", "barn wedding venues Catskills 150 guests").
- Read the results. Pull real business names, real cities. Cross-check by searching the vendor's own site if useful.

Constraints:
- Only include vendors whose websites you actually saw in search results. No invented names.
- Never copy contact details (no phone numbers, no email addresses, no street addresses) — Outreach handles contacting later.
- Each item gets a fitScore (0-100) and one short paragraph of notes citing specific reasons grounded in the brief.
- Honor the budget bracket: if the budget is modest, do not propose top-of-market vendors.

OUTPUT RULES (CRITICAL):
- After your searches, your final assistant message must END with a single JSON array — no trailing prose.
- The JSON array is the LAST thing in your output. Wrap it in a \`\`\`json fenced block.
- No commentary AFTER the JSON. Citations BEFORE the JSON are fine.`;

export async function scoutShortlist(args: {
  brief: Brief;
  category: string;
  count?: number;
}): Promise<VendorShortlistItem[]> {
  const count = args.count ?? 5;

  if (!hasApiKey()) {
    return offlineShortlist(args.brief, args.category, count);
  }

  const userPrompt = `Brief:
- Organizer: ${args.brief.organizerName}
- Partner: ${args.brief.partnerName}
- Region: ${args.brief.region}
- Date window: ${args.brief.dateWindow}
- Guest count: ${args.brief.guestCount}
- Budget envelope (total wedding): $${args.brief.budgetUsd.toLocaleString()}
- Vibe: ${args.brief.vibe}

Category to shortlist: ${args.category}
Number of results: ${count}

Return a JSON array of ${count} items with this exact shape:
[
  {
    "name": "string",
    "city": "string",
    "fitScore": 0-100 integer,
    "priceBracket": "$" | "$$" | "$$$" | "$$$$",
    "notes": "1-2 sentence rationale tied to the brief"
  }
]`;

  const resp = await createWithWebSearch({
    model: MODELS.orchestrator,
    max_tokens: 4000,
    system: SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
    maxSearches: 4,
  });

  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  const json = stripJsonFences(text);
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) throw new Error("not an array");
    return parsed.slice(0, count).map(coerceItem);
  } catch {
    // Fall back to offline data so the demo never breaks.
    return offlineShortlist(args.brief, args.category, count);
  }
}

// Pull the first JSON array out of arbitrary model output, even when prose
// or web-search citations surround it.
function stripJsonFences(s: string): string {
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

function coerceItem(raw: unknown): VendorShortlistItem {
  const r = (raw ?? {}) as Record<string, unknown>;
  const bracket = (r.priceBracket as string) ?? "$$";
  const validBracket = ["$", "$$", "$$$", "$$$$"].includes(bracket)
    ? (bracket as VendorShortlistItem["priceBracket"])
    : "$$";
  return {
    name: String(r.name ?? "Unnamed vendor"),
    city: String(r.city ?? "—"),
    fitScore: Math.max(0, Math.min(100, Math.round(Number(r.fitScore) || 0))),
    priceBracket: validBracket,
    notes: String(r.notes ?? ""),
  };
}

function offlineShortlist(..._: unknown[]): VendorShortlistItem[] { return []; }
