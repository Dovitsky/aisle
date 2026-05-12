// File-backed JSON store. v0 only. Replace with Drizzle/Postgres per build brief §6.
// Every mutation appends a LedgerEvent. every action is recorded (PRD §6.2).

import fs from "node:fs/promises";
import path from "node:path";
import {
  ProjectState, LedgerEvent, ApprovalCard, ChatMessage, Brief,
  Vendor, BudgetLine, Household, Guest, DesignAsset, SeatingChart,
  DayOfItem, ThankYou, ViewerRole, GateConfig, GateScope, AgentName,
  StationerySuite, HotelBlock, Shuttle, WelcomeBagItem,
  ContingencyBand, EngagementMilestone, VowDraft, SpeechDraft,
  RegistryItem, HoneymoonSegment, VendorMessage,
  CeremonyTradition,
  MusicCue, CeremonySection, CakeSpec, BarProgram, FloralArrangement,
  RentalItem, BeautyAppt, VisitAppt, MarriageLicense, WeddingSite,
  WeddingPartyMember, PreEvent, TipEnvelope, Memorial,
  MenuItem, DietaryResolution,
  MoodBoard, Pin, ImageGeneration,
  DEFAULT_GATES, EMPTY_SEATING,
} from "./types";

// AISLE_STORE_FILE lets tests + the autonomous loop point at an isolated store
// without touching the developer's persistent data/store.json.
// On serverless hosts (Vercel, Netlify Functions, AWS Lambda) the working
// directory is read-only. only /tmp is writable. Detect that and fall
// back to /tmp so the JSON store still works for demos. State persists
// only within a warm container in that mode; cold starts reset.
const SERVERLESS =
  !!process.env.VERCEL ||
  !!process.env.NETLIFY ||
  !!process.env.AWS_LAMBDA_FUNCTION_NAME;
const STORE_FILE = process.env.AISLE_STORE_FILE
  ? path.resolve(process.env.AISLE_STORE_FILE)
  : SERVERLESS
  ? "/tmp/aisle-store.json"
  : path.join(process.cwd(), "data", "store.json");
const DATA_DIR = path.dirname(STORE_FILE);

const EMPTY: ProjectState = {
  brief: null,
  chat: [],
  approvals: [],
  ledger: [],
  paused: false,
  vendors: [],
  budget: [],
  households: [],
  guests: [],
  designs: [],
  seating: EMPTY_SEATING,
  dayOf: [],
  thanks: [],
  gates: DEFAULT_GATES,
  viewer: "organizer",
  stationery: [],
  hotelBlocks: [],
  shuttles: [],
  welcomeBag: [],
  contingencies: [],
  engagement: [],
  vows: [],
  speeches: [],
  registry: [],
  honeymoon: [],
  dayOfMode: false,
  plan: "couple_plus",
  approvedTokens: [],
  music: [],
  ceremony: [],
  ceremonyTradition: "humanist",
  cake: null,
  bar: null,
  florals: [],
  rentals: [],
  beauty: [],
  visits: [],
  license: null,
  site: null,
  weddingParty: [],
  preEvents: [],
  tips: [],
  memorials: [],
  menu: [],
  dietaryResolutions: {},
};

let cache: ProjectState | null = null;
let writeChain: Promise<void> = Promise.resolve();

import { hasSupabase } from "./db/supabase";
import { loadProjectState } from "./db/loader";
import { persistDelta } from "./db/persist";
import { currentProjectId } from "./auth/project";

async function ensureFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(STORE_FILE);
  } catch {
    await fs.writeFile(STORE_FILE, JSON.stringify(EMPTY, null, 2), "utf8");
  }
}

export async function readState(): Promise<ProjectState> {
  if (cache) return cache;
  if (hasSupabase()) {
    const projectId = await currentProjectId();
    cache = await loadProjectState(projectId);
    return cache;
  }
  await ensureFile();
  const raw = await fs.readFile(STORE_FILE, "utf8");
  const parsed = JSON.parse(raw) as Partial<ProjectState>;
  cache = {
    ...EMPTY,
    ...parsed,
    seating: { ...EMPTY_SEATING, ...(parsed.seating ?? {}) },
    gates: { ...DEFAULT_GATES, ...(parsed.gates ?? {}) },
  };
  return cache;
}

export async function writeState(next: ProjectState): Promise<void> {
  cache = next;
  if (hasSupabase()) return;       // Postgres mode persists via mutate's persistDelta.
  writeChain = writeChain.then(async () => {
    await ensureFile();
    await fs.writeFile(STORE_FILE, JSON.stringify(next, null, 2), "utf8");
  });
  await writeChain;
}

export function invalidateCache() { cache = null; }

export async function mutate(fn: (s: ProjectState) => ProjectState): Promise<ProjectState> {
  const cur = await readState();
  const next = fn(structuredClone(cur));
  if (hasSupabase()) {
    const projectId = await currentProjectId();
    try {
      await persistDelta(cur, next, projectId);
    } catch (e) {
      // Don't lose the in-memory mutation; just log. Reads will re-fetch from DB next time
      // and resolve any drift.
      console.error("persistDelta failed:", e);
    }
    cache = next;
    return next;
  }
  await writeState(next);
  return next;
}

// --- ID + factories ------------------------------------------------------

