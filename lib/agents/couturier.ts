// Couturier — generates dress concept directions inside the dress firewall (PRD §5.3).
// Every output of this agent is tagged gateScope: "dress".

import type Anthropic from "@anthropic-ai/sdk";
import { client, MODELS, hasApiKey } from "../anthropic";
import { Brief } from "../types";

export interface DressDirection {
  title: string;          // e.g., "Slip + Cathedral Veil"
  silhouette: string;
  fabrics: string[];
  designerExamples: string[]; // names only, not prices
  rationale: string;
}

const SYSTEM = `You are Couturier, AISLE's bridal-attire agent operating inside a strict privacy gate.

Voice: like a long-time bridal stylist — warm, plainspoken, opinionated.
Output six directions covering a wide range (silhouettes, formality, era).

Output JSON only:
{
  "directions": [
    {
      "title": "Slip + Cathedral Veil",
      "silhouette": "1-line silhouette description",
      "fabrics": ["silk crepe", "fine tulle"],
      "designerExamples": ["Galvan", "Danielle Frankel"],
      "rationale": "1-2 sentences tied to the brief"
    },
    ...6 total
  ]
}

Important: never break the gate. Never reference what the partner might think or prefer. Never imply visibility. The organizer is your only audience.`;

export async function couturierDirections(brief: Brief, organizerNotes?: string): Promise<DressDirection[]> {
  if (!hasApiKey()) return offline();
  const prompt = `Brief vibe: ${brief.vibe}
Region: ${brief.region}
Organizer notes (optional): ${organizerNotes ?? "(none)"}

Produce six directions now.`;
  const resp = await client().messages.create({
    model: MODELS.specialist,
    max_tokens: 2200,
    system: SYSTEM,
    messages: [{ role: "user", content: prompt }],
  });
  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n").trim();
  const json = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    const parsed = JSON.parse(json);
    const dirs = (parsed?.directions ?? []) as unknown[];
    return dirs.slice(0, 6).map(coerce).filter(Boolean) as DressDirection[];
  } catch {
    return offline();
  }
}

function coerce(raw: unknown): DressDirection | null {
  const r = (raw ?? {}) as Record<string, unknown>;
  const title = String(r.title ?? "").trim();
  if (!title) return null;
  return {
    title,
    silhouette: String(r.silhouette ?? ""),
    fabrics: (Array.isArray(r.fabrics) ? r.fabrics : []).map(String).slice(0, 4),
    designerExamples: (Array.isArray(r.designerExamples) ? r.designerExamples : []).map(String).slice(0, 4),
    rationale: String(r.rationale ?? ""),
  };
}

function offline(): DressDirection[] {
  return [
    { title: "Slip + Cathedral Veil",
      silhouette: "Bias-cut silk slip, narrow shoulder strap, low cowl back; lengthy cathedral veil for the aisle moment.",
      fabrics: ["Silk crepe", "Fine bridal tulle"],
      designerExamples: ["Galvan", "Danielle Frankel", "Saint Laurent"],
      rationale: "Quiet drama. The veil does the work; the dress reads modern at dinner without the period feel." },
    { title: "Architectural Mikado A-line",
      silhouette: "Strapless mikado A-line with a defined waist seam; structured but not stiff.",
      fabrics: ["Silk mikado", "Bonded silk"],
      designerExamples: ["Carolina Herrera", "Markarian", "Vera Wang Haute"],
      rationale: "Reads as 'wedding' from a distance. Suits formal venues; photographs cleanly." },
    { title: "Couture Embroidered Long Sleeve",
      silhouette: "Hand-embroidered illusion bodice into a fluted skirt, full long sleeves.",
      fabrics: ["Silk organza", "Hand-beaded tulle"],
      designerExamples: ["Monique Lhuillier", "Reem Acra", "Marchesa"],
      rationale: "Maximalist option. Best at a black-tie or evening ceremony with cool light." },
    { title: "Modern Mini + Cape",
      silhouette: "Tailored mini dress with detachable floor-length cape — mini for reception, cape for ceremony.",
      fabrics: ["Wool crepe", "Silk faille"],
      designerExamples: ["Khaite", "Toteme x bridal", "Halfpenny London"],
      rationale: "Two looks in one for a couple who wants the ceremony moment and freedom to dance." },
    { title: "Vintage-Inspired Tea Length",
      silhouette: "Tea-length full-skirt with a fitted bodice; cap sleeves; pleated waist.",
      fabrics: ["Silk taffeta", "Bonded organza"],
      designerExamples: ["The Vampire's Wife", "Self-Portrait Bridal", "Loulou de Saison"],
      rationale: "Garden ceremonies, daytime weddings, retro-leaning vibes." },
    { title: "Sleek Tuxedo or Suit",
      silhouette: "Tailored ivory or black wool tuxedo; satin lapels; silk camisole; statement shoe.",
      fabrics: ["Wool / silk twill", "Italian wool"],
      designerExamples: ["The Row", "Bode", "Saint Laurent"],
      rationale: "Modernist alternative. Travels well, photographs editorially, ages out of trend cycles." },
  ];
}
