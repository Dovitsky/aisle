// Anthropic SDK helpers — per build brief §7.1.
// Reads keys from process.env. Never inline.

import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

export function client(): Anthropic {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Copy .env.example to .env.local and fill it in.",
    );
  }
  _client = new Anthropic({ apiKey });
  return _client;
}

// Three-tier model strategy (cost-optimized).
//
//   orchestrator — Opus. Maestro chat (multi-turn tool use, brief extraction
//                  reasoning, decision routing). The single agent that needs
//                  full Opus depth.
//   specialist   — Sonnet. Most domain agents — drafting emails, ceremony
//                  scripts, music setlists, cake specs, contract redlines,
//                  mood directions, etc. Sonnet is plenty for structured
//                  generation and saves real money at scale.
//   triage       — Haiku. High-volume / low-latency parsing — email intent
//                  classification, RSVP parse, dietary parse.
//
// Anything web-search-driven (Scout, Locator, Itinerist, Curator,
// Quartermaster, Cantor) stays on Opus by default — the larger model
// reads search results substantially better, which more than pays back
// its premium when the alternative is hallucinated vendor names.
export const MODELS = {
  orchestrator: process.env.ANTHROPIC_MODEL_ORCHESTRATOR ?? "claude-opus-4-7",
  specialist:   process.env.ANTHROPIC_MODEL_SPECIALIST   ?? "claude-sonnet-4-6",
  triage:       process.env.ANTHROPIC_MODEL_TRIAGE       ?? "claude-haiku-4-5-20251001",
} as const;

export function hasApiKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

// Anthropic's built-in web_search server tool. Anthropic does the searching
// and returns trimmed results to the model. Metered on the API bill, no
// extra key needed. Cast because SDK 0.32 types don't include this tool yet.
export function webSearchTool(maxUses = 4): Anthropic.Tool {
  return {
    type: "web_search_20250305",
    name: "web_search",
    max_uses: maxUses,
  } as unknown as Anthropic.Tool;
}

// Convenience wrapper: call Messages.create with web_search enabled, but if
// the model/account rejects it (older model, region restriction, etc.) fall
// back to a normal call without tools so the agent still produces output.
export async function createWithWebSearch(args: {
  model: string;
  max_tokens: number;
  system: string;
  messages: Anthropic.MessageParam[];
  maxSearches?: number;
}): Promise<Anthropic.Message> {
  try {
    return await client().messages.create({
      model: args.model,
      max_tokens: args.max_tokens,
      system: args.system,
      tools: [webSearchTool(args.maxSearches ?? 4)],
      messages: args.messages,
    });
  } catch (e) {
    console.warn(
      "web_search unavailable, retrying without:",
      e instanceof Error ? e.message : e,
    );
    return await client().messages.create({
      model: args.model,
      max_tokens: args.max_tokens,
      system: args.system,
      messages: args.messages,
    });
  }
}