export const id = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export function makeLedger(ev: Omit<LedgerEvent, "id" | "at">): LedgerEvent {
  return { id: id(), at: new Date().toISOString(), ...ev };
}

export function makeApproval(
  card: Omit<ApprovalCard, "id" | "createdAt" | "status">,
): ApprovalCard {
  return {
    id: id(),
    createdAt: new Date().toISOString(),
    status: "pending",
    ...card,
  };
}

export function makeChat(msg: Omit<ChatMessage, "id" | "createdAt">): ChatMessage {
  return { id: id(), createdAt: new Date().toISOString(), ...msg };
}

// --- Viewer-scoped filtering --------------------------------------------

export function filterForViewer(state: ProjectState): ProjectState {
  if (state.viewer === "vendor") {
    // Vendors see no project-side data via the standard API.
    // Their portal route hits /api/vendor-portal which returns a vendor-specific slice.
    return {
      ...state,
      brief: null,
      chat: [],
      approvals: [],
      ledger: [],
      vendors: [],
      budget: [],
      households: [],
      guests: [],
      designs: [],
      stationery: [],
      hotelBlocks: [],
      shuttles: [],
      welcomeBag: [],
      contingencies: [],
      engagement: [],
      vows: [],
      speeches: [],
      registry: [],
      honeymoon: [],
      thanks: [],
    };
  }
  if (state.viewer !== "partner") return state;
  const blocked = (g: GateScope | undefined) => g != null && state.gates[g];
  return {
    ...state,
    approvals: state.approvals.filter((a) => !blocked(a.gateScope ?? null)),
    chat: state.chat.filter((c) => !blocked(c.gateScope ?? null)),
    vendors: state.vendors.filter((v) => !blocked(v.gateScope ?? null)),
    budget: state.budget.filter((b) => !blocked(b.gateScope ?? null)),
    designs: state.designs.filter((d) => !blocked(d.gateScope ?? null)),
    ledger: state.ledger.filter((e) => !blocked(e.gateScope ?? null)),
    vows: state.vows.filter((v) => {
      const scope: GateScope = v.whose === "organizer" ? "vows_organizer" : "vows_partner";
      return !blocked(scope);
    }),
    speeches: state.gates.speech ? [] : state.speeches,
    honeymoon: state.honeymoon.filter((s) => !s.surprise || !blocked("honeymoon")),
  };
}

// --- Approval token lifecycle (build brief §8.3) -------------------------

export function issueApprovalToken(): string {
  return "tok_" + Math.random().toString(36).slice(2, 14);
}

export function tokenIsValid(state: ProjectState, token: string | undefined): boolean {
  if (!token) return false;
  return state.approvedTokens.includes(token);
}

export function consumeToken(state: ProjectState, token: string): ProjectState {
  state.approvedTokens = state.approvedTokens.filter((t) => t !== token);
  return state;
}

// --- Domain mutations ----------------------------------------------------

export async function appendChat(msg: Omit<ChatMessage, "id" | "createdAt">) {
  return mutate((s) => {
    s.chat.push(makeChat(msg));
    return s;
  });
}

export async function appendApproval(
  card: Omit<ApprovalCard, "id" | "createdAt" | "status">,
) {
  return mutate((s) => {
    const c = makeApproval(card);
    s.approvals.push(c);
    s.ledger.push(
      makeLedger({
        actor: "agent",
        agent: card.agent,
        kind: "approval.created",
        summary: card.title,
        meta: { approvalId: c.id, risk: card.risk, action: card.action.kind },
        gateScope: card.gateScope ?? null,
      }),
    );
    return s;
  });
}

