// Itinerist — honeymoon planning agent (gateScope: "honeymoon" when surprise segments exist).

import type Anthropic from "@anthropic-ai/sdk";
import { MODELS, hasApiKey, createWithWebSearch } from "../anthropic";
import { Brief, HoneymoonSegment } from "../types";

const SYSTEM = `You are Itinerist, AISLE's honeymoon agent.
Propose a 2-4 segment honeymoon itinerary for a couple.

How you work:
- Use the web_search tool to verify hotels are currently operating, check seasonal weather, and find recent travel notes.
- Search for things like "best hotels Lisbon Alfama 2026" or "Comporta beach hotels honeymoon".
- Only suggest hotels you saw on real travel sites or hotel websites — no invented properties.

Output JSON only (after your searches, no prose):
{ "segments": [
  { "city": "Lisbon", "country": "Portugal",
    "arrivalDate": "YYYY-MM-DD", "departureDate": "YYYY-MM-DD",
    "hotel": "specific hotel name",
    "notes": "1 sentence specific recommendation",
    "surprise": false }
] }

The first segment starts 5-10 days after the wedding date the couple gives.
Mix relaxation + activity.
At most one segment can be flagged "surprise: true" (these stay inside the honeymoon firewall).`;

export async function itineristPropose(args: { brief: Brief; weddingDate: string }): Promise<Omit<HoneymoonSegment, "id">[]> {
  if (!hasApiKey()) return offline(args.weddingDate);
  const resp = await createWithWebSearch({
    model: MODELS.orchestrator,
    max_tokens: 4000,
    system: SYSTEM,
    messages: [{ role: "user", content: `Couple vibe: ${args.brief.vibe}\nBudget envelope (overall wedding): $${args.brief.budgetUsd.toLocaleString()}\nWedding date: ${args.weddingDate}\n\nPropose the honeymoon now.` }],
    maxSearches: 4,
  });
  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text).join("\n").trim();
  const json = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    const parsed = JSON.parse(json);
    const segs = Array.isArray(parsed.segments) ? parsed.segments : [];
    return segs.slice(0, 4).map((r: unknown) => {
      const x = (r ?? {}) as Record<string, unknown>;
      return {
        city: String(x.city ?? ""),
        country: String(x.country ?? ""),
        arrivalDate: String(x.arrivalDate ?? ""),
        departureDate: String(x.departureDate ?? ""),
        hotel: x.hotel ? String(x.hotel) : undefined,
        notes: x.notes ? String(x.notes) : undefined,
        surprise: Boolean(x.surprise),
      };
    });
  } catch {
    return offline(args.weddingDate);
  }
}

function offline(weddingDate?: string): Omit<HoneymoonSegment, "id">[] {
  // 7 days after wedding for arrival.
  const base = weddingDate && /^\d{4}-\d{2}-\d{2}/.test(weddingDate)
    ? new Date(weddingDate + "T00:00:00")
    : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  const offset = (days: number) => {
    const d = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 10);
  };
  return [
    { city: "Lisbon",   country: "Portugal", arrivalDate: offset(7),  departureDate: offset(11),
      hotel: "Bairro Alto Hotel",
      notes: "Walk Alfama at sunset, eat at Belcanto, day trip to Sintra. Soft re-entry to traveling together as marrieds.",
      surprise: false },
    { city: "Comporta", country: "Portugal", arrivalDate: offset(11), departureDate: offset(15),
      hotel: "Sublime Comporta",
      notes: "Pine forests, empty beaches, slow mornings. Rental bikes, late dinners.",
      surprise: false },
    { city: "Évora",    country: "Portugal", arrivalDate: offset(15), departureDate: offset(18),
      hotel: "Convento do Espinheiro",
      notes: "Inland, vineyard country, history. Optional surprise day-trip booked privately.",
      surprise: false },
  ];
}
