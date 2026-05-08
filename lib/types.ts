// Core domain types for AISLE.
// Mirrors PRD §6 (Data Model) — full v1 surface.

export type Phase =
  | "discovery"
  | "foundation"
  | "design"
  | "logistics"
  | "guest_management"
  | "personal_prep"
  | "week_of"
  | "wedding_day"
  | "post_event";

export const PHASES: { id: Phase; label: string; blurb: string }[] = [
  { id: "discovery", label: "Discovery", blurb: "Brief, vibe, budget, dates." },
  { id: "foundation", label: "Foundation", blurb: "Venue, date, officiant — the hard dependencies." },
  { id: "design", label: "Design", blurb: "Palette, mood boards, stationery, florals." },
  { id: "logistics", label: "Logistics", blurb: "Catering, rentals, transportation, hotel block." },
  { id: "guest_management", label: "Guest Management", blurb: "List, save-the-dates, invitations, RSVPs." },
  { id: "personal_prep", label: "Personal Prep", blurb: "Attire, beauty, vows, gifts." },
  { id: "week_of", label: "Week-Of", blurb: "Final counts, day-of brief, vendor confirmations." },
  { id: "wedding_day", label: "Wedding Day", blurb: "Day-of console. Approval queue suspended." },
  { id: "post_event", label: "Post-Event", blurb: "Gifts, thank-yous, vendor reviews." },
];

export type RiskLevel = "low" | "medium" | "high";

export type AgentName =
  | "Maestro" | "Maestro Jr."
  | "Scout" | "Outreach" | "Negotiator" | "Counsel"
  | "Treasurer" | "Designer" | "Couturier" | "Triage"
  | "Cartographer" | "Watcher" | "Quartermaster" | "Stationer"
  | "Concierge"            // engagement studio
  | "Voice"                // vows + speech support
  | "Curator"              // registry
  | "Itinerist"            // honeymoon
  | "Cantor"               // music director
  | "Cleric"               // ceremony writer
  | "Patissier"            // cake & dessert
  | "Sommelier"            // bar program
  | "Botanist"             // florals
  | "Steward"              // rentals
  | "Atelier"              // hair & makeup
  | "Clerk"                // marriage license
  | "Larder";              // dietary + allergens

// PRD §2.3: gated workflows.
export type GateScope = null | "dress" | "partner_gift" | "honeymoon" | "speech" | "vows_organizer" | "vows_partner";

export type ApprovalAction =
  | { kind: "send_email"; to: string; subject: string; body: string }
  | { kind: "book_vendor"; vendor: string; category: string; estimate: number }
  | { kind: "lock_brief"; summary: string }
  | { kind: "schedule_payment"; vendor: string; amountUsd: number; dueDate: string }
  | { kind: "send_message"; to: string; body: string }
  | { kind: "sign_contract"; vendor: string; redlines: string[]; estimate: number }
  | { kind: "lock_seating"; tableCount: number; guestCount: number }
  | { kind: "send_invitations"; recipients: number; format: string }
  | { kind: "publish_design"; assetId: string; title: string }
  | { kind: "send_save_the_date"; suiteId: string; recipients: number; format: string }
  | { kind: "lock_stationery_suite"; suiteId: string; piece: string }
  | { kind: "block_hotel_rooms"; hotel: string; rooms: number; nightlyRate: number }
  | { kind: "purchase_registry_item"; item: string; vendor: string; amountUsd: number }
  | { kind: "lock_vows"; whose: "organizer" | "partner"; wordCount: number }
  | { kind: "publish_engagement_announcement"; channel: string; copy: string }
  | { kind: "lock_setlist"; cueCount: number }
  | { kind: "lock_ceremony"; sectionCount: number }
  | { kind: "lock_cake"; tiers: number; servings: number }
  | { kind: "publish_website"; slug: string }
  | { kind: "file_marriage_license"; state: string; county: string }
  | { kind: "send_caterer_brief"; vendor: string; guestCount: number; allergenCount: number };

