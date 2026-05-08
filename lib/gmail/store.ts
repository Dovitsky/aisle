// Gmail connection storage. Two modes:
//  1. Supabase (when configured) — gmail_connections + inbox_messages tables.
//  2. JSON store (offline mode) — appended to data/gmail.json.
//
// Both expose the same API.

import fs from "node:fs/promises";
import path from "node:path";
import { hasSupabase, adminClient } from "../db/supabase";

export interface GmailConnection {
  emailAddress: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  scopes: string[];
  historyId?: string;
  aliasAddress?: string;
  lastScanAt?: string;
  scanFilter: string;
}

export interface InboxMessageRecord {
  id: string;
  gmailMessageId: string;
  gmailThreadId: string;
  fromAddr: string;
  toAddr: string;
  subject: string;
  snippet: string;
  receivedAt: string;
  rawBody: string;
  parsedIntent?: string;
  quotedUsd?: number;
  triageNotes?: string;
  matchedVendorId?: string;
  outcome?: "matched_to_vendor" | "unmatched" | "spam" | "noise";
  approvalId?: string;
  scannedAt: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const GMAIL_FILE = path.join(DATA_DIR, "gmail.json");

interface GmailJsonFile {
  connection: GmailConnection | null;
  messages: InboxMessageRecord[];
}

const EMPTY: GmailJsonFile = { connection: null, messages: [] };

async function readJson(): Promise<GmailJsonFile> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await fs.readFile(GMAIL_FILE, "utf8");
    return JSON.parse(raw) as GmailJsonFile;
  } catch {
    return structuredClone(EMPTY);
  }
}

async function writeJson(data: GmailJsonFile) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(GMAIL_FILE, JSON.stringify(data, null, 2), "utf8");
}

// In Supabase mode we also need a project_id + user_id pair. In JSON mode,
// the demo has a single project so we ignore those fields.
const DEMO_PROJECT = "demo";
const DEMO_USER = "00000000-0000-0000-0000-000000000000";

export async function saveConnection(c: GmailConnection): Promise<void> {
  if (hasSupabase()) {
    await adminClient().from("gmail_connections").upsert({
      user_id: DEMO_USER,
      project_id: DEMO_PROJECT,
      email_address: c.emailAddress,
      access_token: c.accessToken,
      refresh_token: c.refreshToken,
      expires_at: c.expiresAt,
      scopes: c.scopes,
      history_id: c.historyId,
      alias_address: c.aliasAddress,
      last_scan_at: c.lastScanAt,
      scan_filter: c.scanFilter,
    });
    return;
  }
  const data = await readJson();
  data.connection = c;
  await writeJson(data);
}

export async function getConnection(): Promise<GmailConnection | null> {
  if (hasSupabase()) {
    const { data } = await adminClient()
      .from("gmail_connections")
      .select("*")
      .eq("user_id", DEMO_USER)
      .eq("project_id", DEMO_PROJECT)
      .maybeSingle();
    if (!data) return null;
    return {
      emailAddress: data.email_address,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_at,
      scopes: data.scopes,
      historyId: data.history_id,
      aliasAddress: data.alias_address,
      lastScanAt: data.last_scan_at,
      scanFilter: data.scan_filter,
    };
  }
  const data = await readJson();
  return data.connection;
}

export async function clearConnection(): Promise<void> {
  if (hasSupabase()) {
    await adminClient().from("gmail_connections")
      .delete().eq("user_id", DEMO_USER).eq("project_id", DEMO_PROJECT);
    return;
  }
  const data = await readJson();
  data.connection = null;
  await writeJson(data);
}

export async function appendInboxMessage(msg: Omit<InboxMessageRecord, "id" | "scannedAt"> & { id?: string }): Promise<InboxMessageRecord> {
  const id = msg.id ?? Math.random().toString(36).slice(2, 14);
  const record: InboxMessageRecord = { ...msg, id, scannedAt: new Date().toISOString() };
  if (hasSupabase()) {
    await adminClient().from("inbox_messages").upsert({
      id,
      project_id: DEMO_PROJECT,
      user_id: DEMO_USER,
      gmail_message_id: msg.gmailMessageId,
      gmail_thread_id: msg.gmailThreadId,
      from_addr: msg.fromAddr,
      to_addr: msg.toAddr,
      subject: msg.subject,
      snippet: msg.snippet,
      received_at: msg.receivedAt,
      raw_body: msg.rawBody,
      parsed_intent: msg.parsedIntent,
      quoted_usd: msg.quotedUsd,
      triage_notes: msg.triageNotes,
      matched_vendor_id: msg.matchedVendorId,
      outcome: msg.outcome,
      approval_id: msg.approvalId,
      scanned_at: record.scannedAt,
    }, { onConflict: "gmail_message_id" });
    return record;
  }
  const data = await readJson();
  // Skip duplicates by Gmail message ID.
  if (data.messages.some((m) => m.gmailMessageId === msg.gmailMessageId)) {
    return data.messages.find((m) => m.gmailMessageId === msg.gmailMessageId)!;
  }
  data.messages.push(record);
  await writeJson(data);
  return record;
}

export async function listInboxMessages(limit = 100): Promise<InboxMessageRecord[]> {
  if (hasSupabase()) {
    const { data } = await adminClient()
      .from("inbox_messages")
      .select("*")
      .eq("project_id", DEMO_PROJECT)
      .order("scanned_at", { ascending: false })
      .limit(limit);
    return (data ?? []).map((d): InboxMessageRecord => ({
      id: d.id,
      gmailMessageId: d.gmail_message_id,
      gmailThreadId: d.gmail_thread_id,
      fromAddr: d.from_addr,
      toAddr: d.to_addr,
      subject: d.subject,
      snippet: d.snippet,
      receivedAt: d.received_at,
      rawBody: d.raw_body,
      parsedIntent: d.parsed_intent,
      quotedUsd: d.quoted_usd,
      triageNotes: d.triage_notes,
      matchedVendorId: d.matched_vendor_id,
      outcome: d.outcome,
      approvalId: d.approval_id,
      scannedAt: d.scanned_at,
    }));
  }
  const data = await readJson();
  return data.messages.slice().sort((a, b) => b.scannedAt.localeCompare(a.scannedAt)).slice(0, limit);
}

export async function knownGmailMessageIds(): Promise<Set<string>> {
  const all = await listInboxMessages(500);
  return new Set(all.map((m) => m.gmailMessageId));
}
