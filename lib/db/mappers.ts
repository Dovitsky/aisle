// Row ↔ TypeScript type mappers. Postgres uses snake_case, our types use camelCase.
// Each mapper has a `toRow` (TS → Postgres) and a `fromRow` (Postgres → TS).

import type {
  ApprovalCard, Brief, ChatMessage, Vendor, VendorMessage, BudgetLine,
  Household, Guest, DesignAsset, DayOfItem, ThankYou, LedgerEvent,
  StationerySuite, HotelBlock, Shuttle, WelcomeBagItem, ContingencyBand,
  EngagementMilestone, VowDraft, SpeechDraft, RegistryItem, HoneymoonSegment,
  MusicCue, CeremonySection, CakeSpec, BarProgram, FloralArrangement,
  RentalItem, BeautyAppt, VisitAppt, MarriageLicense, WeddingSite,
  WeddingPartyMember, PreEvent, TipEnvelope, Memorial, MenuItem,
  SeatingChart,
} from "../types";

// ---- Vendor ------------------------------------------------------------

export const vendorFromRow = (r: Record<string, unknown>): Vendor => ({
  id: r.id as string,
  name: r.name as string,
  category: r.category as string,
  city: (r.city as string) ?? "",
  fitScore: (r.fit_score as number) ?? 0,
  priceBracket: (r.price_bracket as Vendor["priceBracket"]) ?? "$$",
  notes: (r.notes as string) ?? "",
  status: (r.status as Vendor["status"]) ?? "shortlisted",
  estimateUsd: r.estimate_usd as number | undefined,
  contractedUsd: r.contracted_usd as number | undefined,
  paidUsd: r.paid_usd as number | undefined,
  lastTouchAt: r.last_touch_at as string | undefined,
  gateScope: r.gate_scope as Vendor["gateScope"],
  verified: Boolean(r.verified),
  thread: [],            // populated from vendor_messages join
});

export const vendorToRow = (v: Vendor, projectId: string) => ({
  id: v.id, project_id: projectId,
  name: v.name, category: v.category, city: v.city,
  fit_score: v.fitScore, price_bracket: v.priceBracket, notes: v.notes,
  status: v.status, estimate_usd: v.estimateUsd ?? null,
  contracted_usd: v.contractedUsd ?? null, paid_usd: v.paidUsd ?? null,
  last_touch_at: v.lastTouchAt ?? new Date().toISOString(),
  gate_scope: v.gateScope ?? null, verified: !!v.verified,
});

export const vendorMessageFromRow = (r: Record<string, unknown>): VendorMessage => ({
  id: r.id as string,
  at: r.at as string,
  direction: r.direction as VendorMessage["direction"],
  body: (r.body as string) ?? "",
  parsedIntent: r.parsed_intent as VendorMessage["parsedIntent"],
  quotedUsd: r.quoted_usd as number | undefined,
});

// ---- Approvals ---------------------------------------------------------

export const approvalFromRow = (r: Record<string, unknown>): ApprovalCard => ({
  id: r.id as string,
  createdAt: r.created_at as string,
  agent: r.agent as ApprovalCard["agent"],
  phase: r.phase as ApprovalCard["phase"],
  title: r.title as string,
  rationale: (r.rationale as string) ?? "",
  risk: r.risk as ApprovalCard["risk"],
  action: r.action as ApprovalCard["action"],
  status: r.status as ApprovalCard["status"],
  resolvedAt: r.resolved_at as string | undefined,
  rejectionNote: r.rejection_note as string | undefined,
  gateScope: r.gate_scope as ApprovalCard["gateScope"],
  approvalToken: r.approval_token as string | undefined,
});

export const approvalToRow = (a: ApprovalCard, projectId: string) => ({
  id: a.id, project_id: projectId,
  created_at: a.createdAt, agent: a.agent, phase: a.phase,
  title: a.title, rationale: a.rationale, risk: a.risk,
  action: a.action, status: a.status,
  resolved_at: a.resolvedAt ?? null,
  rejection_note: a.rejectionNote ?? null,
  gate_scope: a.gateScope ?? null,
  approval_token: a.approvalToken ?? null,
});

// ---- Ledger ------------------------------------------------------------

