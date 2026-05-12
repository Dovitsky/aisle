// Region-matched hero photo fallback.
//
// When the AI-generated brief.heroImage hasn't arrived yet (or failed,
// or is just the placeholder SVG), the dashboard should never show
// blank cream space. We pick a curated stock photo whose vibe matches
// the brief's region — Tuscany sun for Amalfi, autumn foliage for the
// Hudson Valley, vineyard golds for Napa, etc. — and fall back to a
// universally beautiful wedding scene if no keyword matches.
//
// All URLs are Unsplash images (free for commercial use, no attribution
// required), accessed via their auto-format CDN with width=1800.

import type { Brief } from "./types";

interface RegionHero {
  /** Keywords (lowercase) to match against brief.region and brief.vibe. */
  match: string[];
  /** Unsplash photo URL — landscape orientation, wedding-appropriate. */
  url: string;
  /** Short description for alt text. */
  alt: string;
}

const HERO_LIBRARY: RegionHero[] = [
  {
    match: [
      "italy", "italian", "amalfi", "tuscany", "tuscan", "sicily",
      "florence", "rome", "venice", "umbria", "puglia", "como",
      "val d'orcia", "maiori", "positano", "ravello", "cinque terre",
    ],
    url: "https://images.unsplash.com/photo-1523592121529-f6dde35f079e?auto=format&fit=crop&w=1800&q=80",
    alt: "Sunlit Italian villa with cypress trees and a long candlelit table",
  },
  {
    match: ["france", "french", "provence", "burgundy", "loire", "paris", "bordeaux", "champagne"],
    url: "https://images.unsplash.com/photo-1499678329028-101435549a4e?auto=format&fit=crop&w=1800&q=80",
    alt: "French countryside chateau in the soft afternoon light",
  },
  {
    match: ["hudson valley", "catskills", "upstate", "kingston", "rhinebeck", "beacon"],
    url: "https://images.unsplash.com/photo-1507371341162-763b5e419408?auto=format&fit=crop&w=1800&q=80",
    alt: "Hudson Valley autumn foliage over a stone barn",
  },
  {
    match: ["vermont", "maine", "new england", "berkshires", "stowe", "nantucket", "martha's vineyard"],
    url: "https://images.unsplash.com/photo-1605000797499-95a51c5269ae?auto=format&fit=crop&w=1800&q=80",
    alt: "New England coastline at golden hour",
  },
  {
    match: ["napa", "sonoma", "california", "santa barbara", "ojai", "carmel", "big sur", "santa ynez"],
    url: "https://images.unsplash.com/photo-1505873242700-f289a29e1e0f?auto=format&fit=crop&w=1800&q=80",
    alt: "California vineyard rows in summer light",
  },
  {
    match: ["charleston", "savannah", "lowcountry", "south carolina", "georgia coast"],
    url: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1800&q=80",
    alt: "Southern oaks draped in Spanish moss",
  },
  {
    match: ["mexico", "tulum", "cabo", "san miguel", "oaxaca", "merida", "playa", "riviera maya"],
    url: "https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?auto=format&fit=crop&w=1800&q=80",
    alt: "Palm-shaded courtyard with turquoise water beyond",
  },
  {
    match: ["greece", "greek", "santorini", "mykonos", "crete", "paros", "aegean"],
    url: "https://images.unsplash.com/photo-1530841377377-3ff06c0ca713?auto=format&fit=crop&w=1800&q=80",
    alt: "Whitewashed Cycladic walls against a deep-blue Aegean",
  },
  {
    match: ["bali", "indonesia", "ubud", "thailand", "vietnam", "tropics", "tropical"],
    url: "https://images.unsplash.com/photo-1537956965359-7573183d1f57?auto=format&fit=crop&w=1800&q=80",
    alt: "Tropical jungle clearing with ceremonial canopy",
  },
  {
    match: [
      "scotland", "ireland", "irish", "scottish", "highlands", "isle of skye",
      "cotswolds", "lake district", "yorkshire", "england", "british",
    ],
    url: "https://images.unsplash.com/photo-1486931336534-ee9bbe45a2eb?auto=format&fit=crop&w=1800&q=80",
    alt: "Misty British countryside with stone walls",
  },
  {
    match: ["colorado", "aspen", "telluride", "rocky mountain", "montana", "wyoming", "jackson hole"],
    url: "https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=1800&q=80",
    alt: "Rocky Mountain vista with wildflowers",
  },
  {
    match: ["texas", "austin", "hill country", "marfa"],
    url: "https://images.unsplash.com/photo-1602741244599-fdfd1b88001a?auto=format&fit=crop&w=1800&q=80",
    alt: "Texas Hill Country bluebonnets at dusk",
  },
  {
    match: ["beach", "ocean", "seaside", "coastal", "shore", "island"],
    url: "https://images.unsplash.com/photo-1525258946800-98cfd641d0de?auto=format&fit=crop&w=1800&q=80",
    alt: "Beachside ceremony arch facing the open ocean",
  },
];

// Universal fallback — the same warm candlelit-bouquet image the landing
// page uses. Never blank. Premium. Works for any wedding.
const DEFAULT_HERO =
  "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1800&q=80";
const DEFAULT_HERO_ALT =
  "A long candlelit wedding table at golden hour";

export function regionHeroFallback(brief: Brief | null | undefined): {
  url: string;
  alt: string;
} {
  if (!brief) return { url: DEFAULT_HERO, alt: DEFAULT_HERO_ALT };
  const haystack = `${brief.region ?? ""} ${brief.vibe ?? ""}`.toLowerCase();
  for (const entry of HERO_LIBRARY) {
    if (entry.match.some((keyword) => haystack.includes(keyword))) {
      return { url: entry.url, alt: entry.alt };
    }
  }
  return { url: DEFAULT_HERO, alt: DEFAULT_HERO_ALT };
}
