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
    model: MODELS.specialist,
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

function offline(args: { vendorName: string; category: string }): CounselSummary {
  // A realistic baseline of concerns the legal industry actually flags on
  // wedding vendor contracts — couple-friendly counters drafted plainly.
  return {
    overallRisk: "medium",
    concerns: [
      {
        topic: "Cancellation policy",
        original: "All deposits are non-refundable under any circumstance. Final payment is due 30 days before the event and is also non-refundable.",
        proposed: "Refund the deposit in full if the cancellation is more than 180 days before the event; sliding scale at 90 / 60 / 30 days. If the vendor cancels for any reason, refund 100% within 14 days.",
        rationale: "Industry-standard for higher-end vendors. The vendor's risk decreases as the event approaches; the couple's exposure should mirror that.",
      },
      {
        topic: "Image / usage rights",
        original: "Vendor retains exclusive rights to photographs and may use them for any commercial purpose without notice.",
        proposed: "Couple receives full personal-use rights at delivery. Commercial / portfolio use by vendor allowed but must be opt-in (couple co-signs a separate release) and excludes children's faces.",
        rationale: `Especially relevant for ${args.category}. Couples should always retain personal-use rights and approve any commercial republication.`,
      },
      {
        topic: "Overtime billing",
        original: "Any service beyond the contracted end time is billed at $X / hour, charged in 30-minute increments, paid in cash on-site.",
        proposed: "Overtime authorized in writing by the couple or planner-of-record (named in the contract). 30-minute incremental billing fine; payment due net-15 by invoice, not cash on-site.",
        rationale: "Avoids on-the-night surprises and cash-handling at the venue. Names the planner explicitly so the couple isn't pulled into operational decisions during the event.",
      },
      {
        topic: "Force majeure",
        original: "In the event of a force majeure (defined to include 'any cause beyond reasonable control'), no refund is due.",
        proposed: "Define force majeure narrowly (named perils + government order). For pandemics, weather, or named events: vendor offers either a date change to within 12 months at no extra cost, OR a full refund of the unearned portion of the contract.",
        rationale: "The pandemic taught the industry. Couples need a path that isn't 'lose your money or eat the loss.'",
      },
      {
        topic: "Liability cap",
        original: "Vendor's liability is limited to the amount paid under this contract. Indirect, consequential, or special damages are excluded.",
        proposed: "Liability cap of 1.5× contract value for direct damages caused by vendor negligence (e.g., destroyed dress, missed ceremony due to vendor no-show). Couple maintains event insurance for indirect / consequential.",
        rationale: "Industry-typical caps are too low when the vendor's negligence can ruin a one-time event. Carrying separate event insurance is standard advice.",
      },
    ],
  };
}
