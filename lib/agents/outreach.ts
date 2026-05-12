// Outreach — drafts personalized first-contact emails to vendors (PRD §4.2).
// Gated by Approval Card. Never sends without an approved token.

import type Anthropic from "@anthropic-ai/sdk";
import { client, MODELS, hasApiKey } from "../anthropic";
import { Brief, Vendor } from "../types";

const SYSTEM = `You are Outreach, Corsia's vendor-contact agent.

Voice: warm, professional, brief. Write as the couple's planning team, not as the couple.
Constraints:
- Reference the date window, region, and guest count from the brief.
- Mention any specific note the couple gave you verbatim if useful.
- Ask only TWO questions: availability in the window, and rough pricing for the size of party.
- Sign off as "Corsia on behalf of <couple>".
- 4-7 sentences total. No emojis, no exclamation points.

Return only the email body — no subject line, no headers.`;

export async function outreachDraft(args: {
  brief: Brief;
  vendor: Vendor;
  noteFromCouple?: string;
}): Promise<string> {
  if (!hasApiKey()) {
    return offline(args);
  }
  const userPrompt = `Vendor: ${args.vendor.name} (${args.vendor.category}, ${args.vendor.city})
Couple: ${args.brief.organizerName} & ${args.brief.partnerName}
Date window: ${args.brief.dateWindow}
Region: ${args.brief.region}
Guest count: ~${args.brief.guestCount}
Vibe: ${args.brief.vibe}
${args.noteFromCouple ? `\nNote from couple: ${args.noteFromCouple}` : ""}

Draft the email body now.`;

  const resp = await client().messages.create({
    model: MODELS.specialist,
    max_tokens: 500,
    system: SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
  });
  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
  return text || offline(args);
}

// Question-focused follow-up to a vendor we already know — "ask the venue
// about the rain plan", "ask the photographer if they shoot film", etc.
// Voice: warm, direct, references the prior thread implicitly.

const QUESTION_SYSTEM = `You are Outreach, Corsia's vendor-contact agent.

You write concise follow-up email bodies asking a vendor a specific question on
behalf of the couple. The vendor and couple are already in conversation — this
is a follow-up, not a first contact.

Voice: warm, professional, one-question-focused. Write as the couple's planning
team, not as the couple. 3-6 sentences. No emojis. No exclamation points.
Reference the date and venue/category context only when useful for grounding
the question. Sign as "Corsia on behalf of <couple>".

Return ONLY the email body. No subject line, no headers.`;

export async function outreachQuestion(args: {
  brief: Brief;
  vendor: Vendor;
  topic: string;       // free-text question or topic — "the rain plan", "if they shoot film"
  note?: string;
}): Promise<string> {
  if (!hasApiKey()) return offlineQuestion(args);

  const userPrompt = `Vendor: ${args.vendor.name} (${args.vendor.category}${args.vendor.city ? `, ${args.vendor.city}` : ""})
Couple: ${args.brief.organizerName} & ${args.brief.partnerName}
Date window: ${args.brief.dateWindow}
Topic / question: ${args.topic}
${args.note ? `\nExtra context from the couple: ${args.note}` : ""}

Draft the follow-up email body now. One clear question, polite, direct.`;

  const resp = await client().messages.create({
    model: MODELS.specialist,
    max_tokens: 400,
    system: QUESTION_SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
  });
  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
  return text || offlineQuestion(args);
}

function offlineQuestion(args: { brief: Brief; vendor: Vendor; topic: string; note?: string }): string {
  const b = args.brief;
  const v = args.vendor;
  const noteLine = args.note ? `\n\nA quick bit of context: ${args.note}` : "";
  return `Hello ${v.name},

Following up from ${b.organizerName} & ${b.partnerName}'s wedding on ${b.dateWindow} — they had one question they wanted to put to you.

${capitalizeQuestion(args.topic)}${noteLine}

Whenever's good for you. Thank you,
Corsia on behalf of ${b.organizerName} & ${b.partnerName}`;
}

function capitalizeQuestion(s: string): string {
  const t = s.trim();
  if (!t) return "Could you share a few more details?";
  // If it's already a question, capitalize the first letter and add "?" if missing.
  let out = t.charAt(0).toUpperCase() + t.slice(1);
  if (!/[?.!]$/.test(out)) {
    // Heuristic: if it starts with a question word, add "?"; else add "." and a follow-up.
    if (/^(can|could|do|does|will|would|are|is|how|what|when|where|why|who)\b/i.test(out)) {
      out += "?";
    } else {
      out = `Could you walk us through ${out.charAt(0).toLowerCase() + out.slice(1)}?`;
    }
  }
  return out;
}

function offline(args: { brief: Brief; vendor: Vendor; noteFromCouple?: string }): string {
  const b = args.brief;
  const v = args.vendor;
  const noteLine = args.noteFromCouple
    ? `\n\nA note from ${b.organizerName} & ${b.partnerName}: ${args.noteFromCouple}`
    : "";
  return `Hello ${v.name},

We're reaching out from ${b.organizerName} & ${b.partnerName}'s wedding planning team. They're considering ${b.dateWindow} in ${b.region}, with roughly ${b.guestCount} guests, and ${v.category.toLowerCase()} is a top priority on our list.${noteLine}

Two quick questions before we go further:
1. Do you have availability anywhere in that date window?
2. For ${b.guestCount} guests, can you share rough pricing or your typical package range?

If the timing aligns, we'd love to learn more about how you work. Thank you for your time.

Warmly,
Corsia on behalf of ${b.organizerName} & ${b.partnerName}`;
}
