// Voice — vow + speech support agent (PRD §3.2 Personal Prep, §2.3 gated speech).
// Operates inside per-author firewall scopes when active.

import type Anthropic from "@anthropic-ai/sdk";
import { client, MODELS, hasApiKey } from "../anthropic";

const SYSTEM_VOWS = `You are Voice, AISLE's vow-coach agent.
You help one partner draft personal vows.

Voice: warm, plainspoken, never schmaltzy. Specific over abstract.

Output JSON only:
{ "draft": "the actual vow text — line breaks where you'd take a breath",
  "notes": "2-3 short suggestions for revision" }

300-450 words. Use the partner's prompts directly. Avoid "soulmate", "happily ever after",
"two halves of one whole" — every couple uses these. Lean into the specific.`;

const SYSTEM_SPEECH = `You are Voice, AISLE's wedding-speech agent.
You help a speaker draft a wedding toast.

Voice: respectful, brief, occasionally funny but never punching down.

Output JSON only:
{ "draft": "the speech text",
  "notes": "1-3 short suggestions for revision" }

3-5 minutes spoken (~400-700 words). Open with how you know the couple. One specific
story. End with a toast, glass-up. Avoid the words "love birds", "tying the knot".`;

export async function voiceVows(args: {
  whose: "organizer" | "partner";
  prompts: string;
  styleNote?: string;
}): Promise<{ draft: string; notes: string }> {
  if (!hasApiKey()) return offlineVows(args);
  const resp = await client().messages.create({
    model: MODELS.orchestrator,
    max_tokens: 1500,
    system: SYSTEM_VOWS,
    messages: [{ role: "user", content: `Whose: ${args.whose}\nPrompts: ${args.prompts}\nStyle note: ${args.styleNote ?? "(none)"}` }],
  });
  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text).join("\n").trim();
  const json = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    const parsed = JSON.parse(json);
    return { draft: String(parsed.draft ?? ""), notes: String(parsed.notes ?? "") };
  } catch {
    return offlineVows(args);
  }
}

export async function voiceSpeech(args: {
  speaker: string;
  relationship: string;
  prompts: string;
}): Promise<{ draft: string; notes: string }> {
  if (!hasApiKey()) return offlineSpeech(args);
  const resp = await client().messages.create({
    model: MODELS.orchestrator,
    max_tokens: 2000,
    system: SYSTEM_SPEECH,
    messages: [{ role: "user", content: `Speaker: ${args.speaker}\nRelationship: ${args.relationship}\nPrompts: ${args.prompts}` }],
  });
  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text).join("\n").trim();
  const json = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    const parsed = JSON.parse(json);
    return { draft: String(parsed.draft ?? ""), notes: String(parsed.notes ?? "") };
  } catch {
    return offlineSpeech(args);
  }
}

function offlineVows(..._: unknown[]): { draft: string; notes: string } { return { draft: "", notes: "" }; }
function offlineSpeech(..._: unknown[]): { draft: string; notes: string } { return { draft: "", notes: "" }; }