export interface ApprovalCard {
  id: string;
  createdAt: string;
  agent: AgentName;
  phase: Phase;
  title: string;
  rationale: string;
  risk: RiskLevel;
  action: ApprovalAction;
  status: "pending" | "approved" | "rejected" | "edited";
  resolvedAt?: string;
  rejectionNote?: string;
  gateScope?: GateScope;
  // Internal token issued when a card is approved. Side-effecting agent
  // functions must be passed a valid token (build brief §8.3).
  approvalToken?: string;
}

// Optional structured UI attached to an agent message. Renderable in chat as
// chips / cards / confirm buttons, etc. Click handlers send the chosen value
// back as a regular user message.
export type ChatUI =
  | {
      kind: "choice";
      question?: string;
      options: { id: string; label: string; description?: string }[];
      allowOther?: boolean;
    }
  | {
      kind: "confirm";
      question?: string;
      yes?: string;          // default "Yes"
      no?: string;           // default "No"
    }
  | {
      kind: "summary";
      title: string;
      rows: { label: string; value: string }[];
    }
  | {
      kind: "quick_replies";
      replies: string[];
    };

export interface ChatMessage {
  id: string;
  role: "user" | "agent" | "system";
  agent?: AgentName;
  content: string;
  createdAt: string;
  gateScope?: GateScope;
  ui?: ChatUI;
  uiResolved?: boolean;      // dimmed once the user has answered
}

// Brief-level cultural tradition; ceremony supports finer-grained tradition
// at the per-section level (see CeremonyTradition below).
export type CulturalTradition = "secular" | "catholic" | "jewish" | "hindu" | "muslim" | "interfaith" | "civil" | "other";

// Ceremony-level traditions — the selectable curation buckets in /ceremony.
export type CeremonyTradition =
  | "humanist"        // secular, ceremony-as-meaningful-non-religious
  | "civil"           // judge / clerk-led, minimal
  | "catholic"
  | "protestant"
  | "orthodox_christian"
  | "jewish"
  | "hindu"
  | "muslim"
  | "buddhist"
  | "sikh"
  | "quaker"
  | "celtic_handfasting"
  | "interfaith"      // explicit blend
  | "custom";         // couple writes their own from scratch

export const CEREMONY_TRADITIONS: { id: CeremonyTradition; label: string; blurb: string }[] = [
  { id: "humanist", label: "Humanist / secular", blurb: "Non-religious, celebrant-led. The most common modern format." },
  { id: "civil", label: "Civil", blurb: "Judge or clerk-officiated. Minimal liturgy." },
  { id: "catholic", label: "Catholic", blurb: "With or without nuptial mass." },
  { id: "protestant", label: "Protestant", blurb: "Episcopal, Methodist, Presbyterian, Lutheran, Baptist, non-denominational." },
  { id: "orthodox_christian", label: "Orthodox Christian", blurb: "Eastern / Greek / Russian Orthodox. Crowning ceremony." },
  { id: "jewish", label: "Jewish", blurb: "Chuppah, ketubah, sheva brachot, breaking of the glass." },
  { id: "hindu", label: "Hindu", blurb: "Baraat, mangal pheras, saptapadi, sindoor + mangalsutra." },
  { id: "muslim", label: "Muslim (Nikah)", blurb: "Khutbah, ijab + qubul, mahr, signing." },
  { id: "buddhist", label: "Buddhist", blurb: "Three refuges, candle / incense offering, vows." },
  { id: "sikh", label: "Sikh (Anand Karaj)", blurb: "Four Lavan, Granth Sahib readings." },
  { id: "quaker", label: "Quaker", blurb: "Silent meeting; couple speaks when moved." },
  { id: "celtic_handfasting", label: "Celtic / hand-fasting", blurb: "Cord-binding ritual; widely adopted across traditions." },
  { id: "interfaith", label: "Interfaith blend", blurb: "Compose rituals from two or more traditions, dual officiants supported." },
  { id: "custom", label: "Custom", blurb: "Start blank. Pull individual rituals from the library." },
];

export interface Brief {
  organizerName: string;
  partnerName: string;
  dateWindow: string;
  region: string;
  guestCount: number;
  budgetUsd: number;
  vibe: string;
  plannerStatus: "none" | "want_one" | "have_one";
  locked: boolean;
  lockedAt?: string;
  weddingDate?: string;
  cultural?: CulturalTradition;
  formalityTone?: "formal" | "modern" | "warm" | "casual";
  destination?: boolean;
}