export const ledgerFromRow = (r: Record<string, unknown>): LedgerEvent => ({
  id: r.id as string,
  at: r.at as string,
  actor: r.actor as LedgerEvent["actor"],
  agent: r.agent as LedgerEvent["agent"],
  kind: r.kind as string,
  summary: (r.summary as string) ?? "",
  meta: r.meta as Record<string, unknown> | undefined,
  gateScope: r.gate_scope as LedgerEvent["gateScope"],
});

export const ledgerToRow = (e: LedgerEvent, projectId: string) => ({
  id: e.id, project_id: projectId, at: e.at,
  actor: e.actor, agent: e.agent ?? null,
  kind: e.kind, summary: e.summary, meta: e.meta ?? null,
  gate_scope: e.gateScope ?? null,
});

// ---- Chat --------------------------------------------------------------

export const chatFromRow = (r: Record<string, unknown>): ChatMessage => ({
  id: r.id as string,
  createdAt: r.created_at as string,
  role: r.role as ChatMessage["role"],
  agent: r.agent as ChatMessage["agent"],
  content: r.content as string,
  gateScope: r.gate_scope as ChatMessage["gateScope"],
});

export const chatToRow = (m: ChatMessage, projectId: string) => ({
  id: m.id, project_id: projectId, created_at: m.createdAt,
  role: m.role, agent: m.agent ?? null, content: m.content,
  gate_scope: m.gateScope ?? null,
});

// ---- Brief / projects --------------------------------------------------

// The brief is denormalized into the projects row (see schema).
export const briefFromProjectRow = (r: Record<string, unknown>): Brief | null => {
  if (!r.organizer_name) return null;
  return {
    organizerName: r.organizer_name as string,
    partnerName: r.partner_name as string,
    dateWindow: (r.date_window as string) ?? "",
    region: (r.region as string) ?? "",
    guestCount: (r.guest_count as number) ?? 100,
    budgetUsd: (r.budget_usd as number) ?? 50000,
    vibe: (r.vibe as string) ?? "",
    plannerStatus: ((r.planner_status as Brief["plannerStatus"]) ?? "want_one"),
    locked: Boolean(r.brief_locked),
    lockedAt: r.brief_locked_at as string | undefined,
    cultural: (r.cultural as Brief["cultural"]) ?? "secular",
    formalityTone: (r.formality_tone as Brief["formalityTone"]) ?? "modern",
    destination: Boolean(r.destination),
    weddingDate: r.wedding_date as string | undefined,
  };
};

// ---- Budget ------------------------------------------------------------

export const budgetFromRow = (r: Record<string, unknown>): BudgetLine => ({
  id: r.id as string, category: r.category as string,
  planUsd: (r.plan_usd as number) ?? 0,
  committedUsd: (r.committed_usd as number) ?? 0,
  paidUsd: (r.paid_usd as number) ?? 0,
  vendorId: r.vendor_id as string | undefined,
  gateScope: r.gate_scope as BudgetLine["gateScope"],
});
export const budgetToRow = (b: BudgetLine, projectId: string) => ({
  id: b.id, project_id: projectId, category: b.category,
  plan_usd: b.planUsd, committed_usd: b.committedUsd, paid_usd: b.paidUsd,
  vendor_id: b.vendorId ?? null, gate_scope: b.gateScope ?? null,
});

// ---- Households + guests -----------------------------------------------

export const householdFromRow = (r: Record<string, unknown>): Household => ({
  id: r.id as string, label: r.label as string,
  side: (r.side as Household["side"]) ?? "both",
  mailingAddress: r.mailing_address as string | undefined,
  email: r.email as string | undefined,
  phone: r.phone as string | undefined,
  outOfTown: Boolean(r.out_of_town),
  hotelBlockReserved: Boolean(r.hotel_block_reserved),
  shuttleSeat: Boolean(r.shuttle_seat),
  welcomeBag: Boolean(r.welcome_bag),
  saveTheDateSentAt: r.save_the_date_sent_at as string | undefined,
  invitationSentAt: r.invitation_sent_at as string | undefined,
});
export const householdToRow = (h: Household, projectId: string) => ({
  id: h.id, project_id: projectId, label: h.label, side: h.side,
  mailing_address: h.mailingAddress ?? null, email: h.email ?? null, phone: h.phone ?? null,
  out_of_town: !!h.outOfTown, hotel_block_reserved: !!h.hotelBlockReserved,
  shuttle_seat: !!h.shuttleSeat, welcome_bag: !!h.welcomeBag,
  save_the_date_sent_at: h.saveTheDateSentAt ?? null,
  invitation_sent_at: h.invitationSentAt ?? null,
});

