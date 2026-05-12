// "Trending now". a mixed-content feed combining photo, vibe, trend, and
// real-wedding cards. v1 is hardcoded; v2 moves to a CMS surface refreshed
// weekly by Corsia's editorial team.

export type TrendingItem =
  | { kind: "photo";   id: string; image: string; place: string; credit: string; pinnedThisWeek: number }
  | { kind: "vibe";    id: string; vibeSlug: string; vibeName: string; planningCount: number }
  | { kind: "trend";   id: string; eyebrow: string; headline: string; excerpt: string; stat: string }
  | { kind: "wedding"; id: string; weddingId: string; couple: string; region: string; season: string; image: string };

export const TRENDING: TrendingItem[] = [
  { kind: "photo", id: "p1",
    image: "https://images.unsplash.com/photo-1525772764200-be829a350797?w=900&q=80",
    place: "Maiori, Amalfi Coast", credit: "Iris & Oak Studio", pinnedThisWeek: 1420 },
  { kind: "vibe", id: "vc1", vibeSlug: "coastal-italian", vibeName: "Coastal Italian, late afternoon", planningCount: 312 },
  { kind: "trend", id: "t1",
    eyebrow: "Trending up",
    headline: "Smaller dance floors, longer dinners",
    excerpt: "Couples are reallocating dance-floor budget to two-hour dinners. The four-hour reception is becoming the five-hour one.",
    stat: "Up 32% YoY in Corsia-planned weddings" },
  { kind: "wedding", id: "wc1", weddingId: "w1", couple: "Maya & Daniel", region: "Sonoma", season: "October",
    image: "https://images.unsplash.com/photo-1505839673365-e3971f8d9184?w=900&q=80" },
  { kind: "photo", id: "p2",
    image: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=900&q=80",
    place: "Cotswolds, England", credit: "Linen + Light Photo", pinnedThisWeek: 980 },
  { kind: "vibe", id: "vc2", vibeSlug: "tuscan-garden", vibeName: "Tuscan Garden", planningCount: 287 },
  { kind: "trend", id: "t2",
    eyebrow: "Trending down",
    headline: "Plated formal dinners",
    excerpt: "Couples are moving to family-style and stations. More table interaction, less waitstaff overhead, faster service.",
    stat: "Down 18% in 2026 bookings" },
  { kind: "photo", id: "p3",
    image: "https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?w=900&q=80",
    place: "Glasshouse, Catskills", credit: "Field Notes Studio", pinnedThisWeek: 760 },
  { kind: "wedding", id: "wc2", weddingId: "w3", couple: "James & Eli", region: "Hudson Valley", season: "September",
    image: "https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=900&q=80" },
  { kind: "vibe", id: "vc3", vibeSlug: "greenhouse", vibeName: "Greenhouse", planningCount: 176 },
  { kind: "trend", id: "t3",
    eyebrow: "Trending up",
    headline: "Two-day weekends",
    excerpt: "Welcome dinners on Friday, ceremony on Saturday, brunch Sunday. The full weekend is becoming the default for destination weddings.",
    stat: "Up 24% in destination bookings" },
  { kind: "photo", id: "p4",
    image: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=900&q=80",
    place: "Joshua Tree, CA", credit: "Iris & Oak Studio", pinnedThisWeek: 612 },
];
