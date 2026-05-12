// Build a fully-populated WebsiteDraft from the existing ProjectState.
// Nothing here is "blank" — every section is auto-filled from real
// wedding data the couple already entered. The builder UI only edits
// or refines, never creates from scratch.

import type {
  ProjectState,
  DayOfItem,
  Brief,
} from "@/lib/types";
import { suggestVibeFromBrief, type VibeId } from "./vibes";

export interface WebsiteScheduleItem {
  id: string;
  /** ISO date string */
  date?: string;
  day?: string;
  time?: string;
  title: string;
  venue?: string;
  description?: string;
  attire?: string;
}

export interface WebsiteFAQ {
  id: string;
  q: string;
  a: string;
}

export interface WebsiteGalleryImage {
  id: string;
  url: string;
  caption?: string;
  /** If true, render the "AI · {description}" badge */
  isAI?: boolean;
  description?: string;
}

export interface WebsiteRegistryLink {
  id: string;
  label: string;
  detail?: string;
  url: string;
}

export interface WebsiteDraft {
  slug: string;
  publicUrl: string;
  vibe: VibeId;
  hero: {
    eyebrow: string;
    organizerName: string;
    partnerName: string;
    /** ISO date the ceremony begins (for the live countdown). */
    ceremonyAtISO?: string;
    /** Stylized display date — e.g. "Sixteen May, MMXXVI". */
    dateLine: string;
    location: string;
  };
  story: {
    pullQuote: string;
    detail?: string;
  };
  schedule: WebsiteScheduleItem[];
  travel: {
    stay: { title: string; body: string };
    fly: { title: string; body: string };
    shuttle: { title: string; body: string };
  };
  faqs: WebsiteFAQ[];
  gallery: WebsiteGalleryImage[];
  songRequests: { id: string; title: string; guestName?: string }[];
  guestbook: { id: string; from: string; message: string }[];
  registry: WebsiteRegistryLink[];
  rsvp: {
    deadline?: string;
  };
  /** A short list of action-log entries — the most recent refinements
   *  applied by the user via the drawer. */
  refinementLog: { id: string; prompt: string; appliedAt: string }[];
  /** Whether the site has been published. */
  published: boolean;
  publishedAt?: string;
}

export function buildWebsiteDraft(state: ProjectState): WebsiteDraft {
  const brief = state.brief;
  const organizerName = brief?.organizerName ?? "Organizer";
  const partnerName = brief?.partnerName ?? "Partner";
  const region = brief?.region ?? "The wedding location";
  const slug = makeSlug(organizerName, partnerName);
  const vibe = suggestVibeFromBrief({
    vibe: brief?.vibe,
    region,
  });

  return {
    slug,
    publicUrl: `aisle.wedding/${slug}`,
    vibe,
    hero: buildHero(brief, region),
    story: buildStory(brief),
    schedule: buildSchedule(state),
    travel: buildTravel(brief, state),
    faqs: buildFAQs(state),
    gallery: buildGallery(state),
    songRequests: buildSeedSongRequests(),
    guestbook: buildSeedGuestbook(brief),
    registry: buildRegistry(state),
    rsvp: { deadline: rsvpDeadlineFromDate(brief?.weddingDate ?? brief?.dateWindow) },
    refinementLog: [],
    published: !!state.site?.slug,
    publishedAt: undefined,
  };
}

// ----------------------------------------------------------------- hero ---

function buildHero(brief: Brief | null, region: string): WebsiteDraft["hero"] {
  const weddingDate = brief?.weddingDate ?? brief?.dateWindow;
  const ceremonyAtISO = ceremonyMomentFromDate(weddingDate);
  return {
    eyebrow: "The wedding of",
    organizerName: brief?.organizerName ?? "Organizer",
    partnerName: brief?.partnerName ?? "Partner",
    ceremonyAtISO,
    dateLine: formatDateLine(weddingDate),
    location: region,
  };
}