// ---- Vendors ------------------------------------------------------------

export type VendorCategory =
  | "Venue" | "Photographer" | "Florist" | "Caterer" | "Officiant"
  | "Band" | "DJ" | "Stationer" | "Rentals" | "Transportation"
  | "Hair & Makeup" | "Videographer" | "Cake" | "Calligrapher" | "Bartending"
  | "Hotel" | "Welcome Bag" | "Honeymoon Concierge" | "Ring Designer";

export type VendorStatus =
  | "shortlisted" | "contacted" | "quoting" | "negotiating"
  | "contracted" | "paid" | "passed";

export interface VendorMessage {
  id: string;
  at: string;
  direction: "inbound" | "outbound";
  body: string;
  parsedIntent?: "available" | "unavailable" | "needs_info" | "out_of_office" | "unknown";
  quotedUsd?: number;
}

export interface Vendor {
  id: string;
  name: string;
  category: VendorCategory | string;
  city: string;
  fitScore: number;
  priceBracket: "$" | "$$" | "$$$" | "$$$$";
  notes: string;
  status: VendorStatus;
  estimateUsd?: number;
  contractedUsd?: number;
  paidUsd?: number;
  lastTouchAt?: string;
  gateScope?: GateScope;
  thread?: VendorMessage[];
  verified?: boolean;     // AISLE Verified (PRD §9.2)
}

export interface VendorShortlistItem {
  name: string;
  city: string;
  fitScore: number;
  priceBracket: "$" | "$$" | "$$$" | "$$$$";
  notes: string;
}

// ---- Budget -------------------------------------------------------------

export interface BudgetLine {
  id: string;
  category: string;
  planUsd: number;
  committedUsd: number;
  paidUsd: number;
  vendorId?: string;
  gateScope?: GateScope;
}

// ---- Guests / RSVPs -----------------------------------------------------

export type Side = "organizer" | "partner" | "both" | "neither";
export type RsvpState = "no_response" | "yes" | "no" | "maybe";
export type Relationship =
  | "immediate_family" | "extended_family" | "college_friend"
  | "work" | "neighbor" | "plus_one" | "child" | "other";

export interface Household {
  id: string;
  label: string;
  side: Side;
  mailingAddress?: string;
  email?: string;
  phone?: string;
  outOfTown?: boolean;
  hotelBlockReserved?: boolean;
  shuttleSeat?: boolean;
  welcomeBag?: boolean;
  saveTheDateSentAt?: string;
  invitationSentAt?: string;
}

export interface Guest {
  id: string;
  householdId: string;
  fullName: string;
  preferredName?: string;
  side: Side;
  relationship: Relationship;
  isChild?: boolean;
  plusOnePolicy: "none" | "named" | "open";
  plusOneName?: string;
  rsvp: RsvpState;
  meal?: string;
  dietary?: string;            // legacy free-text; preserved + parsed into allergens/preferences below
  notes?: string;
  accessibility?: string;
  songRequest?: string;
  // Structured dietary record (PRD §5.4.1 dietary; §5.4.4 RSVP cross-checks).
  allergens?: AllergenEntry[];
  dietaryPreferences?: DietaryPref[];
  dietaryNotes?: string;
}

// ---- Dietary + allergens ------------------------------------------------

export const ALLERGEN_CODES = [
  "peanut", "tree_nut", "shellfish", "fish", "dairy", "gluten",
  "egg", "soy", "sesame", "sulfites", "mustard", "celery",
  "lupin", "molluscs",
] as const;
export type AllergenCode = typeof ALLERGEN_CODES[number];

export const ALLERGEN_LABEL: Record<AllergenCode, string> = {
  peanut: "Peanut",
  tree_nut: "Tree nuts",
  shellfish: "Shellfish (crustaceans)",
  fish: "Fish",
  dairy: "Dairy",
  gluten: "Gluten / wheat",
  egg: "Egg",
  soy: "Soy",
  sesame: "Sesame",
  sulfites: "Sulfites",
  mustard: "Mustard",
  celery: "Celery",
  lupin: "Lupin",
  molluscs: "Molluscs",
};

