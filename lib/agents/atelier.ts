// Atelier — hair & makeup agent. Builds a day-of beauty schedule.

import type Anthropic from "@anthropic-ai/sdk";
import { client, MODELS, hasApiKey } from "../anthropic";
import { Brief, BeautyAppt, WeddingPartyMember } from "../types";

const SYSTEM = `You are Atelier, Corsia's hair-and-makeup agent.
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
    model: MODELS.specialist,
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

function offline(args: { brief: Brief; ceremonyTime: string; party: WeddingPartyMember[] }): Omit<BeautyAppt, "id">[] {
  // Schedule backwards from ceremony time. Hair starts ~5 hr out, makeup ~3 hr.
  // Organizer goes LAST for both (peak photos).
  const [hh, mm] = (args.ceremonyTime || "16:00").split(":").map((n) => parseInt(n, 10));
  const ceremony = hh * 60 + (isFinite(mm) ? mm : 0);
  const fmt = (mins: number): string => {
    const h = Math.max(0, Math.floor(mins / 60));
    const m = ((mins % 60) + 60) % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };
  const partyNames = args.party
    .filter((m) => m.role === "maid_of_honor" || m.role === "bridesmaid")
    .map((m) => m.name);
  // Default party of 4 if none configured.
  const names = partyNames.length ? partyNames : ["Bridesmaid 1", "Bridesmaid 2", "Bridesmaid 3", "Bridesmaid 4"];

  const appts: Omit<BeautyAppt, "id">[] = [];
  // Trials first.
  appts.push({ who: `${args.brief.organizerName} — organizer`, service: "both", startTime: "10:00", durationMin: 120, trial: true, notes: "Trial appointment, 6-8 weeks before the wedding. Bring veil + hairpiece." });
  // Hair: starts 5 hr before ceremony, 60 min each, two chairs.
  const hairStart = ceremony - 5 * 60;
  let h1 = hairStart;
  let h2 = hairStart;
  names.forEach((n, i) => {
    if (i % 2 === 0) {
      appts.push({ who: n, service: "hair", startTime: fmt(h1), durationMin: 60, trial: false, notes: "Stylist 1." });
      h1 += 60;
    } else {
      appts.push({ who: n, service: "hair", startTime: fmt(h2), durationMin: 60, trial: false, notes: "Stylist 2." });
      h2 += 60;
    }
  });
  appts.push({ who: `${args.brief.organizerName} — organizer`, service: "hair", startTime: fmt(Math.max(h1, h2)), durationMin: 75, trial: false, notes: "Organizer last; allow 75 min for veil pinning." });
  // Makeup: starts 3 hr before ceremony.
  const makeupStart = ceremony - 3 * 60;
  let m1 = makeupStart;
  let m2 = makeupStart;
  names.forEach((n, i) => {
    if (i % 2 === 0) {
      appts.push({ who: n, service: "makeup", startTime: fmt(m1), durationMin: 45, trial: false, notes: "Artist 1." });
      m1 += 45;
    } else {
      appts.push({ who: n, service: "makeup", startTime: fmt(m2), durationMin: 45, trial: false, notes: "Artist 2." });
      m2 += 45;
    }
  });
  appts.push({ who: `${args.brief.organizerName} — organizer`, service: "makeup", startTime: fmt(Math.max(m1, m2)), durationMin: 60, trial: false, notes: "Lead artist; lashes optional." });
  return appts;
}