export const guestFromRow = (r: Record<string, unknown>): Guest => ({
  id: r.id as string,
  householdId: r.household_id as string,
  fullName: r.full_name as string,
  preferredName: r.preferred_name as string | undefined,
  side: (r.side as Guest["side"]) ?? "both",
  relationship: (r.relationship as Guest["relationship"]) ?? "other",
  isChild: Boolean(r.is_child),
  plusOnePolicy: (r.plus_one_policy as Guest["plusOnePolicy"]) ?? "none",
  plusOneName: r.plus_one_name as string | undefined,
  rsvp: (r.rsvp as Guest["rsvp"]) ?? "no_response",
  meal: r.meal as string | undefined,
  dietary: r.dietary as string | undefined,
  notes: r.notes as string | undefined,
  accessibility: r.accessibility as string | undefined,
  songRequest: r.song_request as string | undefined,
  // Structured dietary fields are NOT in the schema yet — we store them in `dietary` as JSON
  // and parse on read. See note in initial migration.
});
export const guestToRow = (g: Guest, projectId: string) => ({
  id: g.id, project_id: projectId, household_id: g.householdId,
  full_name: g.fullName, preferred_name: g.preferredName ?? null,
  side: g.side, relationship: g.relationship, is_child: !!g.isChild,
  plus_one_policy: g.plusOnePolicy, plus_one_name: g.plusOneName ?? null,
  rsvp: g.rsvp, meal: g.meal ?? null, dietary: g.dietary ?? null,
  notes: g.notes ?? null, accessibility: g.accessibility ?? null,
  song_request: g.songRequest ?? null,
});

// ---- Designs -----------------------------------------------------------

export const designFromRow = (r: Record<string, unknown>): DesignAsset => ({
  id: r.id as string, title: r.title as string,
  kind: r.kind as DesignAsset["kind"],
  description: (r.description as string) ?? "",
  swatches: (r.swatches as string[]) ?? undefined,
  refs: (r.refs as string[]) ?? undefined,
  createdAt: r.created_at as string,
  agent: r.agent as DesignAsset["agent"],
  gateScope: r.gate_scope as DesignAsset["gateScope"],
  approved: Boolean(r.approved),
});
export const designToRow = (d: DesignAsset, projectId: string) => ({
  id: d.id, project_id: projectId, title: d.title, kind: d.kind,
  description: d.description, swatches: d.swatches ?? null, refs: d.refs ?? null,
  created_at: d.createdAt, agent: d.agent, gate_scope: d.gateScope ?? null,
  approved: !!d.approved,
});

// ---- Day-of, contingencies, thanks, registry, honeymoon ----------------

export const dayOfFromRow = (r: Record<string, unknown>): DayOfItem => ({
  id: r.id as string, time: (r.time as string) ?? "",
  title: r.title as string, owner: (r.owner as string) ?? "",
  status: r.status as DayOfItem["status"],
  note: r.note as string | undefined,
  toleranceMinutes: r.tolerance_minutes as number | undefined,
  critical: Boolean(r.critical),
});
export const dayOfToRow = (d: DayOfItem, projectId: string, position = 0) => ({
  id: d.id, project_id: projectId, time: d.time, title: d.title,
  owner: d.owner, status: d.status, note: d.note ?? null,
  tolerance_minutes: d.toleranceMinutes ?? null, critical: !!d.critical,
  position,
});

