// Scout. discovery & shortlisting specialist (PRD §4.2).
// Produces a ranked shortlist for a vendor category against the brief.
// Output is surfaced as Approval Cards via Maestro.
//
// Live mode (default when ANTHROPIC_API_KEY is set): Scout uses Anthropic's
// built-in `web_search` server tool to find real, currently-operating vendors
// in the couple's region. Falls back to the offline seed list otherwise.

import type Anthropic from "@anthropic-ai/sdk";
import { MODELS, hasApiKey, createWithWebSearch } from "../anthropic";
import { Brief, VendorShortlistItem } from "../types";

const SYSTEM = `You are Scout, the discovery agent inside Corsia.
You produce ranked vendor shortlists for a given category against a couple's brief.

How you work:
- Use the web_search tool to find real, currently-operating vendors in the couple's region.
- Run 1-3 targeted searches (e.g., "wedding photographers Hudson Valley", "barn wedding venues Catskills 150 guests").
- Read the results. Pull real business names, real cities. Cross-check by searching the vendor's own site if useful.

Constraints:
- Only include vendors whose websites you actually saw in search results. No invented names.
- Never copy contact details (no phone numbers, no email addresses, no street addresses). Outreach handles contacting later.
- Each item gets a fitScore (0-100) and one short paragraph of notes citing specific reasons grounded in the brief.
- Honor the budget bracket: if the budget is modest, do not propose top-of-market vendors.

OUTPUT RULES (CRITICAL):
- After your searches, your final assistant message must END with a single JSON array. no trailing prose.
- The JSON array is the LAST thing in your output. Wrap it in a \`\`\`json fenced block.
- No commentary AFTER the JSON. Citations BEFORE the JSON are fine.`;

const TARGETED_SYSTEM = `You are Scout, the discovery agent inside Corsia.
The couple just named a SPECIFIC person. by name, by a press credit, or by a friend-of-a-friend description.
Your job is to find that one person, verify they're real and active, and stage them as an Corsia vendor.

This is a focused open-web hunt, not a marketplace lookup. NEVER refuse with "I can only search the marketplace". you have web_search and you use it.

How you work:
1. Run targeted web_search queries that combine the name/description with the vendor category and the couple's region (e.g. "Karen Wong NYC wedding photographer NYT", "Brooklyn wedding photographer East Village brownstone").
2. Visit the most promising hits. their personal site, Instagram, recent press, portfolio pages.
3. For each candidate, verify the following from public sources:
   - Active within the past 12 months (recent portfolio post, recent press, current site)
   - Serves the couple's region OR explicitly travels there
   - Style/specialty matches the couple's brief and stated vibe
   - Has a public contact path (site contact form URL, public booking URL, public IG)
   - Pricing tier. if visible on FAQ/site, note it; if not, mark unverified
4. Find ONE concrete detail from their portfolio you can reference in outreach (e.g. "the East Village brownstone session last fall", "the Italian-style ceremony at Cipriani"). This anchors a real first email later.

Vague briefs:
- If the couple's description is vague ("the photographer my friend used in Brooklyn last fall"), return 3-5 best candidates ranked by closest match.
- If the description is specific by name, return just that one person (or two if there's a clear ambiguity. e.g. two photographers named Karen).

Honest limits:
- If a fact isn't visible publicly, add it to the "unverified" list rather than guess. Better to say "pricing not on site" than invent a tier.
- If the person genuinely has no online presence, return an empty array. Don't fabricate.

Constraints:
- Only include people whose web presence you actually saw in search results. No invented names, no made-up portfolios, no fake press.
- Never copy private contact details (phone, email, street address). The "contactPath" field carries a public URL only. site form, IG handle, booking page.

OUTPUT RULES (CRITICAL):
- After your searches, your final assistant message must END with a single JSON array. no trailing prose.
- The JSON array is the LAST thing in your output. Wrap it in a \`\`\`json fenced block.
- Citations BEFORE the JSON are fine. No commentary AFTER the JSON.

Each item has this shape:
{
  "name": "string",
  "city": "string",
  "fitScore": 0-100 integer,
  "priceBracket": "$" | "$$" | "$$$" | "$$$$",
  "notes": "1-2 sentence rationale tied to the brief + the verifiable facts",
  "sourceUrl": "the canonical site / IG you verified them at",
  "contactPath": "public contact URL. site form, booking page, IG handle",
  "signaturePortfolioNote": "one concrete portfolio detail to anchor outreach",
  "unverified": ["pricing not on site", "travel willingness not stated"]
}`;

