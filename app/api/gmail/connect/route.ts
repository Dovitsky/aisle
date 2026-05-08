// Step 1 of OAuth: redirect the user to Google's consent screen.

import { NextResponse } from "next/server";
import { consentUrl, hasGoogleOAuth } from "@/lib/gmail/client";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!hasGoogleOAuth()) {
    return NextResponse.json({
      error: "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set. Add them to .env.local + restart dev.",
    }, { status: 412 });
  }
  // CSRF state — simple random; in real builds tie to session.
  const state = Math.random().toString(36).slice(2, 14);
  const url = consentUrl(state);
  return NextResponse.redirect(url);
}
