// Google OAuth credential storage.
//
// Two-layer lookup so the user can paste credentials into the in-app
// wizard at runtime without needing to restart the Next dev server:
//
//   1. process.env  (preferred. set via .env.local for production deploys)
//   2. data/gmail-credentials.json  (written by the in-app setup wizard)
//
// Either source satisfies `hasGoogleOAuth()`. The wizard route stores into
// (2) and the OAuth client picks it up on next request, no restart needed.

import { promises as fs } from "node:fs";
import path from "node:path";

const SERVERLESS =
  !!process.env.VERCEL ||
  !!process.env.NETLIFY ||
  !!process.env.AWS_LAMBDA_FUNCTION_NAME;
const STORE_PATH = SERVERLESS
  ? "/tmp/aisle-gmail-credentials.json"
  : path.resolve(process.cwd(), "data", "gmail-credentials.json");

const DEFAULT_REDIRECT_URI = "http://localhost:3000/api/gmail/callback";

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

interface StoredCredentials {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  savedAt?: string;
}

let cache: StoredCredentials | null = null;
let cacheLoadedAt = 0;
const CACHE_TTL_MS = 5_000;

async function readStore(): Promise<StoredCredentials> {
  // Brief cache so a request that touches OAuth multiple times doesn't
  // re-read the file every call.
  const now = Date.now();
  if (cache && now - cacheLoadedAt < CACHE_TTL_MS) return cache;
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    cache = JSON.parse(raw) as StoredCredentials;
  } catch {
    cache = {};
  }
  cacheLoadedAt = now;
  return cache;
}

export async function getGoogleOAuthConfig(): Promise<GoogleOAuthConfig | null> {
  // process.env wins so production / CI envs remain authoritative.
  const envId = process.env.GOOGLE_CLIENT_ID;
  const envSecret = process.env.GOOGLE_CLIENT_SECRET;
  const envRedirect = process.env.GOOGLE_REDIRECT_URI ?? DEFAULT_REDIRECT_URI;
  if (envId && envSecret) {
    return { clientId: envId, clientSecret: envSecret, redirectUri: envRedirect };
  }
  const stored = await readStore();
  if (stored.clientId && stored.clientSecret) {
    return {
      clientId: stored.clientId,
      clientSecret: stored.clientSecret,
      redirectUri: stored.redirectUri || DEFAULT_REDIRECT_URI,
    };
  }
  return null;
}

export async function hasGoogleOAuthAsync(): Promise<boolean> {
  return (await getGoogleOAuthConfig()) !== null;
}

export async function saveGoogleOAuthConfig(input: {
  clientId: string;
  clientSecret: string;
  redirectUri?: string;
}): Promise<void> {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
  const payload: StoredCredentials = {
    clientId: input.clientId.trim(),
    clientSecret: input.clientSecret.trim(),
    redirectUri: (input.redirectUri || DEFAULT_REDIRECT_URI).trim(),
    savedAt: new Date().toISOString(),
  };
  await fs.writeFile(STORE_PATH, JSON.stringify(payload, null, 2));
  cache = payload;
  cacheLoadedAt = Date.now();
}

export async function clearGoogleOAuthConfig(): Promise<void> {
  cache = null;
  cacheLoadedAt = 0;
  try {
    await fs.unlink(STORE_PATH);
  } catch {
    // file may not exist; that's fine
  }
}

// The redirect URI the caller needs to paste into Google Cloud Console.
// Always derived from the current request when possible, otherwise from
// env or the localhost default.
export function defaultRedirectUri(): string {
  return process.env.GOOGLE_REDIRECT_URI ?? DEFAULT_REDIRECT_URI;
}
