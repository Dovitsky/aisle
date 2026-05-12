// Triage. Haiku-class email/RSVP parser (PRD §4.2, build brief §4.3).
// Used for high-volume parsing where latency and cost matter more than depth.

import type Anthropic from "@anthropic-ai/sdk";
import { client, MODELS, hasApiKey } from "../anthropic";

export type TriageVendorReply = {
  intent: "available" | "unavailable" | "needs_info" | "out_of_office" | "unknown";
  quotedUsd?: number;
  notes?: string;
};

const SYSTEM = `You are Triage, Corsia's parser. Classify a vendor reply email.
Return ONLY JSON of shape { "intent": ..., "quotedUsd"?: number, "notes"?: string }.
- "available"  . the vendor confirms availability in the date window
- "unavailable". booked or no longer accepting work
- "needs_info" . they ask follow-up questions
- "out_of_office". auto-reply only
- "unknown"    . ambiguous

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

// Offline rule-based classifier. covers the common signal patterns. Used
// when no API key is set so the inbox flow is fully exercisable.
function offline(emailBody: string): TriageVendorReply {
  const t = (emailBody || "").toLowerCase();

  // Out-of-office auto-replies first (highest precedence. they don't carry intent).
  if (/\bout of office\b|\bout-of-office\b|\bauto[\s-]?reply\b|\bautomated reply\b|\bauto-?responder\b|i'?m away|will reply when (i'?m|we'?re) back/.test(t)) {
    return { intent: "out_of_office", notes: "Auto-reply detected; vendor is unavailable until they return." };
  }

  // Marketing / newsletter noise (not a vendor reply at all).
  if (/\bunsubscribe\b|\bsponsored content\b|\bnewsletter\b/.test(t) && !/\bavailab|\bquote|\binquir/.test(t)) {
    return { intent: "unknown", notes: "Looks like marketing or newsletter content; not a vendor reply." };
  }

  // Detect a quoted USD price anywhere in the body.
  let quotedUsd: number | undefined;
  const dollar = emailBody.match(/\$\s*([\d,]+(?:\.\d{2})?)/);
  if (dollar) {
    const n = parseFloat(dollar[1].replace(/,/g, ""));
    if (Number.isFinite(n) && n >= 100 && n <= 5_000_000) quotedUsd = Math.round(n);
  }
  if (!quotedUsd) {
    // "$/pp" pricing: "$145/pp"
    const pp = emailBody.match(/\$\s*([\d,]+)\s*\/?\s*(?:pp|per\s+(?:guest|person|head))/i);
    if (pp) {
      const n = parseFloat(pp[1].replace(/,/g, ""));
      if (Number.isFinite(n) && n > 0 && n <= 1000) quotedUsd = Math.round(n);
    }
  }

  // Unavailable signals. bound to "we/I" subject so we don't catch
  // "if a particular variety is unavailable" and similar.
  if (/(?:we|i|i'?m|we'?re|we are)\s+(?:are\s+|am\s+)?(?:unavailable|fully booked|already booked|sold out)|cannot accommodate|won'?t be able to|regretfully decline|sadly decline|no longer (taking|accepting)|booked (that|the) (date|weekend|day)/.test(t)) {
    return { intent: "unavailable", quotedUsd, notes: "Vendor declined or said the date is booked." };
  }

  // Needs-info / follow-up signals.
  if (/\bbefore (i|we) can\b|need (a few|some) (more )?(details|questions|info)|few questions|several questions|please clarify|please confirm|could you (tell|share|let)/.test(t) || /(\?[^?]*?){2,}/.test(emailBody)) {
    return { intent: "needs_info", quotedUsd, notes: "Vendor asked clarifying questions before they can quote." };
  }

  // Available signals.
  if (/(do have|have|are|we'?re|we are|happy to|would love).{0,80}(availab|open|free|that (date|weekend|day))|that (date|weekend|day) (is|works)|we are available|we have availability|the date (works|is open)|we can accommodate/.test(t)) {
    return { intent: "available", quotedUsd, notes: quotedUsd ? `Available; quoted $${quotedUsd.toLocaleString()}.` : "Available in the requested window." };
  }

  return { intent: "unknown", quotedUsd };
}
