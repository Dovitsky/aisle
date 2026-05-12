// Minimal property + integration tests required by build brief §9.1.
// Runs without a test framework: `npx tsx tests/run.ts`.
//
//   1. Cartographer property test
//   2. Dress firewall exfiltration test
//   3. Budget arithmetic property test
//   4. Dietary cross-check + cake + resolution test
//   5. Caterer brief generation test

import { solveSeating, scoreArrangement } from "../lib/agents/cartographer";
import { assertBudgetInvariant } from "../lib/agents/treasurer";
import { computeConflicts, catererBrief, larderParse } from "../lib/agents/larder";
import { inferAllergens } from "../lib/agents/patissier";
import { filterForViewer } from "../lib/store";
import {
  Guest, SeatingTable, SeatingConstraint, BudgetLine, ProjectState,
  AllergenCode, AllergenEntry, MenuItem,
  DEFAULT_GATES, EMPTY_SEATING,
} from "../lib/types";

function rnd(seed: number) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff; }; }

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`✗ ${msg}`);
    process.exit(1);
  }
  console.log(`✓ ${msg}`);
}

// --- 1. Cartographer property test --------------------------------------

function makeGuests(n: number, r: () => number): Guest[] {
  const guests: Guest[] = [];
  for (let i = 0; i < n; i++) {
    guests.push({
      id: `g${i}`,
      householdId: "h" + Math.floor(i / 2),
      fullName: "Guest " + i,
      side: r() < 0.5 ? "organizer" : "partner",
      relationship: "extended_family",
      plusOnePolicy: "none",
      rsvp: "yes",
    });
  }
  return guests;
}

function makeTables(n: number, capacity: number): SeatingTable[] {
  const tables: SeatingTable[] = [];
  for (let i = 0; i < n; i++) {
    tables.push({ id: "t" + i, label: "Table " + (i + 1), capacity, shape: "round", x: 50, y: 50 });
  }
  return tables;
}

function cartographerPropertyTest() {
  const r = rnd(42);
  for (let trial = 0; trial < 100; trial++) {
    const guestCount = 80 + Math.floor(r() * 40);
    const tableCount = Math.ceil(guestCount / 8);
    const guests = makeGuests(guestCount, r);
    const tables = makeTables(tableCount, 10);
    const constraints: SeatingConstraint[] = [];
    for (let c = 0; c < 5; c++) {
      const a = guests[Math.floor(r() * guestCount)].id;
      let b = guests[Math.floor(r() * guestCount)].id;
      while (a === b) b = guests[Math.floor(r() * guestCount)].id;
      constraints.push({
        id: "c" + trial + "_" + c,
        kind: "hard_separation",
        guestIds: [a, b],
        reason: "test",
      });
    }
    const { assignments } = solveSeating(guests, tables, constraints, { maxIterations: 8000, seed: trial });
    for (const c of constraints) {
      const [a, b] = c.guestIds;
      if (assignments[a] && assignments[b] && assignments[a] === assignments[b]) {
        // Annealing solver isn't a guarantee, but with the cost weight we set it should
        // never violate hard_separation in practice. Fail loudly if it does.
        const cost = scoreArrangement(assignments, tables, constraints, guests);
        throw new Error(`Hard separation violated at trial ${trial} for ${a}/${b} (cost ${cost})`);
      }
    }
  }
  assert(true, "Cartographer: 100×5 hard_separation constraints respected");
}

// --- 2. Dress firewall exfiltration test --------------------------------