export const contingencyFromRow = (r: Record<string, unknown>): ContingencyBand => ({
  id: r.id as string, topic: r.topic as ContingencyBand["topic"],
  preApproved: r.pre_approved as string,
  escalation: r.escalation as ContingencyBand["escalation"],
  triggered: Boolean(r.triggered),
  triggeredAt: r.triggered_at as string | undefined,
  triggerNote: r.trigger_note as string | undefined,
});
export const contingencyToRow = (c: ContingencyBand, projectId: string) => ({
  id: c.id, project_id: projectId, topic: c.topic,
  pre_approved: c.preApproved, escalation: c.escalation,
  triggered: !!c.triggered, triggered_at: c.triggeredAt ?? null,
  trigger_note: c.triggerNote ?? null,
});

export const thankFromRow = (r: Record<string, unknown>): ThankYou => ({
  id: r.id as string, guestId: r.guest_id as string,
  guestName: r.guest_name as string,
  giftDescription: r.gift_description as string | undefined,
  draftBody: r.draft_body as string | undefined,
  status: r.status as ThankYou["status"],
  sentAt: r.sent_at as string | undefined,
});
export const thankToRow = (t: ThankYou, projectId: string) => ({
  id: t.id, project_id: projectId, guest_id: t.guestId,
  guest_name: t.guestName, gift_description: t.giftDescription ?? null,
  draft_body: t.draftBody ?? null, status: t.status, sent_at: t.sentAt ?? null,
});

export const registryFromRow = (r: Record<string, unknown>): RegistryItem => ({
  id: r.id as string, item: (r.item as string) ?? "",
  vendor: (r.vendor as string) ?? "",
  priceUsd: (r.price_usd as number) ?? 0,
  category: r.category as RegistryItem["category"],
  url: r.url as string | undefined,
  status: r.status as RegistryItem["status"],
  purchasedBy: r.purchased_by as string | undefined,
});
export const registryToRow = (r: RegistryItem, projectId: string) => ({
  id: r.id, project_id: projectId, item: r.item, vendor: r.vendor,
  price_usd: r.priceUsd, category: r.category, url: r.url ?? null,
  status: r.status, purchased_by: r.purchasedBy ?? null,
});

export const honeymoonFromRow = (r: Record<string, unknown>): HoneymoonSegment => ({
  id: r.id as string, city: r.city as string, country: r.country as string,
  arrivalDate: r.arrival_date as string, departureDate: r.departure_date as string,
  hotel: r.hotel as string | undefined, notes: r.notes as string | undefined,
  surprise: Boolean(r.surprise),
});
export const honeymoonToRow = (s: HoneymoonSegment, projectId: string) => ({
  id: s.id, project_id: projectId, city: s.city, country: s.country,
  arrival_date: s.arrivalDate, departure_date: s.departureDate,
  hotel: s.hotel ?? null, notes: s.notes ?? null, surprise: !!s.surprise,
});

// ---- Logistics ---------------------------------------------------------

export const hotelFromRow = (r: Record<string, unknown>): HotelBlock => ({
  id: r.id as string, hotel: r.hotel as string, city: (r.city as string) ?? "",
  nightlyRateUsd: (r.nightly_rate_usd as number) ?? 0,
  roomsBlocked: (r.rooms_blocked as number) ?? 0,
  roomsBooked: (r.rooms_booked as number) ?? 0,
  releaseDate: r.release_date as string,
  notes: r.notes as string | undefined,
});
export const hotelToRow = (h: HotelBlock, projectId: string) => ({
  id: h.id, project_id: projectId, hotel: h.hotel, city: h.city,
  nightly_rate_usd: h.nightlyRateUsd, rooms_blocked: h.roomsBlocked,
  rooms_booked: h.roomsBooked, release_date: h.releaseDate, notes: h.notes ?? null,
});

export const shuttleFromRow = (r: Record<string, unknown>): Shuttle => ({
  id: r.id as string, route: r.route as string, pickupTime: r.pickup_time as string,
  capacity: (r.capacity as number) ?? 30,
  reservedSeats: (r.reserved_seats as number) ?? 0,
});
export const shuttleToRow = (s: Shuttle, projectId: string) => ({
  id: s.id, project_id: projectId, route: s.route,
  pickup_time: s.pickupTime, capacity: s.capacity, reserved_seats: s.reservedSeats,
});

