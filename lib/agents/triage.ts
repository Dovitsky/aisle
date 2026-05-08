// Triage — Haiku-class email/RSVP parser (PRD §4.2, build brief §4.3).
// Used for high-volume parsing where latency and cost matter more than depth.

import type Anthropic from "@anthropic-ai/sdk";
import { client, MODELS, hasApiKey } from "../anthropic";

export type TriageVendorReply = {
  intent: "available" | "unavailable" | "needs_info" | "out_of_office" | "unknown";
  quotedUsd?: number;
  notes?: string;
};

const SYSTEM = `You are Triage, AISLE's parser. Classify a vendor reply email.
Return ONLY JSON of shape { "intent": ..., "quotedUsd"?: number, "notes"?: string }.
- "available"   — the vendor confirms availability in the date window
- "unavailable" — booked or no longer accepting work
- "needs_info"  — they ask follow-up questions
- "out_of_office" — auto-reply only
- "unknown"     — ambiguous

If a price is quoted, parse it to a USD integer (drop currency symbols, commas).
Notes: at most one short sentence (the most useful detail).`;

export async function triageVendorReply(emailBody: string): Promise<TriageVendorReply> {
  if (!hasApiKey()) return offline(emailBody);
  const resp = await client().messages.create({
    model: MODELS.triage,
    max_tokens: 200,
    system: SYSTEM,
    messages: [{ role: "user", content: emailBody }],
  });
  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
  const json = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    const parsed = JSON.parse(json);
    return coerce(parsed);
  } catch {
    return offline(emailBody);
  }
}

function coerce(raw: unknown): TriageVendorReply {
  const r = (raw ?? {}) as Record<string, unknown>;
  const validIntents = ["available", "unavailable", "needs_info", "out_of_office", "unknown"] as const;
  const intent = (validIntents as readonly string[]).includes(r.intent as string)
    ? (r.intent as TriageVendorReply["intent"])
    : "unknown";
  const out: TriageVendorReply = { intent };
  if (typeof r.quotedUsd === "number") out.quotedUsd = Math.max(0, Math.round(r.quotedUsd));
  if (typeof r.notes === "string" && r.notes.length > 0) out.notes = r.notes.slice(0, 200);
  return out;
}

function offline(..._: unknown[]): TriageVendorReply { return { intent: "unknown" }; }