function dressFirewallTest() {
  const baseState: ProjectState = {
    brief: {
      organizerName: "Maya", partnerName: "Jordan", dateWindow: "Sep 2026",
      region: "Hudson Valley", guestCount: 100, budgetUsd: 75000, vibe: "stone barn",
      plannerStatus: "want_one", locked: true, cultural: "secular", formalityTone: "modern", destination: false,
    },
    chat: [
      { id: "c1", role: "agent", agent: "Couturier", content: "Drafted dress directions.", createdAt: "x", gateScope: "dress" },
      { id: "c2", role: "agent", agent: "Maestro", content: "Hi.", createdAt: "x" },
    ],
    approvals: [
      { id: "a1", createdAt: "x", agent: "Couturier", phase: "personal_prep", title: "Bias-cut slip dress concept",
        rationale: "secret", risk: "low", action: { kind: "publish_design", assetId: "x", title: "Slip dress" }, status: "pending", gateScope: "dress" },
      { id: "a2", createdAt: "x", agent: "Maestro", phase: "discovery", title: "Approve brief", rationale: "ok",
        risk: "low", action: { kind: "lock_brief", summary: "Brief locked" }, status: "pending" },
    ],
    ledger: [
      { id: "l1", at: "x", actor: "agent", agent: "Couturier", kind: "couturier.proposed", summary: "Generated 6 dress directions", gateScope: "dress" },
      { id: "l2", at: "x", actor: "user", kind: "brief.locked", summary: "Brief locked" },
    ],
    paused: false,
    vendors: [
      { id: "v1", name: "Bridal Boutique", category: "Bridal", city: "NYC", fitScore: 90, priceBracket: "$$$", notes: "couture", status: "shortlisted", gateScope: "dress" },
    ],
    budget: [
      { id: "b1", category: "Dress", planUsd: 8000, committedUsd: 0, paidUsd: 0, gateScope: "dress" },
      { id: "b2", category: "Venue", planUsd: 25000, committedUsd: 0, paidUsd: 0 },
    ],
    households: [],
    guests: [],
    designs: [
      { id: "d1", title: "Slip dress concept", kind: "dress_concept", description: "white silk crepe", createdAt: "x", agent: "Couturier", gateScope: "dress" },
      { id: "d2", title: "Editorial Provence", kind: "moodboard", description: "stone + linen", createdAt: "x", agent: "Designer" },
    ],
    seating: EMPTY_SEATING,
    dayOf: [],
    thanks: [],
    gates: { ...DEFAULT_GATES, dress: true },
    viewer: "partner",
    stationery: [], hotelBlocks: [], shuttles: [], welcomeBag: [],
    contingencies: [], engagement: [], vows: [], speeches: [],
    registry: [], honeymoon: [],
    dayOfMode: false, plan: "couple_plus", approvedTokens: [],
    music: [], ceremony: [], ceremonyTradition: "humanist",
    cake: null, bar: null, florals: [], rentals: [],
    beauty: [], visits: [], license: null, site: null,
    weddingParty: [], preEvents: [], tips: [], memorials: [],
    menu: [], dietaryResolutions: {},
  };

  const filtered = filterForViewer(baseState);
  const hay = JSON.stringify(filtered);
  // No dress-tagged record should appear.
  assert(!filtered.approvals.some((a) => a.gateScope === "dress"), "Firewall: no dress approvals leaked");
  assert(!filtered.chat.some((c) => c.gateScope === "dress"), "Firewall: no dress chat leaked");
  assert(!filtered.vendors.some((v) => v.gateScope === "dress"), "Firewall: no dress vendors leaked");
  assert(!filtered.budget.some((b) => b.gateScope === "dress"), "Firewall: no dress budget lines leaked");
  assert(!filtered.designs.some((d) => d.gateScope === "dress"), "Firewall: no dress designs leaked");
  assert(!filtered.ledger.some((e) => e.gateScope === "dress"), "Firewall: no dress ledger events leaked");
  // No literal dress vendor name leaked.
  assert(!hay.includes("Bridal Boutique"), "Firewall: no dress vendor name leaked anywhere");
  assert(!hay.includes("Slip dress concept"), "Firewall: no dress design title leaked");
  assert(!hay.includes("dress_concept"), "Firewall: no dress concept kind leaked");
}

// --- 3. Budget invariant property test ---------------------------------

function budgetInvariantTest() {
  const r = rnd(7);
  for (let trial = 0; trial < 200; trial++) {
    const lines: BudgetLine[] = [];
    for (let i = 0; i < 10; i++) {
      const plan = Math.round(r() * 10000);
      const committed = Math.round(r() * plan);
      const paid = Math.round(r() * committed);
      lines.push({
        id: "b" + i, category: "Cat" + i,
        planUsd: plan, committedUsd: committed, paidUsd: paid,
      });
    }
    const inv = assertBudgetInvariant(lines);
    if (!inv.ok) throw new Error("Constructed-valid lines failed invariant: " + inv.violation);
  }
  // Construct a known-bad case
  const bad: BudgetLine[] = [{ id: "x", category: "Bad", planUsd: 100, committedUsd: 200, paidUsd: 50 }];
  const inv = assertBudgetInvariant(bad);
  if (inv.ok) throw new Error("Invariant said OK on a known-bad case");
  assert(true, "Budget invariant: 200 valid arrangements pass, known-bad case caught");
}