export const wbFromRow = (r: Record<string, unknown>): WelcomeBagItem => ({
  id: r.id as string, item: r.item as string,
  unitCostUsd: (r.unit_cost_usd as number) ?? 0,
  rationale: (r.rationale as string) ?? "",
});
export const wbToRow = (w: WelcomeBagItem, projectId: string) => ({
  id: w.id, project_id: projectId, item: w.item,
  unit_cost_usd: w.unitCostUsd, rationale: w.rationale,
});

// ---- Personal: vows + speeches + engagement + memorials + visits ------

export const vowFromRow = (r: Record<string, unknown>): VowDraft => ({
  id: r.id as string, whose: r.whose as VowDraft["whose"],
  draft: (r.draft as string) ?? "",
  wordCount: (r.word_count as number) ?? 0,
  locked: Boolean(r.locked),
  notes: r.notes as string | undefined,
});
export const vowToRow = (v: VowDraft, projectId: string) => ({
  id: v.id, project_id: projectId, whose: v.whose, draft: v.draft,
  word_count: v.wordCount, locked: !!v.locked, notes: v.notes ?? null,
});

export const speechFromRow = (r: Record<string, unknown>): SpeechDraft => ({
  id: r.id as string, speaker: r.speaker as string,
  draft: (r.draft as string) ?? "",
  wordCount: (r.word_count as number) ?? 0,
  approved: Boolean(r.approved),
});
export const speechToRow = (s: SpeechDraft, projectId: string) => ({
  id: s.id, project_id: projectId, speaker: s.speaker,
  draft: s.draft, word_count: s.wordCount, approved: !!s.approved,
});

export const engagementFromRow = (r: Record<string, unknown>): EngagementMilestone => ({
  id: r.id as string, kind: r.kind as EngagementMilestone["kind"],
  title: r.title as string, description: (r.description as string) ?? "",
  status: r.status as EngagementMilestone["status"],
  scheduledFor: r.scheduled_for as string | undefined,
});
export const engagementToRow = (e: EngagementMilestone, projectId: string) => ({
  id: e.id, project_id: projectId, kind: e.kind, title: e.title,
  description: e.description, status: e.status,
  scheduled_for: e.scheduledFor ?? null,
});

export const memorialFromRow = (r: Record<string, unknown>): Memorial => ({
  id: r.id as string, name: r.name as string,
  relationship: r.relationship as string,
  side: r.side as Memorial["side"],
  treatment: r.treatment as Memorial["treatment"],
  notes: r.notes as string | undefined,
});
export const memorialToRow = (m: Memorial, projectId: string) => ({
  id: m.id, project_id: projectId, name: m.name,
  relationship: m.relationship, side: m.side, treatment: m.treatment,
  notes: m.notes ?? null,
});

export const visitFromRow = (r: Record<string, unknown>): VisitAppt => ({
  id: r.id as string, kind: r.kind as VisitAppt["kind"],
  vendorId: r.vendor_id as string | undefined,
  vendorName: (r.vendor_name as string) ?? "",
  date: r.date as string,
  time: r.time as string | undefined,
  location: r.location as string | undefined,
  attendees: (r.attendees as string[]) ?? [],
  notes: r.notes as string | undefined,
  done: Boolean(r.done),
});
export const visitToRow = (v: VisitAppt, projectId: string) => ({
  id: v.id, project_id: projectId, kind: v.kind,
  vendor_id: v.vendorId ?? null, vendor_name: v.vendorName,
  date: v.date, time: v.time ?? null, location: v.location ?? null,
  attendees: v.attendees, notes: v.notes ?? null, done: !!v.done,
});

// ---- Day modules: music, ceremony, cake, bar, florals, rentals, beauty -

export const musicFromRow = (r: Record<string, unknown>): MusicCue => ({
  id: r.id as string, slot: r.slot as MusicCue["slot"],
  song: (r.song as string) ?? "", artist: (r.artist as string) ?? "",
  notes: r.notes as string | undefined,
  guestRequest: Boolean(r.guest_request),
  approved: Boolean(r.approved),
});
export const musicToRow = (c: MusicCue, projectId: string) => ({
  id: c.id, project_id: projectId, slot: c.slot, song: c.song, artist: c.artist,
  notes: c.notes ?? null, guest_request: !!c.guestRequest, approved: !!c.approved,
});

