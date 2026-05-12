import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { generateMoodBoardImage, buildFullPrompt, hasOpenAIKey } from "@/lib/imagegen";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// =====================================================================
// /api/brand/logo. the Corsia wordmark, served as an image.
//
// First request generates an AI wordmark via gpt-image-1 (the editorial
// serif variant. black on cream, Vogue-masthead register) and caches
// it to disk. Subsequent requests serve the cached bytes with a long
// Cache-Control header so the browser + the Vercel edge cache it.
//
// When OPENAI_API_KEY isn't set, we serve the static SVG wordmark from
// /public/logo-corsia.svg as a fallback so the header is never empty.
//
// To force a re-render: GET /api/brand/logo?force=1
// To regenerate with a different style (0/1/2): ?style=0|1|2
// =====================================================================

const PROMPT_EDITORIAL =
  "Premium wedding brand wordmark spelling the single word 'Corsia' in distinctive editorial serif typography. refined, slightly condensed, high-contrast strokes, deliberate letter-spacing. Pure black ink on a warm ivory cream background. Clean minimal design, no decorative elements, no flourishes, no other text, no borders, no figures. Centered, generous white space. Reads like a Vogue masthead or a Loewe logotype. Just the single word.";

const PROMPTS = [
  // 0. Hand-lettered calligraphic, gold on cream
  "Luxury brand logotype reading the single word 'Corsia' in elegant, refined modern calligraphy. hand-lettered, slight swash on the C, balanced letterforms, exquisite letter-spacing. Gold ink on warm cream paper. Minimal, no decorative elements, no flowers, no borders, no other text. just the wordmark. Centered, generous white space, Hermès or Aman Resorts editorial register.",
  // 1. Editorial serif, black on cream. fashion house (DEFAULT)
  PROMPT_EDITORIAL,
  // 2. Engraved / embossed on textured paper
  "Couture brand logotype reading the single word 'Corsia' in a custom modern serif, debossed and engraved on warm ivory cotton-rag textured paper. Subtle shadow gives slight three-dimensional depth. Single word only, no other text, no borders, no decorative elements. Photographed flat-lay, soft natural light. Reads like the cover of a luxury wedding invitation or a Chanel atelier card.",
];

const SERVERLESS =
  !!process.env.VERCEL ||
  !!process.env.NETLIFY ||
  !!process.env.AWS_LAMBDA_FUNCTION_NAME;
const CACHE_DIR = SERVERLESS ? "/tmp" : path.join(process.cwd(), "data");

function cachePath(style: number): string {
  return path.join(CACHE_DIR, `corsia-logo-${style}.png`);
}

async function readCache(style: number): Promise<Buffer | null> {
  try {
    return await fs.readFile(cachePath(style));
  } catch {
    return null;
  }
}

async function writeCache(style: number, buf: Buffer): Promise<void> {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.writeFile(cachePath(style), buf);
}

function svgFallback(): Response {
  // Serve the static SVG wordmark from /public as the fallback.
  // We don't read it from disk. just redirect; the browser caches it.
  return NextResponse.redirect(
    new URL("/logo-corsia.svg", "https://placeholder.local"),
  );
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const force = url.searchParams.get("force") === "1";
  const styleParam = url.searchParams.get("style");
  const style = Math.max(
    0,
    Math.min(PROMPTS.length - 1, Number(styleParam ?? 1) || 1),
  );

  if (!hasOpenAIKey()) {
    // No key. let the header keep using /logo-corsia.svg directly.
    // Returning a 302 to /logo-corsia.svg keeps this endpoint usable as
    // a single canonical logo URL regardless of key status.
    return NextResponse.redirect(new URL("/logo-corsia.svg", req.url));
  }

  if (!force) {
    const cached = await readCache(style);
    if (cached) {
      return new NextResponse(new Uint8Array(cached), {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          "Cache-Control":
            "public, max-age=86400, s-maxage=2592000, immutable",
        },
      });
    }
  }

  const result = await generateMoodBoardImage({
    fullPrompt: buildFullPrompt(PROMPTS[style]),
  });

  if (result.mode !== "live" || !result.url.startsWith("data:image/png")) {
    // Fallback to SVG when generation failed.
    return NextResponse.redirect(new URL("/logo-corsia.svg", req.url));
  }

  const b64 = result.url.split(",")[1] ?? "";
  const buf = Buffer.from(b64, "base64");
  await writeCache(style, buf).catch(() => {
    /* /tmp full or read-only. still serve the bytes inline */
  });

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400, s-maxage=2592000, immutable",
    },
  });
}

void svgFallback;
