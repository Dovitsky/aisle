// Outreach — drafts personalized first-contact emails to vendors (PRD §4.2).
// Gated by Approval Card. Never sends without an approved token.

import type Anthropic from "@anthropic-ai/sdk";
import { client, MODELS, hasApiKey } from "../anthropic";
import { Brief, Vendor } from "../types";

const SYSTEM = `You are Outreach, AISLE's vendor-contact agent.

Voice: warm, professional, brief. Write as the couple's planning team, not as the couple.
Constraints:
- Reference the date window, region, and guest count from the brief.
- Mention any specific note the couple gave you verbatim if useful.
- Ask only TWO questions: availability in the window, and rough pricing for the size of party.
- Sign off as "AISLE on behalf of <couple>".
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
    model: MODELS.orchestrator,
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

function offline(..._: unknown[]): string { return ""; }
