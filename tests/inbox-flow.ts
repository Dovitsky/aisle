// Inbox flow test. verifies the offline Gmail fixture + Triage classifier +
// vendor matcher + Negotiator follow-up cascade produce real demo output.
//
// Without these wired together, "Scan now" on /inbox is a no-op in offline mode.

import { setBrief, addVendors, readState } from "../lib/store";
import { triageVendorReply } from "../lib/agents/triage";
import { scanInbox } from "../lib/gmail/scan";
import type { Brief } from "../lib/types";

function ok(cond: boolean, msg: string) {
  if (cond) console.log(`✓ ${msg}`);
  else { console.error(`✗ ${msg}`); process.exit(1); }
}

const BRIEF: Brief = {
  organizerName: "Maya", partnerName: "Sam",
  dateWindow: "Late September 2026", region: "Hudson Valley, NY",
  guestCount: 120, budgetUsd: 80000,
  vibe: "candlelit barn, editorial film",
  plannerStatus: "want_one", cultural: "secular",
  formalityTone: "modern", destination: false,
  locked: true, lockedAt: new Date().toISOString(),
};

async function main() {
  // 1. Triage classifier. independently of Gmail, verify offline parser.
  const tAvail = await triageVendorReply(
    "Hi! Yes we have availability that weekend. For 120 guests our site fee is $14,500.",
  );
  ok(tAvail.intent === "available", `Triage: 'available' parsed (got: ${tAvail.intent})`);
  ok(tAvail.quotedUsd === 14500, `Triage: $14,500 parsed (got: ${tAvail.quotedUsd})`);

  const tOoo = await triageVendorReply(
    "I'm out of office through Sunday. I will reply when I'm back at my desk Monday.",
  );
  ok(tOoo.intent === "out_of_office", `Triage: out-of-office parsed (got: ${tOoo.intent})`);

  const tNeeds = await triageVendorReply(
    "Thanks for reaching out. Before I can quote, I need a few questions answered. Are you using a venue with floral restrictions?",
  );
  ok(tNeeds.intent === "needs_info", `Triage: needs_info parsed (got: ${tNeeds.intent})`);

  const tUnavail = await triageVendorReply(
    "Unfortunately we are fully booked that weekend and cannot accommodate.",
  );
  ok(tUnavail.intent === "unavailable", `Triage: unavailable parsed (got: ${tUnavail.intent})`);

  const tNoise = await triageVendorReply(
    "Sponsored content from our partners. [unsubscribe]",
  );
  ok(tNoise.intent === "unknown", `Triage: marketing noise filtered (got: ${tNoise.intent})`);

  // 2. Set up real state with vendors so the matcher has targets.
  await setBrief(BRIEF);
  await addVendors([
    { name: "Hudson Valley Barn",          category: "Venue",        city: "Hudson, NY",     fitScore: 95, priceBracket: "$$$" as const, notes: "Top venue pick" },
    { name: "Iris & Oak Studio",           category: "Photographer", city: "Hudson, NY",     fitScore: 90, priceBracket: "$$$" as const, notes: "Editorial doc style" },
    { name: "Wildgrove Florals",           category: "Florist",      city: "Hudson, NY",     fitScore: 88, priceBracket: "$$" as const,  notes: "Garden-style" },
    { name: "Hudson Valley Table Co.",     category: "Caterer",      city: "Hudson, NY",     fitScore: 85, priceBracket: "$$$" as const, notes: "Family-style menu" },
  ]);

  // 3. Run scanInbox. uses the offline fixture which generates one message per
  // top vendor in each category + one marketing-noise message.
  const result = await scanInbox({ max: 25 });
  ok(result.scanned >= 4, `Inbox scan: ${result.scanned} messages scanned`);
  ok(result.matched >= 3, `Inbox scan: ${result.matched} messages matched to vendors`);
  ok(result.approvalsQueued >= 1, `Inbox scan: ${result.approvalsQueued} follow-up approvals queued`);
  ok(result.errors.length === 0, `Inbox scan: no errors (errors: ${result.errors.join(", ")})`);

  // 4. Verify state mutations: vendor statuses updated, threads populated.
  const state = await readState();
  const venue = state.vendors.find((v) => v.category === "Venue");
  ok(!!venue, "State: venue still present");
  ok((venue?.thread?.length ?? 0) >= 1, `State: venue thread populated (${venue?.thread?.length ?? 0} entries)`);
  ok(venue?.status === "quoting", `State: venue status updated from inbound (got: ${venue?.status})`);

  const photog = state.vendors.find((v) => v.category === "Photographer");
  // OOO message shouldn't change status.
  ok(photog?.status !== "quoting" && photog?.status !== "negotiating",
    `State: out-of-office didn't change photographer status (got: ${photog?.status})`);

  const florist = state.vendors.find((v) => v.category === "Florist");
  ok(florist?.status === "negotiating", `State: needs_info bumps florist to negotiating (got: ${florist?.status})`);

  console.log("\nInbox flow: 5 fixture messages → triage classified each → matcher bound 4 vendors → 1 OOO + 1 needs_info + at least 1 available → Negotiator drafted follow-up.");
}

main().catch((e) => { console.error("FAIL:", e); process.exit(1); });