export async function resolveApproval(
  approvalId: string,
  decision: "approved" | "rejected" | "edited",
  note?: string,
) {
  const after = await mutate((s) => {
    const card = s.approvals.find((a) => a.id === approvalId);
    if (!card) return s;
    card.status = decision;
    card.resolvedAt = new Date().toISOString();
    if (note) card.rejectionNote = note;
    s.ledger.push(
      makeLedger({
        actor: "user",
        kind: `approval.${decision}`,
        summary: `${decision}. ${card.title}`,
        meta: { approvalId, agent: card.agent },
        gateScope: card.gateScope ?? null,
      }),
    );

    if (decision === "approved") {
      // Issue a token that the agent layer can spend to perform the side effect.
      const token = issueApprovalToken();
      card.approvalToken = token;
      s.approvedTokens.push(token);

      switch (card.action.kind) {
        case "send_email": {
          const v = s.vendors.find((x) => card.action.kind === "send_email" && card.action.to.includes(x.name));
          if (v) {
            v.status = v.status === "shortlisted" ? "contacted" : v.status;
            v.lastTouchAt = new Date().toISOString();
            v.thread = v.thread || [];
            v.thread.push({
              id: id(), at: new Date().toISOString(),
              direction: "outbound", body: card.action.body,
            });
          }
          break;
        }
        case "sign_contract": {
          const a = card.action;
          const v = s.vendors.find((x) => x.name === a.vendor);
          if (v) {
            v.status = "contracted";
            v.contractedUsd = a.estimate;
            const line = s.budget.find((b) => b.vendorId === v.id);
            if (line) {
              line.committedUsd = a.estimate;
            } else {
              s.budget.push({
                id: id(),
                category: String(v.category),
                planUsd: a.estimate,
                committedUsd: a.estimate,
                paidUsd: 0,
                vendorId: v.id,
              });
            }

            // When the Venue contract is signed, the wedding now has a
            // place and a date locked. Only now does it make sense to
            // stand up the guest-facing website. Fire that reminder once.
            if (v.category === "Venue" && s.brief) {
              const alreadyQueued = s.approvals.some(
                (x) => x.action.kind === "publish_website",
              );
              if (!alreadyQueued) {
                s.approvals.push(
                  makeApproval({
                    agent: "Stationer",
                    phase: "guest_management",
                    title: "Stand up the wedding website?",
                    rationale: `Now that ${v.name} is contracted, you have a venue and a date. Time to stand up the guest-facing site. travel info, hotel block (we'll add it once you pick one), RSVP form, FAQs, and dietary form. Save-the-dates link here.`,
                    risk: "low",
                    action: {
                      kind: "publish_website",
                      slug: `${s.brief.organizerName}-${s.brief.partnerName}`
                        .toLowerCase()
                        .replace(/\s+/g, "-"),
                    },
                  }),
                );
                s.ledger.push(
                  makeLedger({
                    actor: "agent",
                    agent: "Stationer",
                    kind: "approval.created",
                    summary: "Stand up the wedding website?",
                    meta: { trigger: "venue_contracted" },
                  }),
                );
              }
            }
          }
          break;
        }
        case "schedule_payment": {
          const a = card.action;
          const v = s.vendors.find((x) => x.name === a.vendor);
          if (v) {
            v.paidUsd = (v.paidUsd ?? 0) + a.amountUsd;
            v.status = "paid";
            const line = s.budget.find((b) => b.vendorId === v.id);
            if (line) line.paidUsd = (line.paidUsd ?? 0) + a.amountUsd;
          }
          break;
        }
        case "publish_design": {
          const a = card.action;
          const d = s.designs.find((x) => x.id === a.assetId);
          if (d) d.approved = true;
          break;
        }
        case "lock_seating": {
          s.seating.locked = true;
          break;
        }
        case "send_save_the_date": {
          const a = card.action;
          const suite = s.stationery.find((x) => x.id === a.suiteId);
          if (suite) suite.saveTheDateSentAt = new Date().toISOString();
          for (const h of s.households) {
            if (!h.saveTheDateSentAt) h.saveTheDateSentAt = new Date().toISOString();
          }
          break;
        }
        case "send_invitations": {
          for (const h of s.households) {
            if (!h.invitationSentAt) h.invitationSentAt = new Date().toISOString();
          }
          for (const suite of s.stationery) {
            if (!suite.invitationsSentAt) suite.invitationsSentAt = new Date().toISOString();
          }
          break;
        }
        case "lock_stationery_suite": {
          const a = card.action;
          const suite = s.stationery.find((x) => x.id === a.suiteId);
          if (suite) {
            const item = suite.items.find((i) => i.piece === a.piece);
            if (item) item.approved = true;
          }
          break;
        }
        case "block_hotel_rooms": {
          const a = card.action;
          if (!s.hotelBlocks.some((h) => h.hotel === a.hotel)) {
            s.hotelBlocks.push({
              id: id(), hotel: a.hotel, city: s.brief?.region ?? "",
              nightlyRateUsd: a.nightlyRate, roomsBlocked: a.rooms, roomsBooked: 0,
              releaseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
            });
          }
          break;
        }
        case "purchase_registry_item": {
          const a = card.action;
          const item = s.registry.find((r) => r.item === a.item);
          if (item) item.status = "purchased";
          break;
        }
        case "lock_vows": {
          const a = card.action;
          const draft = s.vows.find((v) => v.whose === a.whose);
          if (draft) draft.locked = true;
          break;
        }
      }
    }
    return s;
  });

  // Run the cascade. additional auto-actions triggered by this resolution.
  // Imported lazily to avoid circular import (cascade.ts → store.ts).
  if (decision === "approved") {
    try {
      const { cascade } = await import("./cascade");
      const card = after.approvals.find((a) => a.id === approvalId);
      if (card) await cascade(card);
    } catch (e) {
      console.error("Cascade failed:", e);
    }
    return readState();
  }
  return after;
}

export async function setBrief(brief: Brief) {
  return mutate((s) => {
    s.brief = brief;
    s.ledger.push(
      makeLedger({
        actor: "user",
        kind: brief.locked ? "brief.locked" : "brief.updated",
        summary: brief.locked ? "Brief locked" : "Brief updated",
      }),
    );
    return s;
  });
}

export async function setPaused(paused: boolean, reason?: string) {
  return mutate((s) => {
    s.paused = paused;
    s.pausedReason = reason;
    s.ledger.push(
      makeLedger({
        actor: "user",
        kind: paused ? "system.paused" : "system.resumed",
        summary: paused ? `Paused: ${reason ?? "no reason"}` : "Resumed",
      }),
    );
    return s;
  });
}

export async function setViewer(role: ViewerRole) {
  return mutate((s) => {
    s.viewer = role;
    return s;
  });
}