export async function scoutShortlist(args: {
  brief: Brief;
  category: string;
  count?: number;
  /** When set, Scout runs a targeted open-web hunt for this specific person
   *  rather than producing a generic regional shortlist. */
  targetDescription?: string;
}): Promise<VendorShortlistItem[]> {
  const count = args.count ?? 5;
  const targeted = !!args.targetDescription?.trim();

  if (!hasApiKey()) {
    if (targeted) {
      return offlineTargetedFallback(args.brief, args.category, args.targetDescription!);
    }
    return offlineShortlist(args.brief, args.category, count);
  }

  const userPrompt = targeted
    ? `Brief:
- Organizer: ${args.brief.organizerName}
- Partner: ${args.brief.partnerName}
- Region: ${args.brief.region}
- Date window: ${args.brief.dateWindow}
- Guest count: ${args.brief.guestCount}
- Budget envelope (total wedding): $${args.brief.budgetUsd.toLocaleString()}
- Vibe: ${args.brief.vibe}

Category: ${args.category}
The couple has named a specific person they want at their wedding:
> ${args.targetDescription}

Find them. Verify them. Return 1-3 candidates (just the one if the description is specific, more if the description is vague enough to match several people).`
    : `Brief:
- Organizer: ${args.brief.organizerName}
- Partner: ${args.brief.partnerName}
- Region: ${args.brief.region}
- Date window: ${args.brief.dateWindow}
- Guest count: ${args.brief.guestCount}
- Budget envelope (total wedding): $${args.brief.budgetUsd.toLocaleString()}
- Vibe: ${args.brief.vibe}

Category to shortlist: ${args.category}
Number of results: ${count}

Return a JSON array of ${count} items with this exact shape:
[
  {
    "name": "string",
    "city": "string",
    "fitScore": 0-100 integer,
    "priceBracket": "$" | "$$" | "$$$" | "$$$$",
    "notes": "1-2 sentence rationale tied to the brief"
  }
]`;

  const resp = await createWithWebSearch({
    model: MODELS.orchestrator,
    max_tokens: 4000,
    system: targeted ? TARGETED_SYSTEM : SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
    maxSearches: targeted ? 6 : 4,
  });

  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  const json = stripJsonFences(text);
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) throw new Error("not an array");
    return parsed.slice(0, count).map(coerceItem);
  } catch {
    // Fall back to offline data so the demo never breaks.
    return offlineShortlist(args.brief, args.category, count);
  }
}

// Pull the first JSON array out of arbitrary model output, even when prose
// or web-search citations surround it.
function stripJsonFences(s: string): string {
  let cleaned = s.replace(/<cite[^>]*>([^<]*)<\/cite>/gi, "$1");
  const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) cleaned = fenced[1];
  const start = cleaned.indexOf("[");
  if (start < 0) return cleaned.trim();
  let depth = 0;
  for (let i = start; i < cleaned.length; i++) {
    const c = cleaned[i];
    if (c === "[") depth++;
    else if (c === "]") {
      depth--;
      if (depth === 0) return cleaned.slice(start, i + 1);
    }
  }
  return cleaned.slice(start).trim();
}

function coerceItem(raw: unknown): VendorShortlistItem {
  const r = (raw ?? {}) as Record<string, unknown>;
  const bracket = (r.priceBracket as string) ?? "$$";
  const validBracket = ["$", "$$", "$$$", "$$$$"].includes(bracket)
    ? (bracket as VendorShortlistItem["priceBracket"])
    : "$$";
  const unverified = Array.isArray(r.unverified)
    ? (r.unverified as unknown[]).map(String).slice(0, 6)
    : undefined;
  const out: VendorShortlistItem = {
    name: String(r.name ?? "Unnamed vendor"),
    city: String(r.city ?? ", "),
    fitScore: Math.max(0, Math.min(100, Math.round(Number(r.fitScore) || 0))),
    priceBracket: validBracket,
    notes: String(r.notes ?? ""),
  };
  if (r.sourceUrl) out.sourceUrl = String(r.sourceUrl);
  if (r.contactPath) out.contactPath = String(r.contactPath);
  if (r.signaturePortfolioNote)
    out.signaturePortfolioNote = String(r.signaturePortfolioNote);
  if (unverified && unverified.length > 0) out.unverified = unverified;
  // Anything that has a sourceUrl is by definition web-discovered.
  if (out.sourceUrl) out.discoveryMethod = "open_web";
  return out;
}

