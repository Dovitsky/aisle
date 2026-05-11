// Gmail OAuth + API client.
//
// Two layers:
//   1. OAuth flow — generate consent URL, exchange code for tokens, refresh tokens.
//   2. Gmail API — list / get messages, send, modify labels.
//
// When GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET aren't set, the integration runs
// in offline mode using a fixture inbox so the demo flow still works.

import { google, gmail_v1 } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import { getGoogleOAuthConfig, hasGoogleOAuthAsync } from "./credentials";

export const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/userinfo.email",
];

// Sync check that only looks at process.env. Use hasGoogleOAuthAsync to also
// consult the runtime credentials file (preferred path for new callers).
export function hasGoogleOAuth(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export { hasGoogleOAuthAsync };

export async function oauthClient(): Promise<OAuth2Client> {
  const cfg = await getGoogleOAuthConfig();
  if (!cfg) {
    throw new Error(
      "Google OAuth not configured. Paste your client ID + secret in Settings → Integrations, or set GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET in .env.local.",
    );
  }
  return new google.auth.OAuth2(cfg.clientId, cfg.clientSecret, cfg.redirectUri);
}

export async function consentUrl(state: string): Promise<string> {
  const client = await oauthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GMAIL_SCOPES,
    state,
  });
}

export async function exchangeCode(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scopes: string[];
  email: string;
}> {
  const client = await oauthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error("Did not receive both access and refresh tokens. Re-run consent with prompt=consent.");
  }
  client.setCredentials(tokens);

  // Read the email of the connected account.
  const oauth2 = google.oauth2({ version: "v2", auth: client });
  const me = await oauth2.userinfo.get();

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: new Date((tokens.expiry_date ?? Date.now() + 3600_000)),
    scopes: (tokens.scope ?? "").split(" "),
    email: me.data.email ?? "",
  };
}

export interface GmailTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export async function authedGmail(tokens: GmailTokens): Promise<gmail_v1.Gmail> {
  const client = await oauthClient();
  client.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    expiry_date: tokens.expiresAt.getTime(),
  });
  return google.gmail({ version: "v1", auth: client });
}

// Pull a list of message metadata matching a Gmail search query.
// query examples:
//   "in:inbox newer_than:30d -from:me"
//   "in:inbox category:primary newer_than:7d"
export async function listMessages(
  tokens: GmailTokens,
  query: string,
  max = 50,
): Promise<gmail_v1.Schema$Message[]> {
  const gmail = await authedGmail(tokens);
  const res = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults: Math.min(max, 100),
  });
  return res.data.messages ?? [];
}

export interface ParsedMessage {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  snippet: string;
  body: string;
  receivedAt: Date;
  labels: string[];
}

export async function getMessage(tokens: GmailTokens, id: string): Promise<ParsedMessage | null> {
  const gmail = await authedGmail(tokens);
  const res = await gmail.users.messages.get({ userId: "me", id, format: "full" });
  const m = res.data;
  if (!m) return null;
  const headers = m.payload?.headers ?? [];
  const h = (name: string) => headers.find((x) => (x.name ?? "").toLowerCase() === name.toLowerCase())?.value ?? "";

  return {
    id: m.id ?? id,
    threadId: m.threadId ?? "",
    from: h("From"),
    to: h("To"),
    subject: h("Subject"),
    snippet: m.snippet ?? "",
    body: extractBody(m.payload ?? null),
    receivedAt: new Date(Number(m.internalDate ?? Date.now())),
    labels: m.labelIds ?? [],
  };
}

function extractBody(payload: gmail_v1.Schema$MessagePart | null): string {
  if (!payload) return "";
  // Prefer text/plain, fall back to text/html stripped.
  const plain = walkParts(payload, "text/plain");
  if (plain) return plain;
  const html = walkParts(payload, "text/html");
  if (html) return stripHtml(html);
  return "";
}

function walkParts(part: gmail_v1.Schema$MessagePart, mime: string): string | null {
  if (part.mimeType === mime && part.body?.data) {
    return Buffer.from(part.body.data, "base64").toString("utf8");
  }
  for (const p of part.parts ?? []) {
    const found = walkParts(p, mime);
    if (found) return found;
  }
  return null;
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Send an email from the connected account on behalf of the couple.
export async function sendEmail(
  tokens: GmailTokens,
  args: { to: string; subject: string; body: string; threadId?: string; inReplyTo?: string },
): Promise<{ id: string; threadId: string }> {
  const gmail = await authedGmail(tokens);
  const messageLines = [
    `To: ${args.to}`,
    `Subject: ${args.subject}`,
    "Content-Type: text/plain; charset=utf-8",
  ];
  if (args.inReplyTo) {
    messageLines.push(`In-Reply-To: ${args.inReplyTo}`);
    messageLines.push(`References: ${args.inReplyTo}`);
  }
  messageLines.push("");
  messageLines.push(args.body);
  const raw = Buffer.from(messageLines.join("\r\n")).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const res = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw, threadId: args.threadId },
  });
  return { id: res.data.id ?? "", threadId: res.data.threadId ?? "" };
}

// Parse a "From" header into name + email.
export function parseFromHeader(value: string): { name: string; email: string } {
  const m = value.match(/^(?:"?([^"<]+?)"?\s*)?<?([^\s<>]+@[^\s<>]+)>?/);
  if (!m) return { name: value.trim(), email: value.trim() };
  return { name: (m[1] ?? "").trim(), email: (m[2] ?? "").trim() };
}
