// Atelier — hair & makeup agent. Builds a day-of beauty schedule.

import type Anthropic from "@anthropic-ai/sdk";
import { client, MODELS, hasApiKey } from "../anthropic";
import { Brief, BeautyAppt, WeddingPartyMember } from "../types";

const SYSTEM = `You are Atelier, AISLE's hair-and-makeup agent.
Build a day-of beauty schedule starting from a "ready by" time.

Output JSON only:
{ "appts": [
  { "who": "named role (e.g., 'Maya — organizer', 'Mom Patel', 'MOH Priya')",
    "service": "hair" | "makeup" | "both",
    "startTime": "HH:mm",
    "durationMin": int,
    "trial": false,
    "notes": "1-line direction" }
] }

Order: hair starts ~5 hours before ceremony, makeup ~3 hours before. Organizer last for both.
Allow 60 min hair + 45 min makeup per person, with overlap when there are two stylists.
Include trials separately at start (one trial each, scheduled ~6-8 weeks before).`;

export async function atelierPropose(args: {
  brief: Brief;
  weddingDate: string;
  ceremonyTime: string;       // HH:mm
  party: WeddingPartyMember[];
}): Promise<Omit<BeautyAppt, "id">[]> {
  if (!hasApiKey()) return offline(args);

  const peopleNeeding = [
    `${args.brief.organizerName} — organizer`,
    `${args.brief.partnerName} — partner`,
    ...args.party.filter((m) => m.role === "maid_of_honor" || m.role === "bridesmaid").map((m) => m.name),
  ];

  const userPrompt = `Wedding date: ${args.weddingDate}
Ceremony time: ${args.ceremonyTime}
People needing hair/makeup:
${peopleNeeding.map((p) => "- " + p).join("\n")}

Schedule the day-of beauty now.`;

  const resp = await client().messages.create({
    model: MODELS.orchestrator,
    max_tokens: 1500,
    system: SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
  });
  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text).join("\n").trim();
  const json = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    const parsed = JSON.parse(json) as { appts: unknown[] };
    return (parsed.appts ?? []).map(coerce).filter(Boolean) as Omit<BeautyAppt, "id">[];
  } catch {
    return offline(args);
  }
}

function coerce(raw: unknown): Omit<BeautyAppt, "id"> | null {
  const r = (raw ?? {}) as Record<string, unknown>;
  if (!r.who) return null;
  const valid = ["hair", "makeup", "both"];
  return {
    who: String(r.who),
    service: valid.includes(String(r.service)) ? (r.service as "hair" | "makeup" | "both") : "both",
    startTime: String(r.startTime ?? "08:00"),
    durationMin: Math.max(15, Math.round(Number(r.durationMin) || 60)),
    trial: Boolean(r.trial),
    notes: r.notes ? String(r.notes) : undefined,
  };
}

function offline(..._: unknown[]): Omit<BeautyAppt, "id">[] { return []; }