export type AllergenSeverity = "anaphylactic" | "severe" | "moderate" | "intolerant";

export interface AllergenEntry {
  code: AllergenCode;
  severity: AllergenSeverity;
  notes?: string;
}

export const DIETARY_PREFS = [
  "vegan", "vegetarian", "pescatarian",
  "kosher", "halal", "no_pork", "no_beef", "no_alcohol",
  "gluten_free", "dairy_free", "low_sodium",
  "diabetic", "pregnant_safe", "kids_menu",
] as const;
export type DietaryPref = typeof DIETARY_PREFS[number];

export const DIETARY_PREF_LABEL: Record<DietaryPref, string> = {
  vegan: "Vegan",
  vegetarian: "Vegetarian",
  pescatarian: "Pescatarian",
  kosher: "Kosher",
  halal: "Halal",
  no_pork: "No pork",
  no_beef: "No beef",
  no_alcohol: "No alcohol",
  gluten_free: "Gluten-free",
  dairy_free: "Dairy-free",
  low_sodium: "Low sodium",
  diabetic: "Diabetic-friendly",
  pregnant_safe: "Pregnancy-safe",
  kids_menu: "Kids menu",
};

// Caterer / cake / bar menu items the dietary engine cross-checks against.
export type MenuCourse = "passed" | "first" | "main_meat" | "main_fish" | "main_veg" | "side" | "dessert" | "cake" | "kids" | "late_night" | "non_alc" | "alc";

export interface MenuItem {
  id: string;
  course: MenuCourse;
  name: string;
  description: string;
  containsAllergens: AllergenCode[];
  isVegan?: boolean;
  isVegetarian?: boolean;
  isGlutenFree?: boolean;
  isDairyFree?: boolean;
  isKosher?: boolean;
  isHalal?: boolean;
  isPescatarian?: boolean;
  isAlcoholic?: boolean;
  vendorId?: string;
}

// Computed cross-reference between guests and menu items.
export interface DietaryConflict {
  guestId: string;
  guestName: string;
  menuItemId: string;
  menuItemName: string;
  course: MenuCourse;
  reason: string;
  severity: "critical" | "warn";
  resolution?: DietaryResolution;
}

// Couple-set resolution per (guest, menu item) — when present, the conflict is
// considered acknowledged and stops counting against the "needs caterer attention" pile.
export type ResolutionKind =
  | "alt_meal"            // serving an alternate course/dish to this guest
  | "menu_changed"        // we modified the menu item to remove the issue
  | "guest_acknowledged"  // guest knows + accepts (e.g., "I'll just skip the cake")
  | "dismissed";          // false positive, ignore

export interface DietaryResolution {
  kind: ResolutionKind;
  alternateItemName?: string;
  note?: string;
  resolvedAt: string;
}

// ---- Design / mood boards -----------------------------------------------

export interface DesignAsset {
  id: string;
  title: string;
  kind: "moodboard" | "palette" | "stationery_proof" | "dress_concept" | "floral_concept" | "signage" | "menu_card";
  description: string;
  swatches?: string[];
  refs?: string[];
  createdAt: string;
  agent: AgentName;
  gateScope?: GateScope;
  approved?: boolean;
}

// ---- Stationery suite (PRD §5.4.2-5.4.3, §5.4.8) ----------------------

export type StationeryPiece = "save_the_date" | "invitation" | "response_card" | "details_card" | "reception_card" | "menu_card" | "place_card" | "program" | "thank_you";

export type StationeryFormat = "paper" | "digital" | "hybrid";

export interface StationerySuiteItem {
  piece: StationeryPiece;
  copy: string;
  approved?: boolean;
  // SVG mock paths so we can render a print-ready preview without image gen.
  mockSvg?: string;
}

export interface StationerySuite {
  id: string;
  direction: string;          // "Editorial Provence" etc., from Designer
  palette: string[];
  font: string;
  format: StationeryFormat;
  items: StationerySuiteItem[];
  createdAt: string;
  printRunCount?: number;
  printPartner?: string;
  saveTheDateSentAt?: string;
  invitationsSentAt?: string;
}

