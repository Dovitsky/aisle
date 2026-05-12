// Page context. gives the chat dock a sense of *where the couple is in the
// app* so short imperatives ("find cheaper ones", "draft an email", "more
// options") can be interpreted against the right vendor category, agent, or
// topic.
//
// The client passes a small `PageContext` object to `/api/chat`. The server
// hands it to Maestro (Anthropic gets it via the system prompt; the offline
// rule-based parser uses `vendorCategory` for short-imperative shortcuts).

import type { VendorCategory } from "./types";

export interface PageContext {
  /** Pathname this message originated from. */
  route: string;
  /** Human label. what Maestro should say to acknowledge the context. */
  label: string;
  /** When the page is about a vendor category, this lets short imperatives
   *  resolve to "this category". */
  vendorCategory?: VendorCategory;
  /** One-line topic for the model. "florals and the floral program",
   *  "the bar program", "the seating chart". */
  topic: string;
  /** Optional active sub-context. e.g. on /vendors with category filtered. */
  active?: { kind: "vendor_category"; category: VendorCategory };
}

const ROUTE_MAP: Record<string, PageContext> = {
  "/florals":      { route: "/florals",      label: "Florals",        vendorCategory: "Florist",      topic: "florals and the per-piece floral program" },
  "/music":        { route: "/music",        label: "Music",          vendorCategory: "Band",         topic: "music. band, DJ, ceremony cues, the setlist" },
  "/cake":         { route: "/cake",         label: "Cake",           vendorCategory: "Cake",         topic: "the cake spec. tiers, flavors, decoration" },
  "/bar":          { route: "/bar",          label: "Bar program",    vendorCategory: "Bartending",   topic: "the bar program. wine, beer, signatures" },
  "/beauty":       { route: "/beauty",       label: "Hair & Makeup",  vendorCategory: "Hair & Makeup",topic: "hair and makeup, the day-of beauty timeline" },
  "/rentals":      { route: "/rentals",      label: "Rentals",        vendorCategory: "Rentals",      topic: "rentals. chairs, tables, linens, glassware" },
  "/stationery":   { route: "/stationery",   label: "Stationery",     vendorCategory: "Stationer",    topic: "the stationery suite. save-the-dates, invitations, place cards" },
  "/website":      { route: "/website",      label: "Wedding website", topic: "the guest-facing wedding website" },
  "/ceremony":     { route: "/ceremony",     label: "Ceremony",       vendorCategory: "Officiant",    topic: "the ceremony script and the officiant" },
  "/seating":      { route: "/seating",      label: "Seating chart",  topic: "the seating chart and the cartographer's solution" },
  "/dietary":      { route: "/dietary",      label: "Dietary",        vendorCategory: "Caterer",      topic: "dietary accommodations and the caterer brief" },
  "/budget":       { route: "/budget",       label: "Budget",         topic: "the budget envelope and per-category allocation" },
  "/guests":       { route: "/guests",       label: "Guests",         topic: "the guest list and RSVPs" },
  "/registry":     { route: "/registry",     label: "Registry",       topic: "the gift registry" },
  "/honeymoon":    { route: "/honeymoon",    label: "Honeymoon",      topic: "the honeymoon itinerary" },
  "/dress":        { route: "/dress",        label: "Dress",          topic: "the dress directions (gated)" },
  "/personal-prep": { route: "/personal-prep", label: "Vows",         topic: "your vows draft" },
  "/speeches":     { route: "/speeches",     label: "Speeches",       topic: "wedding-party speeches and toasts" },
  "/license":      { route: "/license",      label: "Marriage license", topic: "the marriage license filing" },
  "/wedding-party": { route: "/wedding-party", label: "Wedding party", topic: "the wedding party. bridesmaids, groomsmen, roles" },
  "/logistics":    { route: "/logistics",    label: "Logistics",      vendorCategory: "Transportation", topic: "logistics. hotel block, shuttles, welcome bags" },
  "/day-of":       { route: "/day-of",       label: "Day-of",         topic: "the day-of timeline and contingency bands" },
  "/inbox":        { route: "/inbox",        label: "Inbox",          topic: "the vendor email inbox and replies" },
  // /approvals merged into / (home command center). Stays mapped so old
  // references resolve to the home-page context cleanly.
  "/approvals":    { route: "/",             label: "Home",           topic: "your approvals queue (on the home command center)" },
  "/timeline":     { route: "/timeline",     label: "Timeline",       topic: "the 12-month checklist" },
  "/pre-events":   { route: "/pre-events",   label: "Pre-events",     topic: "rehearsal dinner, welcome drinks, next-day brunch" },
  "/memorials":    { route: "/memorials",    label: "Memorials",      topic: "memorials and tributes during the ceremony" },
  "/visits":       { route: "/visits",       label: "Site visits",    topic: "venue tours and tastings" },
  "/tips":         { route: "/tips",         label: "Tip envelopes",  topic: "tip envelopes for the day-of vendors" },
  "/thanks":       { route: "/thanks",       label: "Thank-yous",     topic: "thank-you notes" },
  "/engagement":   { route: "/engagement",   label: "Engagement",     topic: "engagement milestones. ring, proposal, photos, announcement" },
  "/discover":     { route: "/discover",     label: "Discover",       topic: "the Discover surface. trending venues, vibes, real weddings" },
  "/mood-board":   { route: "/mood-board",   label: "Mood board",     topic: "your mood board. pins, generations, design references" },
  "/vendors":      { route: "/vendors",      label: "Vendors",        topic: "the vendor pipeline" },
  "/design":       { route: "/design",       label: "Design",         topic: "the design directions and mood-board" },
};

export function pageContextForPath(pathname: string): PageContext | null {
  // Exact match first
  if (ROUTE_MAP[pathname]) return ROUTE_MAP[pathname];
  // Dynamic prefixes (vibe slug, etc.). fall back to the parent.
  for (const route of Object.keys(ROUTE_MAP)) {
    if (pathname.startsWith(route + "/")) return ROUTE_MAP[route];
  }
  return null;
}
