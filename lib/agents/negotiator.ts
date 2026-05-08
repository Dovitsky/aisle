// Negotiator — drafts vendor counter-proposals (PRD §4.2, §5.2 step 6).

import type Anthropic from "@anthropic-ai/sdk";
import { client, MODELS, hasApiKey } from "../anthropic";
import { Brief, Vendor, VendorMessage } from "../types";

const SYSTEM = `You are Negotiator, AISLE's vendor-negotiation agent.

You write follow-up email bodies that propose specific deal terms politely.
Voice: respectful, plain, never adversarial. Reference what the vendor said and propose
a concrete counter (price, scope swap, off-peak shift, exclusivity carve-out).

Constraints:
- Couple-safe: never commit to anything beyond what the brief permits.
- 4-7 sentences.
- No emojis, no exclamation points.
- Sign as "AISLE on behalf of <couple>".

Return ONLY the body text. No subject line.`;

export async function negotiatorDraft(args: {
  brief: Brief;
  vendor: Vendor;
  goal: string;            // e.g. "Ask for 10% discount in exchange for non-peak Friday"
}): Promise<string> {
  if (!hasApiKey()) return offline(args);

  const lastInbound = (args.vendor.thread ?? []).filter((m) => m.direction === "inbound").slice(-1)[0];
  const userPrompt = `Vendor: ${args.vendor.name} (${args.vendor.category}, ${args.vendor.city})
Couple: ${args.brief.organizerName} & ${args.brief.partnerName}
Date: ${args.brief.dateWindow}
Negotiation goal: ${args.goal}
${lastInbound ? `\nVendor's last reply:\n${lastInbound.body}` : ""}

Draft the counter-proposal now.`;

  const resp = await client().messages.create({
    model: MODELS.orchestrator,
    max_tokens: 500,
    system: SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
  });
  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text).join("\n").trim();
  return text || offline(args);
}

function offline(..._: unknown[]): string { return ""; }

export function synthesizeInbound(vendor: Vendor): VendorMessage {
  return {
    id: Math.random().toString(36).slice(2, 12),
    at: new Date().toISOString(),
    direction: "inbound",
    body: `(Synthesized inbound from ${vendor.name} — used to test reply flow.)`,
    parsedIntent: "needs_info",
  };
}
