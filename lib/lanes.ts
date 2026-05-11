// Planning lanes — the 8 sequential phases AISLE walks couples through.
//
// A great planner never dumps the whole project on a couple at once. They
// guide one room at a time: foundation, then food, then photography, then
// aesthetics, then the music, then attire, then paper goods, then the day-of
// orchestration. Each lane has 1-3 approval cards visible at any time; new
// cards only surface when the current lane completes.
//
// On the dashboard, only the CURRENT lane's cards render. /approvals can
// show all lanes (with progress) for the curious user who wants to look
// ahead.

import type { ApprovalCard, ProjectState } from "./types";

export type LaneId =
  | "foundation"
  | "food_and_drink"
  | "capture"
  | "aesthetics"
  | "music"
  | "attire_and_beauty"
  | "stationery"
  | "day_of";

export interface Lane {
  id: LaneId;
  order: number;        // 1..8
  label: string;
  blurb: string;
  /** Vendor categories that belong here (used by laneFor + isComplete). */
  categories: string[];
  /** Agents that fire into this lane. */
  agents: string[];
  /** ApprovalCard.action.kind values that belong here (when an action's
   *  domain isn't a vendor category). */
  actionKinds: string[];
  /** "This lane is finished" predicate — typically the primary booking is
   *  contracted OR a lock approval is resolved. */
  isComplete: (s: ProjectState) => boolean;
  /** Short phrase for transitions: "Beautiful choice. Next up — let's…" */
  transitionLine: string;
}

const cat = (s: ProjectState, c: string) =>
  s.vendors.some((v) => v.category === c && (v.status === "contracted" || v.status === "paid"));

const approvalApproved = (s: ProjectState, kinds: string[]) =>
  s.approvals.some((a) => a.status === "approved" && kinds.includes(a.action.kind));

export const LANES: Lane[] = [
  {
    id: "foundation",
    order: 1,
    label: "Foundation",
    blurb: "Venue, date, the things everything else depends on.",
    categories: ["Venue", "Officiant"],
    agents: ["Scout", "Counsel"],
    actionKinds: ["sign_contract", "lock_brief"],
    isComplete: (s) => cat(s, "Venue"),
    transitionLine: "Foundation locked. Next up — let's talk food and drink.",
  },
  {
    id: "food_and_drink",
    order: 2,
    label: "Food & Drink",
    blurb: "Caterer, cake, the bar program.",
    categories: ["Caterer", "Cake", "Bartending"],
    agents: ["Patissier", "Sommelier", "Larder"],
    actionKinds: ["lock_cake", "send_caterer_brief"],
    isComplete: (s) => cat(s, "Caterer"),
    transitionLine: "Food sorted. Now let's find the photographer.",
  },
  {
    id: "capture",
    order: 3,
    label: "Capture",
    blurb: "Photography and videography.",
    categories: ["Photographer", "Videographer"],
    agents: [],
    actionKinds: [],
    isComplete: (s) => cat(s, "Photographer"),
    transitionLine: "Capture set. Onward to florals and the room.",
  },
  {
    id: "aesthetics",
    order: 4,
    label: "Aesthetics",
    blurb: "Design direction, florals, palette, the room.",
    categories: ["Florist"],
    agents: ["Designer", "Botanist", "Couturier"],
    actionKinds: ["publish_design"],
    isComplete: (s) =>
      cat(s, "Florist")
      && approvalApproved(s, ["publish_design"]),
    transitionLine: "The look is locked. Music next.",
  },
  {
    id: "music",
    order: 5,
    label: "Music & Entertainment",
    blurb: "Band, DJ, ceremony cues, first dance.",
    categories: ["Band", "DJ"],
    agents: ["Cantor"],
    actionKinds: ["lock_setlist"],
    isComplete: (s) => (cat(s, "Band") || cat(s, "DJ"))
      && approvalApproved(s, ["lock_setlist"]),
    transitionLine: "Setlist locked. Let's talk attire and beauty.",
  },
  {
    id: "attire_and_beauty",
    order: 6,
    label: "Attire & Beauty",
    blurb: "Dress, suit, hair, makeup, day-of looks.",
    categories: ["Hair & Makeup"],
    agents: ["Atelier"],
    actionKinds: ["lock_vows"],
    isComplete: (s) => cat(s, "Hair & Makeup"),
    transitionLine: "Beauty timeline scheduled. Stationery and details now.",
  },
  {
    id: "stationery",
    order: 7,
    label: "Stationery & Details",
    blurb: "Save-the-dates, invitations, place cards, programs, registry, welcome bags.",
    categories: ["Stationer", "Calligrapher"],
    agents: ["Stationer", "Quartermaster", "Curator"],
    actionKinds: ["send_save_the_date", "send_invitations", "publish_website", "lock_stationery_suite"],
    isComplete: (s) =>
      approvalApproved(s, ["send_invitations"])
      || (cat(s, "Stationer") && approvalApproved(s, ["publish_website"])),
    transitionLine: "Paper goods are out. Final stretch — day-of logistics.",
  },
  {
    id: "day_of",
    order: 8,
    label: "Day-of Logistics",
    blurb: "Marriage license, seating chart, dietary brief, day-of timeline, contingency plan.",
    categories: ["Rentals", "Transportation"],
    agents: ["Cleric", "Cartographer", "Maestro Jr."],
    actionKinds: [
      "lock_seating", "lock_ceremony", "file_marriage_license", "send_caterer_brief",
      "block_hotel_rooms", "schedule_payment",
    ],
    isComplete: () => false, // never "complete" — runs through the wedding day itself
    transitionLine: "We're in the final stretch.",
  },
];

