// Counsel — produces a plain-English contract redline summary (PRD §5.2 step 6).
// Highlights cancellation, image rights, overtime billing, force majeure.

import type Anthropic from "@anthropic-ai/sdk";
import { client, MODELS, hasApiKey } from "../anthropic";

export interface CounselSummary {
  concerns: { topic: string; original: string; proposed: string; rationale: string }[];
  overallRisk: "low" | "medium" | "high";
}

const SYSTEM = `You are Counsel, AISLE's contract review agent.
You produce plain-English redline proposals against a vendor contract.

Output JSON only:
{
  "overallRisk": "low" | "medium" | "high",
  "concerns": [
    { "topic": "Cancellation", "original": "verbatim clause excerpt", "proposed": "couple-friendly rewrite", "rationale": "one sentence" },
    ...
  ]
}

At least include cancellation, image/usage rights, and overtime/extension. Limit to 5 concerns total.
Use real wedding-industry contract language. No legalese in rationale — speak to the couple.`;

export async function counselReview(args: {
  vendorName: string;
  category: string;
  contractText?: string;
}): Promise<CounselSummary> {
  if (!hasApiKey()) return offline(args);

  const userPrompt = `Vendor: ${args.vendorName} (${args.category})
${args.contractText ? `Contract:\n${args.contractText}` : "No contract text supplied — synthesize a typical contract for this category and produce concerns against it."}`;

  const resp = await client().messages.create({
    model: MODELS.orchestrator,
    max_tokens: 1500,
    system: SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
  });
  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n").trim();
  const json = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    const parsed = JSON.parse(json);
    return coerce(parsed);
  } catch {
    return offline(args);
  }
}

function coerce(raw: unknown): CounselSummary {
  const r = (raw ?? {}) as Record<string, unknown>;
  const risk = ["low", "medium", "high"].includes(r.overallRisk as string)
    ? (r.overallRisk as CounselSummary["overallRisk"])
    : "medium";
  const concerns = Array.isArray(r.concerns) ? r.concerns.slice(0, 5) : [];
  return {
    overallRisk: risk,
    concerns: concerns.map((c) => {
      const x = (c ?? {}) as Record<string, unknown>;
      return {
        topic: String(x.topic ?? "Concern"),
        original: String(x.original ?? ""),
        proposed: String(x.proposed ?? ""),
        rationale: String(x.rationale ?? ""),
      };
    }),
  };
}

function offline(..._: unknown[]): CounselSummary { return { overallRisk: "medium", concerns: [] }; }
