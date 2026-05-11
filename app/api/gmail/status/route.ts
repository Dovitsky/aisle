// GET — connection + scan status. Drives the Settings + Inbox UI.

import { NextResponse } from "next/server";
import { getConnection, listInboxMessages } from "@/lib/gmail/store";
import { hasGoogleOAuthAsync } from "@/lib/gmail/client";
import { hasSupabase } from "@/lib/db/supabase";
import { hasApiKey as hasAnthropicKey } from "@/lib/anthropic";
import { hasOpenAIKey } from "@/lib/imagegen";

export const dynamic = "force-dynamic";

export async function GET() {
  const [conn, messages, oauthReady] = await Promise.all([
    getConnection(),
    listInboxMessages(50),
    hasGoogleOAuthAsync(),
  ]);
  return NextResponse.json({
    googleOauthConfigured: oauthReady,
    supabaseConfigured: hasSupabase(),
    anthropicConfigured: hasAnthropicKey(),
    openaiConfigured: hasOpenAIKey(),
    connected: !!conn,
    emailAddress: conn?.emailAddress ?? null,
    lastScanAt: conn?.lastScanAt ?? null,
    scanFilter: conn?.scanFilter ?? null,
    messages,
  });
}
