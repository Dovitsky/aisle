// Cleric — ceremony script writer (PRD §5.4.3 cultural copy variants).
//
// Cleric takes an explicit tradition argument (independent of the brief's
// cultural flag) so couples can curate. Uses the local ritual library as
// both the offline fallback and as a grounding context for the LLM.

import type Anthropic from "@anthropic-ai/sdk";
import { client, MODELS, hasApiKey } from "../anthropic";
import { Brief, CeremonySection, CeremonyTradition } from "../types";
import { DEFAULT_CEREMONIES, getRitual, substituteNames } from "../ceremony/rituals";

interface ClericArgs {
  brief: Brief;
  tradition: CeremonyTradition;
  notes?: string;
}

const SYSTEM = `You are Cleric, AISLE's ceremony-script agent.

You write the spoken script for a wedding ceremony in the requested tradition. You have working
knowledge of: humanist / civil / catholic (with or without nuptial mass) / protestant / orthodox christian
/ jewish / hindu / muslim (nikah) / buddhist / sikh (anand karaj) / quaker / celtic hand-fasting / interfaith blends.

Output JSON only:
{ "sections": [
  { "kind": "welcome"|"reading"|"prayer"|"vows"|"ring_exchange"|"blessing"|"ritual"|"communion"|"pronouncement"|"recessional"|"tribute"|"music_cue",
    "title": "section title",
    "body": "the literal spoken text",
    "reader": "who delivers this line",
    "ritualKey": "optional canonical key from the library" }
] }

Rules:
- Match the requested tradition. If interfaith, name both source traditions in the welcome.
- Use real liturgical / ritual language. Don't write "[insert prayer here]" placeholders — write the actual lines.
- For Catholic, distinguish whether full Mass or outside Mass; default outside Mass unless the couple notes otherwise.
- Use {{organizer}} and {{partner}} placeholders for the couple's names; we'll substitute on render.
- Honor the couple's notes verbatim — if they say "skip kanyadaan" or "include hand-fasting after the vows," do that.
- Keep each section's body 2-12 lines unless the tradition demands more (e.g., Sheva Brachot).
- Do not hallucinate readings from religious texts; quote real verses or use the named blessing as written.`;

export async function clericPropose(args: ClericArgs): Promise<Omit<CeremonySection, "id">[]> {
  if (!hasApiKey()) return offline(args);

  const userPrompt = `Couple: ${args.brief.organizerName} & ${args.brief.partnerName}
Brief cultural flag: ${args.brief.cultural ?? "secular"}
Selected ceremony tradition: ${args.tradition}
Formality: ${args.brief.formalityTone ?? "modern"}
Couple notes: ${args.notes ?? "(none)"}

Write the script now. Tag each section with its tradition: "${args.tradition}".`;

  const resp = await client().messages.create({
    model: MODELS.orchestrator,
    max_tokens: 4000,
    system: SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
  });
  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text).join("\n").trim();
  const json = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    const parsed = JSON.parse(json) as { sections: unknown[] };
    return (parsed.sections ?? []).map((raw) => coerce(raw, args.tradition)).filter(Boolean) as Omit<CeremonySection, "id">[];
  } catch {
    return offline(args);
  }
}

function coerce(raw: unknown, tradition: CeremonyTradition): Omit<CeremonySection, "id"> | null {
  const r = (raw ?? {}) as Record<string, unknown>;
  const valid = ["welcome", "reading", "prayer", "vows", "ring_exchange", "blessing", "ritual", "communion", "pronouncement", "recessional", "tribute", "music_cue"];
  if (!valid.includes(String(r.kind))) return null;
  return {
    kind: r.kind as CeremonySection["kind"],
    title: String(r.title ?? ""),
    body: String(r.body ?? ""),
    reader: r.reader ? String(r.reader) : undefined,
    tradition,
    ritualKey: r.ritualKey ? String(r.ritualKey) : undefined,
  };
}

function offline(..._: unknown[]): Omit<CeremonySection, "id">[] { return []; }
