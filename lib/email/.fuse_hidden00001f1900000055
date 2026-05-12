// Outbound email transport. Three paths, in priority order:
//   1. User's connected Gmail (preferred — the email comes from the couple's address)
//   2. Resend (if RESEND_API_KEY set) — system-side send via aisle.email alias
//   3. Log-only fallback — record the would-have-sent in the ledger
//
// The cascade engine calls sendEmail() when an approved Approval Card has
// `action.kind === "send_email"`. The result feeds the vendor thread.

import { sendEmail as sendGmail } from "../gmail/client";
import { getConnection } from "../gmail/store";

export interface SentEmail {
  via: "gmail" | "resend" | "logged";
  externalId?: string;
  threadId?: string;
}

export async function sendEmail(args: {
  to: string;
  subject: string;
  body: string;
  inReplyTo?: string;
  threadId?: string;
}): Promise<SentEmail> {
  // Strip "(via AISLE alias)" suffix and any leading display name.
  const recipientEmail = extractEmail(args.to);

  // 1. Try Gmail
  try {
    const conn = await getConnection();
    if (conn?.accessToken) {
      const sent = await sendGmail(
        { accessToken: conn.accessToken, refreshToken: conn.refreshToken, expiresAt: new Date(conn.expiresAt) },
        {
          to: recipientEmail || args.to,
          subject: args.subject,
          body: args.body,
          inReplyTo: args.inReplyTo,
          threadId: args.threadId,
        },
      );
      return { via: "gmail", externalId: sent.id, threadId: sent.threadId };
    }
  } catch (e) {
    console.error("Gmail send failed:", e);
  }

  // 2. Try Resend
  if (process.env.RESEND_API_KEY) {
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM ?? "AISLE <hello@aisle.email>",
          to: [recipientEmail || args.to],
          subject: args.subject,
          text: args.body,
        }),
      });
      const j = (await r.json()) as { id?: string; message?: string };
      if (r.ok && j.id) return { via: "resend", externalId: j.id };
      console.error("Resend send failed:", j.message ?? "unknown");
    } catch (e) {
      console.error("Resend send failed:", e);
    }
  }

  // 3. Log fallback
  return { via: "logged" };
}

// Pull a bare email address out of a header value like:
//   "The Hudson Barn <bookings@thehudsonbarn.com>"
//   "The Hudson Barn (via AISLE alias)"
//   "bookings@thehudsonbarn.com"
function extractEmail(s: string): string {
  const m = s.match(/[^\s<>"']+@[^\s<>"']+/);
  return m ? m[0] : "";
}
