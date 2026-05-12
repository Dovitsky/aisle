// Page-aware chat. short imperatives resolve against the page's vendor
// category. "find cheaper ones" on /florals → dispatch_scout(Florist).

import { maestroReply, parseImperativeAgainstContext } from "../lib/agents/maestro";
import { pageContextForPath } from "../lib/pageContext";
import { setBrief, addVendors, readState } from "../lib/store";
import type { Brief } from "../lib/types";

function ok(cond: boolean, msg: string) {
  if (cond) console.log(`✓ ${msg}`);
  else { console.error(`✗ ${msg}`); process.exit(1); }
}

const BRIEF: Brief = {
  organizerName: "Maya", partnerName: "Sam",
  dateWindow: "Late September 2026", region: "Hudson Valley, NY",
  guestCount: 120, budgetUsd: 80000,
  vibe: "candlelit barn",
  plannerStatus: "want_one", cultural: "secular",
  formalityTone: "modern", destination: false,
  locked: true, lockedAt: new Date().toISOString(),
};

async function main() {
  // ---- Page context map ----
  const florals = pageContextForPath("/florals");
  ok(florals?.vendorCategory === "Florist", "Page context: /florals → Florist");

  const music = pageContextForPath("/music");
  ok(music?.vendorCategory === "Band", "Page context: /music → Band");

  const cake = pageContextForPath("/cake");
  ok(cake?.vendorCategory === "Cake", "Page context: /cake → Cake");

  const bar = pageContextForPath("/bar");
  ok(bar?.vendorCategory === "Bartending", "Page context: /bar → Bartending");

  const beauty = pageContextForPath("/beauty");
  ok(beauty?.vendorCategory === "Hair & Makeup", "Page context: /beauty → Hair & Makeup");

  const rentals = pageContextForPath("/rentals");
  ok(rentals?.vendorCategory === "Rentals", "Page context: /rentals → Rentals");

  const stationery = pageContextForPath("/stationery");
  ok(stationery?.vendorCategory === "Stationer", "Page context: /stationery → Stationer");

  const seating = pageContextForPath("/seating");
  ok(seating?.vendorCategory === undefined && seating?.label === "Seating chart", "Page context: /seating has no vendor category but has a topic");

  // Dynamic prefix fallback
  const vibeDetail = pageContextForPath("/discover/vibe/coastal-italian");
  ok(vibeDetail?.label === "Discover", "Page context: dynamic /discover/vibe/[slug] falls back to /discover");

  // No-match returns null
  ok(pageContextForPath("/totally-fake-route") === null, "Page context: unknown route returns null");

  // ---- Imperative parser ----
  ok(parseImperativeAgainstContext("find cheaper ones") === "scout_cheaper", "Imperative: 'find cheaper ones' → scout_cheaper");
  ok(parseImperativeAgainstContext("show me cheaper options") === "scout_cheaper", "Imperative: 'show me cheaper options' → scout_cheaper");
  ok(parseImperativeAgainstContext("any cheaper picks") === "scout_cheaper", "Imperative: 'any cheaper picks' → scout_cheaper");
  ok(parseImperativeAgainstContext("more options") === "scout_more", "Imperative: 'more options' → scout_more");
  ok(parseImperativeAgainstContext("show me more") === "scout_more", "Imperative: 'show me more' → scout_more");
  ok(parseImperativeAgainstContext("any others") === "scout_more", "Imperative: 'any others' → scout_more");
  ok(parseImperativeAgainstContext("what else") === "scout_more", "Imperative: 'what else' → scout_more");

  // Negative cases. shouldn't false-fire
  ok(parseImperativeAgainstContext("we're Maya and Sam") === null, "Imperative: name extraction doesn't trip parser");
  ok(parseImperativeAgainstContext("yes lock it") === null, "Imperative: lock confirm doesn't trip parser");
  ok(parseImperativeAgainstContext("Email the venue about rain") === null, "Imperative: vendor-email intent doesn't trip parser");

  // ---- End-to-end through offline Maestro ----
  await setBrief(BRIEF);
  await addVendors([
    { name: "Wildgrove Florals", category: "Florist", city: "Hudson, NY", fitScore: 88, priceBracket: "$$$" as const, notes: "" },
    { name: "Velvet Hour Trio",  category: "Band",    city: "Hudson, NY", fitScore: 82, priceBracket: "$$" as const,  notes: "" },
  ]);
  const state = await readState();

  // On /florals, "find cheaper ones" → dispatch_scout(category=Florist)
  const r1 = await maestroReply({
    brief: state.brief,
    history: state.chat,
    userMessage: "find cheaper ones",
    pageContext: pageContextForPath("/florals") ?? undefined,
  });
  const tool1 = r1.toolUses.find((t) => t.name === "dispatch_scout");
  ok(!!tool1, "Maestro: 'find cheaper ones' on /florals → dispatch_scout");
  ok((tool1?.input as Record<string, unknown>).category === "Florist", "Maestro: category resolved to Florist");
  ok((tool1?.input as Record<string, unknown>).priceHint === "lower", "Maestro: priceHint = lower for cheaper intent");
  ok(/cheaper/i.test(r1.text) && /florist/i.test(r1.text), "Maestro: reply acknowledges 'cheaper florist'");

  // On /music, "more options" → dispatch_scout(category=Band)
  const r2 = await maestroReply({
    brief: state.brief, history: state.chat,
    userMessage: "more options",
    pageContext: pageContextForPath("/music") ?? undefined,
  });
  const tool2 = r2.toolUses.find((t) => t.name === "dispatch_scout");
  ok(!!tool2, "Maestro: 'more options' on /music → dispatch_scout");
  ok((tool2?.input as Record<string, unknown>).category === "Band", "Maestro: category resolved to Band");

  // Without page context, the same message doesn't fire dispatch_scout
  const r3 = await maestroReply({
    brief: state.brief, history: state.chat,
    userMessage: "find cheaper ones",
  });
  ok(!r3.toolUses.find((t) => t.name === "dispatch_scout"),
    "Maestro: 'find cheaper ones' without page context does NOT fire dispatch_scout");

  // On /seating (no vendor category), short imperatives don't fire dispatch_scout
  const r4 = await maestroReply({
    brief: state.brief, history: state.chat,
    userMessage: "more options",
    pageContext: pageContextForPath("/seating") ?? undefined,
  });
  ok(!r4.toolUses.find((t) => t.name === "dispatch_scout"),
    "Maestro: short imperative on /seating (no vendor category) is a no-op");

  console.log("\nPage-aware chat: 'find cheaper ones' on /florals → cheaper florists; 'more options' on /music → more bands. Without context: no false positives.");
}

main().catch((e) => { console.error("FAIL:", e); process.exit(1); });
