// GET — connection + scan status. Drives the Settings + Inbox UI.

import { NextResponse } from "next/server";
import { getConnection, listInboxMessages } from "@/lib/gmail/store";
import { hasGoogleOAuth } from "@/lib/gmail/client";
import { hasSupabase } from "@/lib/db/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const conn = await getConnection();
  const messages = await listInboxMessages(50);
  return NextResponse.json({
    googleOauthConfigured: hasGoogleOAuth(),
    supabaseConfigured: hasSupabase(),
    connected: !!conn,
    emailAddress: conn?.emailAddress ?? null,
    lastScanAt: conn?.lastScanAt ?? null,
    scanFilter: conn?.scanFilter ?? null,
    messages,
  });
}
