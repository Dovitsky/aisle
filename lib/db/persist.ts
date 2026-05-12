// Differential persistence: given a `before` and `after` ProjectState, write only
// what changed to Postgres. Singletons get UPSERTs; arrays get diff INSERT / UPSERT
// / DELETE; the ledger is append-only.
//
// Called by lib/store.ts on every mutate() in Postgres mode.

import type { SupabaseClient } from "@supabase/supabase-js";
import { adminClient } from "./supabase";
import type {
  ProjectState, ApprovalCard, BudgetLine, ChatMessage, DayOfItem,
  DesignAsset, EngagementMilestone, FloralArrangement, Guest, Household,
  HoneymoonSegment, HotelBlock, LedgerEvent, MenuItem, Memorial,
  MusicCue, BeautyAppt, RentalItem, RegistryItem, SpeechDraft,
  StationerySuite, TipEnvelope, ContingencyBand, VendorMessage, VisitAppt,
  Vendor, VowDraft, WeddingPartyMember, PreEvent,
  Shuttle, WelcomeBagItem, CeremonySection, ThankYou,
} from "../types";
import {
  approvalToRow, budgetToRow, chatToRow, dayOfToRow, designToRow,
  engagementToRow, floralToRow, guestToRow, householdToRow, hotelToRow,
  shuttleToRow, wbToRow, ledgerToRow, menuToRow, memorialToRow,
  musicToRow, beautyToRow, rentalToRow, registryToRow, speechToRow,
  stationeryToRow, tipToRow, contingencyToRow, vendorToRow, visitToRow,
  vowToRow, partyToRow, preEventToRow, ceremonyToRow,
  thankToRow, honeymoonToRow,
  cakeToRow, barToRow, licenseToRow, siteToRow, seatingToRow,
} from "./mappers";

// ---- Generic helpers ---------------------------------------------------

async function diffSync<T extends { id: string }>(
  supa: SupabaseClient,
  table: string,
  before: T[],
  after: T[],
  toRow: (t: T, projectId: string) => Record<string, unknown>,
  projectId: string,
) {
  const beforeIds = new Set(before.map((x) => x.id));
  const afterIds = new Set(after.map((x) => x.id));
  // Toggle membership change → DELETE removed
  const removed = [...beforeIds].filter((id) => !afterIds.has(id));
  const upserts = after.map((t) => toRow(t, projectId));

  if (removed.length) {
    await supa.from(table).delete().in("id", removed).eq("project_id", projectId);
  }
  if (upserts.length) {
    // Upsert covers both insert + update. Conflict on id.
    await supa.from(table).upsert(upserts, { onConflict: "id" });
  }
}

async function appendNewLedger(
  supa: SupabaseClient,
  before: LedgerEvent[],
  after: LedgerEvent[],
  projectId: string,
) {
  const seen = new Set(before.map((e) => e.id));
  const fresh = after.filter((e) => !seen.has(e.id));
  if (fresh.length) {
    await supa.from("ledger_events").insert(fresh.map((e) => ledgerToRow(e, projectId)));
  }
}

async function upsertProjectLevel(supa: SupabaseClient, after: ProjectState, projectId: string) {
  const b = after.brief;
  const update: Record<string, unknown> = {
    paused: after.paused,
    paused_reason: after.pausedReason ?? null,
    day_of_mode: after.dayOfMode,
    plan: after.plan,
    maestro_name: after.maestroName ?? null,
    ceremony_tradition: after.ceremonyTradition,
    gate_dress: after.gates.dress,
    gate_partner_gift: after.gates.partner_gift,
    gate_honeymoon: after.gates.honeymoon,
    gate_speech: after.gates.speech,
    gate_vows_organizer: after.gates.vows_organizer,
    gate_vows_partner: after.gates.vows_partner,
  };
  if (b) {
    Object.assign(update, {
      organizer_name: b.organizerName,
      partner_name: b.partnerName,
      date_window: b.dateWindow,
      region: b.region,
      guest_count: b.guestCount,
      budget_usd: b.budgetUsd,
      vibe: b.vibe,
      cultural: b.cultural,
      formality_tone: b.formalityTone,
      destination: b.destination,
      wedding_date: b.weddingDate ?? null,
      brief_locked: b.locked,
      brief_locked_at: b.lockedAt ?? null,
    });
  }
  await supa.from("projects").update(update).eq("id", projectId);
}

