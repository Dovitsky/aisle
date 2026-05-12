// Voice. vow + speech support agent (PRD §3.2 Personal Prep, §2.3 gated speech).
// Operates inside per-author firewall scopes when active.

import type Anthropic from "@anthropic-ai/sdk";
import { client, MODELS, hasApiKey } from "../anthropic";

const SYSTEM_VOWS = `You are Voice, Corsia's vow-coach agent.
You help one partner draft personal vows.

Voice: warm, plainspoken, never schmaltzy. Specific over abstract.

Output JSON only:
{ "draft": "the actual vow text. line breaks where you'd take a breath",
  "notes": "2-3 short suggestions for revision" }

300-450 words. Use the partner's prompts directly. Avoid "soulmate", "happily ever after",
"two halves of one whole". every couple uses these. Lean into the specific.`;

const SYSTEM_SPEECH = `You are Voice, Corsia's wedding-speech agent.
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
    model: MODELS.specialist,
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
    model: MODELS.specialist,
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

function offlineVows(args: { whose: "organizer" | "partner"; prompts: string }): { draft: string; notes: string } {
  const subject = args.whose === "organizer" ? "you" : "you";
  return {
    draft: `${args.prompts ? `(working from your prompts: ${args.prompts})\n\n` : ""}Standing here, in front of everyone we love, I want to say what I should have said a hundred mornings ago.

I love how seriously ${subject} take small kindnesses. The text on the worst Tuesday. The light always on when I get home. The way ${subject} answer the same question patiently, even when I've asked it three times that week.

I promise to be steady when ${subject} are tired. To laugh first, even when I'm wrong. To bring home good bread on Fridays. To listen. really listen, the kind that puts the phone down. when ${subject} tell me about your day. To choose us, again, when it's hard, and especially when it's easy.

I promise that the small things will keep being the things. Not the big speeches, not the anniversaries. the breakfasts, the long drives, the way I'll ask about your mother. Those are what we'll be made of.

I love you. I am ready. Let's go.`,
    notes: "Read it out loud once before printing. Cut anything that sounds like a quote. The third paragraph is where most people start crying. pause there.",
  };
}
function offlineSpeech(args: { speaker: string; relationship: string; prompts: string }): { draft: string; notes: string } {
  return {
    draft: `Good evening, everyone. I'm ${args.speaker || "the speaker"}. ${args.relationship ? `I'm the couple's ${args.relationship}` : ""}, which means I have stories I won't tell tonight, and a couple I will.

${args.prompts || "There's a moment I keep coming back to: the first time I saw the two of them in the same room. The room felt different. They didn't notice. but everyone else did. That's been true ever since."}

What I want to say is simple. Some couples convince you that romance survives. These two convince you that it grows up. They take care of each other in the small ways and they show up for the rest of us in the big ones. Watching them is a master class in being kind on purpose.

So please raise your glass. To the years they've already given each other, and to all the ones still to come. To easy mornings. To full kitchens. To showing up. Cheers.`,
    notes: "5 minutes. Cut to 3 if dinner is running long. The speaker should pause after the toast invitation; people fumble for glasses.",
  };
}
