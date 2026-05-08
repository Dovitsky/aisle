// Step 2 of OAuth: Google redirects back here with ?code=...
// We exchange it for tokens and persist the connection.

import { NextRequest, NextResponse } from "next/server";
import { exchangeCode, hasGoogleOAuth } from "@/lib/gmail/client";
import { saveConnection } from "@/lib/gmail/store";
import { logAgentEvent } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!hasGoogleOAuth()) {
    return NextResponse.redirect(new URL("/settings?gmail=missing_oauth", req.url));
  }
  const code = req.nextUrl.searchParams.get("code");
  const errorParam = req.nextUrl.searchParams.get("error");
  if (errorParam) {
    return NextResponse.redirect(new URL(`/settings?gmail=error&detail=${encodeURIComponent(errorParam)}`, req.url));
  }
  if (!code) {
    return NextResponse.redirect(new URL("/settings?gmail=no_code", req.url));
  }
  try {
    const { accessToken, refreshToken, expiresAt, scopes, email } = await exchangeCode(code);
    await saveConnection({
      emailAddress: email,
      accessToken,
      refreshToken,
      expiresAt: expiresAt.toISOString(),
      scopes,
      scanFilter: "in:inbox newer_than:30d -from:me",
    });
    await logAgentEvent("Triage", "gmail.connected", `Gmail connected: ${email}`);
    return NextResponse.redirect(new URL("/inbox?connected=1", req.url));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown";
    return NextResponse.redirect(new URL(`/settings?gmail=fail&detail=${encodeURIComponent(msg)}`, req.url));
  }
}