export async function setMaestroName(name: string | null) {
  return mutate((s) => {
    const before = s.maestroName ?? "Maestro";
    const next = (name ?? "").trim();
    s.maestroName = next || undefined;
    s.ledger.push(
      makeLedger({
        actor: "user",
        kind: "agent.renamed",
        summary: `Renamed Maestro: "${before}" → "${next || "Maestro"}"`,
      }),
    );
    return s;
  });
}

export async function setGates(gates: Partial<GateConfig>) {
  return mutate((s) => {
    s.gates = { ...s.gates, ...gates };
    return s;
  });
}

export async function setPlan(plan: ProjectState["plan"]) {
  return mutate((s) => { s.plan = plan; return s; });
}

export async function setDayOfMode(on: boolean) {
  return mutate((s) => {
    s.dayOfMode = on;
    s.ledger.push(makeLedger({
      actor: "user",
      kind: on ? "system.day_of_on" : "system.day_of_off",
      summary: on ? "Day-of mode engaged. Approval queue suspended; Maestro Jr. handles in-band decisions." : "Day-of mode released.",
    }));
    return s;
  });
}

export async function resetAll() {
  cache = structuredClone(EMPTY);
  await writeState(cache);
  return cache;
}

// --- Vendors -------------------------------------------------------------

export async function addVendor(v: Omit<Vendor, "id" | "status" | "lastTouchAt"> & { status?: Vendor["status"] }) {
  return mutate((s) => {
    s.vendors.push({
      id: id(),
      status: v.status ?? "shortlisted",
      lastTouchAt: new Date().toISOString(),
      ...v,
    });
    return s;
  });
}

export async function addVendors(vs: Omit<Vendor, "id" | "status" | "lastTouchAt">[]) {
  return mutate((s) => {
    for (const v of vs) {
      if (s.vendors.some((x) => x.name === v.name && x.category === v.category)) continue;
      s.vendors.push({
        id: id(),
        status: "shortlisted",
        lastTouchAt: new Date().toISOString(),
        ...v,
      });
    }
    return s;
  });
}

export async function updateVendor(vendorId: string, patch: Partial<Vendor>) {
  return mutate((s) => {
    const v = s.vendors.find((x) => x.id === vendorId);
    if (!v) return s;
    Object.assign(v, patch);
    v.lastTouchAt = new Date().toISOString();
    return s;
  });
}

export async function appendVendorMessage(vendorId: string, msg: Omit<VendorMessage, "id" | "at">) {
  return mutate((s) => {
    const v = s.vendors.find((x) => x.id === vendorId);
    if (!v) return s;
    v.thread = v.thread || [];
    v.thread.push({ id: id(), at: new Date().toISOString(), ...msg });
    v.lastTouchAt = new Date().toISOString();
    return s;
  });
}

// --- Budget --------------------------------------------------------------

export async function upsertBudgetLine(line: Omit<BudgetLine, "id"> & { id?: string }) {
  return mutate((s) => {
    if (line.id) {
      const cur = s.budget.find((b) => b.id === line.id);
      if (cur) {
        Object.assign(cur, line);
        return s;
      }
    }
    s.budget.push({ id: id(), ...line });
    return s;
  });
}

export async function deleteBudgetLine(lineId: string) {
  return mutate((s) => {
    s.budget = s.budget.filter((b) => b.id !== lineId);
    return s;
  });
}

// --- Guests / Households ------------------------------------------------

export async function addHousehold(h: Omit<Household, "id">) {
  return mutate((s) => {
    s.households.push({ id: id(), ...h });
    return s;
  });
}

export async function addGuest(g: Omit<Guest, "id" | "rsvp"> & { rsvp?: Guest["rsvp"] }) {
  return mutate((s) => {
    s.guests.push({ id: id(), rsvp: g.rsvp ?? "no_response", ...g });
    return s;
  });
}

export async function updateGuest(guestId: string, patch: Partial<Guest>) {
  return mutate((s) => {
    const g = s.guests.find((x) => x.id === guestId);
    if (!g) return s;
    Object.assign(g, patch);
    return s;
  });
}

export async function updateHousehold(householdId: string, patch: Partial<Household>) {
  return mutate((s) => {
    const h = s.households.find((x) => x.id === householdId);
    if (!h) return s;
    Object.assign(h, patch);
    return s;
  });
}

export async function deleteGuest(guestId: string) {
  return mutate((s) => {
    s.guests = s.guests.filter((g) => g.id !== guestId);
    delete s.seating.assignments[guestId];
    s.seating.constraints = s.seating.constraints.filter(
      (c) => !c.guestIds.includes(guestId),
    );
    return s;
  });
}

// --- Designs -------------------------------------------------------------

export async function addDesign(d: Omit<DesignAsset, "id" | "createdAt">) {
  return mutate((s) => {
    s.designs.push({ id: id(), createdAt: new Date().toISOString(), ...d });
    return s;
  });
}

// --- Seating -------------------------------------------------------------

export async function setSeating(updater: (chart: SeatingChart) => SeatingChart) {
  return mutate((s) => {
    s.seating = updater(s.seating);
    return s;
  });
}

// --- Day-of --------------------------------------------------------------

export async function setDayOf(items: DayOfItem[]) {
  return mutate((s) => {
    s.dayOf = items;
    return s;
  });
}

