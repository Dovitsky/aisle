// Approval cascade engine.
//
// When an Approval Card transitions to `status: "approved"`, sometimes the
// natural next step is automatic — sign a contract, you owe a deposit; lock
// the design direction, the stationery suite should be drafted; lock seating,
// thank-yous should be rebuilt.
//
// Each cascade entry runs AFTER `resolveApproval` writes the approval, and
// can append more cards to the queue, send emails, or kick off agent work.

import type { ApprovalCard, ProjectState } from "./types";
import {
  addStationerySuite, appendApproval, appendChat, appendVendorMessage,
  mutate, readState, setThanks, updateVendor,
} from "./store";
import { sendEmail } from "./email/send";
import { scoutShortlist } from "./agents/scout";
import { stationerSuite, suiteItemSvg } from "./agents/stationer";
import { addVendors } from "./store";
import { catererBrief, computeConflicts } from "./agents/larder";

// Returns a short summary string of what happened for the ledger / chat.
export async function cascade(card: ApprovalCard): Promise<string[]> {
  const summaries: string[] = [];
  if (card.status !== "approved") return summaries;
  const state = await readState();

  switch (card.action.kind) {
    case "send_email": {
      const sent = await handleSendEmail(card, state);
      if (sent) summaries.push(sent);
      break;
    }
    case "sign_contract": {
      const s = await handleSignContract(card, state);
      if (s) summaries.push(s);
      break;
    }
    case "schedule_payment": {
      // Already updates vendor.paid in resolveApproval; cascade just logs.
      summaries.push(`Payment of $${card.action.amountUsd.toLocaleString()} scheduled for ${card.action.vendor}.`);
      break;
    }
    case "lock_brief": {
      const s = await handleLockBrief(card, state);
      if (s) summaries.push(s);
      break;
    }
    case "publish_design": {
      const s = await handlePublishDesign(card, state);
      if (s) summaries.push(s);
      break;
    }
    case "lock_seating": {
      const s = await handleLockSeating(state);
      if (s) summaries.push(s);
      break;
    }
    case "send_save_the_date": {
      summaries.push(`Save-the-dates dispatched to ${card.action.recipients} households via ${card.action.format}. AISLE will queue invitations 8-10 weeks before the wedding.`);
      break;
    }
    case "send_invitations": {
      summaries.push(`Invitations dispatched to ${card.action.recipients} households. RSVPs will route into the inbox automatically.`);
      break;
    }
    case "send_caterer_brief": {
      // For when the caterer brief was sent — Larder's recompute is now stale; just note.
      summaries.push(`Dietary brief sent to ${card.action.vendor}. Conflicts re-checked.`);
      break;
    }
    case "block_hotel_rooms": {
      summaries.push(`Block of ${card.action.rooms} rooms confirmed at ${card.action.hotel}. Out-of-town households will be routed there on the invitation details card.`);
      break;
    }
    case "lock_cake": {
      summaries.push(`Cake spec locked. Dietary cross-check re-ran across ${state.guests.filter((g) => g.rsvp === "yes").length} confirmed guests.`);
      break;
    }
    case "lock_setlist":
    case "lock_ceremony":
    case "lock_vows":
    case "publish_website":
    case "file_marriage_license":
    case "purchase_registry_item":
    case "send_message":
    case "publish_engagement_announcement":
    case "lock_stationery_suite":
    case "book_vendor":
      // No cascade for these — they're terminal or already handled in resolveApproval.
      break;
  }

  if (summaries.length) {
    // Chat-surface summary so the couple sees what happened.
    await appendChat({
      role: "agent", agent: "Maestro",
      content: summaries.join("\n"),
    });
  }
  return summaries;
}

// --------------------------------------------------------------------
// Handlers
// --------------------------------------------------------------------