export const ceremonyFromRow = (r: Record<string, unknown>): CeremonySection => ({
  id: r.id as string, kind: r.kind as CeremonySection["kind"],
  title: r.title as string, body: (r.body as string) ?? "",
  reader: r.reader as string | undefined,
  approved: Boolean(r.approved),
  tradition: r.tradition as CeremonySection["tradition"],
  ritualKey: r.ritual_key as string | undefined,
});
export const ceremonyToRow = (c: CeremonySection, projectId: string, position = 0) => ({
  id: c.id, project_id: projectId, kind: c.kind, title: c.title,
  body: c.body, reader: c.reader ?? null, approved: !!c.approved,
  tradition: c.tradition ?? null, ritual_key: c.ritualKey ?? null,
  position,
});

export const cakeFromRow = (r: Record<string, unknown>): CakeSpec => ({
  id: "cake_" + (r.project_id as string),
  tiers: (r.tiers as number) ?? 3,
  flavors: (r.flavors as string[]) ?? [],
  fillings: (r.fillings as string[]) ?? [],
  frostingStyle: (r.frosting_style as string) ?? "",
  decorationNotes: (r.decoration_notes as string) ?? "",
  servings: (r.servings as number) ?? 100,
  allergenNotes: (r.allergen_notes as string) ?? "",
  vendorId: r.vendor_id as string | undefined,
  approved: Boolean(r.approved),
  // allergens not in schema yet; if you add a JSON column, populate here.
});
export const cakeToRow = (c: CakeSpec, projectId: string) => ({
  project_id: projectId, tiers: c.tiers, flavors: c.flavors, fillings: c.fillings,
  frosting_style: c.frostingStyle, decoration_notes: c.decorationNotes,
  servings: c.servings, allergen_notes: c.allergenNotes, vendor_id: c.vendorId ?? null,
  approved: !!c.approved,
});

export const barFromRow = (r: Record<string, unknown>): BarProgram => ({
  id: "bar_" + (r.project_id as string),
  style: (r.style as BarProgram["style"]) ?? "open",
  signatureCount: (r.signature_count as number) ?? 0,
  itemMenu: (r.item_menu as BarProgram["itemMenu"]) ?? [],
  estimatedAlcoholBudget: (r.estimated_alcohol_budget as number) ?? 0,
  notes: (r.notes as string) ?? "",
});
export const barToRow = (b: BarProgram, projectId: string) => ({
  project_id: projectId, style: b.style, signature_count: b.signatureCount,
  item_menu: b.itemMenu, estimated_alcohol_budget: b.estimatedAlcoholBudget,
  notes: b.notes,
});

export const floralFromRow = (r: Record<string, unknown>): FloralArrangement => ({
  id: r.id as string, piece: r.piece as FloralArrangement["piece"],
  quantity: (r.quantity as number) ?? 1,
  primary: (r.primary_stems as string[]) ?? [],
  secondary: (r.secondary_stems as string[]) ?? [],
  vesselNotes: r.vessel_notes as string | undefined,
  unitCost: (r.unit_cost as number) ?? 0,
  approved: Boolean(r.approved),
});
export const floralToRow = (f: FloralArrangement, projectId: string) => ({
  id: f.id, project_id: projectId, piece: f.piece, quantity: f.quantity,
  primary_stems: f.primary, secondary_stems: f.secondary,
  vessel_notes: f.vesselNotes ?? null, unit_cost: f.unitCost, approved: !!f.approved,
});

export const rentalFromRow = (r: Record<string, unknown>): RentalItem => ({
  id: r.id as string, category: r.category as RentalItem["category"],
  item: r.item as string, quantity: (r.quantity as number) ?? 1,
  unitCost: (r.unit_cost as number) ?? 0,
  notes: r.notes as string | undefined,
  vendorId: r.vendor_id as string | undefined,
});
export const rentalToRow = (r: RentalItem, projectId: string) => ({
  id: r.id, project_id: projectId, category: r.category, item: r.item,
  quantity: r.quantity, unit_cost: r.unitCost, notes: r.notes ?? null,
  vendor_id: r.vendorId ?? null,
});