// ---- Hotel block + Transportation --------------------------------------

export interface HotelBlock {
  id: string;
  hotel: string;
  city: string;
  nightlyRateUsd: number;
  roomsBlocked: number;
  roomsBooked: number;
  releaseDate: string;
  notes?: string;
}

export interface Shuttle {
  id: string;
  route: string;             // "Hotel → Venue"
  pickupTime: string;
  capacity: number;
  reservedSeats: number;
}

// ---- Welcome bags ------------------------------------------------------

export interface WelcomeBagItem {
  id: string;
  item: string;
  unitCostUsd: number;
  rationale: string;
}

// ---- Seating chart -----------------------------------------------------

export type SeatingConstraintKind =
  | "hard_separation" | "hard_placement"
  | "strong_affinity" | "soft_affinity"
  | "comfort" | "aesthetic";

export interface SeatingConstraint {
  id: string;
  kind: SeatingConstraintKind;
  guestIds: string[];
  tableId?: string;
  weight?: number;
  reason?: string;
}

export interface SeatingTable {
  id: string;
  label: string;
  capacity: number;
  shape: "round" | "rectangle";
  x: number;
  y: number;
}

export interface SeatingChart {
  tables: SeatingTable[];
  assignments: Record<string, string>;
  constraints: SeatingConstraint[];
  cost: number;
  lastSolveAt?: string;
  locked?: boolean;
}

// ---- Day-of console ----------------------------------------------------

export type DayOfStatus = "pending" | "in_progress" | "done" | "delayed" | "skipped";

export interface DayOfItem {
  id: string;
  time: string;
  title: string;
  owner: string;
  status: DayOfStatus;
  note?: string;
  toleranceMinutes?: number;   // built into contingency bands
  critical?: boolean;          // ceremony start, processional cue, first dance
}

export interface ContingencyBand {
  id: string;
  topic: "weather" | "timeline_slip" | "vendor_late" | "vendor_no_show" | "guest_medical" | "intoxication";
  preApproved: string;
  escalation: "planner" | "couple";
  triggered?: boolean;
  triggeredAt?: string;
  triggerNote?: string;
}

// ---- Thank-you studio --------------------------------------------------

export interface ThankYou {
  id: string;
  guestId: string;
  guestName: string;
  giftDescription?: string;
  draftBody?: string;
  status: "no_gift" | "drafting" | "ready" | "sent";
  sentAt?: string;
}

// ---- Engagement studio (pre-brief) -------------------------------------

export interface EngagementMilestone {
  id: string;
  kind: "ring" | "proposal_plan" | "engagement_photos" | "announcement" | "engagement_party";
  title: string;
  description: string;
  status: "idea" | "planned" | "done";
  scheduledFor?: string;
}

// ---- Personal prep: vows + speeches (gated) ----------------------------

export interface VowDraft {
  id: string;
  whose: "organizer" | "partner";
  draft: string;
  wordCount: number;
  locked?: boolean;
  notes?: string;            // private prompts
}

export interface SpeechDraft {
  id: string;
  speaker: string;           // "Maid of honor", "Best man", "Father of the bride"
  draft: string;
  wordCount: number;
  approved?: boolean;
}

// ---- Registry ----------------------------------------------------------

export interface RegistryItem {
  id: string;
  item: string;
  vendor: string;
  priceUsd: number;
  category: "kitchen" | "bedroom" | "bath" | "dining" | "experience" | "cash_fund" | "charity" | "other";
  url?: string;
  status: "wanted" | "purchased";
  purchasedBy?: string;
}

// ---- Honeymoon (gated) -------------------------------------------------

export interface HoneymoonSegment {
  id: string;
  city: string;
  country: string;
  arrivalDate: string;
  departureDate: string;
  hotel?: string;
  notes?: string;
  surprise?: boolean;        // gated-only segment
}

// ---- Music director (PRD §3.2) ----------------------------------------

export type MusicSlot =
  | "processional" | "ceremony_music" | "recessional"
  | "cocktail_hour" | "introduction" | "first_dance"
  | "parent_dance" | "dinner" | "open_dancing" | "last_dance"
  | "do_not_play";