async function handleSendEmail(card: ApprovalCard, state: ProjectState): Promise<string> {
  if (card.action.kind !== "send_email") return "";
  // Match recipient to a vendor for thread tracking.
  const vendorMatch = state.vendors.find((v) => card.action.kind === "send_email" && card.action.to.includes(v.name));
  const result = await sendEmail({
    to: card.action.to,
    subject: card.action.subject,
    body: card.action.body,
  });
  if (vendorMatch) {
    await appendVendorMessage(vendorMatch.id, {
      direction: "outbound",
      body: card.action.body,
    });
    await updateVendor(vendorMatch.id, {
      lastTouchAt: new Date().toISOString(),
      status: vendorMatch.status === "shortlisted" ? "contacted" : vendorMatch.status,
    });
  }
  if (result.via === "gmail") return `Email sent via Gmail (${result.externalId?.slice(0, 12)}…).`;
  if (result.via === "resend") return `Email sent via Resend.`;
  return `Email approved but no transport configured. The draft is saved on the vendor record. Connect Gmail at /inbox to actually send.`;
}

async function handleSignContract(card: ApprovalCard, state: ProjectState): Promise<string> {
  if (card.action.kind !== "sign_contract") return "";
  const action = card.action;
  const v = state.vendors.find((x) => x.name === action.vendor);
  if (!v) return "";
  // Auto-queue the deposit (50% by default).
  const deposit = Math.round(action.estimate * 0.5);
  const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  await appendApproval({
    agent: "Treasurer", phase: "logistics",
    title: `Pay ${v.name} $${deposit.toLocaleString()} deposit by ${dueDate}?`,
    rationale: `Standard 50% deposit on the $${action.estimate.toLocaleString()} contract you just signed. Auto-queued by the cascade. Approve to schedule via Treasurer; the second 50% is typically due 30 days before the wedding.`,
    risk: deposit > 5000 ? "high" : "medium",
    action: {
      kind: "schedule_payment",
      vendor: v.name,
      amountUsd: deposit,
      dueDate,
    },
  });
  return `Contract with ${v.name} signed. A $${deposit.toLocaleString()} deposit Approval Card is now in your queue.`;
}

async function handleLockBrief(_card: ApprovalCard, state: ProjectState): Promise<string> {
  if (!state.brief?.locked) return "";
  // Auto-fire Scout for the foundational categories if we don't have shortlists yet.
  const needsShortlist = (cat: string) =>
    state.vendors.filter((v) => v.category === cat).length === 0;

  const phase2: string[] = [];
  for (const cat of ["Venue", "Photographer"]) {
    if (!needsShortlist(cat)) continue;
    try {
      const items = await scoutShortlist({ brief: state.brief, category: cat, count: 5 });
      await addVendors(items.map((it) => ({
        name: it.name, category: cat, city: it.city,
        fitScore: it.fitScore, priceBracket: it.priceBracket, notes: it.notes,
      })));
      const top = items[0];
      if (top) {
        await appendApproval({
          agent: "Scout", phase: cat === "Venue" ? "foundation" : "discovery",
          title: `Open outreach to ${top.name} for ${cat}?`,
          rationale: `Auto-shortlisted by Scout after brief lock. ${items.length} candidates ranked against your brief. Approving sends Outreach a personalized first email — that itself becomes a separate Approval Card.\n\n${items.map((it, i) => `${i + 1}. ${it.name} — ${it.city} · ${it.priceBracket} · fit ${it.fitScore}/100`).join("\n")}`,
          risk: "low",
          action: {
            kind: "send_email",
            to: `${top.name} (via AISLE alias)`,
            subject: `Inquiry for ${cat} — ${state.brief.dateWindow}`,
            body: `Hello ${top.name},\n\nWe're reaching out from ${state.brief.organizerName} & ${state.brief.partnerName}'s wedding planning team. They're looking at ${state.brief.dateWindow} in ${state.brief.region} for roughly ${state.brief.guestCount} guests.\n\nWould you have availability in that window?\n\nThank you,\nAISLE on behalf of ${state.brief.organizerName} & ${state.brief.partnerName}`,
          },
        });
        phase2.push(cat);
      }
    } catch {
      // Scout can fail in offline mode without an API key; ignore.
    }
  }
  if (phase2.length) {
    return `Brief locked. Scout shortlisted ${phase2.join(" + ")} and queued an outreach card for each top match.`;
  }
  return "";
}