export async function updateDayOfItem(itemId: string, patch: Partial<DayOfItem>) {
  return mutate((s) => {
    const item = s.dayOf.find((i) => i.id === itemId);
    if (item) Object.assign(item, patch);
    return s;
  });
}

export async function setContingencies(items: ContingencyBand[]) {
  return mutate((s) => { s.contingencies = items; return s; });
}

export async function triggerContingency(bandId: string, note: string) {
  return mutate((s) => {
    const b = s.contingencies.find((x) => x.id === bandId);
    if (b) {
      b.triggered = true;
      b.triggeredAt = new Date().toISOString();
      b.triggerNote = note;
    }
    s.ledger.push(makeLedger({
      actor: "agent", agent: "Maestro Jr.",
      kind: "contingency.triggered",
      summary: `${b?.topic ?? bandId} band triggered: ${note}`,
    }));
    return s;
  });
}

// --- Thank-yous ----------------------------------------------------------

export async function setThanks(items: ThankYou[]) {
  return mutate((s) => { s.thanks = items; return s; });
}

export async function updateThank(thankId: string, patch: Partial<ThankYou>) {
  return mutate((s) => {
    const t = s.thanks.find((x) => x.id === thankId);
    if (t) Object.assign(t, patch);
    return s;
  });
}

// --- Stationery suites --------------------------------------------------

export async function addStationerySuite(suite: Omit<StationerySuite, "id" | "createdAt">) {
  return mutate((s) => {
    s.stationery.push({ id: id(), createdAt: new Date().toISOString(), ...suite });
    return s;
  });
}

export async function updateStationerySuite(suiteId: string, patch: Partial<StationerySuite>) {
  return mutate((s) => {
    const x = s.stationery.find((y) => y.id === suiteId);
    if (x) Object.assign(x, patch);
    return s;
  });
}

// --- Logistics ----------------------------------------------------------

export async function addHotelBlock(block: Omit<HotelBlock, "id">) {
  return mutate((s) => { s.hotelBlocks.push({ id: id(), ...block }); return s; });
}

export async function updateHotelBlock(blockId: string, patch: Partial<HotelBlock>) {
  return mutate((s) => {
    const h = s.hotelBlocks.find((x) => x.id === blockId);
    if (h) Object.assign(h, patch);
    return s;
  });
}

export async function addShuttle(sh: Omit<Shuttle, "id">) {
  return mutate((s) => { s.shuttles.push({ id: id(), ...sh }); return s; });
}

export async function updateShuttle(shuttleId: string, patch: Partial<Shuttle>) {
  return mutate((s) => {
    const x = s.shuttles.find((y) => y.id === shuttleId);
    if (x) Object.assign(x, patch);
    return s;
  });
}

export async function setWelcomeBag(items: WelcomeBagItem[]) {
  return mutate((s) => { s.welcomeBag = items; return s; });
}

// --- Engagement studio -------------------------------------------------

export async function addEngagementMilestone(m: Omit<EngagementMilestone, "id">) {
  return mutate((s) => { s.engagement.push({ id: id(), ...m }); return s; });
}

export async function updateEngagementMilestone(milestoneId: string, patch: Partial<EngagementMilestone>) {
  return mutate((s) => {
    const x = s.engagement.find((y) => y.id === milestoneId);
    if (x) Object.assign(x, patch);
    return s;
  });
}

// --- Vows + speeches ---------------------------------------------------

export async function upsertVow(whose: VowDraft["whose"], patch: Partial<VowDraft>) {
  return mutate((s) => {
    let v = s.vows.find((x) => x.whose === whose);
    if (!v) {
      v = { id: id(), whose, draft: "", wordCount: 0 };
      s.vows.push(v);
    }
    Object.assign(v, patch);
    if (typeof patch.draft === "string") v.wordCount = patch.draft.trim().split(/\s+/).filter(Boolean).length;
    return s;
  });
}

export async function addSpeech(sp: Omit<SpeechDraft, "id">) {
  return mutate((s) => { s.speeches.push({ id: id(), ...sp }); return s; });
}

export async function updateSpeech(speechId: string, patch: Partial<SpeechDraft>) {
  return mutate((s) => {
    const x = s.speeches.find((y) => y.id === speechId);
    if (x) {
      Object.assign(x, patch);
      if (typeof patch.draft === "string") x.wordCount = patch.draft.trim().split(/\s+/).filter(Boolean).length;
    }
    return s;
  });
}

// --- Registry ---------------------------------------------------------

export async function addRegistryItem(item: Omit<RegistryItem, "id">) {
  return mutate((s) => { s.registry.push({ id: id(), ...item }); return s; });
}

export async function updateRegistryItem(itemId: string, patch: Partial<RegistryItem>) {
  return mutate((s) => {
    const x = s.registry.find((y) => y.id === itemId);
    if (x) Object.assign(x, patch);
    return s;
  });
}

// --- Honeymoon --------------------------------------------------------

export async function addHoneymoonSegment(seg: Omit<HoneymoonSegment, "id">) {
  return mutate((s) => { s.honeymoon.push({ id: id(), ...seg }); return s; });
}

export async function updateHoneymoonSegment(segId: string, patch: Partial<HoneymoonSegment>) {
  return mutate((s) => {
    const x = s.honeymoon.find((y) => y.id === segId);
    if (x) Object.assign(x, patch);
    return s;
  });
}