export interface MusicCue {
  id: string;
  slot: MusicSlot;
  song: string;
  artist: string;
  notes?: string;
  // Free-text song requests collected from RSVPs flow into here too.
  guestRequest?: boolean;
  approved?: boolean;
}

// ---- Ceremony script (PRD §5.4.3 host line + cultural copy) -----------

export type CeremonySectionKind =
  | "welcome" | "reading" | "prayer"
  | "vows" | "ring_exchange" | "blessing"
  | "ritual"            // any tradition-specific ritual (ketubah, saptapadi, breaking glass, etc.)
  | "communion"
  | "pronouncement" | "recessional" | "tribute"
  | "music_cue";

export interface CeremonySection {
  id: string;
  kind: CeremonySectionKind;
  title: string;
  body: string;
  reader?: string;
  approved?: boolean;
  // Curation metadata — which tradition this section comes from, and the
  // canonical ritual key if it was inserted from the library.
  tradition?: CeremonyTradition;
  ritualKey?: string;         // e.g., "ketubah_signing", "saptapadi"
}

// ---- Cake (PRD §3.2) ---------------------------------------------------

export interface CakeSpec {
  id: string;
  tiers: number;
  flavors: string[];          // per tier
  fillings: string[];
  frostingStyle: string;
  decorationNotes: string;
  servings: number;
  // Legacy free-text retained for backward compat; structured field below is canonical.
  allergenNotes: string;
  // Structured — joined to the dietary engine.
  allergens?: AllergenCode[];
  vendorId?: string;
  approved?: boolean;
}

// ---- Bar program (PRD §3.2 Bartending) --------------------------------

export interface BarMenuItem {
  id: string;
  kind: "signature" | "wine" | "beer" | "spirit" | "non_alcoholic";
  name: string;
  description?: string;
  servings?: number;          // estimated for 100 guests
}

export interface BarProgram {
  id?: string;
  style: "open" | "limited" | "dry" | "beer_wine_only";
  signatureCount: number;
  itemMenu: BarMenuItem[];
  estimatedAlcoholBudget: number;
  notes: string;
}

// ---- Florals (PRD §3.2) -----------------------------------------------

export type FloralPiece =
  | "ceremony_arch" | "ceremony_aisle" | "centerpiece"
  | "bouquet_organizer" | "bouquet_partner" | "bouquet_party"
  | "boutonniere" | "corsage" | "cake_florals" | "head_table"
  | "welcome_floral" | "ladies_room" | "petals";

export interface FloralArrangement {
  id: string;
  piece: FloralPiece;
  quantity: number;
  primary: string[];           // primary stems (e.g., ["garden roses", "ranunculus"])
  secondary: string[];
  vesselNotes?: string;
  unitCost: number;
  approved?: boolean;
}

// ---- Rentals (PRD §3.2) -----------------------------------------------

export type RentalCategory =
  | "seating" | "tables" | "linens" | "china" | "glassware"
  | "flatware" | "dance_floor" | "lighting" | "tent" | "heaters" | "other";

export interface RentalItem {
  id: string;
  category: RentalCategory;
  item: string;
  quantity: number;
  unitCost: number;
  notes?: string;
  vendorId?: string;
}

// ---- Hair & Makeup (PRD §3.2) -----------------------------------------

export interface BeautyAppt {
  id: string;
  who: string;                 // organizer, partner, MOH, mother, etc.
  service: "hair" | "makeup" | "both";
  startTime: string;           // HH:mm
  durationMin: number;
  trial: boolean;
  notes?: string;
}

// ---- Tastings + site visits ------------------------------------------

export type VisitKind = "tasting" | "site_visit" | "trial" | "consultation" | "fitting";

export interface VisitAppt {
  id: string;
  kind: VisitKind;
  vendorId?: string;
  vendorName: string;
  date: string;                // YYYY-MM-DD
  time?: string;
  location?: string;
  attendees: string[];         // free-text names
  notes?: string;
  done?: boolean;
}

// ---- Marriage license (NEW — not in PRD) ------------------------------

export interface MarriageLicense {
  id: string;
  state: string;
  county: string;
  applicationDate?: string;
  appointmentDate?: string;
  pickedUpAt?: string;
  expiresAt?: string;
  filedAt?: string;
  // Per-state requirements that vary widely.
  requirements: string[];
  notes?: string;
}

