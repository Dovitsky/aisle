// Shared "everything the app knows about this wedding" context.
//
// FOUNDATIONAL DESIGN PRINCIPLE — the app grows with you. By the time
// a couple reaches florals, cake, music, design, the app already knows:
// region, month/season, vibe, contracted venue, locked palette, cultural
// tradition, formality, guest count, etc. Each specialist should
// generate recommendations using ALL of that — not just the brief in
// isolation. This helper bundles it into one typed shape so we don't
// repeat the same `state.vendors.find(...)` / `state.designs.find(...)`
// boilerplate in every agent.
//
// Pass `wedingContext(state)` to any agent's `propose` function. The
// agent decides which fields to weave into its system / user prompt.

import type { ProjectState, Brief, DesignAsset, Vendor } from "../types";

export interface WeddingContext {
  brief: Brief;
  /** "Hudson Valley, NY" verbatim from the brief. */
  region: string;
  /** "spring" | "summer" | "autumn" | "winter" | "the soft hours". */
  season: string;
  /** Long-form month name when we can parse one ("October"), else null. */
  monthName: string | null;
  /** "modern" | "formal" | "warm" | "casual". */
  formality: string;
  /** "secular" | "catholic" | "jewish" | "hindu" | "muslim" | "interfaith" | "civil" | "other". */
  cultural: string;
  /** Free-text vibe from the brief ("candlelit barn, wildflowers"). */
  vibe: string;
  /** Guest count from the brief. */
  guestCount: number;
  /** The contracted (or paid) venue, if any. Null until booked. */
  venue: Vendor | null;
  /** Short string for prompts: "Inn at Pound Ridge in Pound Ridge, NY" or null. */
  venueLine: string | null;
  /** The approved moodboard design, if any. Carries swatches + title. */
  design: DesignAsset | null;
  /** Hex color codes from the approved moodboard. ["#A88E6A", "#5B5034", …]. */
  palette: string[];
  /** Free-text design direction title ("Candlelit Editorial"). */
  designTitle: string | null;
  /** Concise human reasoning, ready to paste under a "Picked for you" badge.
   *  e.g. "October in Hudson Valley · candlelit editorial palette · 120 guests" */
  reasoning: string;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function weddingContext(state: ProjectState): WeddingContext | null {
  const brief = state.brief;
  if (!brief) return null;

  // Season + month.
  const ymd = brief.dateWindow.match(/(\d{4})-(\d{2})-(\d{2})/);
  let season = "the soft hours";
  let monthName: string | null = null;
  if (ymd) {
    const monthIdx = Number(ymd[2]) - 1;
    monthName = MONTHS[monthIdx] ?? null;
    if (monthIdx >= 2 && monthIdx <= 4) season = "spring";
    else if (monthIdx >= 5 && monthIdx <= 7) season = "summer";
    else if (monthIdx >= 8 && monthIdx <= 10) season = "autumn";
    else season = "winter";
  } else {
    // Fall back to keywords in the dateWindow string.
    const lower = brief.dateWindow.toLowerCase();
    for (const m of MONTHS) {
      if (lower.includes(m.toLowerCase())) {
        monthName = m;
        const idx = MONTHS.indexOf(m);
        if (idx >= 2 && idx <= 4) season = "spring";
        else if (idx >= 5 && idx <= 7) season = "summer";
        else if (idx >= 8 && idx <= 10) season = "autumn";
        else season = "winter";
        break;
      }
    }
    if (!monthName) {
      if (lower.includes("summer")) season = "summer";
      else if (lower.includes("spring")) season = "spring";
      else if (lower.includes("fall") || lower.includes("autumn")) season = "autumn";
      else if (lower.includes("winter")) season = "winter";
    }
  }

  // Contracted venue.
  const venue =
    state.vendors.find(
      (v) =>
        v.category === "Venue" &&
        (v.status === "contracted" || v.status === "paid"),
    ) ?? null;
  const venueLine = venue
    ? `${venue.name}${venue.city ? ` in ${venue.city}` : ""}`
    : null;

  // Approved design moodboard.
  const design =
    state.designs.find((d) => d.approved && d.kind === "moodboard") ??
    state.designs.find((d) => d.approved) ??
    null;
  const palette = (design?.swatches ?? []).slice(0, 6);
  const designTitle = design?.title ?? null;

  // Compose the "Picked for you" reasoning line. Always present; gets
  // richer as more details accumulate.
  const reasoningParts: string[] = [];
  if (monthName) reasoningParts.push(`${monthName} in ${brief.region}`);
  else if (brief.region) reasoningParts.push(brief.region);
  if (designTitle) reasoningParts.push(`${designTitle.toLowerCase()} palette`);
  else if (brief.vibe) {
    const short = brief.vibe.split(/[.,;]/)[0]?.trim() ?? "";
    if (short) reasoningParts.push(short.toLowerCase());
  }
  if (venue) reasoningParts.push(`booked at ${venue.name}`);
  reasoningParts.push(`${brief.guestCount} guests`);
  const reasoning = reasoningParts.join(" · ");

  return {
    brief,
    region: brief.region,
    season,
    monthName,
    formality: brief.formalityTone ?? "modern",
    cultural: brief.cultural ?? "secular",
    vibe: brief.vibe,
    guestCount: brief.guestCount,
    venue,
    venueLine,
    design,
    palette,
    designTitle,
    reasoning,
  };
}

/** Convert a WeddingContext into a few lines of "what we know" the AI
 *  can read at the top of its user prompt. Skips empty fields. */
export function contextSummaryForPrompt(ctx: WeddingContext): string {
  const lines: string[] = [];
  lines.push(`Region: ${ctx.region}`);
  lines.push(
    `When: ${ctx.monthName ?? ctx.brief.dateWindow} (${ctx.season})`,
  );
  lines.push(`Guest count: ${ctx.guestCount}`);
  lines.push(`Formality: ${ctx.formality}`);
  if (ctx.cultural && ctx.cultural !== "secular")
    lines.push(`Cultural tradition: ${ctx.cultural}`);
  if (ctx.vibe) lines.push(`Vibe: ${ctx.vibe}`);
  if (ctx.venueLine) lines.push(`Venue (booked): ${ctx.venueLine}`);
  if (ctx.designTitle)
    lines.push(`Design direction: ${ctx.designTitle}`);
  if (ctx.palette.length)
    lines.push(`Approved palette (hex): ${ctx.palette.join(", ")}`);
  return lines.join("\n");
}
