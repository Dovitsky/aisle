// Concierge — Engagement Studio agent (PRD §10.2 — flagged as the most exposed
// product surface). Helps couples plan the ring, the proposal, the engagement
// photoshoot, and the announcement, before the brief is ever locked.

import type Anthropic from "@anthropic-ai/sdk";
import { MODELS, hasApiKey, createWithWebSearch } from "../anthropic";
import { EngagementMilestone } from "../types";

export interface EngagementProposal {
  milestones: Omit<EngagementMilestone, "id">[];
}

const SYSTEM = `You are Concierge, AISLE's pre-engagement agent.
You propose a sequence of engagement milestones for a couple just starting out.

How you work:
- Use the web_search tool to ground recommendations: which jewelers ship recycled platinum,
  which engagement photographers are working in the couple's city, current proposal-spot lists.
- Reference real businesses you saw in search results.

Output JSON only (after your searches, no prose):
{ "milestones": [
  { "kind": "ring" | "proposal_plan" | "engagement_photos" | "announcement" | "engagement_party",
    "title": "1-line title",
    "description": "1-2 sentence specific suggestion",
    "status": "idea" }
] }

Cover all five kinds. Be specific. No clichés.`;

export async function conciergePropose(args: { context: string }): Promise<EngagementProposal> {
  if (!hasApiKey()) return offline();
  const resp = await createWithWebSearch({
    model: MODELS.orchestrator,
    max_tokens: 4000,
    system: SYSTEM,
    messages: [{ role: "user", content: `Context: ${args.context}\n\nProduce the milestones now.` }],
    maxSearches: 4,
  });
  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text).join("\n").trim();
  const json = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    const parsed = JSON.parse(json);
    const ms = (Array.isArray(parsed.milestones) ? parsed.milestones : []).map((m: unknown) => {
      const x = (m ?? {}) as Record<string, unknown>;
      const validKinds = ["ring", "proposal_plan", "engagement_photos", "announcement", "engagement_party"];
      const kind = validKinds.includes(String(x.kind)) ? (x.kind as EngagementMilestone["kind"]) : "ring";
      return {
        kind,
        title: String(x.title ?? ""),
        description: String(x.description ?? ""),
        status: "idea" as const,
      };
    });
    return { milestones: ms.slice(0, 5) };
  } catch {
    return offline();
  }
}

function offline(..._: unknown[]): EngagementProposal { return { milestones: [] }; }