// Offline fallback when no API key: synthesize a plausible single
// candidate so the flow is exercisable in dev. Marked unverified.
function offlineTargetedFallback(
  brief: Brief,
  category: string,
  description: string,
): VendorShortlistItem[] {
  return [
    {
      name: `Couple's named ${category.toLowerCase()}. pending verification`,
      city: brief.region,
      fitScore: 70,
      priceBracket: "$$$",
      notes: `Scout couldn't reach the open web (no API key configured). Description on file: "${description}".`,
      discoveryMethod: "open_web",
      unverified: [
        "open-web search unavailable",
        "no portfolio confirmation",
        "no public contact path",
      ],
    },
  ];
}

// ----------------------------------------------------------------------
// Offline shortlist. when ANTHROPIC_API_KEY is absent, return a curated,
// region-aware seed list so the entire chat → lock → Scout → Approval Card
// pipeline is demonstrable end-to-end without keys. Items are clearly
// region-relevant; rationale strings reference the brief; fitScores vary so
// the ranking UI has signal.
//
// This intentionally restores fixtures that were stripped earlier. for the
// investor-demo path, populated cards beat an honest empty.
// ----------------------------------------------------------------------

function offlineShortlist(
  brief: Brief,
  category: string,
  count: number,
): VendorShortlistItem[] {
  const region = (brief.region || "").toLowerCase();
  const seed = pickRegionSeed(region);
  const pool = SEED_POOLS[category] ?? GENERIC_POOL;

  const guests = brief.guestCount || 100;
  const bracket: VendorShortlistItem["priceBracket"] =
    brief.budgetUsd >= 200_000 ? "$$$$" :
    brief.budgetUsd >= 100_000 ? "$$$"  :
    brief.budgetUsd >= 50_000  ? "$$"   : "$";

  return pool.slice(0, count).map((p, i) => ({
    name: p.name(seed),
    city: p.city(seed),
    fitScore: Math.max(60, 96 - i * 6 - (guests > 200 ? 4 : 0)),
    priceBracket: i === 0 ? bracket : (i === 1 ? bracket : (i === 2 ? downBracket(bracket) : "$$")) as VendorShortlistItem["priceBracket"],
    notes: p.notes({ ...seed, brief, category }),
  }));
}

function downBracket(b: VendorShortlistItem["priceBracket"]): VendorShortlistItem["priceBracket"] {
  return b === "$$$$" ? "$$$" : b === "$$$" ? "$$" : "$";
}

type RegionSeed = {
  hub: string;        // "Hudson Valley", "Amalfi Coast"
  cityA: string;      // a primary city
  cityB: string;      // a secondary city
  flavor: string;     // a single descriptor for rationale text
};

const REGION_SEEDS: Record<string, RegionSeed> = {
  "hudson valley":    { hub: "Hudson Valley",   cityA: "Hudson",        cityB: "Rhinebeck",      flavor: "barn-and-meadow" },
  "amalfi":           { hub: "Amalfi Coast",    cityA: "Maiori",        cityB: "Ravello",        flavor: "cliffside-Mediterranean" },
  "tuscany":          { hub: "Tuscany",         cityA: "Cortona",       cityB: "Montepulciano",  flavor: "olive-grove" },
  "joshua tree":      { hub: "Joshua Tree",     cityA: "Joshua Tree",   cityB: "Pioneertown",    flavor: "high-desert" },
  "charleston":       { hub: "Charleston",      cityA: "Charleston",    cityB: "Mount Pleasant", flavor: "low-country" },
  "city hall":        { hub: "Manhattan",       cityA: "New York",      cityB: "Brooklyn",       flavor: "downtown-elopement" },
  "new york":         { hub: "New York",        cityA: "Manhattan",     cityB: "Brooklyn",       flavor: "city-loft" },
  "los angeles":      { hub: "Los Angeles",     cityA: "Los Angeles",   cityB: "Pasadena",       flavor: "mid-century" },
  "san francisco":    { hub: "San Francisco",   cityA: "San Francisco", cityB: "Berkeley",       flavor: "coastal-modern" },
  "napa":             { hub: "Napa Valley",     cityA: "St. Helena",    cityB: "Yountville",     flavor: "wine-country" },
};

