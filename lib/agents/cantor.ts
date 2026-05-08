// Cantor — music director (PRD §3.2). Builds the wedding setlist from
// brief vibe + RSVP-collected song requests + ceremony tradition.

import type Anthropic from "@anthropic-ai/sdk";
import { MODELS, hasApiKey, createWithWebSearch } from "../anthropic";
import { Brief, MusicCue, MusicSlot } from "../types";

const SLOTS: MusicSlot[] = [
  "processional", "ceremony_music", "recessional",
  "cocktail_hour", "introduction", "first_dance",
  "parent_dance", "dinner", "open_dancing", "last_dance",
];

const SYSTEM = `You are Cantor, AISLE's music director.
Build a wedding setlist anchored to the couple's vibe and cultural tradition.

How you work:
- Use the web_search tool to surface songs that match the couple's vibe AND that are
  current popular wedding picks (search "best first dance songs 2026", or genre-specific
  if the vibe calls for it).
- Mix evergreen anchors with current picks. Real songs, real artists, no placeholders.

Output JSON only (after your searches, no prose):
{ "cues": [
  { "slot": "processional"|"ceremony_music"|"recessional"|"cocktail_hour"|"introduction"|"first_dance"|"parent_dance"|"dinner"|"open_dancing"|"last_dance",
    "song": "title", "artist": "artist", "notes": "1-line direction (e.g., 'instrumental version, slow tempo')" }
] }

Coverage:
- Exactly one entry for each ceremony slot (processional, ceremony_music, recessional).
- Exactly one for first_dance, introduction, last_dance.
- 3-5 entries for cocktail_hour, dinner, and open_dancing each.
Cultural tradition matters — match instrumentation to the brief.`;

export async function cantorPropose(args: { brief: Brief; guestRequests?: string[] }): Promise<Omit<MusicCue, "id">[]> {
  if (!hasApiKey()) return offline(args);

  const userPrompt = `Vibe: ${args.brief.vibe}
Cultural: ${args.brief.cultural ?? "secular"}
Formality: ${args.brief.formalityTone ?? "modern"}
Region: ${args.brief.region}
${args.guestRequests?.length ? `\nGuest requests so far:\n${args.guestRequests.slice(0, 30).join("\n")}` : ""}

Build the setlist now.`;

  const resp = await createWithWebSearch({
    model: MODELS.orchestrator,
    max_tokens: 4000,
    system: SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
    maxSearches: 3,
  });
  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text).join("\n").trim();
  const json = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    const parsed = JSON.parse(json) as { cues: unknown[] };
    return (parsed.cues ?? []).map(coerce).filter(Boolean) as Omit<MusicCue, "id">[];
  } catch {
    return offline(args);
  }
}

function coerce(raw: unknown): Omit<MusicCue, "id"> | null {
  const r = (raw ?? {}) as Record<string, unknown>;
  const slot = String(r.slot ?? "");
  if (!SLOTS.includes(slot as MusicSlot)) return null;
  return {
    slot: slot as MusicSlot,
    song: String(r.song ?? ""),
    artist: String(r.artist ?? ""),
    notes: r.notes ? String(r.notes) : undefined,
  };
}

function offline(..._: unknown[]): Omit<MusicCue, "id">[] { return []; }
