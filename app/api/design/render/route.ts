// Render a hero image for one or all design assets.
//
// Body (one of):
//   { op: "render_one", designId }    . render hero for a single design
//   { op: "render_all", kind?: string }. render hero for every design (or just one kind)
//
// Uses lib/imagegen.ts which calls OpenAI gpt-image-1 when OPENAI_API_KEY is
// set, otherwise returns sage-pale placeholder SVGs. Either way the action
// succeeds and the design.heroImage is populated. the UI doesn't need to
// know which mode is active.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readState, setDesignHero, bumpGenerationCount } from "@/lib/store";
import { generateMoodBoardImage, buildFullPrompt, hasOpenAIKey } from "@/lib/imagegen";
import type { DesignAsset } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

const Body = z.discriminatedUnion("op", [
  z.object({ op: z.literal("render_one"), designId: z.string().min(1) }),
  z.object({ op: z.literal("render_all"), kind: z.string().optional() }),
]);

// Map design kind + content into a focused image prompt.
function promptFor(d: DesignAsset): string {
  const palette = (d.swatches ?? []).slice(0, 4).join(", ");
  const refs = (d.refs ?? []).slice(0, 4).join(", ");
  if (d.kind === "moodboard") {
    return `An editorial wedding mood. ${d.title}. ${d.description}${palette ? ` Palette: ${palette}.` : ""}${refs ? ` Includes ${refs}.` : ""} Wide reception establishing shot, no people, golden-hour natural light.`;
  }
  if (d.kind === "dress_concept") {
    return `An editorial wedding dress. ${d.title}. ${d.description}. Photographed on a dress form against a soft cream studio backdrop, no model, medium-format film, even diffused light.`;
  }
  if (d.kind === "floral_concept") {
    return `An editorial wedding floral arrangement. ${d.title}. ${d.description}${palette ? ` Palette: ${palette}.` : ""} Single arrangement on a linen table, no people, soft golden light.`;
  }
  if (d.kind === "stationery_proof") {
    return `An editorial wedding stationery flat-lay. ${d.title}. ${d.description}. Photographed flat on a linen surface, no people, soft directional light.`;
  }
  return `An editorial wedding moment. ${d.title}. ${d.description}${palette ? ` Palette: ${palette}.` : ""}`;
}

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const state = await readState();

  // Pick the designs to render.
  let targets: DesignAsset[] = [];
  const data = parsed.data;
  if (data.op === "render_one") {
    const d = state.designs.find((x) => x.id === data.designId);
    if (!d) return NextResponse.json({ error: "Design not found." }, { status: 404 });
    targets = [d];
  } else {
    targets = data.kind
      ? state.designs.filter((d) => d.kind === data.kind)
      : state.designs.filter((d) => !d.heroImage);
  }

  if (targets.length === 0) {
    return NextResponse.json({ error: "Nothing to render." }, { status: 400 });
  }

  // Daily generation cap (shared with Mood Board). never bypassable from
  // the client.
  const cap = await bumpGenerationCount(targets.length);
  if (!cap.allowed) {
    return NextResponse.json({
      error: `You've generated ${40 - cap.remaining} images today. Maestro will be back tomorrow.`,
      remaining: cap.remaining,
    }, { status: 429 });
  }

  // Render in parallel. Failures are skipped, not fatal.
  const results = await Promise.allSettled(
    targets.map(async (d) => {
      const prompt = promptFor(d);
      const fullPrompt = buildFullPrompt(prompt);
      const out = await generateMoodBoardImage({ fullPrompt });
      await setDesignHero(d.id, out.url, prompt);
      return { id: d.id, url: out.url, mode: out.mode };
    }),
  );
  const ok = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.length - ok;

  return NextResponse.json({
    rendered: ok,
    failed,
    mode: hasOpenAIKey() ? "live" : "sample",
    remaining: cap.remaining,
  });
}