// --- Music ------------------------------------------------------------

export async function setMusic(items: MusicCue[]) {
  return mutate((s) => { s.music = items; return s; });
}
export async function addMusicCue(cue: Omit<MusicCue, "id">) {
  return mutate((s) => { s.music.push({ id: id(), ...cue }); return s; });
}
export async function updateMusicCue(cueId: string, patch: Partial<MusicCue>) {
  return mutate((s) => {
    const c = s.music.find((x) => x.id === cueId);
    if (c) Object.assign(c, patch);
    return s;
  });
}

// --- Ceremony ---------------------------------------------------------

export async function setCeremony(items: CeremonySection[]) {
  return mutate((s) => { s.ceremony = items; return s; });
}
export async function updateCeremonySection(sectionId: string, patch: Partial<CeremonySection>) {
  return mutate((s) => {
    const c = s.ceremony.find((x) => x.id === sectionId);
    if (c) Object.assign(c, patch);
    return s;
  });
}
export async function setCeremonyTradition(tradition: CeremonyTradition) {
  return mutate((s) => {
    s.ceremonyTradition = tradition;
    s.ledger.push(makeLedger({
      actor: "user", kind: "ceremony.tradition_set",
      summary: `Ceremony tradition set to ${tradition}.`,
    }));
    return s;
  });
}
export async function appendCeremonySection(section: CeremonySection) {
  return mutate((s) => { s.ceremony.push(section); return s; });
}
export async function deleteCeremonySection(sectionId: string) {
  return mutate((s) => { s.ceremony = s.ceremony.filter((x) => x.id !== sectionId); return s; });
}
export async function moveCeremonySection(sectionId: string, direction: "up" | "down") {
  return mutate((s) => {
    const idx = s.ceremony.findIndex((x) => x.id === sectionId);
    if (idx < 0) return s;
    const swap = direction === "up" ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= s.ceremony.length) return s;
    const tmp = s.ceremony[idx];
    s.ceremony[idx] = s.ceremony[swap];
    s.ceremony[swap] = tmp;
    return s;
  });
}

// --- Cake -------------------------------------------------------------

export async function setCake(cake: CakeSpec | null) {
  return mutate((s) => { s.cake = cake; return s; });
}

// --- Bar --------------------------------------------------------------

export async function setBar(bar: BarProgram | null) {
  return mutate((s) => { s.bar = bar; return s; });
}

// --- Florals ----------------------------------------------------------

export async function setFlorals(items: FloralArrangement[]) {
  return mutate((s) => { s.florals = items; return s; });
}
export async function updateFloral(arrId: string, patch: Partial<FloralArrangement>) {
  return mutate((s) => {
    const a = s.florals.find((x) => x.id === arrId);
    if (a) Object.assign(a, patch);
    return s;
  });
}

// --- Rentals ----------------------------------------------------------

export async function setRentals(items: RentalItem[]) {
  return mutate((s) => { s.rentals = items; return s; });
}
export async function updateRental(itemId: string, patch: Partial<RentalItem>) {
  return mutate((s) => {
    const r = s.rentals.find((x) => x.id === itemId);
    if (r) Object.assign(r, patch);
    return s;
  });
}

// --- Beauty (hair & makeup) -----------------------------------------

export async function setBeauty(items: BeautyAppt[]) {
  return mutate((s) => { s.beauty = items; return s; });
}
export async function updateBeauty(apptId: string, patch: Partial<BeautyAppt>) {
  return mutate((s) => {
    const b = s.beauty.find((x) => x.id === apptId);
    if (b) Object.assign(b, patch);
    return s;
  });
}

// --- Tastings + site visits -----------------------------------------

export async function addVisit(v: Omit<VisitAppt, "id">) {
  return mutate((s) => { s.visits.push({ id: id(), ...v }); return s; });
}
export async function updateVisit(visitId: string, patch: Partial<VisitAppt>) {
  return mutate((s) => {
    const v = s.visits.find((x) => x.id === visitId);
    if (v) Object.assign(v, patch);
    return s;
  });
}

// --- Marriage license ------------------------------------------------

export async function setLicense(license: MarriageLicense | null) {
  return mutate((s) => { s.license = license; return s; });
}

// --- Wedding website -------------------------------------------------

export async function setSite(site: WeddingSite | null) {
  return mutate((s) => { s.site = site; return s; });
}

// --- Wedding Party ---------------------------------------------------

export async function addWeddingPartyMember(m: Omit<WeddingPartyMember, "id">) {
  return mutate((s) => { s.weddingParty.push({ id: id(), ...m }); return s; });
}
export async function updateWeddingPartyMember(mid: string, patch: Partial<WeddingPartyMember>) {
  return mutate((s) => {
    const m = s.weddingParty.find((x) => x.id === mid);
    if (m) Object.assign(m, patch);
    return s;
  });
}
export async function deleteWeddingPartyMember(mid: string) {
  return mutate((s) => {
    s.weddingParty = s.weddingParty.filter((m) => m.id !== mid);
    return s;
  });
}

// --- Pre-wedding events -----------------------------------------------

