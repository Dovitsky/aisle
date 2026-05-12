// Cantor — music director (PRD §3.2). Builds the wedding setlist from
// brief vibe + RSVP-collected song requests + ceremony tradition.

import type Anthropic from "@anthropic-ai/sdk";
import { MODELS, hasApiKey, createWithWebSearch } from "../anthropic";
import { Brief, MusicCue, MusicSlot } from "../types";
import type { WeddingContext } from "./context";
import { contextSummaryForPrompt } from "./context";

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

export async function cantorPropose(args: {
  brief: Brief;
  context?: WeddingContext;
  guestRequests?: string[];
}): Promise<Omit<MusicCue, "id">[]> {
  if (!hasApiKey()) return offline(args);

  const header = args.context
    ? contextSummaryForPrompt(args.context)
    : [
        `Vibe: ${args.brief.vibe}`,
        `Cultural: ${args.brief.cultural ?? "secular"}`,
        `Formality: ${args.brief.formalityTone ?? "modern"}`,
        `Region: ${args.brief.region}`,
      ].join("\n");

  const userPrompt = `${header}
${args.guestRequests?.length ? `\nGuest requests so far:\n${args.guestRequests.slice(0, 30).join("\n")}` : ""}

Build the setlist now — anchored to the vibe + venue + design direction above.`;

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

// Offline setlist — a curated, vibe-shaded baseline so /music renders a real
// program even without an API key.
function offline(args: { brief: Brief; guestRequests?: string[] }): Omit<MusicCue, "id">[] {
  const v = (args.brief.vibe || "").toLowerCase();
  const moody = /candlelit|moody|editorial|deep|jewel|noir|black\s*tie/.test(v);
  return [
    { slot: "processional",   song: moody ? "Spiegel im Spiegel" : "Canon in D",                  artist: moody ? "Arvo Pärt" : "Pachelbel",        notes: "Instrumental string arrangement; tempo set to a slow walk." },
    { slot: "ceremony_music", song: "Clair de Lune",                                              artist: "Debussy",                                 notes: "During unity ritual or readings." },
    { slot: "recessional",    song: moody ? "Here Comes the Sun (string quartet)" : "Signed, Sealed, Delivered (instrumental)", artist: moody ? "Beatles arr." : "Stevie Wonder arr.", notes: "Lifts the room as you exit." },
    { slot: "cocktail_hour",  song: "Moon River",          artist: "Henry Mancini",      notes: "Trio jazz arrangement." },
    { slot: "cocktail_hour",  song: "Sway",                artist: "Dean Martin",        notes: "Light, swung, low volume." },
    { slot: "cocktail_hour",  song: "L-O-V-E",             artist: "Nat King Cole",      notes: "" },
    { slot: "cocktail_hour",  song: "Dream a Little Dream", artist: "Ella Fitzgerald",   notes: "Slow tempo." },
    { slot: "introduction",   song: "September",           artist: "Earth, Wind & Fire", notes: "Walk-in to dinner." },
    { slot: "first_dance",    song: "At Last",             artist: "Etta James",         notes: "Full vocal version." },
    { slot: "parent_dance",   song: "The Way You Look Tonight", artist: "Frank Sinatra", notes: "Or substitute family-specific request." },
    { slot: "dinner",         song: "Lover",               artist: "Taylor Swift (acoustic)", notes: "Mellow." },
    { slot: "dinner",         song: "Better Together",     artist: "Jack Johnson",       notes: "" },
    { slot: "dinner",         song: "Make You Feel My Love", artist: "Adele",            notes: "" },
    { slot: "open_dancing",   song: "Don't Stop Me Now",   artist: "Queen",              notes: "Floor opener." },
    { slot: "open_dancing",   song: "I Wanna Dance with Somebody", artist: "Whitney Houston", notes: "" },
    { slot: "open_dancing",   song: "Mr. Brightside",      artist: "The Killers",         notes: "Crowd singalong." },
    { slot: "open_dancing",   song: "Levitating",          artist: "Dua Lipa",           notes: "Late-set energy." },
    { slot: "open_dancing",   song: "Dancing Queen",       artist: "ABBA",               notes: "" },
    { slot: "last_dance",     song: "Closing Time",        artist: "Semisonic",          notes: "Sparkler exit cue." },
  ];
}
