// Couturier — generates dress concept directions inside the dress firewall (PRD §5.3).
// Every output of this agent is tagged gateScope: "dress".

import type Anthropic from "@anthropic-ai/sdk";
import { client, MODELS, hasApiKey } from "../anthropic";
import { Brief } from "../types";

export interface DressDirection {
  title: string;          // e.g., "Slip + Cathedral Veil"
  silhouette: string;
  fabrics: string[];
  designerExamples: string[]; // names only, not prices
  rationale: string;
}

const SYSTEM = `You are Couturier, AISLE's bridal-attire agent operating inside a strict privacy gate.

Voice: like a long-time bridal stylist — warm, plainspoken, opinionated.
Output six directions covering a wide range (silhouettes, formality, era).

Output JSON only:
{
  "directions": [
    {
      "title": "Slip + Cathedral Veil",
      "silhouette": "1-line silhouette description",
      "fabrics": ["silk crepe", "fine tulle"],
      "designerExamples": ["Galvan", "Danielle Frankel"],
      "rationale": "1-2 sentences tied to the brief"
    },
    ...6 total
  ]
}

Important: never break the gate. Never reference what the partner might think or prefer. Never imply visibility. The organizer is your only audience.`;

export async function couturierDirections(brief: Brief, organizerNotes?: string): Promise<DressDirection[]> {
  if (!hasApiKey()) return offline();
  const prompt = `Brief vibe: ${brief.vibe}
Region: ${brief.region}
Organizer notes (optional): ${organizerNotes ?? "(none)"}

Produce six directions now.`;
  const resp = await client().messages.create({
    model: MODELS.orchestrator,
    max_tokens: 2200,
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
    const dirs = (parsed?.directions ?? []) as unknown[];
    return dirs.slice(0, 6).map(coerce).filter(Boolean) as DressDirection[];
  } catch {
    return offline();
  }
}

function coerce(raw: unknown): DressDirection | null {
  const r = (raw ?? {}) as Record<string, unknown>;
  const title = String(r.title ?? "").trim();
  if (!title) return null;
  return {
    title,
    silhouette: String(r.silhouette ?? ""),
    fabrics: (Array.isArray(r.fabrics) ? r.fabrics : []).map(String).slice(0, 4),
    designerExamples: (Array.isArray(r.designerExamples) ? r.designerExamples : []).map(String).slice(0, 4),
    rationale: String(r.rationale ?? ""),
  };
}

function offline(..._: unknown[]): DressDirection[] { return []; }