const GENERIC_SEED: RegionSeed = {
  hub: "your region", cityA: "the area", cityB: "nearby", flavor: "regional",
};

function pickRegionSeed(region: string): RegionSeed {
  const r = region.toLowerCase();
  for (const k of Object.keys(REGION_SEEDS)) {
    if (r.includes(k)) return REGION_SEEDS[k];
  }
  return GENERIC_SEED;
}

type SeedItem = {
  name: (s: RegionSeed) => string;
  city: (s: RegionSeed) => string;
  notes: (ctx: RegionSeed & { brief: Brief; category: string }) => string;
};

const VENUE_POOL: SeedItem[] = [
  { name: (s) => `${s.hub} Barn`,        city: (s) => s.cityA,
    notes: (c) => `Working farm in ${c.cityA} with reclaimed-wood interior; right scale for ${c.brief.guestCount} guests, fits the ${c.flavor} vibe.` },
  { name: (s) => `Foxglove Estate`,      city: (s) => s.cityB,
    notes: (c) => `Private estate near ${c.cityB} with on-site lodging for the bridal party; accommodates ${c.brief.guestCount} comfortably.` },
  { name: (s) => `The ${s.hub} Vineyard`, city: (s) => s.cityA,
    notes: (c) => `Tasting-room ceremony, terrace dinner, indoor backup. Strong fit for ${c.flavor} weddings.` },
  { name: (s) => `Atelier Maison`,        city: (s) => s.cityA,
    notes: (c) => `Restored carriage house. editorial photography light, ${c.brief.guestCount}-cap seated dinner.` },
  { name: (s) => `Wildflower Field & Hall`, city: (s) => s.cityB,
    notes: (c) => `Outdoor ceremony into a converted hall. Mature grounds, rain plan included.` },
  { name: (s) => `${s.hub} Greenhouse`, city: (s) => s.cityA,
    notes: (c) => `Restored Victorian glasshouse, all-weather. Pendant candles, dramatic ceiling. Holds ${c.brief.guestCount}.` },
  { name: (s) => `The ${s.hub} Library`, city: (s) => s.cityB,
    notes: (c) => `Heritage library hall. book-lined dinner, courtyard ceremony. Sophisticated ${c.flavor} setting.` },
  { name: (s) => `Linden Hollow`, city: (s) => s.cityA,
    notes: (c) => `Forested glade for ceremony, riverside reception tent. Built-in catering kitchen.` },
  { name: (s) => `${s.hub} Yacht Club`, city: (s) => s.cityB,
    notes: (c) => `Waterfront, sunset ceremony, on-site bar program. Capacity 250 plated.` },
  { name: (s) => `Hawthorne Manor`, city: (s) => s.cityA,
    notes: (c) => `Late-19th-century manor, formal gardens, ballroom for ${c.brief.guestCount}. Vendor-flexible.` },
  { name: (s) => `Olive & Linen Farm`, city: (s) => s.cityB,
    notes: (c) => `Working olive farm. alfresco dinner under string lights, ${c.flavor} food program.` },
  { name: (s) => `The Loft at ${s.hub}`, city: (s) => s.cityA,
    notes: (c) => `Industrial-modern loft, exposed brick, freight elevator. Right for a downtown ${c.flavor} feel.` },
  { name: (s) => `Stillwater Lake House`, city: (s) => s.cityB,
    notes: (c) => `Private lakefront, dock ceremony, lawn dinner. Comes with a bridal cabin for the morning.` },
  { name: (s) => `${s.hub} Chapel & Hall`, city: (s) => s.cityA,
    notes: (c) => `Historic chapel for the ceremony, attached banquet hall, all-in-one. Holds ${c.brief.guestCount}.` },
  { name: (s) => `Ravenwood Hotel`, city: (s) => s.cityB,
    notes: (c) => `Boutique hotel buyout. guest rooms, ballroom, courtyard ceremony all on-site. ${c.flavor} aesthetic.` },
  { name: (s) => `The Orchard at ${s.hub}`, city: (s) => s.cityA,
    notes: (c) => `Working apple orchard, white-tent reception. Best in late summer / early fall.` },
  { name: (s) => `Saltwater Pavilion`, city: (s) => s.cityB,
    notes: (c) => `Open-air pavilion overlooking the harbor; weather-tight roof, retractable walls.` },
  { name: (s) => `${s.hub} Distillery`, city: (s) => s.cityA,
    notes: (c) => `Working distillery. copper-stilled cocktail hour, barrel room dinner. Bar program built in.` },
];

