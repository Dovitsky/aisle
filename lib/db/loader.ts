// Postgres → ProjectState loader.
// Runs ~30 SELECTs in parallel and assembles the in-memory ProjectState.

import {
  ProjectState, EMPTY_SEATING, DEFAULT_GATES,
} from "../types";
import { adminClient } from "./supabase";
import {
  vendorFromRow, vendorMessageFromRow, approvalFromRow, ledgerFromRow,
  chatFromRow, briefFromProjectRow, budgetFromRow, householdFromRow,
  guestFromRow, designFromRow, dayOfFromRow, contingencyFromRow,
  thankFromRow, registryFromRow, honeymoonFromRow, hotelFromRow, shuttleFromRow,
  wbFromRow, vowFromRow, speechFromRow, engagementFromRow, memorialFromRow,
  visitFromRow, musicFromRow, ceremonyFromRow, cakeFromRow, barFromRow,
  floralFromRow, rentalFromRow, beautyFromRow, licenseFromRow, siteFromRow,
  partyFromRow, preEventFromRow, tipFromRow, stationeryFromRow, menuFromRow,
  seatingFromRow,
} from "./mappers";

export async function loadProjectState(projectId: string): Promise<ProjectState> {
  const supa = adminClient();
  const eq = (table: string) => supa.from(table).select("*").eq("project_id", projectId);

  // Run the loader queries in parallel.
  const [
    project, vendors, vendorMessages, approvals, ledger, chat,
    budget, households, guests, designs, dayOf, contingencies, thanks,
    registry, honeymoon, hotelBlocks, shuttles, welcomeBag, vows, speeches,
    engagement, memorials, visits, music, ceremony, cake, bar, florals,
    rentals, beauty, license, site, weddingParty, preEvents, tips,
    stationery, menu, seating, resolutions, userPref,
  ] = await Promise.all([
    supa.from("projects").select("*").eq("id", projectId).maybeSingle(),
    eq("vendors"),
    eq("vendor_messages").order("at", { ascending: true }),
    eq("approvals").order("created_at", { ascending: true }),
    eq("ledger_events").order("at", { ascending: true }),
    eq("chat_messages").order("created_at", { ascending: true }),
    eq("budget_lines"),
    eq("households"),
    eq("guests"),
    eq("design_assets"),
    eq("day_of_items").order("position", { ascending: true }),
    eq("contingencies"),
    eq("thank_yous"),
    eq("registry_items"),
    eq("honeymoon_segments"),
    eq("hotel_blocks"),
    eq("shuttles"),
    eq("welcome_bag_items"),
    eq("vows"),
    eq("speeches"),
    eq("engagement_milestones"),
    eq("memorials"),
    eq("visits").order("date", { ascending: true }),
    eq("music_cues"),
    eq("ceremony_sections").order("position", { ascending: true }),
    supa.from("cake_specs").select("*").eq("project_id", projectId).maybeSingle(),
    supa.from("bar_programs").select("*").eq("project_id", projectId).maybeSingle(),
    eq("florals"),
    eq("rentals"),
    eq("beauty_appts"),
    supa.from("licenses").select("*").eq("project_id", projectId).maybeSingle(),
    supa.from("wedding_sites").select("*").eq("project_id", projectId).maybeSingle(),
    eq("wedding_party"),
    eq("pre_events").order("date", { ascending: true }),
    eq("tip_envelopes"),
    eq("stationery_suites"),
    eq("menus"),
    supa.from("seating_charts").select("*").eq("project_id", projectId).maybeSingle(),
    eq("dietary_resolutions"),
    supa.from("user_project_prefs").select("*").eq("project_id", projectId).limit(1).maybeSingle(),
  ]);

  // Build vendor.thread map from the messages join.
  const threadByVendor: Record<string, ReturnType<typeof vendorMessageFromRow>[]> = {};
  for (const m of (vendorMessages.data ?? [])) {
    const v = m.vendor_id as string;
    if (!threadByVendor[v]) threadByVendor[v] = [];
    threadByVendor[v].push(vendorMessageFromRow(m));
  }
  const vendorList = (vendors.data ?? []).map((r) => {
    const v = vendorFromRow(r);
    v.thread = threadByVendor[v.id] ?? [];
    return v;
  });

  // Resolutions map keyed `${guestId}__${menuItemId}`
  const dietaryResolutions: ProjectState["dietaryResolutions"] = {};
  for (const r of resolutions.data ?? []) {
    dietaryResolutions[`${r.guest_id}__${r.menu_item_id}`] = {
      kind: r.kind, alternateItemName: r.alternate_item_name ?? undefined,
      note: r.note ?? undefined, resolvedAt: r.resolved_at,
    };
  }

  const proj = project.data ?? null;

  return {
    brief: proj ? briefFromProjectRow(proj) : null,
    chat: (chat.data ?? []).map(chatFromRow),
    approvals: (approvals.data ?? []).map(approvalFromRow),
    ledger: (ledger.data ?? []).map(ledgerFromRow),
    paused: Boolean(proj?.paused),
    pausedReason: (proj?.paused_reason as string) ?? undefined,
    vendors: vendorList,
    budget: (budget.data ?? []).map(budgetFromRow),
    households: (households.data ?? []).map(householdFromRow),
    guests: (guests.data ?? []).map((r) => {
      const g = guestFromRow(r);
      // Hydrate structured dietary fields if present.
      if (Array.isArray(r.allergens)) g.allergens = r.allergens as Guest["allergens"];
      if (Array.isArray(r.dietary_preferences)) g.dietaryPreferences = r.dietary_preferences as Guest["dietaryPreferences"];
      if (typeof r.dietary_notes === "string") g.dietaryNotes = r.dietary_notes;
      return g;
    }),
    designs: (designs.data ?? []).map(designFromRow),
    seating: seating.data ? seatingFromRow(seating.data) : EMPTY_SEATING,
    dayOf: (dayOf.data ?? []).map(dayOfFromRow),
    thanks: (thanks.data ?? []).map(thankFromRow),
    gates: {
      ...DEFAULT_GATES,
      dress: Boolean(proj?.gate_dress),
      partner_gift: Boolean(proj?.gate_partner_gift),
      honeymoon: Boolean(proj?.gate_honeymoon),
      speech: Boolean(proj?.gate_speech),
      vows_organizer: Boolean(proj?.gate_vows_organizer),
      vows_partner: Boolean(proj?.gate_vows_partner),
    },
    viewer: (userPref?.data?.viewer_role as ProjectState["viewer"]) ?? "organizer",
    maestroName: userPref?.data?.maestro_name ?? proj?.maestro_name ?? undefined,
    stationery: (stationery.data ?? []).map(stationeryFromRow),
    hotelBlocks: (hotelBlocks.data ?? []).map(hotelFromRow),
    shuttles: (shuttles.data ?? []).map(shuttleFromRow),
    welcomeBag: (welcomeBag.data ?? []).map(wbFromRow),
    contingencies: (contingencies.data ?? []).map(contingencyFromRow),
    engagement: (engagement.data ?? []).map(engagementFromRow),
    vows: (vows.data ?? []).map(vowFromRow),
    speeches: (speeches.data ?? []).map(speechFromRow),
    registry: (registry.data ?? []).map(registryFromRow),
    honeymoon: (honeymoon.data ?? []).map(honeymoonFromRow),
    dayOfMode: Boolean(proj?.day_of_mode),
    plan: ((proj?.plan as ProjectState["plan"]) ?? "couple_plus"),
    approvedTokens: [],   // tokens are session-scoped; we don't persist them
    music: (music.data ?? []).map(musicFromRow),
    ceremony: (ceremony.data ?? []).map(ceremonyFromRow),
    ceremonyTradition: ((proj?.ceremony_tradition as ProjectState["ceremonyTradition"]) ?? "humanist"),
    cake: cake.data ? cakeFromRow(cake.data) : null,
    bar: bar.data ? barFromRow(bar.data) : null,
    florals: (florals.data ?? []).map(floralFromRow),
    rentals: (rentals.data ?? []).map(rentalFromRow),
    beauty: (beauty.data ?? []).map(beautyFromRow),
    visits: (visits.data ?? []).map(visitFromRow),
    license: license.data ? licenseFromRow(license.data) : null,
    site: site.data ? siteFromRow(site.data) : null,
    weddingParty: (weddingParty.data ?? []).map(partyFromRow),
    preEvents: (preEvents.data ?? []).map(preEventFromRow),
    tips: (tips.data ?? []).map(tipFromRow),
    memorials: (memorials.data ?? []).map(memorialFromRow),
    menu: (menu.data ?? []).map(menuFromRow),
    dietaryResolutions,
  };
}

import type { Guest } from "../types";
