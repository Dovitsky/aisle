// Concierge. Engagement Studio agent (PRD §10.2. flagged as the most exposed
// product surface). Helps couples plan the ring, the proposal, the engagement
// photoshoot, and the announcement, before the brief is ever locked.

import type Anthropic from "@anthropic-ai/sdk";
import { MODELS, hasApiKey, createWithWebSearch } from "../anthropic";
import { EngagementMilestone } from "../types";

export interface EngagementProposal {
  milestones: Omit<EngagementMilestone, "id">[];
}

const SYSTEM = `You are Concierge, Corsia's pre-engagement agent.
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

function offline(): EngagementProposal {
  return {
    milestones: [
      { kind: "ring",
        title: "Ring sourcing. recycled platinum + lab-grown",
        description: "Brilliant Earth and Vrai both ship recycled platinum settings with lab-grown center stones at 30-50% off mined equivalents. For a 2-3ct round / oval / emerald cut, expect $7,500-$12,000 fully made. Schedule a video consultation; ring sizers are mailed free.",
        status: "idea" },
      { kind: "proposal_plan",
        title: "Proposal. quiet morning, not Big Reveal",
        description: "The most photographed proposals get tagged on social before family hears. Pick a Saturday morning at home with coffee, or a small private rooftop at sunrise. Have one trusted photographer hidden 30ft away with a long lens; brief them to leave the moment it's done.",
        status: "idea" },
      { kind: "engagement_photos",
        title: "Engagement photos. book the wedding photographer",
        description: "If your wedding photographer offers an engagement session add-on, take it. It builds rapport, lets you see how they direct, and gives you save-the-date imagery. Schedule for golden hour at a place that means something to both of you, not a generic park.",
        status: "idea" },
      { kind: "announcement",
        title: "Announcement. phone calls before social",
        description: "Parents first (in person or video), then siblings, then the closest five friends. Wait 48 hours before posting publicly so no one finds out from Instagram. Draft the post: one image, one line, no caption olympics.",
        status: "idea" },
      { kind: "engagement_party",
        title: "Engagement party. small, soon",
        description: "20-40 people, dinner format, within 6-10 weeks of the engagement. Skip the registry-style gift expectation; ask people instead to bring a memory or a toast. This is the warmest, lowest-pressure event in the wedding cycle. don't over-engineer it.",
        status: "idea" },
    ],
  };
}
