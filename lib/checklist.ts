// 12-month wedding-planning checklist.
//
// Each item declares when it should land (monthsOut), a short title, the
// agent or page that owns the work, and an `isDone(state)` predicate that
// auto-checks the item from real signals (vendor contracted, approval
// resolved, license filed, etc.) — no manual checkbox needed.

import type { ProjectState } from "./types";

export interface ChecklistItem {
  id: string;
  monthsOut: number;             // ~ months before the wedding date
  title: string;
  detail: string;
  area: string;                  // Foundation / Discovery / Design / Logistics / Paperwork / Day-of / After
  href?: string;                 // route to jump to
  isDone: (s: ProjectState) => boolean;
}

const venueLocked = (s: ProjectState) =>
  s.vendors.some((v) => v.category === "Venue" && (v.status === "contracted" || v.status === "paid"));

const cat = (s: ProjectState, c: string) =>
  s.vendors.some((v) => v.category === c && (v.status === "contracted" || v.status === "paid"));

const approvalApproved = (s: ProjectState, kind: string) =>
  s.approvals.some((a) => a.action.kind === kind && a.status === "approved");

export const CHECKLIST: ChecklistItem[] = [
  // ---------- 12 months ----------
  {
    id: "lock-brief",
    monthsOut: 12,
    title: "Seal the dossier",
    detail: "Date window, region, guest count, budget, vibe. Releases the team.",
    area: "Foundation",
    href: "/dossier",
    isDone: (s) => !!s.brief?.locked,
  },
  {
    id: "book-venue",
    monthsOut: 12,
    title: "Book the venue",
    detail: "Foundation of every other date. Popular venues book 12-18 months out.",
    area: "Foundation",
    href: "/vendors",
    isDone: venueLocked,
  },
  {
    id: "set-date",
    monthsOut: 12,
    title: "Lock the date",
    detail: "Once the venue confirms, freeze the date everywhere.",
    area: "Foundation",
    href: "/dossier",
    isDone: (s) => !!s.brief?.weddingDate,
  },

  // ---------- 10 months ----------
  {
    id: "hire-photographer",
    monthsOut: 10,
    title: "Hire the photographer",
    detail: "In-demand photographers book a year out. Same for videographer.",
    area: "Discovery",
    href: "/vendors",
    isDone: (s) => cat(s, "Photographer"),
  },
  {
    id: "choose-officiant",
    monthsOut: 10,
    title: "Choose the officiant",
    detail: "Friend, civil, or clergy — affects ceremony script and license rules.",
    area: "Discovery",
    href: "/ceremony",
    isDone: (s) => cat(s, "Officiant") || (s.ceremony && s.ceremony.length > 0),
  },

  // ---------- 9 months ----------
  {
    id: "lock-mood",
    monthsOut: 9,
    title: "Lock the design direction",
    detail: "Designer proposes six mood-board directions; you pick one.",
    area: "Design",
    href: "/design",
    isDone: (s) => approvalApproved(s, "publish_design"),
  },
  {
    id: "save-the-dates",
    monthsOut: 9,
    title: "Send save-the-dates",
    detail: "Six to eight months ahead — earlier for destinations.",
    area: "Discovery",
    href: "/stationery",
    isDone: (s) => approvalApproved(s, "send_save_the_date"),
  },
  {
    id: "open-registry",
    monthsOut: 9,
    title: "Open the registry",
    detail: "Curator proposes 12-18 items; opens before save-the-dates ship.",
    area: "Personal",
    href: "/registry",
    isDone: (s) => s.registry.length > 0,
  },
  {
    id: "guest-list",
    monthsOut: 9,
    title: "Build the guest list",
    detail: "Reach 80% confidence before invitations ship.",
    area: "Build",
    href: "/guests",
    isDone: (s) => s.guests.length >= Math.max(20, (s.brief?.guestCount ?? 100) * 0.5),
  },

  // ---------- 8 months ----------
  {
    id: "wedding-website",
    monthsOut: 8,
    title: "Publish the wedding website",
    detail: "Travel info, schedule, RSVP. Lives on aisle.wedding/<your-slug>.",
    area: "Build",
    href: "/website",
    isDone: (s) => approvalApproved(s, "publish_website") || !!s.site?.schedulePublished,
  },

  // ---------- 7 months ----------
  {
    id: "hire-caterer",
    monthsOut: 7,
    title: "Hire the caterer",
    detail: "Drives bar program, dietary brief, rentals headcount.",
    area: "Logistics",
    href: "/vendors",
    isDone: (s) => cat(s, "Caterer"),
  },
  {
    id: "hire-band",
    monthsOut: 7,
    title: "Hire the band or DJ",
    detail: "Cantor builds the setlist once they're locked.",
    area: "Logistics",
    href: "/vendors",
    isDone: (s) => cat(s, "Band") || cat(s, "DJ"),
  },
  {
    id: "hire-florist",
    monthsOut: 7,
    title: "Hire the florist",
    detail: "Botanist drafts the floral program against your locked design direction.",
    area: "Design",
    href: "/florals",
    isDone: (s) => cat(s, "Florist") || s.florals.length > 0,
  },

  // ---------- 6 months ----------
  {
    id: "block-hotels",
    monthsOut: 6,
    title: "Block hotel rooms",
    detail: "For out-of-town guests. Quartermaster prepares the welcome bag.",
    area: "Logistics",
    href: "/logistics",
    isDone: (s) => s.hotelBlocks.length > 0 || approvalApproved(s, "block_hotel_rooms"),
  },
  {
    id: "order-attire",
    monthsOut: 6,
    title: "Order attire",
    detail: "4-6 months for alterations on dresses; suits ~3 months.",
    area: "Personal",
    href: "/dress",
    isDone: (s) => s.designs.some((d) => d.kind === "dress_concept" && !!d.approved),
  },
  {
    id: "rehearsal-dinner",
    monthsOut: 6,
    title: "Plan the rehearsal dinner",
    detail: "Add to /pre-events. Same vendor pipeline as the main day.",
    area: "Logistics",
    href: "/pre-events",
    isDone: (s) => s.preEvents.some((e) => e.kind === "rehearsal_dinner"),
  },

  // ---------- 4 months ----------
  {
    id: "menu-tasting",
    monthsOut: 4,
    title: "Menu tasting + dietary brief",
    detail: "Larder reconciles menu against guest allergens; sends caterer brief.",
    area: "Logistics",
    href: "/dietary",
    isDone: (s) => approvalApproved(s, "send_caterer_brief") || s.menu.length > 0,
  },
  {
    id: "lock-cake",
    monthsOut: 4,
    title: "Lock the cake",
    detail: "Patissier designs tiers, flavors, allergen profile.",
    area: "Logistics",
    href: "/cake",
    isDone: (s) => approvalApproved(s, "lock_cake") || !!s.cake?.approved,
  },
  {
    id: "stationery-suite",
    monthsOut: 4,
    title: "Lock the stationery suite",
    detail: "Stationer drafts invitations, menu cards, escort cards from the design direction.",
    area: "Design",
    href: "/stationery",
    isDone: (s) => s.stationery.length > 0,
  },

  // ---------- 3 months ----------
  {
    id: "send-invitations",
    monthsOut: 3,
    title: "Send invitations",
    detail: "6-8 weeks before the wedding for non-destination; 3 months for travel-heavy.",
    area: "Discovery",
    href: "/stationery",
    isDone: (s) => approvalApproved(s, "send_invitations"),
  },
  {
    id: "music-setlist",
    monthsOut: 3,
    title: "Lock the music setlist",
    detail: "Cantor proposes ceremony, cocktail, reception cues.",
    area: "Day",
    href: "/music",
    isDone: (s) => approvalApproved(s, "lock_setlist") || s.music.length > 5,
  },
  {
    id: "ceremony-script",
    monthsOut: 3,
    title: "Lock the ceremony script",
    detail: "Cleric drafts in your tradition; you co-edit section by section.",
    area: "Day",
    href: "/ceremony",
    isDone: (s) => approvalApproved(s, "lock_ceremony") || s.ceremony.length > 5,
  },
  {
    id: "rentals-inventory",
    monthsOut: 3,
    title: "Confirm rentals",
    detail: "Steward computes chairs, linens, china, glassware against the seating plan.",
    area: "Logistics",
    href: "/rentals",
    isDone: (s) => s.rentals.length > 0,
  },

  // ---------- 2 months ----------
  {
    id: "lock-seating",
    monthsOut: 2,
    title: "Lock the seating chart",
    detail: "Cartographer solves it; you nudge.",
    area: "Build",
    href: "/seating",
    isDone: (s) => !!s.seating.locked,
  },
  {
    id: "license",
    monthsOut: 2,
    title: "File the marriage license",
    detail: "State + county rules vary. Clerk handles the paperwork.",
    area: "Paperwork",
    href: "/license",
    isDone: (s) => !!s.license?.filedAt,
  },
  {
    id: "beauty-trial",
    monthsOut: 2,
    title: "Hair & makeup trial",
    detail: "Atelier schedules the trial and the day-of timeline.",
    area: "Personal",
    href: "/beauty",
    isDone: (s) => s.beauty.some((b) => b.trial),
  },
  {
    id: "vows",
    monthsOut: 2,
    title: "Draft your vows",
    detail: "Voice helps. Each partner's draft is firewalled.",
    area: "Personal",
    href: "/personal-prep",
    isDone: (s) => s.vows.some((v) => v.draft.length > 50),
  },

  // ---------- 1 month ----------
  {
    id: "welcome-bags",
    monthsOut: 1,
    title: "Welcome bags ready",
    detail: "Quartermaster composes; you assemble and drop at the hotel block.",
    area: "Logistics",
    href: "/logistics",
    isDone: (s) => s.welcomeBag.length > 0,
  },
  {
    id: "tips",
    monthsOut: 1,
    title: "Pack tip envelopes",
    detail: "Day-of cash for vendors and crew.",
    area: "Day",
    href: "/tips",
    isDone: (s) => s.tips.length > 0,
  },
  {
    id: "final-headcount",
    monthsOut: 1,
    title: "Send final headcount to caterer",
    detail: "Larder + RSVPs reconciled. Final menu count locks pricing.",
    area: "Logistics",
    href: "/dietary",
    isDone: (s) => approvalApproved(s, "send_caterer_brief"),
  },

  // ---------- 0 months ----------
  {
    id: "day-of",
    monthsOut: 0,
    title: "Day-of mode",
    detail: "Maestro Jr. takes over. Contingency bands armed. You exhale.",
    area: "Day-of",
    href: "/day-of",
    isDone: (s) => !!s.dayOfMode,
  },

  // ---------- After ----------
  {
    id: "thank-yous",
    monthsOut: -1,
    title: "Send thank-yous",
    detail: "Generated per guest based on gifts received and your relationship to them.",
    area: "After",
    href: "/thanks",
    isDone: (s) => s.thanks.length > 0 && s.thanks.every((t) => t.status === "sent"),
  },
];

export function checklistByMonthsOut(): { monthsOut: number; items: ChecklistItem[] }[] {
  const map = new Map<number, ChecklistItem[]>();
  for (const it of CHECKLIST) {
    const arr = map.get(it.monthsOut) ?? [];
    arr.push(it);
    map.set(it.monthsOut, arr);
  }
  return [...map.entries()]
    .sort(([a], [b]) => b - a)            // 12, 10, 9, ... 0, -1
    .map(([monthsOut, items]) => ({ monthsOut, items }));
}

// Returns approximate months between today and the wedding date.
// Falls back to a conservative 12 if no parseable date exists.
export function currentMonthsOut(state: ProjectState): number {
  if (!state.brief) return 12;
  const m = state.brief.dateWindow.match(/(\d{4})-(\d{2})-(\d{2})/) ??
            (state.brief.weddingDate?.match(/(\d{4})-(\d{2})-(\d{2})/));
  if (!m) return 12;
  const target = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00`);
  const now = Date.now();
  const days = (target.getTime() - now) / (1000 * 60 * 60 * 24);
  if (days < 0) return -1;
  return Math.max(0, Math.round(days / 30));
}