// ---- Wedding website (NEW — couples expect this) ----------------------

// A custom question shown on the RSVP form. Smart-RSVP pattern from
// Joy / RSVPify / Say I Do — couples crowdsource dietary, song requests,
// arrival times, transport needs in one form. Responses flow into Larder
// (allergens), Cantor (playlist), Quartermaster (welcome bag).
export interface RsvpQuestion {
  id: string;
  kind: "text" | "choice" | "yes_no";
  question: string;
  options?: string[];                 // for kind === "choice"
  required?: boolean;
  appliesToOnlyAttending?: boolean;   // skip if guest RSVP'd no
  routesTo?: "larder" | "cantor" | "quartermaster" | "cartographer" | "none"; // which agent the answer feeds
}

export interface WeddingSite {
  slug: string;
  hero: string;                // "Maya & Jordan · September 2026"
  story: string;
  schedulePublished: boolean;
  rsvpEnabled: boolean;
  registryLinked: boolean;
  travelGuide: string;
  faqs: { q: string; a: string }[];
  customRsvpQuestions?: RsvpQuestion[];
  password?: string;           // optional gate
}

// ---- Wedding Party (NEW) ---------------------------------------------

export interface WeddingPartyMember {
  id: string;
  name: string;
  role: "maid_of_honor" | "best_man" | "bridesmaid" | "groomsman" | "officiant" | "ring_bearer" | "flower_kid" | "usher" | "officiant_witness" | "other";
  side: "organizer" | "partner";
  attireOrdered?: boolean;
  attireSize?: string;
  attireColor?: string;
  giftIdea?: string;
  email?: string;
}

// ---- Pre-wedding events (NEW) ----------------------------------------

export type PreEventKind =
  | "engagement_party" | "bridal_shower" | "bachelor_party"
  | "bachelorette_party" | "rehearsal_dinner" | "welcome_drinks"
  | "after_party" | "morning_after_brunch";

export interface PreEvent {
  id: string;
  kind: PreEventKind;
  date: string;
  location: string;
  hostNames: string[];
  invitedCount: number;
  notes?: string;
  budgetUsd?: number;
}

// ---- Tip envelopes (NEW — practical day-of need) ----------------------

export interface TipEnvelope {
  id: string;
  vendorId?: string;
  recipient: string;
  amountUsd: number;
  cashDelivered?: boolean;
  handedToOnDay?: string;     // who's responsible for delivering it
}

// ---- Memorial / Tribute (NEW) ----------------------------------------

export interface Memorial {
  id: string;
  name: string;
  relationship: string;
  side: "organizer" | "partner" | "both";
  treatment: "memorial_table" | "ceremony_mention" | "candle" | "reserved_seat" | "boutonniere_charm";
  notes?: string;
}

// ---- Ledger ------------------------------------------------------------

export interface LedgerEvent {
  id: string;
  at: string;
  actor: "user" | "agent";
  agent?: AgentName;
  kind: string;
  summary: string;
  meta?: Record<string, unknown>;
  gateScope?: GateScope;
}

// ---- Viewer / settings -------------------------------------------------

export type ViewerRole = "organizer" | "partner" | "planner" | "vendor";

export interface GateConfig {
  dress: boolean;
  partner_gift: boolean;
  honeymoon: boolean;
  speech: boolean;
  vows_organizer: boolean;
  vows_partner: boolean;
}

export interface PricingPlan {
  id: "free" | "couple_plus" | "planner" | "studio";
  label: string;
  monthly: number;
  blurb: string;
  features: string[];
}

