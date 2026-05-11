// 12 trending venues. Hardcoded for v1.

export type VenueRegion = "Coastal" | "Vineyard" | "Urban" | "Garden" | "Destination";

export interface DiscoverVenue {
  id: string;
  name: string;
  region: VenueRegion;
  city: string;
  image: string;
  description: string;
  bookingsTrend: string;
  availability: string;
  vibeTags: string[];
}

export const DISCOVER_VENUES: DiscoverVenue[] = [
  { id: "v1", name: "Hudson Valley Barn",     region: "Garden",      city: "Hudson, NY",
    image: "https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=1200&q=80",
    description: "Reclaimed-wood interior, working farm, ceremony in the orchard.",
    bookingsTrend: "Bookings up 28%", availability: "9 dates in 2027", vibeTags: ["pressed-linen", "english-countryside"] },
  { id: "v2", name: "Foxglove Estate",        region: "Garden",      city: "Rhinebeck, NY",
    image: "https://images.unsplash.com/photo-1501696461415-6bd6660c6742?w=1200&q=80",
    description: "Private estate, on-site lodging, peony garden in late spring.",
    bookingsTrend: "Bookings up 22%", availability: "6 dates in 2027", vibeTags: ["old-money-garden-party"] },
  { id: "v3", name: "Belmond Caruso",         region: "Coastal",     city: "Ravello, Italy",
    image: "https://images.unsplash.com/photo-1533699025563-1eb4f9b4d6f9?w=1200&q=80",
    description: "Cliffside terrace, infinity pool ceremony, Amalfi at sunset.",
    bookingsTrend: "Bookings up 41%", availability: "3 dates in 2027", vibeTags: ["coastal-italian"] },
  { id: "v4", name: "Borgo Stomennano",       region: "Destination", city: "Tuscany, Italy",
    image: "https://images.unsplash.com/photo-1499678329028-101435549a4e?w=1200&q=80",
    description: "12th-century estate. Olive groves, cypress allée, long communal dinners.",
    bookingsTrend: "Bookings up 19%", availability: "8 dates in 2027", vibeTags: ["tuscan-garden"] },
  { id: "v5", name: "Cannon Green",           region: "Urban",       city: "Charleston, SC",
    image: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1200&q=80",
    description: "Restored church, original heart-pine floors, courtyard cocktail.",
    bookingsTrend: "Bookings up 14%", availability: "11 dates in 2027", vibeTags: ["quiet-modern", "old-money-garden-party"] },
  { id: "v6", name: "Vrbo Joshua",            region: "Destination", city: "Joshua Tree, CA",
    image: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80",
    description: "Boulder-and-yucca desert. Sunsets photograph dramatically.",
    bookingsTrend: "Bookings up 36%", availability: "12 dates in 2027", vibeTags: ["quiet-modern"] },
  { id: "v7", name: "Ventana Big Sur",        region: "Coastal",     city: "Big Sur, CA",
    image: "https://images.unsplash.com/photo-1510227272981-87123e259b17?w=1200&q=80",
    description: "Cliffside redwoods, foggy mornings, intimate cap of 100.",
    bookingsTrend: "Bookings up 24%", availability: "4 dates in 2027", vibeTags: ["coastal-italian", "pressed-linen"] },
  { id: "v8", name: "Sublime Comporta",        region: "Coastal",     city: "Comporta, Portugal",
    image: "https://images.unsplash.com/photo-1518684079-3c830dcef090?w=1200&q=80",
    description: "Pine-forest cottages, empty Atlantic beaches, low-key luxe.",
    bookingsTrend: "Bookings up 52%", availability: "9 dates in 2027", vibeTags: ["coastal-italian", "quiet-modern"] },
  { id: "v9", name: "Inn at Walpole",          region: "Vineyard",    city: "Sonoma, CA",
    image: "https://images.unsplash.com/photo-1505839673365-e3971f8d9184?w=1200&q=80",
    description: "Vineyard ceremony, in-house tasting menu. Strong on weeknights.",
    bookingsTrend: "Bookings up 18%", availability: "16 dates in 2027", vibeTags: ["tuscan-garden", "pressed-linen"] },
  { id: "v10", name: "Hôtel de Crillon",       region: "Urban",       city: "Paris, France",
    image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&q=80",
    description: "Place de la Concorde. City-hall civil + private mansion reception.",
    bookingsTrend: "Bookings up 11%", availability: "5 dates in 2027", vibeTags: ["quiet-modern", "old-money-garden-party"] },
  { id: "v11", name: "Wave Hill",              region: "Garden",      city: "Bronx, NY",
    image: "https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?w=1200&q=80",
    description: "Greenhouse-style conservatory, the Hudson visible, intimate cap.",
    bookingsTrend: "Bookings up 27%", availability: "7 dates in 2027", vibeTags: ["greenhouse"] },
  { id: "v12", name: "El Cosmico",             region: "Destination", city: "Marfa, TX",
    image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80",
    description: "High-desert tents and yurts. Art-world crowd, two-day affairs.",
    bookingsTrend: "Bookings up 33%", availability: "13 dates in 2027", vibeTags: ["mountain-lodge", "quiet-modern"] },
];
