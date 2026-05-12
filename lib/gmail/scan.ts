// Inbox scan orchestration.
//
// Pulls unread vendor-relevant messages, runs Triage on each, matches to
// existing vendors by sender email or display name, appends to vendor.thread,
// updates vendor.status from intent, optionally drafts a follow-up via Negotiator.
//
// Works in two modes:
//   - real Gmail (when GOOGLE_CLIENT_ID + connected user)
//   - simulated (offline) — uses a fixture inbox so the demo flow is testable

import { getConnection, appendInboxMessage, knownGmailMessageIds, saveConnection } from "./store";
import { getMessage, listMessages, parseFromHeader, hasGoogleOAuth, type ParsedMessage } from "./client";
import { triageVendorReply } from "../agents/triage";
import { negotiatorDraft } from "../agents/negotiator";
import { appendApproval, appendVendorMessage, mutate, readState, updateVendor } from "../store";
import type { Vendor } from "../types";

export interface ScanResult {
  scanned: number;
  matched: number;
  unmatched: number;
  approvalsQueued: number;
  errors: string[];
}

export async function scanInbox(opts: { max?: number } = {}): Promise<ScanResult> {
  const max = opts.max ?? 25;
  const result: ScanResult = { scanned: 0, matched: 0, unmatched: 0, approvalsQueued: 0, errors: [] };

  const conn = await getConnection();
  const seen = await knownGmailMessageIds();

  // Pull messages — real Gmail or simulated.
  let messages: ParsedMessage[] = [];
  if (conn && hasGoogleOAuth()) {
    try {
      const list = await listMessages(
        { accessToken: conn.accessToken, refreshToken: conn.refreshToken, expiresAt: new Date(conn.expiresAt) },
        conn.scanFilter,
        max,
      );
      const news = list.filter((m) => m.id && !seen.has(m.id));
      const fetched = await Promise.all(
        news.slice(0, max).map((m) =>
          getMessage(
            { accessToken: conn.accessToken, refreshToken: conn.refreshToken, expiresAt: new Date(conn.expiresAt) },
            m.id!,
          ),
        ),
      );
      messages = fetched.filter((x): x is ParsedMessage => !!x);
    } catch (e) {
      result.errors.push(`Gmail fetch failed: ${e instanceof Error ? e.message : String(e)}`);
      return result;
    }
  } else {
    // Offline simulation — inject a 5-message fixture batch on each run.
    // The fixture is keyed off the existing vendor list so messages match
    // real entries the cascade just planted, exercising the matcher fully.
    const state = await readState();
    const vendors = state.vendors;
    const top = (cat: string) => vendors.find((v) => v.category === cat);
    const venue = top("Venue");
    const photog = top("Photographer");
    const florist = top("Florist");
    const caterer = top("Caterer");
    const fixture: ParsedMessage[] = [];

    if (venue) {
      const id = `fix-venue-${venue.id}-${Date.now()}`;
      if (!seen.has(id)) {
        fixture.push({
          id,
          threadId: id,
          from: `${venue.name} <events@${slugDomain(venue.name)}.com>`,
          subject: `Re: Inquiry for Venue — ${state.brief?.dateWindow ?? "your dates"}`,
          snippet: `Thanks for reaching out — we have availability that weekend...`,
          body: `Hi,\n\nThanks for reaching out about ${state.brief?.organizerName ?? "the couple"} & ${state.brief?.partnerName ?? ""}'s wedding. We do have availability the weekend you're looking at.\n\nFor ${state.brief?.guestCount ?? 120} guests, our typical site fee is $14,500 and we can accommodate up to 180 seated. We require a $4,000 deposit to hold the date and the balance is due 30 days prior.\n\nWould you like to schedule a venue tour? We have openings the next two weekends.\n\nBest,\n${venue.name}`,
          to: "you@corsia.test", receivedAt: new Date(), labels: ["INBOX"],
        });
      }
    }
    if (photog) {
      const id = `fix-photog-${photog.id}-${Date.now()}`;
      if (!seen.has(id)) {
        fixture.push({
          id,
          threadId: id,
          from: `${photog.name} <hello@${slugDomain(photog.name)}.com>`,
          subject: `Re: Inquiry for Photographer`,
          snippet: `Out of office until next week — back Monday.`,
          body: `I'm out of office through this Sunday and will reply when I'm back at my desk Monday morning. For urgent inquiries about wedding photography availability, please contact my studio manager at studio@${slugDomain(photog.name)}.com.\n\nThank you,\n${photog.name}`,
          to: "you@corsia.test", receivedAt: new Date(), labels: ["INBOX"],
        });
      }
    }
    if (florist) {
      const id = `fix-florist-${florist.id}-${Date.now()}`;
      if (!seen.has(id)) {
        fixture.push({
          id,
          threadId: id,
          from: `${florist.name} <orders@${slugDomain(florist.name)}.com>`,
          subject: `Re: Inquiry for Florist`,
          snippet: `Thanks — a few questions before we can quote...`,
          body: `Hello,\n\nThanks for the inquiry. Before I can put a real number together I need a few more details:\n\n1. Are you using a venue with floral restrictions (no candles, height limits)?\n2. Are bouquets going to be carried by the wedding party, or just the couple?\n3. Are you open to seasonal substitutions if a particular variety is unavailable?\n\nOur weddings in your size range typically run $6,500-$12,000 depending on scope. Looking forward to hearing more.\n\n${florist.name}`,
          to: "you@corsia.test", receivedAt: new Date(), labels: ["INBOX"],
        });
      }
    }
    if (caterer) {
      const id = `fix-caterer-${caterer.id}-${Date.now()}`;
      if (!seen.has(id)) {
        fixture.push({
          id,
          threadId: id,
          from: `${caterer.name} <events@${slugDomain(caterer.name)}.com>`,
          subject: `Re: Inquiry for Catering`,
          snippet: `Available — sending menu options.`,
          body: `Hi,\n\nWe're available your weekend and would love to be considered. For ${state.brief?.guestCount ?? 120} guests, our family-style menu is $145/pp inclusive of service, and our plated menu is $185/pp. Both include passed apps, three-course main, late-night station, and bar staff.\n\nWe specialize in dietary accommodations — we can flag every plate to allergens at the line. Happy to share a sample menu when you're ready.\n\nWarmly,\n${caterer.name}`,
          to: "you@corsia.test", receivedAt: new Date(), labels: ["INBOX"],
        });
      }
    }
    // One marketing-noise message so triage's filter is exercised.
    const noiseId = `fix-noise-${Date.now()}`;
    if (!seen.has(noiseId)) {
      fixture.push({
        id: noiseId,
        threadId: noiseId,
        from: `Wedding Wire Newsletter <newsletter@weddingwire.com>`,
        subject: `15 trends for 2026 weddings — must-read`,
        snippet: `Sponsored content from our partners...`,
        body: `Hi there!\n\nThis week's top picks from our advertisers...\n\n[unsubscribe]`,
        to: "you@corsia.test", receivedAt: new Date(), labels: ["INBOX"],
      });
    }

    messages = fixture;
  }

  result.scanned = messages.length;
  const state = await readState();

  for (const m of messages) {
    try {
      const { name, email } = parseFromHeader(m.from);
      const matched = matchVendor(state.vendors, email, name);
      const triage = await triageVendorReply(m.body || m.snippet);

      let outcome: "matched_to_vendor" | "unmatched" | "spam" | "noise" = "unmatched";
      let approvalId: string | undefined;

      if (matched) {
        outcome = "matched_to_vendor";
        result.matched += 1;

        // Append to vendor thread
        await appendVendorMessage(matched.id, {
          direction: "inbound",
          body: m.body || m.snippet,
          parsedIntent: triage.intent,
          quotedUsd: triage.quotedUsd,
        });

        // Auto-update status from intent
        const patch: Partial<Vendor> = { lastTouchAt: new Date().toISOString() };
        if (triage.intent === "available") {
          patch.status = "quoting";
          if (triage.quotedUsd) patch.estimateUsd = triage.quotedUsd;
        } else if (triage.intent === "unavailable") {
          patch.status = "passed";
        } else if (triage.intent === "needs_info") {
          patch.status = "negotiating";
        }
        await updateVendor(matched.id, patch);

        // Bind email address to vendor for future matches
        if (email && !(matched as Vendor & { emailAddresses?: string[] }).emailAddresses?.includes(email)) {
          await mutate((s) => {
            const v = s.vendors.find((x) => x.id === matched.id);
            if (v && !((v as Vendor & { emailAddresses?: string[] }).emailAddresses?.includes(email))) {
              const ext = v as Vendor & { emailAddresses?: string[] };
              ext.emailAddresses = [...(ext.emailAddresses ?? []), email];
            }
            return s;
          });
        }

        // Auto-draft follow-up for actionable intents
        if (triage.intent === "available" && state.brief) {
          const goal = triage.quotedUsd && triage.quotedUsd > (matched.estimateUsd ?? 0) * 1.2
            ? "Acknowledge their availability, ask a clarifying question about a few line items, and signal we're price-sensitive without pushing back hard yet."
            : "Acknowledge their availability and ask one specific clarifying question about scope before moving toward a contract.";
          const body = await negotiatorDraft({ brief: state.brief, vendor: matched, goal });
          const card = await appendApproval({
            agent: "Negotiator", phase: "discovery",
            title: `Send follow-up to ${matched.name}?`,
            rationale: `Inbox scan parsed an "available" reply${triage.quotedUsd ? ` quoting $${triage.quotedUsd.toLocaleString()}` : ""}. Negotiator drafted a response. Approve to send via your connected Gmail.`,
            risk: "low",
            action: {
              kind: "send_email",
              to: `${matched.name} <${email}>`,
              subject: m.subject ? (m.subject.startsWith("Re:") ? m.subject : `Re: ${m.subject}`) : `Re: Inquiry`,
              body,
            },
          });
          // Find the just-created approval id by reading state — we use the newest one for this vendor.
          const after = await readState();
          approvalId = after.approvals.slice(-1)[0]?.id;
          void card;
          result.approvalsQueued += 1;
        } else if (triage.intent === "needs_info" && state.brief) {
          // Surface a Maestro draft for the couple to fill in the missing info.
          const body = await negotiatorDraft({
            brief: state.brief, vendor: matched,
            goal: "They asked for more info. Reply with the missing details politely; if anything is genuinely unclear, ask the couple before answering.",
          });
          await appendApproval({
            agent: "Negotiator", phase: "discovery",
            title: `Reply to ${matched.name}'s information request?`,
            rationale: `Inbox scan parsed a "needs_info" reply. Negotiator drafted a response.`,
            risk: "low",
            action: {
              kind: "send_email",
              to: `${matched.name} <${email}>`,
              subject: m.subject ? (m.subject.startsWith("Re:") ? m.subject : `Re: ${m.subject}`) : `Re: Inquiry`,
              body,
            },
          });
          const after = await readState();
          approvalId = after.approvals.slice(-1)[0]?.id;
          result.approvalsQueued += 1;
        }
      } else {
        // Heuristic spam filter
        const lower = (m.subject + " " + m.snippet).toLowerCase();
        if (/unsubscribe|newsletter|no-reply|noreply/.test(lower)) outcome = "noise";
        else result.unmatched += 1;
      }

      await appendInboxMessage({
        gmailMessageId: m.id,
        gmailThreadId: m.threadId,
        fromAddr: m.from,
        toAddr: m.to,
        subject: m.subject,
        snippet: m.snippet,
        receivedAt: m.receivedAt.toISOString(),
        rawBody: m.body,
        parsedIntent: triage.intent,
        quotedUsd: triage.quotedUsd,
        triageNotes: triage.notes,
        matchedVendorId: matched?.id,
        outcome,
        approvalId,
      });
    } catch (e) {
      result.errors.push(`Message ${m.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Update last_scan_at on the connection so we know when we last pulled.
  if (conn) {
    await saveConnection({ ...conn, lastScanAt: new Date().toISOString() });
  }

  return result;
}

function matchVendor(vendors: Vendor[], email: string, name: string): Vendor | null {
  const e = email.toLowerCase();
  const n = name.toLowerCase().replace(/\s+/g, " ").trim();
  // 1. Exact email-address match (set after first interaction)
  for (const v of vendors) {
    const emails = (v as Vendor & { emailAddresses?: string[] }).emailAddresses;
    if (emails?.some((x) => x.toLowerCase() === e)) return v;
  }
  // 2. Domain match — vendor name appears in email host
  const host = e.split("@")[1] ?? "";
  if (host) {
    for (const v of vendors) {
      const slug = v.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (slug && host.replace(/[^a-z0-9]/g, "").includes(slug.slice(0, 8))) return v;
    }
  }
  // 3. Display-name fuzzy match
  for (const v of vendors) {
    const vn = v.name.toLowerCase();
    if (n && (n.includes(vn) || vn.includes(n))) return v;
    // Token overlap
    const vTokens = new Set(vn.split(/\s+/).filter((t) => t.length > 3));
    const fromTokens = new Set(n.split(/\s+/).filter((t) => t.length > 3));
    const overlap = [...vTokens].filter((t) => fromTokens.has(t)).length;
    if (overlap >= 2) return v;
  }
  return null;
}

// Simulated inbox for offline mode. Returns a small batch of plausible vendor
// replies so the scan flow is fully exercisable without Google credentials.

// Slugify a vendor name into a domain-safe label for fixture email addresses.
function slugDomain(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20) || "vendor";
}