// --- 4. Dietary cross-check test ---------------------------------------

function emptyState(): ProjectState {
  return {
    brief: { organizerName: "M", partnerName: "J", dateWindow: "x", region: "x", guestCount: 100, budgetUsd: 50000, vibe: "x", plannerStatus: "want_one", locked: true, cultural: "secular", formalityTone: "modern", destination: false },
    chat: [], approvals: [], ledger: [], paused: false,
    vendors: [], budget: [], households: [], guests: [],
    designs: [], seating: EMPTY_SEATING, dayOf: [], thanks: [],
    gates: DEFAULT_GATES, viewer: "organizer",
    stationery: [], hotelBlocks: [], shuttles: [], welcomeBag: [],
    contingencies: [], engagement: [], vows: [], speeches: [],
    registry: [], honeymoon: [],
    dayOfMode: false, plan: "couple_plus", approvedTokens: [],
    music: [], ceremony: [], ceremonyTradition: "humanist",
    cake: null, bar: null, florals: [], rentals: [],
    beauty: [], visits: [], license: null, site: null,
    weddingParty: [], preEvents: [], tips: [], memorials: [],
    menu: [], dietaryResolutions: {},
  };
}

async function dietaryTestAsync() {
  // Offline parser: clear the API key so we hit the regex path deterministically.
  const savedKey = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  try {
    const parsed1 = await larderParse("EpiPen for peanuts. anaphylactic.");
    if (!parsed1.allergens.find((a) => a.code === "peanut" && a.severity === "anaphylactic")) {
      throw new Error("Parser failed to detect anaphylactic peanut from EpiPen text");
    }
    const parsed2 = await larderParse("Lactose intolerant. milk products give me trouble");
    if (!parsed2.allergens.find((a) => a.code === "dairy" && a.severity === "intolerant")) {
      throw new Error("Parser failed to detect dairy intolerance");
    }
    const parsed3 = await larderParse("Vegan, no animal products");
    if (!parsed3.preferences.includes("vegan")) {
      throw new Error("Parser failed to detect vegan preference");
    }
  } finally {
    if (savedKey) process.env.ANTHROPIC_API_KEY = savedKey;
  }
  assert(true, "Dietary parser: peanut/anaphylactic, dairy/intolerant, vegan all detected");

  // Cross-check: anaphylactic guest × menu item containing that allergen → critical
  const s = emptyState();
  const guest: Guest = {
    id: "g1", householdId: "h1", fullName: "Anish Patel",
    side: "partner", relationship: "immediate_family",
    plusOnePolicy: "none", rsvp: "yes",
    allergens: [{ code: "shellfish", severity: "anaphylactic" }],
    dietaryPreferences: [],
  };
  s.guests = [guest];
  s.menu = [
    { id: "m1", course: "passed", name: "Tuna tartare on cucumber", description: "Sesame, lime", containsAllergens: ["fish", "sesame", "soy"] },
    { id: "m2", course: "first", name: "Heirloom tomato salad", description: "Burrata", containsAllergens: ["dairy"], isVegetarian: true },
    { id: "m3", course: "main_meat", name: "Grilled hanger steak", description: "Chimichurri", containsAllergens: [], isDairyFree: true },
    { id: "m4", course: "passed", name: "Crab cake", description: "Lemon aioli", containsAllergens: ["shellfish", "egg"] },
  ];
  const conflicts1 = computeConflicts(s);
  const crab = conflicts1.find((c) => c.menuItemId === "m4" && c.guestId === "g1");
  if (!crab || crab.severity !== "critical") {
    throw new Error("Anaphylactic shellfish guest × crab cake should be critical");
  }
  if (conflicts1.find((c) => c.menuItemId === "m1" && c.guestId === "g1")) {
    throw new Error("Tuna (fish, not shellfish) should not conflict with shellfish-only allergy");
  }
  assert(true, "Cross-check: anaphylactic shellfish × crab cake → critical, tuna correctly skipped");

  // Cake fold-in: cake.allergens propagates to conflicts.
  const s2 = emptyState();
  s2.guests = [{ ...guest, allergens: [{ code: "tree_nut", severity: "severe" }] }];
  s2.cake = {
    id: "cake1", tiers: 3, flavors: ["almond honey", "vanilla"], fillings: ["raspberry", "vanilla custard"],
    frostingStyle: "Italian buttercream", decorationNotes: "", servings: 100,
    allergens: ["dairy", "egg", "gluten", "tree_nut"],
    allergenNotes: "almond tier",
  };
  const conflicts2 = computeConflicts(s2);
  const cakeConflict = conflicts2.find((c) => c.menuItemId === "cake_synthetic");
  if (!cakeConflict || cakeConflict.severity !== "critical") {
    throw new Error("Tree-nut allergic guest × almond cake should be critical via fold-in");
  }
  assert(true, "Cake cross-check: tree-nut guest × almond cake folds into conflicts as critical");

  // Resolution: setting a resolution attaches to the conflict and de-prioritizes it.
  const s3 = { ...s, dietaryResolutions: { ["g1__m4"]: { kind: "alt_meal" as const, alternateItemName: "Beet tartlet", resolvedAt: new Date().toISOString() } } };
  const conflicts3 = computeConflicts(s3);
  const resolved = conflicts3.find((c) => c.menuItemId === "m4" && c.guestId === "g1");
  if (!resolved?.resolution) {
    throw new Error("Resolution should attach to the matching conflict");
  }
  assert(true, "Dietary resolution: attached to conflict and persisted across recompute");

  // Patissier inferAllergens: almond honey → tree_nut + dairy + gluten + egg
  const inferred = inferAllergens(["almond honey", "vanilla custard", "Italian buttercream"]);
  if (!inferred.includes("tree_nut") || !inferred.includes("dairy") || !inferred.includes("egg") || !inferred.includes("gluten")) {
    throw new Error(`inferAllergens missed an obvious allergen: ${inferred.join(",")}`);
  }
  // vegan + GF should NOT add dairy/egg/gluten
  const veganGf = inferAllergens(["vegan vanilla", "gluten-free chocolate"]);
  if (veganGf.includes("dairy") || veganGf.includes("egg") || veganGf.includes("gluten")) {
    throw new Error(`inferAllergens added dairy/egg/gluten despite vegan + GF flags`);
  }
  assert(true, "Patissier inferAllergens: tree_nut + default trio detected; vegan+GF skip the defaults");

  // Caterer brief: critical guest names appear, allergen rollup includes the count.
  const briefState = emptyState();
  briefState.guests = [
    { id: "g1", householdId: "h", fullName: "Anish Patel", side: "partner", relationship: "immediate_family", plusOnePolicy: "none", rsvp: "yes", allergens: [{ code: "peanut", severity: "anaphylactic" }] },
    { id: "g2", householdId: "h", fullName: "Karen Lee", side: "organizer", relationship: "extended_family", plusOnePolicy: "none", rsvp: "yes", allergens: [{ code: "shellfish", severity: "severe" }] },
    { id: "g3", householdId: "h", fullName: "Vegan friend", side: "both", relationship: "college_friend", plusOnePolicy: "none", rsvp: "yes", dietaryPreferences: ["vegan"] },
  ];
  const brief = catererBrief(briefState);
  if (!brief.body.includes("Anish Patel") || !brief.body.includes("Karen Lee")) {
    throw new Error("Caterer brief missing critical guest names");
  }
  if (!brief.allergenSummary.find((a) => a.allergen === "peanut" && a.severity === "anaphylactic")) {
    throw new Error("Caterer brief allergen summary missing anaphylactic peanut");
  }
  if (!brief.preferenceSummary.find((p) => p.preference === "vegan" && p.count === 1)) {
    throw new Error("Caterer brief preference summary missing vegan count");
  }
  assert(true, "Caterer brief: critical guests named, allergens rolled up with severity, prefs counted");
}

// --- run ----------------------------------------------------------------

async function main() {
  cartographerPropertyTest();
  dressFirewallTest();
  budgetInvariantTest();
  await dietaryTestAsync();
  console.log("\nAll tests passed.");
}
main().catch((e) => { console.error(e); process.exit(1); });
