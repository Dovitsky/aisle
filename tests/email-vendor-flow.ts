// "Email the venue about the rain plan". natural-language → Approval Card.
// Verifies offline parser, vendor resolver, and the question-focused Outreach
// draft, end-to-end without a server.

import { maestroReply, parseVendorEmailIntent } from "../lib/agents/maestro";
import { outreachQuestion } from "../lib/agents/outreach";
import {
  setBrief, addVendors, readState,
} from "../lib/store";
import type { Brief, Vendor } from "../lib/types";

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
  // ---- Parser ----
  const cases: { input: string; expectVendor: string; expectTopic: RegExp }[] = [
    { input: "Email the venue about the rain plan",                    expectVendor: "venue",        expectTopic: /rain plan/i },
    { input: "Ask the photographer if they shoot film",                expectVendor: "photographer", expectTopic: /shoot film/i },
    { input: "Send the caterer about kosher meals",                    expectVendor: "caterer",      expectTopic: /kosher/i },
    { input: "Check with the florist regarding seasonal substitutions", expectVendor: "florist",      expectTopic: /seasonal substitutions/i },
    { input: "Email Hudson Valley Barn about the rain plan",           expectVendor: "Hudson Valley Barn", expectTopic: /rain plan/i },
    { input: "ask our band whether they play yacht rock",              expectVendor: "band",         expectTopic: /play yacht rock/i },
  ];
  for (const c of cases) {
    const r = parseVendorEmailIntent(c.input);
    ok(!!r, `Parser: detected intent in "${c.input}"`);
    ok(r!.vendorRef.toLowerCase().includes(c.expectVendor.toLowerCase()),
      `Parser: vendorRef contains "${c.expectVendor}" (got "${r?.vendorRef}")`);
    ok(c.expectTopic.test(r!.topic),
      `Parser: topic matches ${c.expectTopic} (got "${r?.topic}")`);
  }

  // Negative: random sentence shouldn't trip it.
  ok(parseVendorEmailIntent("Locking the brief now") === null,
    "Parser: doesn't false-fire on non-email messages");
  ok(parseVendorEmailIntent("we're Maya and Sam") === null,
    "Parser: doesn't false-fire on name-extraction messages");

  // ---- Offline Maestro emits dispatch_email_vendor ----
  await setBrief(BRIEF);
  await addVendors([
    { name: "Hudson Valley Barn",     category: "Venue",        city: "Hudson, NY",     fitScore: 95, priceBracket: "$$$" as const, notes: "" },
    { name: "Iris & Oak Studio",      category: "Photographer", city: "Hudson, NY",     fitScore: 90, priceBracket: "$$$" as const, notes: "" },
    { name: "Hudson Valley Table Co.", category: "Caterer",      city: "Hudson, NY",     fitScore: 88, priceBracket: "$$$" as const, notes: "" },
  ]);
  const state = await readState();

  const reply = await maestroReply({
    brief: state.brief,
    history: state.chat,
    userMessage: "Email the venue about the rain plan",
  });
  const tu = reply.toolUses.find((t) => t.name === "dispatch_email_vendor");
  ok(!!tu, "Maestro: emits dispatch_email_vendor for 'Email the venue about the rain plan'");
  ok(String((tu!.input as Record<string, unknown>).vendorRef).toLowerCase().includes("venue"),
    "Maestro: vendorRef includes 'venue'");
  ok(/rain plan/i.test(String((tu!.input as Record<string, unknown>).topic)),
    "Maestro: topic includes 'rain plan'");

  // ---- Outreach draft ----
  const v = state.vendors.find((x) => x.category === "Venue") as Vendor;
  const draft = await outreachQuestion({
    brief: state.brief!, vendor: v,
    topic: "the rain plan",
  });
  ok(draft.includes("Maya") && draft.includes("Sam"),
    "Outreach: question email references the couple by name");
  ok(/rain plan/i.test(draft),
    `Outreach: question email mentions the topic (got "${draft.slice(0, 80)}…")`);
  ok(draft.includes(v.name),
    "Outreach: question email greets the vendor by name");

  console.log("\nVendor-email flow complete: parse → tool call → resolve → Outreach draft → ready as Approval Card.");
}

main().catch((e) => { console.error("FAIL:", e); process.exit(1); });