function ceremonyMomentFromDate(input?: string): string | undefined {
  const d = parseDateInput(input);
  if (!d) return undefined;
  // Default ceremony at 4:30pm local — the most common slot.
  d.setHours(16, 30, 0, 0);
  return d.toISOString();
}

function parseDateInput(input?: string): Date | null {
  if (!input) return null;
  const iso = input.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(`${iso[1]}-${iso[2]}-${iso[3]}T16:30:00`);
  // Best-effort parse for "Summer 2027" → August 1
  const seasonYear = input.match(/(spring|summer|fall|autumn|winter)\s*(\d{4})/i);
  if (seasonYear) {
    const month = { spring: 4, summer: 7, fall: 9, autumn: 9, winter: 12 }[
      seasonYear[1].toLowerCase() as "spring" | "summer" | "fall" | "autumn" | "winter"
    ];
    return new Date(parseInt(seasonYear[2], 10), month - 1, 15, 16, 30);
  }
  const monthYear = input.match(/([A-Za-z]+)\s+(\d{4})/);
  if (monthYear) {
    const month = MONTH_INDEX[monthYear[1].toLowerCase()];
    if (month !== undefined) return new Date(parseInt(monthYear[2], 10), month, 15, 16, 30);
  }
  const t = Date.parse(input);
  if (!Number.isNaN(t)) return new Date(t);
  return null;
}

const MONTH_INDEX: Record<string, number> = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
};

function formatDateLine(input?: string): string {
  const d = parseDateInput(input);
  if (!d) return input ?? "Date to be announced";
  const day = d.getDate();
  const month = d.toLocaleString("en-US", { month: "long" });
  const year = d.getFullYear();
  return `${spellOutDay(day)} ${month}, ${toRomanNumeral(year)}`;
}

function spellOutDay(day: number): string {
  const ones = [
    "Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen",
  ];
  const tens = ["", "", "Twenty", "Thirty"];
  if (day < 20) return ones[day];
  if (day < 32) {
    const t = Math.floor(day / 10);
    const o = day % 10;
    return o === 0 ? tens[t] : `${tens[t]}-${ones[o].toLowerCase()}`;
  }
  return String(day);
}