export interface ProjectState {
  brief: Brief | null;
  chat: ChatMessage[];
  approvals: ApprovalCard[];
  ledger: LedgerEvent[];
  paused: boolean;
  pausedReason?: string;
  vendors: Vendor[];
  budget: BudgetLine[];
  households: Household[];
  guests: Guest[];
  designs: DesignAsset[];
  seating: SeatingChart;
  dayOf: DayOfItem[];
  thanks: ThankYou[];
  gates: GateConfig;
  viewer: ViewerRole;
  maestroName?: string;
  // New v1 entities
  stationery: StationerySuite[];
  hotelBlocks: HotelBlock[];
  shuttles: Shuttle[];
  welcomeBag: WelcomeBagItem[];
  contingencies: ContingencyBand[];
  engagement: EngagementMilestone[];
  vows: VowDraft[];
  speeches: SpeechDraft[];
  registry: RegistryItem[];
  honeymoon: HoneymoonSegment[];
  // Day-of mode flag — when true, approval queue is suspended,
  // contingency bands take effect, Maestro Jr. handles in-band decisions.
  dayOfMode: boolean;
  // Plan tier (display only, no payment integration in v0).
  plan: "free" | "couple_plus" | "planner" | "studio";
  // Approved tokens registry — proves a card was approved before agent acts.
  approvedTokens: string[];
  // New v1.5 entities.
  music: MusicCue[];
  ceremony: CeremonySection[];
  ceremonyTradition: CeremonyTradition;
  cake: CakeSpec | null;
  bar: BarProgram | null;
  florals: FloralArrangement[];
  rentals: RentalItem[];
  beauty: BeautyAppt[];
  visits: VisitAppt[];
  license: MarriageLicense | null;
  site: WeddingSite | null;
  weddingParty: WeddingPartyMember[];
  preEvents: PreEvent[];
  tips: TipEnvelope[];
  memorials: Memorial[];
  // Caterer/cake/bar menu the Larder agent uses for dietary cross-checks.
  menu: MenuItem[];
  // Couple-set resolutions per conflict, keyed by `${guestId}__${menuItemId}`.
  dietaryResolutions: Record<string, DietaryResolution>;
}

export const DEFAULT_GATES: GateConfig = {
  dress: false,
  partner_gift: false,
  honeymoon: false,
  speech: false,
  vows_organizer: false,
  vows_partner: false,
};

export const EMPTY_SEATING: SeatingChart = {
  tables: [],
  assignments: {},
  constraints: [],
  cost: 0,
};

// Pun-y wedding-planner names couples can pick for Maestro.
export const MAESTRO_NAMES = [
  "Maestro",
  "Aisle Capone",
  "Veil Hartz",
  "Vowdini",
  "Bouquet Fontaine",
  "Knot Wright",
  "Cake Walken",
  "Marry Poppins",
  "Indiana Vows",
  "Vow Wilder",
  "Florist Gump",
  "Sir Vows-A-Lot",
  "Marquee Brûlée",
  "Ferris Wedder",
  "Aisle B. There",
  "The Vow-fessor",
  "Captain Aisle",
  "The Wed-itor",
  "Walt Whitveil",
  "Lady Wedweth",
  "Aretha Frank-vows",
  "Tux Luthor",
  "Veil Armstrong",
  "Engaged-y Murphy",
  "Holy Matrimoanie",
  "William Shakesveil",
  "Marie Antoiknot",
  "Plot Twistle",
  "Toastmaster Flex",
  "Honey, I'm Suite",
] as const;

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "free",
    label: "Free",
    monthly: 0,
    blurb: "Read-only. Approve cards, see the timeline. No agent work.",
    features: ["Maestro chat (read-only)", "Approve / reject cards from your planner", "Ledger view"],
  },
  {
    id: "couple_plus",
    label: "Couple+",
    monthly: 49,
    blurb: "The full agent network. Best for couples planning themselves.",
    features: ["Every specialist agent", "Vendor marketplace + outreach", "Budget, guests, seating, design", "Dress firewall + gated workflows", "Day-of console", "Thank-you studio", "Founders' price grandfathered"],
  },
  {
    id: "planner",
    label: "Planner",
    monthly: 199,
    blurb: "Multi-couple dashboard for professional planners.",
    features: ["Everything in Couple+", "Switch between couples", "Planner override layer", "Day-of mode for the planner's own device", "Couple-shared notes"],
  },
  {
    id: "studio",
    label: "Studio",
    monthly: 999,
    blurb: "API + integrations + white-label. For agencies.",
    features: ["Everything in Planner", "API access", "White-label print partner", "AISLE Verified vendor program", "Volume billing"],
  },
];