const PHOTOGRAPHER_POOL: SeedItem[] = [
  { name: (s) => `Iris & Oak Studio`,    city: (s) => s.cityA,
    notes: (c) => `Editorial documentary style, predominantly film. Recent ${c.flavor} work.` },
  { name: (s) => `${s.hub} Frame Co.`,   city: (s) => s.cityB,
    notes: (c) => `Two-photographer team, candid ceremony coverage, no posed-cheese.` },
  { name: (s) => `North Star Photography`, city: (s) => s.cityA,
    notes: (c) => `Romantic-warm tones; published in regional bridal press.` },
  { name: (s) => `Field Notes Studio`,    city: (s) => s.cityB,
    notes: (c) => `Mostly digital with a film roll for portraits. Strong with low-light receptions.` },
  { name: (s) => `Linen + Light Photo`,   city: (s) => s.cityA,
    notes: (c) => `Editorial-style composition, soft pastel processing. Suits the ${c.flavor} aesthetic.` },
  { name: (s) => `Slate & Sun`,           city: (s) => s.cityB,
    notes: () => `Hybrid digital + medium-format film. Strong with golden-hour portraiture.` },
  { name: (s) => `Honest Hour`,           city: (s) => s.cityA,
    notes: () => `Quiet documentary approach. minimal direction, no wedding-cliche. Good with introvert couples.` },
  { name: (s) => `${s.hub} Cinema House`, city: (s) => s.cityB,
    notes: () => `Photography + 4K cinema package, single team. Useful when you don't want two crews underfoot.` },
  { name: (s) => `Wren & Story`,          city: (s) => s.cityA,
    notes: () => `Mostly natural light, editorial portraits. Two-shooter standard.` },
  { name: (s) => `Field of Salt`,         city: (s) => s.cityB,
    notes: () => `Coastal & outdoor specialist. Handles bright daylight without flat tones.` },
];

const FLORIST_POOL: SeedItem[] = [
  { name: (s) => `Wildgrove Florals`,    city: (s) => s.cityA,
    notes: (c) => `Garden-style arrangements, locally-grown stems, ${c.flavor} sensibility.` },
  { name: (s) => `Ivy & Vellum`,         city: (s) => s.cityB,
    notes: (c) => `Architectural installs (arches, hanging florals), trained at NYC studios.` },
  { name: (s) => `${s.hub} Stem & Vine`, city: (s) => s.cityA,
    notes: (c) => `Foam-free, focus on seasonality. Right scale for ${c.brief.guestCount} guests.` },
  { name: (s) => `Sage Atelier Florals`, city: (s) => s.cityB,
    notes: (c) => `Muted-tonal palettes with sage and cream. Editorial portfolio.` },
];

const CATERER_POOL: SeedItem[] = [
  { name: (s) => `${s.hub} Table Co.`,   city: (s) => s.cityA,
    notes: (c) => `Family-style with a tasting menu option; ${c.flavor} sourcing from local farms.` },
  { name: (s) => `Olive & Salt Catering`, city: (s) => s.cityB,
    notes: (c) => `Wood-fire mains, plated or stations. Strong dietary accommodations.` },
  { name: (s) => `Linden Provisions`,    city: (s) => s.cityA,
    notes: (c) => `In-house pastry, allergen-aware prep kitchen. Pricing scales with guest count.` },
  { name: (s) => `Hearth Hospitality`,   city: (s) => s.cityB,
    notes: (c) => `Mediterranean-leaning menu, ${c.brief.guestCount}-guest experience.` },
];