export async function addPreEvent(e: Omit<PreEvent, "id">) {
  return mutate((s) => { s.preEvents.push({ id: id(), ...e }); return s; });
}
export async function updatePreEvent(eid: string, patch: Partial<PreEvent>) {
  return mutate((s) => {
    const e = s.preEvents.find((x) => x.id === eid);
    if (e) Object.assign(e, patch);
    return s;
  });
}

// --- Tip envelopes ----------------------------------------------------

export async function setTips(tips: TipEnvelope[]) {
  return mutate((s) => { s.tips = tips; return s; });
}
export async function updateTip(tid: string, patch: Partial<TipEnvelope>) {
  return mutate((s) => {
    const t = s.tips.find((x) => x.id === tid);
    if (t) Object.assign(t, patch);
    return s;
  });
}

// --- Memorials --------------------------------------------------------

export async function addMemorial(m: Omit<Memorial, "id">) {
  return mutate((s) => { s.memorials.push({ id: id(), ...m }); return s; });
}
export async function updateMemorial(mid: string, patch: Partial<Memorial>) {
  return mutate((s) => {
    const m = s.memorials.find((x) => x.id === mid);
    if (m) Object.assign(m, patch);
    return s;
  });
}

// --- Menu (Larder) ----------------------------------------------------

export async function setMenu(items: MenuItem[]) {
  return mutate((s) => { s.menu = items; return s; });
}
export async function addMenuItem(item: Omit<MenuItem, "id">) {
  return mutate((s) => { s.menu.push({ id: id(), ...item }); return s; });
}
export async function updateMenuItem(itemId: string, patch: Partial<MenuItem>) {
  return mutate((s) => {
    const m = s.menu.find((x) => x.id === itemId);
    if (m) Object.assign(m, patch);
    return s;
  });
}
export async function deleteMenuItem(itemId: string) {
  return mutate((s) => { s.menu = s.menu.filter((m) => m.id !== itemId); return s; });
}

// --- Dietary resolutions ---------------------------------------------

export const dietaryKey = (guestId: string, menuItemId: string) => `${guestId}__${menuItemId}`;

export async function setDietaryResolution(
  guestId: string,
  menuItemId: string,
  resolution: DietaryResolution | null,
) {
  return mutate((s) => {
    const key = dietaryKey(guestId, menuItemId);
    if (resolution) {
      s.dietaryResolutions[key] = resolution;
    } else {
      delete s.dietaryResolutions[key];
    }
    s.ledger.push(makeLedger({
      actor: "user",
      kind: resolution ? "dietary.resolved" : "dietary.unresolved",
      summary: resolution
        ? `Resolved dietary conflict for guest ${guestId} × ${menuItemId} (${resolution.kind})`
        : `Cleared dietary resolution for ${guestId} × ${menuItemId}`,
    }));
    return s;
  });
}

// --- Design hero images ------------------------------------------------

export async function setDesignHero(
  designId: string,
  heroImage: string,
  heroPrompt: string,
): Promise<DesignAsset | null> {
  let updated: DesignAsset | null = null;
  await mutate((s) => {
    const d = s.designs.find((x) => x.id === designId);
    if (!d) return s;
    d.heroImage = heroImage;
    d.heroPrompt = heroPrompt;
    d.heroRenderedAt = new Date().toISOString();
    updated = d;
    return s;
  });
  return updated;
}

// --- Mood boards + pins -----------------------------------------------

const DEFAULT_BOARDS: { name: string; gateScope: GateScope }[] = [
  { name: "Overall",   gateScope: null },
  { name: "Ceremony",  gateScope: null },
  { name: "Reception", gateScope: null },
  { name: "Florals",   gateScope: null },
  { name: "Attire",    gateScope: "dress" },
];