async function syncVendorMessages(
  supa: SupabaseClient,
  before: Vendor[],
  after: Vendor[],
  projectId: string,
) {
  // Flatten with their vendor id
  const flatBefore: { vendorId: string; m: VendorMessage }[] = [];
  for (const v of before) for (const m of v.thread ?? []) flatBefore.push({ vendorId: v.id, m });
  const flatAfter: { vendorId: string; m: VendorMessage }[] = [];
  for (const v of after) for (const m of v.thread ?? []) flatAfter.push({ vendorId: v.id, m });

  const beforeIds = new Set(flatBefore.map((x) => x.m.id));
  const afterIds = new Set(flatAfter.map((x) => x.m.id));
  const removed = [...beforeIds].filter((id) => !afterIds.has(id));
  const upserts = flatAfter.map(({ vendorId, m }) => ({
    id: m.id,
    project_id: projectId,
    vendor_id: vendorId,
    at: m.at,
    direction: m.direction,
    body: m.body,
    parsed_intent: m.parsedIntent ?? null,
    quoted_usd: m.quotedUsd ?? null,
  }));
  if (removed.length) {
    await supa.from("vendor_messages").delete().in("id", removed).eq("project_id", projectId);
  }
  if (upserts.length) {
    await supa.from("vendor_messages").upsert(upserts, { onConflict: "id" });
  }
}

// ---- Public entry ------------------------------------------------------

