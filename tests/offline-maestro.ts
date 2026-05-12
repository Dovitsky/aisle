// Offline Maestro tests. verify the rule-based onboarding path actually
// extracts brief fields and fires the right tool calls in offline mode.
// Without these, the entire chat flow is dead when no API key is present.

import { maestroReply } from "../lib/agents/maestro";
import type { Brief } from "../lib/types";

function pass(msg: string) { console.log(`✓ ${msg}`); }
function fail(msg: string): never { console.error(`✗ ${msg}`); process.exit(1); }
function assert(cond: boolean, msg: string): void {
  if (!cond) fail(msg); else pass(msg);
}

const empty = (): Brief | null => null;
const partial = (over: Partial<Brief>): Brief => ({
  organizerName: "", partnerName: "", dateWindow: "", region: "",
  guestCount: 0, budgetUsd: 0, vibe: "",
  plannerStatus: "want_one", cultural: "secular",
  formalityTone: "modern", destination: false, locked: false,
  ...over,
});

async function main() {
  // 1. Pair extraction.
  let r = await maestroReply({
    brief: empty(), history: [], userMessage: "we're Maya and Sam",
  });
  let tu = r.toolUses.find((t) => t.name === "update_brief");
  assert(!!tu, "Pair: update_brief fires for 'we're Maya and Sam'");
  assert((tu!.input as Record<string, unknown>).organizerName === "Maya", "Pair: organizerName=Maya");
  assert((tu!.input as Record<string, unknown>).partnerName === "Sam",   "Pair: partnerName=Sam");

  // 2. Solo "I'm X" extraction.
  r = await maestroReply({
    brief: empty(), history: [], userMessage: "Hi, I'm Maya",
  });
  tu = r.toolUses.find((t) => t.name === "update_brief");
  assert(!!tu, "Solo: update_brief fires for 'I'm Maya'");
  assert((tu!.input as Record<string, unknown>).organizerName === "Maya", "Solo: organizerName=Maya");

  // 3. Bare reply: "Sam." after we already have organizerName.
  r = await maestroReply({
    brief: partial({ organizerName: "Maya" }),
    history: [],
    userMessage: "Sam.",
  });
  tu = r.toolUses.find((t) => t.name === "update_brief");
  assert(!!tu, "Bare: update_brief fires for 'Sam.'");
  assert((tu!.input as Record<string, unknown>).partnerName === "Sam", "Bare: partnerName=Sam");

  // 4. Guest count from "around 120".
  r = await maestroReply({
    brief: partial({ organizerName: "Maya", partnerName: "Sam" }),
    history: [], userMessage: "around 120 guests",
  });
  tu = r.toolUses.find((t) => t.name === "update_brief");
  assert(!!tu && (tu.input as Record<string, unknown>).guestCount === 120, "Guests: 'around 120 guests' → 120");

  // 5. Budget formats.
  r = await maestroReply({ brief: partial({}), history: [], userMessage: "budget around $80k" });
  tu = r.toolUses.find((t) => t.name === "update_brief");
  assert(!!tu && (tu.input as Record<string, unknown>).budgetUsd === 80000, "Budget: '$80k' → 80000");

  r = await maestroReply({ brief: partial({}), history: [], userMessage: "$110,000 envelope" });
  tu = r.toolUses.find((t) => t.name === "update_brief");
  assert(!!tu && (tu.input as Record<string, unknown>).budgetUsd === 110000, "Budget: '$110,000' → 110000");

  // 6. Date window. month + year.
  r = await maestroReply({
    brief: partial({}), history: [],
    userMessage: "Late September 2026 ideally",
  });
  tu = r.toolUses.find((t) => t.name === "update_brief");
  const dw = (tu?.input as Record<string, unknown>)?.dateWindow as string;
  assert(typeof dw === "string" && dw.includes("September") && dw.includes("2026"), "Date: 'Late September 2026' parsed");

  // 7. Date window. season form.
  r = await maestroReply({
    brief: partial({}), history: [],
    userMessage: "Spring 2027 maybe",
  });
  tu = r.toolUses.find((t) => t.name === "update_brief");
  const dw2 = (tu?.input as Record<string, unknown>)?.dateWindow as string;
  assert(typeof dw2 === "string" && dw2.includes("Spring") && dw2.includes("2027"), "Date: 'Spring 2027' parsed");

  // 8. Region "in Hudson Valley".
  r = await maestroReply({
    brief: partial({ organizerName: "Maya", partnerName: "Sam" }),
    history: [],
    userMessage: "in the Hudson Valley, NY",
  });
  tu = r.toolUses.find((t) => t.name === "update_brief");
  const reg = (tu?.input as Record<string, unknown>)?.region as string;
  assert(typeof reg === "string" && reg.toLowerCase().includes("hudson"), `Region: 'Hudson Valley' parsed (got: ${reg})`);

  // 9. Vibe. long descriptive sentence.
  r = await maestroReply({
    brief: partial({ organizerName: "Maya", partnerName: "Sam", dateWindow: "September 2026", region: "Hudson Valley", guestCount: 120, budgetUsd: 80000 }),
    history: [],
    userMessage: "candlelit barn with editorial film photography and no DJ banter",
  });
  tu = r.toolUses.find((t) => t.name === "update_brief");
  const v = (tu?.input as Record<string, unknown>)?.vibe as string;
  assert(typeof v === "string" && v.length >= 10, `Vibe: long sentence captured (got: ${v?.slice(0, 60)})`);

  // 10. Lock intent fires lock_brief_now when brief is complete.
  const complete = partial({
    organizerName: "Maya", partnerName: "Sam",
    dateWindow: "September 2026", region: "Hudson Valley",
    guestCount: 120, budgetUsd: 80000,
    vibe: "candlelit barn",
  });
  r = await maestroReply({ brief: complete, history: [], userMessage: "yes lock it" });
  assert(r.toolUses.some((t) => t.name === "lock_brief_now"), "Lock: 'yes lock it' → lock_brief_now fires");

  // 11. Negative override. "no, wait" while complete should NOT lock.
  r = await maestroReply({ brief: complete, history: [], userMessage: "no wait, change the date" });
  assert(!r.toolUses.some((t) => t.name === "lock_brief_now"), "Lock: 'no wait' does not fire lock");

  // 12. Reply text always asks the next missing field.
  r = await maestroReply({
    brief: empty(), history: [], userMessage: "Hi I'm Maya",
  });
  assert(/partner/i.test(r.text), `Reply: after 'I'm Maya' Maestro asks about partner (got: ${r.text.slice(0, 80)})`);

  console.log("\nAll offline-Maestro tests passed.");
}

main().catch((e) => {
  console.error("FAIL:", e);
  process.exit(1);
});