function toRomanNumeral(num: number): string {
  const map: [number, string][] = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
    [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let result = "";
  let n = num;
  for (const [value, glyph] of map) {
    while (n >= value) {
      result += glyph;
      n -= value;
    }
  }
  return result;
}

// ---------------------------------------------------------------- story ---

function buildStory(brief: Brief | null): WebsiteDraft["story"] {
  const o = brief?.organizerName ?? "";
  const p = brief?.partnerName ?? "";
  const r = brief?.region ?? "";
  // Slightly different opening depending on whether the wedding is destination.
  if (brief?.destination) {
    return {
      pullQuote: `Of all the places to begin a marriage, we chose ${r}.`,
      detail: `${o} and ${p} are getting married. Come stay a while.`,
    };
  }
  return {
    pullQuote: `Two people, one wedding, a city you'll want to keep.`,
    detail: `${o} and ${p} are getting married in ${r}. We'd love you there.`,
  };
}

// ------------------------------------------------------------- schedule ---

function buildSchedule(state: ProjectState): WebsiteScheduleItem[] {
  const items: WebsiteScheduleItem[] = [];
  // Wedding day from dayOf timeline
  for (const d of state.dayOf as DayOfItem[]) {
    items.push({
      id: d.id,
      title: d.title,
      time: d.time,
      day: "Saturday",
      description: d.note,
    });
  }
  // Pre-events
  for (const e of state.preEvents ?? []) {
    items.push({
      id: e.id,
      title: humanizePreEventKind(e.kind),
      day: humanDayFromDate(e.date),
      venue: e.location,
      description: e.notes,
    });
  }
  // If nothing's been entered yet, drop in a sensible weekend skeleton
  // so the page never reads as empty.
  if (items.length === 0) {
    items.push(
      {
        id: "skel-1",
        day: "Friday",
        time: "6:30 PM",
        title: "Welcome drinks",
        venue: "TBD",
        attire: "Resort smart",
        description: "Cocktails to start the weekend.",
      },
      {
        id: "skel-2",
        day: "Saturday",
        time: "4:30 PM",
        title: "Ceremony",
        venue: "TBD",
        attire: "Black tie optional",
        description: "Vows. Hold-your-breath quiet.",
      },
      {
        id: "skel-3",
        day: "Saturday",
        time: "6:00 PM",
        title: "Reception",
        venue: "TBD",
        attire: "Black tie optional",
        description: "Dinner, toasts, dancing until late.",
      },
      {
        id: "skel-4",
        day: "Sunday",
        time: "11:00 AM",
        title: "Farewell brunch",
        venue: "TBD",
        attire: "Casual",
        description: "Eggs, coffee, hugs goodbye.",
      },
    );
  }
  return items;
}

function humanDayFromDate(iso?: string): string | undefined {
  if (!iso) return undefined;
  const d = parseDateInput(iso);
  if (!d) return undefined;
  return d.toLocaleString("en-US", { weekday: "long" });
}

function humanizePreEventKind(kind: string): string {
  switch (kind) {
    case "welcome_drinks":
      return "Welcome drinks";
    case "rehearsal_dinner":
      return "Rehearsal dinner";
    case "farewell_brunch":
      return "Farewell brunch";
    case "after_party":
      return "After-party";
    default:
      return kind.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
  }
}

// --------------------------------------------------------------- travel ---

function buildTravel(brief: Brief | null, state: ProjectState): WebsiteDraft["travel"] {
  const block = state.hotelBlocks?.[0];
  const shuttle = state.shuttles?.[0];
  const region = brief?.region ?? "the area";
  return {
    stay: {
      title: "Where to stay",
      body: block
        ? `We've held rooms at ${block.hotel} in ${block.city}. Use the link in your invite to book at the group rate.`
        : `A handful of hotels are within ten minutes of the venue. Details land in your invite.`,
    },
    fly: {
      title: "How to fly in",
      body: `The closest major airport is the nearest hub to ${region}. We recommend arriving by Friday afternoon and staying until Sunday brunch.`,
    },
    shuttle: {
      title: "Shuttle plan",
      body: shuttle
        ? `Shuttles run ${shuttle.route} beginning ${shuttle.pickupTime}. Look for the AISLE-branded coach.`
        : `Shuttles are scheduled between the room block and the venue both directions. Times will be on the back of your place card.`,
    },
  };
}

// ----------------------------------------------------------------- FAQs ---

function buildFAQs(state: ProjectState): WebsiteFAQ[] {
  const faqs: WebsiteFAQ[] = [];
  const brief = state.brief;
  let i = 0;
  const push = (q: string, a: string) =>
    faqs.push({ id: `faq-${i++}`, q, a });

  push(
    "What time should I arrive?",
    "Plan to be seated fifteen minutes before the ceremony begins. The ushers will help you find a chair.",
  );
  push(
    "What's the dress code?",
    `Each event has its own. The headline events read ${brief?.formalityTone ?? "modern"} formal — most guests will be in black tie or evening attire.`,
  );
  if (brief?.destination) {
    push(
      "Is this a destination wedding?",
      `Yes. The whole weekend takes place in ${brief.region}. We've blocked rooms and arranged shuttles — see Travel above.`,
    );
  }
  // Dietary
  const hasDietary = (state.guests ?? []).some((g) => g.dietary && g.dietary.length > 0);
  if (hasDietary) {
    push(
      "Are dietary needs handled?",
      "Yes — we've collected dietary information through your RSVP. The kitchen will have a plate for you.",
    );
  }
  push(
    "Can I bring a plus-one or kids?",
    "Your invite spells out who's included on your line. If you're unsure, the concierge below can confirm.",
  );
  push(
    "Where do I park?",
    "There's parking on-site at the venue. Shuttles are recommended after the ceremony — much easier than driving.",
  );
  push(
    "When do I need to RSVP by?",
    "We'd love your response at least eight weeks before the wedding so the kitchen and the seating chart can do their thing.",
  );
  push(
    "Will the ceremony be outdoors?",
    "Yes if the weather holds. We have a covered indoor option if it doesn't.",
  );

  return faqs;
}

// -------------------------------------------------------------- gallery ---

function buildGallery(state: ProjectState): WebsiteGalleryImage[] {
  const images: WebsiteGalleryImage[] = [];
  // Pull whatever the brief's hero generator stored, if anything.
  if (state.brief?.heroImage && !state.brief.heroImage.startsWith("data:image/svg+xml")) {
    images.push({
      id: "brief-hero",
      url: state.brief.heroImage,
      description: "Brief hero",
      isAI: true,
    });
  }
  // Pull pins flagged as gallery-worthy.
  for (const p of state.pins ?? []) {
    if (images.length >= 9) break;
    images.push({
      id: p.id,
      url: p.imageUrl,
      caption: p.caption,
      isAI: p.source === "generated",
      description: p.caption,
    });
  }
  return images;
}

// --------------------------------------------------------------- songs ---

function buildSeedSongRequests(): WebsiteDraft["songRequests"] {
  return [
    { id: "s-1", title: "September — Earth, Wind & Fire", guestName: "Mark" },
    { id: "s-2", title: "Linger — The Cranberries", guestName: "Anya" },
    { id: "s-3", title: "Dancing Queen — ABBA", guestName: "Maya & Theo" },
  ];
}

// ----------------------------------------------------------- guestbook ---

function buildSeedGuestbook(brief: Brief | null): WebsiteDraft["guestbook"] {
  const o = brief?.organizerName ?? "you";
  const p = brief?.partnerName ?? "your partner";
  return [
    {
      id: "g-1",
      from: "Eleanor",
      message: `${o} & ${p}, can't wait to celebrate. You picked a beautiful weekend.`,
    },
    {
      id: "g-2",
      from: "Marco",
      message: "Booked the flight. Bringing my dancing shoes.",
    },
  ];
}

// ------------------------------------------------------------- registry ---

function buildRegistry(state: ProjectState): WebsiteRegistryLink[] {
  const out: WebsiteRegistryLink[] = [];
  // Group registry items by vendor so the website surfaces one card per
  // registry destination, not one card per item.
  const byVendor = new Map<string, { items: number; sampleUrl?: string }>();
  for (const r of state.registry ?? []) {
    const entry = byVendor.get(r.vendor) ?? { items: 0 };
    entry.items += 1;
    if (!entry.sampleUrl && r.url) entry.sampleUrl = r.url;
    byVendor.set(r.vendor, entry);
  }
  let idx = 0;
  for (const [vendor, entry] of byVendor) {
    out.push({
      id: `reg-${idx++}`,
      label: vendor,
      detail: `${entry.items} item${entry.items === 1 ? "" : "s"}`,
      url: entry.sampleUrl ?? "#",
    });
  }
  if (out.length === 0) {
    out.push(
      {
        id: "honeymoon",
        label: "Honeymoon fund",
        detail: "Cliffside lunches and slow afternoons.",
        url: "#",
      },
      {
        id: "home",
        label: "Home registry",
        detail: "Linen, ceramics, things that age well.",
        url: "#",
      },
    );
  }
  return out;
}

// --------------------------------------------------------------- utils ---

function makeSlug(o: string, p: string): string {
  return `${o}-and-${p}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function rsvpDeadlineFromDate(input?: string): string | undefined {
  const d = parseDateInput(input);
  if (!d) return undefined;
  const deadline = new Date(d);
  deadline.setDate(deadline.getDate() - 56); // 8 weeks before
  return deadline.toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