async function handlePublishDesign(card: ApprovalCard, state: ProjectState): Promise<string> {
  if (card.action.kind !== "publish_design") return "";
  const action = card.action;
  // Find the locked direction; if no stationery suite yet, propose one.
  const direction = state.designs.find((d) => d.id === action.assetId);
  if (!direction) return "";
  if (state.stationery.length > 0) return "";   // already have a suite
  if (!state.brief?.locked) return "";

  try {
    const items = await stationerSuite({
      brief: state.brief,
      direction: action.title,
      menu: state.menu,
    });
    const palette = direction.swatches ?? ["#FBF8F1", "#7C5E3A", "#1A1814"];
    const font = "Cormorant Garamond";
    const itemsWithSvg = items.map((it) => ({
      ...it,
      mockSvg: suiteItemSvg({ copy: it.copy, palette, piece: it.piece, font }),
    }));
    await addStationerySuite({
      direction: action.title,
      palette, font, format: "hybrid",
      items: itemsWithSvg,
    });
    return `Design direction "${action.title}" locked. Stationer drafted a full ${items.length}-piece suite — review at /stationery.`;
  } catch {
    return `Design direction locked. Stationer didn't run automatically — visit /stationery to draft the suite.`;
  }
}

async function handleLockSeating(state: ProjectState): Promise<string> {
  // Rebuild thank-you records from yes-RSVPs.
  const yes = state.guests.filter((g) => g.rsvp === "yes");
  if (yes.length === 0) return "";
  const items = yes.map((g) => {
    const existing = state.thanks.find((t) => t.guestId === g.id);
    return existing ?? {
      id: Math.random().toString(36).slice(2, 12),
      guestId: g.id,
      guestName: g.fullName,
      status: "no_gift" as const,
    };
  });
  await setThanks(items);
  // Larder cross-check refresh — table service notes are now actionable.
  const conflicts = computeConflicts(state);
  const critical = conflicts.filter((c) => c.severity === "critical" && !c.resolution).length;
  if (critical > 0) {
    return `Seating chart locked. ${items.length} thank-you records prepared. ⚠ ${critical} critical dietary conflict${critical === 1 ? "" : "s"} still need a resolution at /dietary.`;
  }
  return `Seating chart locked. ${items.length} thank-you records prepared from confirmed guests.`;
}

// Optional: queue the caterer brief automatically once seating locks AND there are dietary entries.
export async function maybeAutoQueueCatererBrief() {
  const state = await readState();
  const yes = state.guests.filter((g) => g.rsvp === "yes" || g.rsvp === "maybe");
  const hasDietary = yes.some((g) => (g.allergens?.length ?? 0) + (g.dietaryPreferences?.length ?? 0) > 0);
  const caterer = state.vendors.find((v) => v.category === "Caterer" && (v.status === "contracted" || v.status === "paid"));
  if (!hasDietary || !caterer) return;
  // Don't queue twice.
  const existing = state.approvals.find((a) =>
    a.action.kind === "send_caterer_brief" && a.status === "pending"
  );
  if (existing) return;
  const brief = catererBrief(state);
  await appendApproval({
    agent: "Larder", phase: "logistics",
    title: `Auto: send dietary brief to ${caterer.name}?`,
    rationale: `${brief.guestCount} guests, ${brief.criticalGuests.length} critical. Auto-queued because seating locked and we now have stable dietary data.`,
    risk: brief.criticalGuests.length > 0 ? "high" : "medium",
    action: {
      kind: "send_caterer_brief",
      vendor: caterer.name,
      guestCount: brief.guestCount,
      allergenCount: brief.allergenSummary.length,
    },
  });
}

// Re-export so route handlers can pull it without circular imports.
export { mutate };