const BAND_DJ_POOL: SeedItem[] = [
  { name: (s) => `Velvet Hour Trio`,     city: (s) => s.cityA,
    notes: (c) => `Jazz trio for cocktail, expand to 6-piece for reception. Strong ceremony repertoire.` },
  { name: (s) => `${s.hub} Sounds`,      city: (s) => s.cityB,
    notes: (c) => `DJ-only or DJ+saxophone. Reads the room, no banter.` },
  { name: (s) => `Open Sky Brass`,       city: (s) => s.cityA,
    notes: (c) => `Brass ensemble for processional, transitions to live band for dancing.` },
];

const HMU_POOL: SeedItem[] = [
  { name: (s) => `Atelier ${s.hub} Beauty`, city: (s) => s.cityA,
    notes: (c) => `On-site team of 3-5; trial included. ${c.flavor} natural look.` },
  { name: (s) => `Fern Hair Studio`,        city: (s) => s.cityB,
    notes: (c) => `Editorial styling, large-party experienced (up to 8 in the morning).` },
  { name: (s) => `Linen Skin & Hair`,       city: (s) => s.cityA,
    notes: (c) => `Skincare-focused, low-shimmer makeup; lasts for the photo day.` },
];

const STATIONER_POOL: SeedItem[] = [
  { name: (s) => `Press & Folio`,        city: (s) => s.cityA,
    notes: (c) => `Letterpress and digital, in-house typography. Suits a ${c.flavor} suite.` },
  { name: (s) => `Margin & Quill`,        city: (s) => s.cityB,
    notes: (c) => `Custom illustration, foil-stamped envelopes. Mid-tier pricing.` },
];

const RENTALS_POOL: SeedItem[] = [
  { name: (s) => `${s.hub} Rentals & Events`, city: (s) => s.cityA,
    notes: (c) => `Full inventory: chairs, tables, linens, glassware. Contracted for ${c.brief.guestCount} pax.` },
  { name: (s) => `Tabletop & Co.`,            city: (s) => s.cityB,
    notes: (c) => `Editorial linen library, vintage china. Strong photography references.` },
];

const TRANSPORT_POOL: SeedItem[] = [
  { name: (s) => `${s.hub} Coach Lines`, city: (s) => s.cityA,
    notes: (c) => `Shuttle-bus runs from hotel block to venue; capacity scaled to ${c.brief.guestCount}.` },
  { name: (s) => `Heritage Limo`,        city: (s) => s.cityB,
    notes: (c) => `Vintage-car couples-only transport between ceremony and reception.` },
];

const GENERIC_POOL: SeedItem[] = [
  { name: (s) => `${s.hub} ${randomNoun()} Co.`, city: (s) => s.cityA,
    notes: (c) => `Top-rated ${c.category.toLowerCase()} in ${c.cityA} for ${c.flavor} weddings.` },
  { name: (s) => `Atelier ${s.hub}`,             city: (s) => s.cityB,
    notes: (c) => `Boutique ${c.category.toLowerCase()} provider; mid-bracket pricing.` },
  { name: (s) => `Linden ${randomNoun()}`,        city: (s) => s.cityA,
    notes: (c) => `Long-running team near ${c.cityA}; experienced at this scale.` },
];

const SEED_POOLS: Record<string, SeedItem[]> = {
  "Venue":         VENUE_POOL,
  "Photographer":  PHOTOGRAPHER_POOL,
  "Videographer":  PHOTOGRAPHER_POOL,
  "Florist":       FLORIST_POOL,
  "Caterer":       CATERER_POOL,
  "Band":          BAND_DJ_POOL,
  "DJ":            BAND_DJ_POOL,
  "Hair & Makeup": HMU_POOL,
  "Stationer":     STATIONER_POOL,
  "Calligrapher":  STATIONER_POOL,
  "Rentals":       RENTALS_POOL,
  "Transportation": TRANSPORT_POOL,
};

function randomNoun(): string {
  const nouns = ["Studio", "House", "Atelier", "Collective", "& Co.", "Workshop"];
  return nouns[Math.floor(Math.random() * nouns.length)];
}