function rid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 12)}`;
}

async function ensureDefaultBoards(): Promise<MoodBoard[]> {
  const cur = await readState();
  if (cur.moodBoards && cur.moodBoards.length > 0) return cur.moodBoards;
  const now = new Date().toISOString();
  const boards: MoodBoard[] = DEFAULT_BOARDS.map((b) => ({
    id: rid("mb"),
    name: b.name,
    gateScope: b.gateScope,
    isDefault: true,
    pinCount: 0,
    createdAt: now,
    updatedAt: now,
  }));
  await mutate((s) => {
    s.moodBoards = boards;
    s.pins = s.pins ?? [];
    s.generations = s.generations ?? [];
    return s;
  });
  return boards;
}

export async function listMoodBoards(): Promise<MoodBoard[]> {
  return ensureDefaultBoards();
}

export async function createMoodBoard(name: string, gateScope: GateScope = null): Promise<MoodBoard> {
  await ensureDefaultBoards();
  const now = new Date().toISOString();
  const board: MoodBoard = {
    id: rid("mb"), name: name.trim().slice(0, 80), gateScope,
    isDefault: false, pinCount: 0, createdAt: now, updatedAt: now,
  };
  await mutate((s) => {
    s.moodBoards = [...(s.moodBoards ?? []), board];
    return s;
  });
  return board;
}

export async function updateMoodBoard(
  boardId: string,
  patch: { name?: string; gateScope?: GateScope }
): Promise<MoodBoard | null> {
  let updated: MoodBoard | null = null;
  await mutate((s) => {
    const list = s.moodBoards ?? [];
    const idx = list.findIndex((b) => b.id === boardId);
    if (idx === -1) return s;
    list[idx] = {
      ...list[idx],
      ...(patch.name ? { name: patch.name.slice(0, 80) } : {}),
      ...(patch.gateScope !== undefined ? { gateScope: patch.gateScope } : {}),
      updatedAt: new Date().toISOString(),
    };
    updated = list[idx];
    s.moodBoards = list;
    return s;
  });
  return updated;
}

export async function deleteMoodBoard(boardId: string): Promise<boolean> {
  let ok = false;
  await mutate((s) => {
    const board = (s.moodBoards ?? []).find((b) => b.id === boardId);
    if (!board || board.isDefault) return s;
    s.moodBoards = (s.moodBoards ?? []).filter((b) => b.id !== boardId);
    s.pins = (s.pins ?? []).filter((p) => p.boardId !== boardId);
    ok = true;
    return s;
  });
  return ok;
}

export async function listPinsForBoard(boardId: string): Promise<Pin[]> {
  const cur = await readState();
  return (cur.pins ?? [])
    .filter((p) => p.boardId === boardId)
    .sort((a, b) => a.position - b.position);
}

export async function addPin(input: Omit<Pin, "id" | "position" | "createdAt">): Promise<Pin> {
  const created: Pin = {
    ...input,
    id: rid("pin"),
    position: 0,
    createdAt: new Date().toISOString(),
  };
  await mutate((s) => {
    const samePins = (s.pins ?? []).filter((p) => p.boardId === input.boardId);
    created.position = samePins.length;
    s.pins = [...(s.pins ?? []), created];
    const board = (s.moodBoards ?? []).find((b) => b.id === input.boardId);
    if (board) {
      board.pinCount = samePins.length + 1;
      board.updatedAt = new Date().toISOString();
    }
    return s;
  });
  return created;
}

export async function removePin(pinId: string): Promise<boolean> {
  let ok = false;
  await mutate((s) => {
    const p = (s.pins ?? []).find((x) => x.id === pinId);
    if (!p) return s;
    s.pins = (s.pins ?? []).filter((x) => x.id !== pinId);
    const board = (s.moodBoards ?? []).find((b) => b.id === p.boardId);
    if (board) {
      board.pinCount = Math.max(0, board.pinCount - 1);
      board.updatedAt = new Date().toISOString();
    }
    ok = true;
    return s;
  });
  return ok;
}

export async function movePin(pinId: string, toBoardId: string): Promise<boolean> {
  let ok = false;
  await mutate((s) => {
    const p = (s.pins ?? []).find((x) => x.id === pinId);
    const target = (s.moodBoards ?? []).find((b) => b.id === toBoardId);
    if (!p || !target) return s;
    const fromId = p.boardId;
    p.boardId = toBoardId;
    p.position = (s.pins ?? []).filter((x) => x.boardId === toBoardId).length - 1;
    const fromBoard = (s.moodBoards ?? []).find((b) => b.id === fromId);
    if (fromBoard) fromBoard.pinCount = Math.max(0, fromBoard.pinCount - 1);
    target.pinCount += 1;
    target.updatedAt = new Date().toISOString();
    ok = true;
    return s;
  });
  return ok;
}

export async function reorderPin(pinId: string, newPosition: number): Promise<boolean> {
  let ok = false;
  await mutate((s) => {
    const p = (s.pins ?? []).find((x) => x.id === pinId);
    if (!p) return s;
    const sameBoard = (s.pins ?? []).filter((x) => x.boardId === p.boardId).sort((a, b) => a.position - b.position);
    const without = sameBoard.filter((x) => x.id !== pinId);
    without.splice(Math.max(0, Math.min(newPosition, without.length)), 0, p);
    without.forEach((x, i) => { x.position = i; });
    ok = true;
    return s;
  });
  return ok;
}

export async function recordGeneration(g: Omit<ImageGeneration, "id" | "createdAt">): Promise<ImageGeneration> {
  const created: ImageGeneration = {
    ...g,
    id: rid("gen"),
    createdAt: new Date().toISOString(),
  };
  await mutate((s) => {
    s.generations = [...(s.generations ?? []), created];
    return s;
  });
  return created;
}

export async function bumpGenerationCount(by: number = 4): Promise<{ allowed: boolean; remaining: number }> {
  const today = new Date().toISOString().slice(0, 10);
  let allowed = true;
  let remaining = 40;
  await mutate((s) => {
    const cur = s.generationCount && s.generationCount.dateISO === today
      ? s.generationCount
      : { dateISO: today, count: 0 };
    if (cur.count + by > 40) {
      allowed = false;
      remaining = Math.max(0, 40 - cur.count);
      return s;
    }
    cur.count += by;
    remaining = 40 - cur.count;
    s.generationCount = cur;
    return s;
  });
  return { allowed, remaining };
}

// --- Generic agent ledger event ---------------------------------------

export async function logAgentEvent(
  agent: AgentName,
  kind: string,
  summary: string,
  meta?: Record<string, unknown>,
  gateScope?: GateScope,
) {
  return mutate((s) => {
    s.ledger.push(
      makeLedger({ actor: "agent", agent, kind, summary, meta, gateScope }),
    );
    return s;
  });
}
