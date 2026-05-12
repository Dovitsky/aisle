// Quill — receipt / email / screenshot text parser.
//
// Takes arbitrary text the couple paste in (forwarded vendor email, an
// OCR'd PDF estimate, a screenshot transcription) and extracts the
// structured business: vendor name, total dollar amount, line items, and
// useful metadata (the contact, the date, the category). Used by the
// Maestro `parse_estimate` tool — the user dumps text, Maestro renders a
// summary card, the couple confirms to log into Budget + Vendors.

import type Anthropic from "@anthropic-ai/sdk";
import { client, MODELS, hasApiKey } from "../anthropic";

export interface ParsedEstimate {
  vendorName: string;        // "Hudson Barn", "Atelier Maison Photography"
  category?: string;         // "Venue" | "Photographer" | "Florist" | etc — match VendorCategory
  totalUsd: number;          // best-guess all-in number
  lineItems: { label: string; amountUsd: number }[];
  contact?: {
    email?: string;
    phone?: string;
    person?: string;         // "Maria — bookings"
  };
  notes?: string;            // 1-line summary of any caveats / fine print
  confidence: "high" | "medium" | "low";
}

const SYSTEM = `You are Quill, Corsia's text parser.

You receive arbitrary text from the couple — a forwarded vendor email, a
screenshot transcription, a PDF excerpt, an SMS thread — and extract the
business of any wedding-vendor estimate, quote, or invoice inside.

Rules:
- Only output JSON. Wrap in a \`\`\`json fence. Nothing after the fence.
- Pick a single best-guess vendor name. If multiple vendors appear, pick
  the one whose price is being quoted.
- "category" must be one of: Venue, Photographer, Videographer, Florist,
  Caterer, Officiant, Band, DJ, Stationer, Hair & Makeup, Cake, Calligrapher,
  Bartending, Rentals, Transportation. If you can't confidently choose, omit it.
- "totalUsd" is the all-in price the vendor is asking for, as an integer.
  Strip currency symbols and commas. If only line items appear, sum them.
- "lineItems" lists each individually-priced piece (e.g. "8-hour photography",
  "second shooter"). Each line gets a "label" and "amountUsd" integer.
- "contact" pulls any email / phone / named person from the text. Omit fields
  that aren't present.
- "notes" is at most one short sentence (e.g. "Quote valid 30 days; deposit
  50% non-refundable").
- "confidence" is "high" if the price and vendor are unambiguous, "medium"
  if you had to infer, "low" if the text was sparse or contradictory.

Shape:
{
  "vendorName": "string",
  "category": "string (optional)",
  "totalUsd": int,
  "lineItems": [{ "label": "string", "amountUsd": int }],
  "contact": { "email": "string?", "phone": "string?", "person": "string?" },
  "notes": "string?",
  "confidence": "high" | "medium" | "low"
}`;

export async function quillParse(text: string): Promise<ParsedEstimate | null> {
  if (!hasApiKey()) return null;
  if (!text.trim()) return null;

  const resp = await client().messages.create({
    model: MODELS.triage,    // fast + cheap — Haiku is enough for parsing
    max_tokens: 1500,
    system: SYSTEM,
    messages: [{
      role: "user",
      content: `Parse this text:\n\n${text.slice(0, 8000)}`,
    }],
  });

  const out = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  const json = extractJsonObject(out);
  if (!json) return null;

  try {
    const parsed = JSON.parse(json);
    return coerce(parsed);
  } catch {
    return null;
  }
}

function extractJsonObject(s: string): string | null {
  const fenced = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const cleaned = (fenced ? fenced[1] : s).trim();
  const start = cleaned.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  for (let i = start; i < cleaned.length; i++) {
    const c = cleaned[i];
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return cleaned.slice(start, i + 1);
    }
  }
  return null;
}

function coerce(raw: unknown): ParsedEstimate | null {
  const r = (raw ?? {}) as Record<string, unknown>;
  const vendorName = String(r.vendorName ?? "").trim();
  const totalUsd = Math.max(0, Math.round(Number(r.totalUsd) || 0));
  if (!vendorName || totalUsd === 0) return null;

  const VALID_CATS = new Set([
    "Venue", "Photographer", "Videographer", "Florist", "Caterer", "Officiant",
    "Band", "DJ", "Stationer", "Hair & Makeup", "Cake", "Calligrapher",
    "Bartending", "Rentals", "Transportation",
  ]);
  const cat = typeof r.category === "string" && VALID_CATS.has(r.category) ? r.category : undefined;

  const lineItems = Array.isArray(r.lineItems)
    ? r.lineItems.map((li) => {
        const x = (li ?? {}) as Record<string, unknown>;
        return {
          label: String(x.label ?? "").trim(),
          amountUsd: Math.max(0, Math.round(Number(x.amountUsd) || 0)),
        };
      }).filter((li) => li.label && li.amountUsd > 0)
    : [];

  const contactRaw = (r.contact ?? {}) as Record<string, unknown>;
  const contact: ParsedEstimate["contact"] = {};
  if (typeof contactRaw.email === "string" && contactRaw.email.trim()) contact.email = contactRaw.email.trim();
  if (typeof contactRaw.phone === "string" && contactRaw.phone.trim()) contact.phone = contactRaw.phone.trim();
  if (typeof contactRaw.person === "string" && contactRaw.person.trim()) contact.person = contactRaw.person.trim();

  const conf = r.confidence === "high" || r.confidence === "low" ? r.confidence : "medium";

  return {
    vendorName,
    category: cat,
    totalUsd,
    lineItems,
    contact: Object.keys(contact).length ? contact : undefined,
    notes: typeof r.notes === "string" ? r.notes.trim() : undefined,
    confidence: conf,
  };
}
