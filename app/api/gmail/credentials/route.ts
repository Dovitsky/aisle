// Save / inspect the user's Google OAuth credentials at runtime.
//
// GET  → { configured, source: "env" | "wizard" | null, redirectUri }
// POST → accepts { clientId, clientSecret } and persists them to
//        data/gmail-credentials.json so the OAuth flow can use them
//        on the very next request. Used by the in-app setup wizard.

import { NextResponse } from "next/server";
import { z } from "zod";
import {
  defaultRedirectUri,
  getGoogleOAuthConfig,
  saveGoogleOAuthConfig,
  clearGoogleOAuthConfig,
} from "@/lib/gmail/credentials";

export const dynamic = "force-dynamic";

export async function GET() {
  const cfg = await getGoogleOAuthConfig();
  const envConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  return NextResponse.json({
    configured: Boolean(cfg),
    source: envConfigured ? "env" : cfg ? "wizard" : null,
    redirectUri: cfg?.redirectUri ?? defaultRedirectUri(),
  });
}

const saveSchema = z.object({
  clientId: z.string().trim().min(10, "Client ID looks too short"),
  clientSecret: z.string().trim().min(10, "Client secret looks too short"),
  redirectUri: z.string().trim().url().optional(),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  // Light sanity check: Google client IDs end in .apps.googleusercontent.com
  if (!parsed.data.clientId.endsWith(".apps.googleusercontent.com")) {
    return NextResponse.json(
      {
        error:
          "That client ID doesn't look right. Google client IDs end in '.apps.googleusercontent.com'.",
      },
      { status: 400 },
    );
  }
  await saveGoogleOAuthConfig(parsed.data);
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await clearGoogleOAuthConfig();
  return NextResponse.json({ ok: true });
}
