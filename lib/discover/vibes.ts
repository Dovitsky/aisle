// The eight curated vibes shown in the Discover horizontal scroller.
// v1: hardcoded. v2: moves to a CMS surface.

export interface Vibe {
  slug: string;
  name: string;
  image: string;
  boardCount: number;
  description: string;
  palette: string[];
  signaturePieces: string[];
}

export const VIBES: Vibe[] = [
  {
    slug: "coastal-italian",
    name: "Coastal Italian",
    image: "https://images.unsplash.com/photo-1533699025563-1eb4f9b4d6f9?w=900&q=80",
    boardCount: 312,
    description: "Cliffside ceremonies, terracotta urns, lemon trees, dripping candles down long pergola tables. The Mediterranean restraint, photographed in golden hour.",
    palette: ["#F5EFDF", "#C9967A", "#7C8A6E", "#1A2A2E", "#E8DCC4"],
    signaturePieces: ["Hand-thrown terracotta", "Olive branch garlands", "Limoncello welcome", "Pergola dinner"],
  },
  {
    slug: "tuscan-garden",
    name: "Tuscan Garden",
    image: "https://images.unsplash.com/photo-1499678329028-101435549a4e?w=900&q=80",
    boardCount: 287,
    description: "Olive groves, stone villas, long communal dinners under cypress. Slow food, slow light, no rushing.",
    palette: ["#F4ECDB", "#A88E6A", "#7C5E3A", "#5B4329", "#E2D9C4"],
    signaturePieces: ["Stone villa cortile", "Heirloom tomato course", "Cypress allée", "Hand-calligraphed menu"],
  },
  {
    slug: "quiet-modern",
    name: "Quiet Modern",
    image: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=900&q=80",
    boardCount: 241,
    description: "Architectural floral installs, no centerpieces, brushed brass, ivory linen with no overlay. Reception lit from above. Clean, considered, controlled.",
    palette: ["#F8F6F1", "#D6CFC2", "#3F3D38", "#1A1814", "#B5AB9A"],
    signaturePieces: ["Suspended floral install", "Sculptural taper candles", "Brushed brass flatware", "Single-bloom centerpieces"],
  },
  {
    slug: "pressed-linen",
    name: "Pressed Linen",
    image: "https://images.unsplash.com/photo-1525772764200-be829a350797?w=900&q=80",
    boardCount: 198,
    description: "Sun-bleached linen, weathered terracotta, dried grasses, oyster-shell accents. Open-air ceremony into a long communal dinner.",
    palette: ["#F0E8D8", "#D9BFA0", "#A88E6A", "#525443", "#FAF6E9"],
    signaturePieces: ["Sun-bleached oak chairs", "Three-tone linen napkins", "Dried grass garlands", "Beeswax tapers"],
  },
  {
    slug: "greenhouse",
    name: "Greenhouse",
    image: "https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?w=900&q=80",
    boardCount: 176,
    description: "A converted glasshouse: hanging ivy, long taper candles, deep green and ivory palette. Ferns, asparagus fern, smilax. botanically literal.",
    palette: ["#F8F6E9", "#C8D2BB", "#5B6748", "#1F3025", "#EFE8D2"],
    signaturePieces: ["Hanging ivy + smilax", "Wooden farmhouse tables", "Brass candelabras", "Glass ceiling at dusk"],
  },
  {
    slug: "mountain-lodge",
    name: "Mountain Lodge",
    image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=900&q=80",
    boardCount: 142,
    description: "Aspen at peak, woolen runners, dark walnut tables, wax-sealed paper. Late September into October. Photographs feel like an old fly-fishing magazine.",
    palette: ["#F4ECD8", "#C99A4D", "#8B5A2B", "#3F3026", "#EFE0BB"],
    signaturePieces: ["Wool table runners", "Pinecone + spruce", "Wax-seal stationery", "Whiskey welcome"],
  },
  {
    slug: "old-money-garden-party",
    name: "Old Money Garden Party",
    image: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=900&q=80",
    boardCount: 134,
    description: "White tents on a manicured lawn, blue-and-white china, peonies, late-spring strawberries. Heirloom-feeling, never costume-y.",
    palette: ["#FBF8F1", "#A8C0D6", "#5C7A9C", "#2D3A33", "#E2DDC8"],
    signaturePieces: ["White peg-and-pole tent", "Blue-and-white Spode china", "Peonies + sweet pea", "Strawberry shortcake bar"],
  },
  {
    slug: "english-countryside",
    name: "English Countryside",
    image: "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=900&q=80",
    boardCount: 118,
    description: "A rambling rectory, wisteria, bunting, trifle and Pimms. Felt-hat photographer. Reads warm in any weather.",
    palette: ["#FCF4ED", "#F1D6C9", "#E0AC8A", "#5C4B36", "#ECE3D2"],
    signaturePieces: ["Wisteria archway", "Pimms welcome cups", "Trifle bar", "Bunting + paper lanterns"],
  },
];

export function findVibe(slug: string): Vibe | undefined {
  return VIBES.find((v) => v.slug === slug);
}
