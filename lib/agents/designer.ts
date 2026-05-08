// Designer — generates mood board concepts and color palettes (PRD §4.2).
// v0 returns named directions with palette swatches; real build calls image gen.

import type Anthropic from "@anthropic-ai/sdk";
import { client, MODELS, hasApiKey } from "../anthropic";
import { Brief } from "../types";

export interface MoodDirection {
  title: string;
  description: string;
  palette: string[];   // 5 hex colors
  refs: string[];      // 4 short reference labels
}

const SYSTEM = `You are Designer, AISLE's visual direction agent.
Given a brief, produce SIX distinct mood-board directions.

Each direction is one coherent aesthetic (not a "best of"). Differ in formality, density, color, and cultural reference.

Output JSON only:
{
  "directions": [
    {
      "title": "Editorial Provence",
      "description": "1-2 sentences naming the feel and the references.",
      "palette": ["#A8896C", ...],   // exactly 5 hex colors that work together as a wedding palette
      "refs": ["sun-faded linen", "pressed olive branches", "raw stone walls", "candlelit long tables"]   // 4 short noun-phrase references
    },
    ...6 total
  ]
}

Constraints: no orange/teal/gen-z palettes. No "boho" — that word is exhausted. Palettes should look like adults could live in them.`;

export async function designerDirections(brief: Brief): Promise<MoodDirection[]> {
  if (!hasApiKey()) return offline();
  const prompt = `Brief vibe: ${brief.vibe}
Region: ${brief.region}
Date window: ${brief.dateWindow}
Guest count: ${brief.guestCount}

Produce six directions now.`;
  const resp = await client().messages.create({
    model: MODELS.orchestrator,
    max_tokens: 2500,
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
    return dirs.slice(0, 6).map(coerce).filter(Boolean) as MoodDirection[];
  } catch {
    return offline();
  }
}

function coerce(raw: unknown): MoodDirection | null {
  const r = (raw ?? {}) as Record<string, unknown>;
  const palette = Array.isArray(r.palette) ? (r.palette as unknown[]).map(String).slice(0, 5) : [];
  if (palette.length < 3) return null;
  return {
    title: String(r.title ?? "Untitled"),
    description: String(r.description ?? ""),
    palette,
    refs: (Array.isArray(r.refs) ? r.refs : []).map(String).slice(0, 4),
  };
}

function offline(..._: unknown[]): { title: string; description: string; palette: string[]; refs: string[] }[] { return []; }
