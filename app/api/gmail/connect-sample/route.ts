// Sample-connect: pretends Gmail is connected so the inbox flow (scan,
// matchers, follow-up drafts) is fully exercisable without setting up
// Google Cloud OAuth. Used when GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
// aren't set.
//
// This isn't fake data with a wink. it's an explicit demonstration mode
// the couple can toggle on. The connection record is tagged with a
// recognizable email address so they know what they're looking at.

import { NextResponse } from "next/server";
import { saveConnection } from "@/lib/gmail/store";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const now = new Date();
    const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await saveConnection({
      emailAddress: "you@corsia.example",
      accessToken: "sample-access-token",
      refreshToken: "sample-refresh-token",
      expiresAt: expires.toISOString(),
      scopes: [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/gmail.modify",
      ],
      scanFilter: "in:inbox newer_than:30d -from:me",
    });
    return NextResponse.json({ ok: true, mode: "sample" });
  } catch (e) {
    return NextResponse.json({
      error: e instanceof Error ? e.message : "Couldn't set up the sample inbox.",
    }, { status: 500 });
  }
}
