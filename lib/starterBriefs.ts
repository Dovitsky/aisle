// Starter brief templates. taste-level presets a couple can apply with one
// click to skip the cold start. All seven required brief fields are filled
// EXCEPT the names; Maestro asks for those after the template lands.

import type { Brief } from "./types";

export interface StarterBrief {
  id: string;
  title: string;
  region: string;          // headline location for the card
  blurb: string;           // one-line evocative description
  accent: string;          // hex used for a subtle wash on the card
  image: string;           // hero photograph URL for the card
  imagePosition?: string;  // optional object-position override (e.g. "center 30%")
  brief: Omit<Brief, "organizerName" | "partnerName" | "locked" | "lockedAt">;
}

export const STARTER_BRIEFS: StarterBrief[] = [
  {
    id: "amalfi-candlelit",
    title: "Amalfi candlelit dinner",
    region: "Amalfi Coast, Italy",
    blurb: "Sun-drenched cliffs, lemon groves, an intimate table at golden hour.",
    accent: "#E8D9A4",
    image: "https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?auto=format&fit=crop&w=1400&q=80",
    imagePosition: "center 40%",
    brief: {
      dateWindow: "Late September 2026",
      region: "Amalfi Coast, Italy",
      guestCount: 60,
      budgetUsd: 120000,
      vibe: "Sun-drenched cliffs and lemon groves. One long candlelit dinner at golden hour, family-style. Linen, ceramics, slow service. No DJ.",
      plannerStatus: "want_one",
      cultural: "secular",
      formalityTone: "modern",
      destination: true,
    },
  },
  {
    id: "hudson-valley-barn",
    title: "Hudson Valley barn",
    region: "Hudson Valley, NY",
    blurb: "Stone barn, wildflowers, candlelit reception. Editorial film photography.",
    accent: "#C7D1BD",
    image: "https://images.unsplash.com/photo-1771211908285-2ec8925f37d3?auto=format&fit=crop&w=1400&q=80",
    imagePosition: "center 50%",
    brief: {
      dateWindow: "Late September 2026",
      region: "Hudson Valley, NY",
      guestCount: 120,
      budgetUsd: 80000,
      vibe: "Editorial film photography, candlelit reception, stone barn, lots of wildflowers, no DJ banter.",
      plannerStatus: "want_one",
      cultural: "secular",
      formalityTone: "modern",
      destination: false,
    },
  },
  {
    id: "tuscan-villa",
    title: "Tuscan villa weekend",
    region: "Val d'Orcia, Tuscany",
    blurb: "Cypress drives, golden hour, three-day Italian welcome.",
    accent: "#D9C8A0",
    image: "https://images.unsplash.com/photo-1738510341339-394a8b8ae2de?auto=format&fit=crop&w=1400&q=80",
    imagePosition: "center 50%",
    brief: {
      dateWindow: "Mid May 2026",
      region: "Val d'Orcia, Tuscany, Italy",
      guestCount: 75,
      budgetUsd: 150000,
      vibe: "Cypress-lined drives, golden hour, candlelit dinner under string lights. Three-day weekend with a welcome aperitivo, wedding day, farewell brunch.",
      plannerStatus: "have_one",
      cultural: "secular",
      formalityTone: "warm",
      destination: true,
    },
  },
  {
    id: "joshua-tree",
    title: "Joshua Tree at dusk",
    region: "Joshua Tree, CA",
    blurb: "Pink sky, cactus silhouettes, mezcal, no chairs at the ceremony.",
    accent: "#D8A28B",
    image: "https://images.unsplash.com/photo-1559779085-2090b6ce411b?auto=format&fit=crop&w=1400&q=80",
    imagePosition: "center 50%",
    brief: {
      dateWindow: "Late October 2026",
      region: "Joshua Tree, CA",
      guestCount: 50,
      budgetUsd: 60000,
      vibe: "Pink sky at dusk. Cactus silhouettes, dust-covered linen, mezcal. Ceremony with no chairs, then a long farm table. Nothing precious.",
      plannerStatus: "want_one",
      cultural: "secular",
      formalityTone: "casual",
      destination: false,
    },
  },
  {
    id: "charleston-garden",
    title: "Charleston garden party",
    region: "Charleston, SC",
    blurb: "Spanish moss, pastel blooms, antique china. Black-tie but warm.",
    accent: "#E8C8D4",
    image: "https://images.unsplash.com/photo-1758810744661-937d2a0b3dd9?auto=format&fit=crop&w=1400&q=80",
    imagePosition: "center 50%",
    brief: {
      dateWindow: "Early April 2026",
      region: "Charleston, SC",
      guestCount: 140,
      budgetUsd: 110000,
      vibe: "Spanish moss and pastel blooms. Antique-feeling china. Southern elegance. black-tie but warm. Hand-written calligraphy on everything.",
      plannerStatus: "have_one",
      cultural: "secular",
      formalityTone: "formal",
      destination: false,
    },
  },
  {
    id: "city-hall-dinner",
    title: "City Hall, then dinner",
    region: "New York, NY",
    blurb: "Two witnesses at noon. The best meal of the year that night.",
    accent: "#C9C7BD",
    image: "https://images.unsplash.com/photo-1774509621816-8c097e4f2d88?auto=format&fit=crop&w=1400&q=80",
    imagePosition: "center 45%",
    brief: {
      dateWindow: "Spring 2026",
      region: "New York, NY",
      guestCount: 14,
      budgetUsd: 25000,
      vibe: "City Hall ceremony at noon, two witnesses. Best meal of the year that night. private dining room, family-style, one toast each. Pavilion at-home brunch the next morning.",
      plannerStatus: "none",
      cultural: "civil",
      formalityTone: "modern",
      destination: false,
    },
  },
];

export function findStarterBrief(id: string): StarterBrief | undefined {
  return STARTER_BRIEFS.find((s) => s.id === id);
}
