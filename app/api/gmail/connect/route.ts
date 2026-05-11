// Step 1 of OAuth: redirect the user to Google's consent screen.

import { NextResponse } from "next/server";
import { consentUrl, hasGoogleOAuthAsync } from "@/lib/gmail/client";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await hasGoogleOAuthAsync())) {
    return NextResponse.json({
      error: "Gmail isn't set up yet. Open Settings → Integrations and paste your Google OAuth client ID and secret.",
    }, { status: 412 });
  }
  // CSRF state — simple random; in real builds tie to session.
  const state = Math.random().toString(36).slice(2, 14);
  const url = await consentUrl(state);
  return NextResponse.redirect(url);
}