export async function persistDelta(
  before: ProjectState,
  after: ProjectState,
  projectId: string,
): Promise<void> {
  const supa = adminClient();

  // 1. Project-level singletons + flags + the brief.
  await upsertProjectLevel(supa, after, projectId);

  // 2. Ledger (append-only).
  await appendNewLedger(supa, before.ledger, after.ledger, projectId);

  // 3. Array-of-rows entities. diff + upsert/delete in parallel.
  await Promise.all([
    diffSync<ChatMessage>(supa, "chat_messages", before.chat, after.chat, chatToRow, projectId),
    diffSync<ApprovalCard>(supa, "approvals", before.approvals, after.approvals, approvalToRow, projectId),
    diffSync<Vendor>(supa, "vendors", before.vendors, after.vendors, vendorToRow, projectId),
    diffSync<BudgetLine>(supa, "budget_lines", before.budget, after.budget, budgetToRow, projectId),
    diffSync<Household>(supa, "households", before.households, after.households, householdToRow, projectId),
    diffSync<Guest>(supa, "guests", before.guests, after.guests, (g, p) => ({
      ...guestToRow(g, p),
      allergens: g.allergens ?? [],
      dietary_preferences: g.dietaryPreferences ?? [],
      dietary_notes: g.dietaryNotes ?? null,
    }), projectId),
    diffSync<DesignAsset>(supa, "design_assets", before.designs, after.designs, designToRow, projectId),
    diffSync<DayOfItem>(supa, "day_of_items", before.dayOf, after.dayOf, (d, p) => dayOfToRow(d, p, after.dayOf.indexOf(d)), projectId),
    diffSync<ThankYou>(supa, "thank_yous", before.thanks, after.thanks, thankToRow, projectId),
    diffSync<RegistryItem>(supa, "registry_items", before.registry, after.registry, registryToRow, projectId),
    diffSync<HoneymoonSegment>(supa, "honeymoon_segments", before.honeymoon, after.honeymoon, honeymoonToRow, projectId),
    diffSync<HotelBlock>(supa, "hotel_blocks", before.hotelBlocks, after.hotelBlocks, hotelToRow, projectId),
    diffSync<Shuttle>(supa, "shuttles", before.shuttles, after.shuttles, shuttleToRow, projectId),
    diffSync<WelcomeBagItem>(supa, "welcome_bag_items", before.welcomeBag, after.welcomeBag, wbToRow, projectId),
    diffSync<ContingencyBand>(supa, "contingencies", before.contingencies, after.contingencies, contingencyToRow, projectId),
    diffSync<EngagementMilestone>(supa, "engagement_milestones", before.engagement, after.engagement, engagementToRow, projectId),
    diffSync<VowDraft>(supa, "vows", before.vows, after.vows, vowToRow, projectId),
    diffSync<SpeechDraft>(supa, "speeches", before.speeches, after.speeches, speechToRow, projectId),
    diffSync<MusicCue>(supa, "music_cues", before.music, after.music, musicToRow, projectId),
    diffSync<CeremonySection>(supa, "ceremony_sections", before.ceremony, after.ceremony,
      (c, p) => ceremonyToRow(c, p, after.ceremony.indexOf(c)), projectId),
    diffSync<FloralArrangement>(supa, "florals", before.florals, after.florals, floralToRow, projectId),
    diffSync<RentalItem>(supa, "rentals", before.rentals, after.rentals, rentalToRow, projectId),
    diffSync<BeautyAppt>(supa, "beauty_appts", before.beauty, after.beauty, beautyToRow, projectId),
    diffSync<VisitAppt>(supa, "visits", before.visits, after.visits, visitToRow, projectId),
    diffSync<WeddingPartyMember>(supa, "wedding_party", before.weddingParty, after.weddingParty, partyToRow, projectId),
    diffSync<PreEvent>(supa, "pre_events", before.preEvents, after.preEvents, preEventToRow, projectId),
    diffSync<TipEnvelope>(supa, "tip_envelopes", before.tips, after.tips, tipToRow, projectId),
    diffSync<Memorial>(supa, "memorials", before.memorials, after.memorials, memorialToRow, projectId),
    diffSync<StationerySuite>(supa, "stationery_suites", before.stationery, after.stationery, stationeryToRow, projectId),
    diffSync<MenuItem>(supa, "menus", before.menu, after.menu, menuToRow, projectId),
    syncVendorMessages(supa, before.vendors, after.vendors, projectId),
  ]);

  // 4. Per-project singletons.
  if (after.cake) {
    await supa.from("cake_specs").upsert({ ...cakeToRow(after.cake, projectId), allergens: after.cake.allergens ?? [] });
  } else if (before.cake && !after.cake) {
    await supa.from("cake_specs").delete().eq("project_id", projectId);
  }
  if (after.bar) {
    await supa.from("bar_programs").upsert(barToRow(after.bar, projectId));
  } else if (before.bar && !after.bar) {
    await supa.from("bar_programs").delete().eq("project_id", projectId);
  }
  if (after.license) {
    await supa.from("licenses").upsert(licenseToRow(after.license, projectId));
  }
  if (after.site) {
    await supa.from("wedding_sites").upsert(siteToRow(after.site, projectId));
  }
  if (after.seating !== before.seating) {
    await supa.from("seating_charts").upsert(seatingToRow(after.seating, projectId));
  }

  // 5. Dietary resolutions map.
  const beforeKeys = new Set(Object.keys(before.dietaryResolutions ?? {}));
  const afterKeys = new Set(Object.keys(after.dietaryResolutions ?? {}));
  const removed = [...beforeKeys].filter((k) => !afterKeys.has(k));
  for (const k of removed) {
    const [guest_id, menu_item_id] = k.split("__");
    await supa.from("dietary_resolutions").delete()
      .eq("project_id", projectId).eq("guest_id", guest_id).eq("menu_item_id", menu_item_id);
  }
  const upserts = Object.entries(after.dietaryResolutions ?? {}).map(([k, v]) => {
    const [guest_id, menu_item_id] = k.split("__");
    return {
      project_id: projectId, guest_id, menu_item_id,
      kind: v.kind, alternate_item_name: v.alternateItemName ?? null,
      note: v.note ?? null, resolved_at: v.resolvedAt,
    };
  });
  if (upserts.length) {
    await supa.from("dietary_resolutions").upsert(upserts, {
      onConflict: "project_id,guest_id,menu_item_id",
    });
  }
}
