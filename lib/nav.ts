// Shared navigation map. Used by MenuOverlay (full-screen) and NavSpread
// (inline mega-menu on the home page).

import type { ProjectState } from "./types";

export type NavItem = {
  href: string;
  label: string;
  scope?: "dress" | "honeymoon" | "speech" | "vows_partner";
  viewerOnly?: ("organizer" | "partner" | "planner" | "vendor")[];
};

export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  { label: "The wedding", items: [
    { href: "/", label: "Home" },
    { href: "/timeline", label: "Phases" },
    { href: "/approvals", label: "Decisions" },
    { href: "/inbox", label: "Inbox" },
  ]},
  { label: "Inspiration", items: [
    { href: "/discover", label: "Discover" },
    { href: "/mood-board", label: "Mood board" },
  ]},
  { label: "Build", items: [
    { href: "/vendors", label: "Vendors" },
    { href: "/budget", label: "Budget" },
    { href: "/guests", label: "Guests" },
    { href: "/dietary", label: "Dietary" },
    { href: "/wedding-party", label: "Party" },
    { href: "/design", label: "Design" },
    { href: "/florals", label: "Florals" },
    { href: "/stationery", label: "Stationery" },
    { href: "/website", label: "Website" },
    { href: "/seating", label: "Seating" },
    { href: "/logistics", label: "Logistics" },
    { href: "/rentals", label: "Rentals" },
  ]},
  { label: "The day", items: [
    { href: "/ceremony", label: "Ceremony" },
    { href: "/music", label: "Music" },
    { href: "/cake", label: "Cake" },
    { href: "/bar", label: "Bar" },
    { href: "/beauty", label: "Hair & makeup" },
    { href: "/pre-events", label: "Other events" },
    { href: "/memorials", label: "Memorials" },
  ]},
  { label: "Personal", items: [
    { href: "/personal-prep", label: "Vows" },
    { href: "/dress", label: "Dress", scope: "dress" },
    { href: "/speeches", label: "Speeches", scope: "speech" },
    { href: "/honeymoon", label: "Honeymoon", scope: "honeymoon" },
    { href: "/registry", label: "Registry" },
    { href: "/engagement", label: "Engagement" },
    { href: "/visits", label: "Visits" },
    { href: "/license", label: "License" },
  ]},
  { label: "After", items: [
    { href: "/day-of", label: "Day-of" },
    { href: "/tips", label: "Tips" },
    { href: "/thanks", label: "Thank-yous" },
    { href: "/planner", label: "Planner", viewerOnly: ["planner"] },
    { href: "/portal", label: "Vendor portal", viewerOnly: ["vendor"] },
    { href: "/pricing", label: "Pricing" },
    { href: "/settings", label: "Settings" },
  ]},
];

export function isVisible(item: NavItem, state: ProjectState | null): boolean {
  if (!state) return true;
  if (item.scope && state.viewer === "partner" && state.gates[item.scope]) return false;
  if (item.viewerOnly && !item.viewerOnly.includes(state.viewer)) return false;
  return true;
}