export const beautyFromRow = (r: Record<string, unknown>): BeautyAppt => ({
  id: r.id as string, who: (r.who as string) ?? "",
  service: r.service as BeautyAppt["service"],
  startTime: (r.start_time as string) ?? "",
  durationMin: (r.duration_min as number) ?? 60,
  trial: Boolean(r.trial),
  notes: r.notes as string | undefined,
});
export const beautyToRow = (b: BeautyAppt, projectId: string) => ({
  id: b.id, project_id: projectId, who: b.who, service: b.service,
  start_time: b.startTime, duration_min: b.durationMin, trial: !!b.trial,
  notes: b.notes ?? null,
});

// ---- License + site + wedding party + pre-events + tips + party + stationery -

export const licenseFromRow = (r: Record<string, unknown>): MarriageLicense => ({
  id: "lic_" + (r.project_id as string),
  state: (r.state as string) ?? "",
  county: (r.county as string) ?? "",
  applicationDate: r.application_date as string | undefined,
  appointmentDate: r.appointment_date as string | undefined,
  pickedUpAt: r.picked_up_at as string | undefined,
  expiresAt: r.expires_at as string | undefined,
  filedAt: r.filed_at as string | undefined,
  requirements: (r.requirements as string[]) ?? [],
  notes: r.notes as string | undefined,
});
export const licenseToRow = (l: MarriageLicense, projectId: string) => ({
  project_id: projectId, state: l.state, county: l.county,
  application_date: l.applicationDate ?? null, appointment_date: l.appointmentDate ?? null,
  picked_up_at: l.pickedUpAt ?? null, expires_at: l.expiresAt ?? null,
  filed_at: l.filedAt ?? null, requirements: l.requirements, notes: l.notes ?? null,
});

export const siteFromRow = (r: Record<string, unknown>): WeddingSite => ({
  slug: (r.slug as string) ?? "",
  hero: (r.hero as string) ?? "",
  story: (r.story as string) ?? "",
  schedulePublished: Boolean(r.schedule_published),
  rsvpEnabled: Boolean(r.rsvp_enabled),
  registryLinked: Boolean(r.registry_linked),
  travelGuide: (r.travel_guide as string) ?? "",
  faqs: (r.faqs as { q: string; a: string }[]) ?? [],
  password: r.password as string | undefined,
});
export const siteToRow = (s: WeddingSite, projectId: string) => ({
  project_id: projectId, slug: s.slug, hero: s.hero, story: s.story,
  schedule_published: !!s.schedulePublished, rsvp_enabled: !!s.rsvpEnabled,
  registry_linked: !!s.registryLinked, travel_guide: s.travelGuide,
  faqs: s.faqs, password: s.password ?? null,
});

export const partyFromRow = (r: Record<string, unknown>): WeddingPartyMember => ({
  id: r.id as string, name: r.name as string,
  role: r.role as WeddingPartyMember["role"],
  side: r.side as WeddingPartyMember["side"],
  attireOrdered: Boolean(r.attire_ordered),
  attireSize: r.attire_size as string | undefined,
  attireColor: r.attire_color as string | undefined,
  giftIdea: r.gift_idea as string | undefined,
  email: r.email as string | undefined,
});
export const partyToRow = (p: WeddingPartyMember, projectId: string) => ({
  id: p.id, project_id: projectId, name: p.name, role: p.role, side: p.side,
  attire_ordered: !!p.attireOrdered, attire_size: p.attireSize ?? null,
  attire_color: p.attireColor ?? null, gift_idea: p.giftIdea ?? null,
  email: p.email ?? null,
});

export const preEventFromRow = (r: Record<string, unknown>): PreEvent => ({
  id: r.id as string, kind: r.kind as PreEvent["kind"],
  date: r.date as string, location: (r.location as string) ?? "",
  hostNames: (r.host_names as string[]) ?? [],
  invitedCount: (r.invited_count as number) ?? 0,
  notes: r.notes as string | undefined,
  budgetUsd: r.budget_usd as number | undefined,
});
export const preEventToRow = (e: PreEvent, projectId: string) => ({
  id: e.id, project_id: projectId, kind: e.kind, date: e.date,
  location: e.location, host_names: e.hostNames, invited_count: e.invitedCount,
  notes: e.notes ?? null, budget_usd: e.budgetUsd ?? null,
});

