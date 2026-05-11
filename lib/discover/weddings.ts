// 6 real-wedding case studies (curated v1 fixtures).

export interface RealWedding {
  id: string;
  couple: string;
  region: string;
  season: string;
  guestCount: number;
  budgetBand: string;
  vibeTags: string[];
  hero: string;
  vendors: { role: string; name: string }[];
  pullQuote: string;
}

export const REAL_WEDDINGS: RealWedding[] = [
  { id: "w1", couple: "Maya & Daniel", region: "Sonoma, CA", season: "October",
    guestCount: 85, budgetBand: "$80-100K",
    vibeTags: ["tuscan-garden", "pressed-linen"],
    hero: "https://images.unsplash.com/photo-1505839673365-e3971f8d9184?w=1400&q=80",
    vendors: [
      { role: "Venue", name: "Inn at Walpole" },
      { role: "Photographer", name: "Iris & Oak Studio" },
      { role: "Florist", name: "Wildgrove Florals" },
      { role: "Caterer", name: "Olive & Salt Catering" },
    ],
    pullQuote: "We didn't realize how much of the day we'd remember from before the ceremony. We're glad someone was watching the small things.",
  },
  { id: "w2", couple: "Priya & Rohan", region: "Maiori, Italy", season: "Late May",
    guestCount: 62, budgetBand: "$140-180K",
    vibeTags: ["coastal-italian"],
    hero: "https://images.unsplash.com/photo-1533699025563-1eb4f9b4d6f9?w=1400&q=80",
    vendors: [
      { role: "Venue", name: "Belmond Caruso" },
      { role: "Photographer", name: "Linen + Light Photo" },
      { role: "Florist", name: "Atelier Maison" },
      { role: "Music", name: "Velvet Hour Trio" },
    ],
    pullQuote: "We chose a 90-minute cocktail hour instead of 60. Nobody wanted to sit down. That's the highest praise.",
  },
  { id: "w3", couple: "James & Eli", region: "Hudson Valley, NY", season: "September",
    guestCount: 120, budgetBand: "$110-130K",
    vibeTags: ["pressed-linen", "english-countryside"],
    hero: "https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=1400&q=80",
    vendors: [
      { role: "Venue", name: "Hudson Valley Barn" },
      { role: "Photographer", name: "North Star Photography" },
      { role: "Florist", name: "Wildgrove Florals" },
      { role: "Caterer", name: "Hudson Valley Table Co." },
    ],
    pullQuote: "We let go of the seating chart battle and trusted the solver. Nobody noticed the politics. That's the win.",
  },
  { id: "w4", couple: "Sara & Tom", region: "Marfa, TX", season: "Early November",
    guestCount: 48, budgetBand: "$45-60K",
    vibeTags: ["mountain-lodge", "quiet-modern"],
    hero: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1400&q=80",
    vendors: [
      { role: "Venue", name: "El Cosmico" },
      { role: "Photographer", name: "Field Notes Studio" },
      { role: "Florist", name: "Sage Atelier Florals" },
    ],
    pullQuote: "Two-day, low-key, dinner-party energy. We picked Marfa because nobody could just drive in for the night.",
  },
  { id: "w5", couple: "Lucia & Anders", region: "Lisbon → Comporta", season: "Mid-September",
    guestCount: 70, budgetBand: "$95-125K",
    vibeTags: ["coastal-italian", "quiet-modern"],
    hero: "https://images.unsplash.com/photo-1518684079-3c830dcef090?w=1400&q=80",
    vendors: [
      { role: "Venue", name: "Sublime Comporta" },
      { role: "Photographer", name: "Iris & Oak Studio" },
      { role: "Music", name: "Open Sky Brass" },
      { role: "Cake", name: "Linden Provisions" },
    ],
    pullQuote: "Portugal stretched the budget further than Italy would have. The light was the same. Nobody noticed the difference.",
  },
  { id: "w6", couple: "Amelia & Jordan", region: "Charleston, SC", season: "Mid-March",
    guestCount: 105, budgetBand: "$70-90K",
    vibeTags: ["old-money-garden-party"],
    hero: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1400&q=80",
    vendors: [
      { role: "Venue", name: "Cannon Green" },
      { role: "Photographer", name: "Iris & Oak Studio" },
      { role: "Florist", name: "Ivy & Vellum" },
      { role: "Caterer", name: "Hearth Hospitality" },
    ],
    pullQuote: "We thought we wanted formal. We ended up with garden-party formal. Best of both.",
  },
];
