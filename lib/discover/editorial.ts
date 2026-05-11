// 8 editorial articles. Stubs for v1 — link to /discover/editorial/[slug] which
// renders a "coming soon" page until real content lands.

export interface EditorialArticle {
  slug: string;
  category: "Florals" | "Stationery" | "Music" | "Logistics" | "Food" | "Contracts" | "Welcome" | "Seating";
  title: string;
  excerpt: string;
  cover: string;
  readMinutes: number;
}

export const EDITORIAL: EditorialArticle[] = [
  { slug: "ninety-minute-cocktail-hour", category: "Logistics",
    title: "The case for a 90-minute cocktail hour",
    excerpt: "The standard 60 minutes was set by venues, not couples. Here's what changes when you give guests a half-hour more before they sit down.",
    cover: "https://images.unsplash.com/photo-1551218372-a8789b81b253?w=1200&q=80",
    readMinutes: 4 },
  { slug: "long-dinner",        category: "Food",
    title: "Why your dinner should be longer than you think",
    excerpt: "Wedding dinners are typically rushed because catering quotes assume a 75-minute service. Pay for 90, plan for 110.",
    cover: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=80",
    readMinutes: 5 },
  { slug: "florals-golden-hour", category: "Florals",
    title: "Florals at golden hour — what to ask your photographer",
    excerpt: "Cool whites, dusty pinks, eucalyptus all shift color in 4pm light. The questions to ask before the bouquets are made.",
    cover: "https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?w=1200&q=80",
    readMinutes: 3 },
  { slug: "five-contracts",      category: "Contracts",
    title: "Five contracts that will surprise you",
    excerpt: "Caterer, photographer, venue, band, florist. The clauses that matter most almost always come up where you didn't expect.",
    cover: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1200&q=80",
    readMinutes: 8 },
  { slug: "force-majeure",       category: "Contracts",
    title: "How to read a venue's force majeure clause",
    excerpt: "The pandemic taught the industry. Most venues now have stronger language — but stronger for whom?",
    cover: "https://images.unsplash.com/photo-1438032005730-c779502df39b?w=1200&q=80",
    readMinutes: 6 },
  { slug: "welcome-bags",        category: "Welcome",
    title: "Welcome bags that don't get thrown away",
    excerpt: "The hangover kit, the local snack, the printed itinerary, the bottle of water. What guests actually use, what gets left in the room.",
    cover: "https://images.unsplash.com/photo-1481260124574-a8df3a96d8b5?w=1200&q=80",
    readMinutes: 4 },
  { slug: "music-brief",          category: "Music",
    title: "Building a music brief your DJ will actually use",
    excerpt: "Ten do-not-plays, three must-plays, an arc for the night, and a cap on requests. The two-page brief that prevents a bad reception.",
    cover: "https://images.unsplash.com/photo-1525362081669-2b476bb628c3?w=1200&q=80",
    readMinutes: 5 },
  { slug: "seating-problem",      category: "Seating",
    title: "The seating chart problem and how we solved it",
    excerpt: "Why human-built seating charts always look like family politics. What changes when a solver respects the politics but optimizes the room.",
    cover: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1200&q=80",
    readMinutes: 7 },
];