export const tipFromRow = (r: Record<string, unknown>): TipEnvelope => ({
  id: r.id as string, vendorId: r.vendor_id as string | undefined,
  recipient: (r.recipient as string) ?? "",
  amountUsd: (r.amount_usd as number) ?? 0,
  cashDelivered: Boolean(r.cash_delivered),
  handedToOnDay: r.handed_to_on_day as string | undefined,
});
export const tipToRow = (t: TipEnvelope, projectId: string) => ({
  id: t.id, project_id: projectId, vendor_id: t.vendorId ?? null,
  recipient: t.recipient, amount_usd: t.amountUsd,
  cash_delivered: !!t.cashDelivered, handed_to_on_day: t.handedToOnDay ?? null,
});

export const stationeryFromRow = (r: Record<string, unknown>): StationerySuite => ({
  id: r.id as string, direction: r.direction as string,
  palette: (r.palette as string[]) ?? [],
  font: (r.font as string) ?? "",
  format: (r.format as StationerySuite["format"]) ?? "hybrid",
  items: (r.items as StationerySuite["items"]) ?? [],
  createdAt: r.created_at as string,
  printRunCount: r.print_run_count as number | undefined,
  printPartner: r.print_partner as string | undefined,
  saveTheDateSentAt: r.save_the_date_sent_at as string | undefined,
  invitationsSentAt: r.invitations_sent_at as string | undefined,
});
export const stationeryToRow = (s: StationerySuite, projectId: string) => ({
  id: s.id, project_id: projectId, direction: s.direction,
  palette: s.palette, font: s.font, format: s.format, items: s.items,
  created_at: s.createdAt, print_run_count: s.printRunCount ?? null,
  print_partner: s.printPartner ?? null,
  save_the_date_sent_at: s.saveTheDateSentAt ?? null,
  invitations_sent_at: s.invitationsSentAt ?? null,
});

// ---- Menu --------------------------------------------------------------

export const menuFromRow = (r: Record<string, unknown>): MenuItem => ({
  id: r.id as string, course: r.course as MenuItem["course"],
  name: r.name as string, description: (r.description as string) ?? "",
  containsAllergens: (r.contains_allergens as MenuItem["containsAllergens"]) ?? [],
  isVegan: Boolean(r.is_vegan), isVegetarian: Boolean(r.is_vegetarian),
  isGlutenFree: Boolean(r.is_gluten_free), isDairyFree: Boolean(r.is_dairy_free),
  isKosher: Boolean(r.is_kosher), isHalal: Boolean(r.is_halal),
  isPescatarian: Boolean(r.is_pescatarian), isAlcoholic: Boolean(r.is_alcoholic),
  vendorId: r.vendor_id as string | undefined,
});
export const menuToRow = (m: MenuItem, projectId: string) => ({
  id: m.id, project_id: projectId, course: m.course, name: m.name,
  description: m.description, contains_allergens: m.containsAllergens,
  is_vegan: !!m.isVegan, is_vegetarian: !!m.isVegetarian,
  is_gluten_free: !!m.isGlutenFree, is_dairy_free: !!m.isDairyFree,
  is_kosher: !!m.isKosher, is_halal: !!m.isHalal,
  is_pescatarian: !!m.isPescatarian, is_alcoholic: !!m.isAlcoholic,
  vendor_id: m.vendorId ?? null,
});

// ---- Seating chart -----------------------------------------------------

export const seatingFromRow = (r: Record<string, unknown>): SeatingChart => ({
  tables: (r.tables as SeatingChart["tables"]) ?? [],
  assignments: (r.assignments as SeatingChart["assignments"]) ?? {},
  constraints: (r.constraints as SeatingChart["constraints"]) ?? [],
  cost: (r.cost as number) ?? 0,
  lastSolveAt: r.last_solve_at as string | undefined,
  locked: Boolean(r.locked),
});
export const seatingToRow = (s: SeatingChart, projectId: string) => ({
  project_id: projectId, tables: s.tables, assignments: s.assignments,
  constraints: s.constraints, cost: s.cost,
  last_solve_at: s.lastSolveAt ?? null, locked: !!s.locked,
});
