// OpenAI image generation for the Mood Board studio.
//
// Calls gpt-image-1 via OpenAI's HTTP API (no SDK dependency added. keep the
// dependency surface small). Returns base64-encoded PNG data URLs so the
// browser can render them immediately. v2 will upload to Supabase Storage /
// R2 and return public URLs; for v1, the inline data URL is fine.
//
// Falls back gracefully when OPENAI_API_KEY isn't set. returns four sage-
// pale placeholder SVGs so the demo flow is exercisable end-to-end.

const AESTHETIC_PREAMBLE =
  "Editorial wedding photography, calm luxury aesthetic, natural light, no people in frame, " +
  "shot on medium format film, sage and cream palette unless the user's prompt specifies otherwise. ";
const COMPOSITION_RULES =
  " Composition is editorial, not Pinterest-blog. No text overlays, no watermarks.";

export function hasOpenAIKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export interface ImageGenResult {
  url: string;          // either data:image/png;base64 OR a remote URL when storage is wired
  mode: "live" | "placeholder";
  /** When mode === "placeholder", explains why (model unavailable, billing, etc.). */
  error?: string;
  /** Which model actually returned the live image. */
  model?: string;
}

export function buildFullPrompt(userPrompt: string): string {
  return `${AESTHETIC_PREAMBLE}${userPrompt.trim()}.${COMPOSITION_RULES}`;
}

// Try each model in order; the first one that returns a usable image wins.
// gpt-image-1 is the newest, sharpest model but many project-scoped keys
// don't yet have access. dall-e-3 is universally available on any active key.
async function tryOpenAIModel(model: string, fullPrompt: string): Promise<
  | { ok: true; url: string }
  | { ok: false; status?: number; reason: string }
> {
  // gpt-image-1 vs dall-e-3 take different params.
  const body: Record<string, unknown> = {
    model,
    prompt: fullPrompt,
    n: 1,
  };
  if (model === "gpt-image-1") {
    body.size = "1024x1024";
    body.quality = "high";
  } else if (model === "dall-e-3") {
    body.size = "1792x1024"; // landscape. works better as a hero backdrop
    body.quality = "hd";
    body.response_format = "b64_json";
    body.style = "natural"; // photographic, not illustrated
  } else {
    body.size = "1024x1024";
  }

  try {
    const r = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const text = await r.text().catch(() => "");
      return { ok: false, status: r.status, reason: `${r.status} ${text.slice(0, 240)}` };
    }
    const j = (await r.json()) as { data?: { b64_json?: string; url?: string }[] };
    const first = j.data?.[0];
    if (first?.b64_json) {
      return { ok: true, url: `data:image/png;base64,${first.b64_json}` };
    }
    if (first?.url) {
      return { ok: true, url: first.url };
    }
    return { ok: false, reason: "Empty response from OpenAI" };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : String(e) };
  }
}

export async function generateMoodBoardImage(args: {
  fullPrompt: string;
  /** Reference image URL. when set, we'd call the /images/edits endpoint. v1 just falls back to /generations. */
  referenceImageUrl?: string;
}): Promise<ImageGenResult> {
  if (!hasOpenAIKey()) {
    return {
      url: placeholderImage(args.fullPrompt),
      mode: "placeholder",
      error: "OPENAI_API_KEY not set",
    };
  }

  // Order is configurable but defaults to gpt-image-1 → dall-e-3 → dall-e-2.
  const order = (
    process.env.OPENAI_IMAGE_MODEL
      ? [process.env.OPENAI_IMAGE_MODEL]
      : ["gpt-image-1", "dall-e-3", "dall-e-2"]
  ) as string[];

  const errors: string[] = [];
  for (const model of order) {
    const r = await tryOpenAIModel(model, args.fullPrompt);
    if (r.ok) {
      return { url: r.url, mode: "live", model };
    }
    errors.push(`${model}: ${r.reason}`);
    console.warn(`OpenAI image gen failed for ${model}: ${r.reason}`);
    // 400-class errors that aren't auth → try next model.
    // 5xx → also try next model (intermittent).
    // 401/403 → no other model will work either, but try anyway in case the
    // key is project-scoped and only some models are denied.
  }

  return {
    url: placeholderImage(args.fullPrompt),
    mode: "placeholder",
    error: errors.join(" | ").slice(0, 500),
  };
}

// ---------------- Placeholder generator ----------------

// Hash a string to two anchor hex colors so the same prompt always produces
// the same placeholder. Helps testing + makes the offline demo path coherent.
function hashColors(s: string): [string, string] {
  let h1 = 0, h2 = 0;
  for (let i = 0; i < s.length; i++) {
    h1 = (h1 * 31 + s.charCodeAt(i)) | 0;
    h2 = (h2 * 17 + s.charCodeAt(i)) | 0;
  }
  const palette = [
    "#FAF7EE", "#E2D9C4", "#C8D2BB", "#A88E6A", "#8F9B7F",
    "#5B5034", "#1A1814", "#F5EFDF", "#C9967A", "#7C8A6E",
  ];
  return [palette[Math.abs(h1) % palette.length], palette[Math.abs(h2) % palette.length]];
}

export function placeholderImage(prompt: string): string {
  const [a, b] = hashColors(prompt);
  const label = prompt.replace(AESTHETIC_PREAMBLE, "").replace(COMPOSITION_RULES, "")
    .slice(0, 64).replace(/[<>&"]/g, "");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${a}"/>
      <stop offset="100%" stop-color="${b}"/>
    </linearGradient>
    <pattern id="p" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
      <circle cx="30" cy="30" r="1.5" fill="rgba(255,255,255,0.18)" />
    </pattern>
  </defs>
  <rect width="1024" height="1024" fill="url(#g)"/>
  <rect width="1024" height="1024" fill="url(#p)"/>
  <text x="64" y="940" font-family="Cormorant Garamond, Georgia, serif" font-style="italic" font-size="36" fill="rgba(255,255,255,0.78)">${label}</text>
  <text x="64" y="60" font-family="Inter, sans-serif" font-size="11" letter-spacing="3" fill="rgba(255,255,255,0.55)">SAMPLE · CONNECT KEY FOR LIVE</text>
</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}