export const TOTAL_LANES = LANES.length;

export function laneById(id: LaneId): Lane {
  const l = LANES.find((x) => x.id === id);
  if (!l) throw new Error(`Unknown lane: ${id}`);
  return l;
}

// Map any ApprovalCard to the most-specific lane it belongs to.
export function laneFor(card: ApprovalCard): LaneId {
  const a = card.action;

  // 1. Action.kind precedence — most specific.
  if (a.kind === "sign_contract" || a.kind === "schedule_payment" || a.kind === "send_email" || a.kind === "send_message") {
    // These actions target a specific vendor — match by vendor name + category lookup
    // when the dashboard has the state. Without state here, fall back to the to/vendor field.
    const target = (a.kind === "send_email" ? a.to
                  : a.kind === "send_message" ? a.to
                  : a.kind === "schedule_payment" ? a.vendor
                  : a.vendor) ?? "";
    const t = target.toLowerCase();
    if (/venue|barn|estate|vineyard|hall|inn|ranch|villa|cosmico|hudson|caruso|borgo|cannon/i.test(t)) return "foundation";
    if (/photo|frame|studio|north star|iris|oak|linen \+ light|field notes/i.test(t)) return "capture";
    if (/floral|botanist|wildgrove|ivy|stem|sage atelier/i.test(t)) return "aesthetics";
    if (/cater|table co|provisions|hospitality|olive|salt|kitchen/i.test(t)) return "food_and_drink";
    if (/cake|bake|patissier|sweet|patisserie/i.test(t)) return "food_and_drink";
    if (/bar|cocktail|sommelier|spirits/i.test(t)) return "food_and_drink";
    if (/band|trio|brass|sounds|orchestra|cantor|dj/i.test(t)) return "music";
    if (/hair|makeup|beauty|atelier.*beauty/i.test(t)) return "attire_and_beauty";
    if (/dress|tailor|courier/i.test(t)) return "attire_and_beauty";
    if (/stationer|press|folio|calligraph|quill/i.test(t)) return "stationery";
    if (/rental|tabletop|coach|limo|transport/i.test(t)) return "day_of";
  }

  // 2. action.kind direct mapping
  for (const lane of LANES) {
    if (lane.actionKinds.includes(a.kind)) return lane.id;
  }

  // 3. agent mapping
  for (const lane of LANES) {
    if (lane.agents.includes(card.agent)) return lane.id;
  }

  // 4. phase fallback
  switch (card.phase) {
    case "foundation":         return "foundation";
    case "discovery":          return "foundation";
    case "design":             return "aesthetics";
    case "guest_management":   return "stationery";
    case "logistics":          return "day_of";
    case "personal_prep":      return "attire_and_beauty";
    case "week_of":            return "day_of";
    case "wedding_day":        return "day_of";
    case "post_event":         return "day_of";
    default:                   return "day_of";
  }
}

// "Phase X of 8" cursor + per-lane progress.
export interface LaneProgress {
  current: Lane;
  currentIndex: number;        // 0-based
  total: number;
  completed: Lane[];
  upcoming: Lane[];
  /** Pending cards in the CURRENT lane (capped at 3 for the dashboard). */
  currentCards: ApprovalCard[];
  /** Pending cards in lanes BEYOND the current one (the "queued" backlog). */
  upcomingCards: ApprovalCard[];
  /** Resolved cards already in the bank. */
  resolvedCards: ApprovalCard[];
}

export function laneProgress(state: ProjectState, maxCurrentCards = 3): LaneProgress {
  const completed: Lane[] = [];
  let current: Lane = LANES[LANES.length - 1];
  let currentIndex = LANES.length - 1;
  for (let i = 0; i < LANES.length; i++) {
    const l = LANES[i];
    if (l.isComplete(state)) {
      completed.push(l);
      continue;
    }
    current = l;
    currentIndex = i;
    break;
  }
  const upcoming = LANES.filter((l) => l.order > current.order && !completed.includes(l));

  const pending = state.approvals.filter((a) => a.status === "pending");
  const cardLane = (c: ApprovalCard) => laneFor(c);

  const currentLanePending = pending.filter((c) => cardLane(c) === current.id);
  const upcomingLanePending = pending.filter((c) => {
    const lid = cardLane(c);
    const lo = LANES.find((x) => x.id === lid)?.order ?? 99;
    return lo > current.order;
  });
  const resolvedCards = state.approvals.filter((a) => a.status !== "pending");

  return {
    current,
    currentIndex,
    total: LANES.length,
    completed,
    upcoming,
    currentCards: currentLanePending.slice(0, maxCurrentCards),
    upcomingCards: upcomingLanePending,
    resolvedCards,
  };
}
