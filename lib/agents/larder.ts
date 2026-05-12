// Larder. dietary + allergen agent.
//
// Three jobs:
//   1. Parse free-text RSVP dietary entries → structured AllergenEntry + DietaryPref
//   2. Cross-check the caterer/cake/bar menu against guest restrictions → DietaryConflict[]
//   3. Draft a caterer-ready brief and per-table day-of service notes
//
// Hooked into the inbox-scan pipeline so dietary mentions in vendor / guest
// emails get extracted automatically when a real Gmail flow is connected.

import type Anthropic from "@anthropic-ai/sdk";
import { client, MODELS, hasApiKey } from "../anthropic";
import {
  ALLERGEN_CODES, ALLERGEN_LABEL, AllergenCode, AllergenEntry,
  DIETARY_PREFS, DIETARY_PREF_LABEL, DietaryPref,
  DietaryConflict, Guest, MenuItem, ProjectState,
} from "../types";

// --------------------------------------------------------------------
// 1. Parse free-text → structured
// --------------------------------------------------------------------

export interface ParsedDietary {
  allergens: AllergenEntry[];
  preferences: DietaryPref[];
  notes?: string;
}

const SYSTEM_PARSE = `You are Larder, Corsia's dietary parser.
Extract structured allergen + dietary-preference data from a guest's free-text RSVP entry.

Allergen codes (use ONLY these):
${ALLERGEN_CODES.map((c) => `- ${c} (${ALLERGEN_LABEL[c]})`).join("\n")}

Severity values: "anaphylactic" | "severe" | "moderate" | "intolerant"
- anaphylactic: epi-pen, hospitalizes
- severe: significant reaction (hives, swelling, GI distress)
- moderate: uncomfortable but manageable
- intolerant: digestive issue, not immune-mediated (e.g., lactose intolerance → dairy "intolerant")

Preference codes (use ONLY these):
${DIETARY_PREFS.map((p) => `- ${p} (${DIETARY_PREF_LABEL[p]})`).join("\n")}

Output JSON only:
{
  "allergens": [ { "code": "<one of above>", "severity": "<one of above>", "notes": "1-line if useful" } ],
  "preferences": [ "<pref code>", ... ],
  "notes": "preserve any nuance not captured above; otherwise empty string"
}

Rules:
- Be conservative: if a guest writes "no nuts please" with no severity context, mark as "moderate".
- If they write "EpiPen" / "hospitalized last time" / "severe" / "anaphylactic", mark "anaphylactic".
- "Lactose intolerant" → dairy + "intolerant" (NOT severe. they can choose).
- "Pescatarian" is its own preference, not "no_beef + no_pork".
- "Eats anything", "no restrictions", or empty input → empty arrays.`;

export async function larderParse(text: string): Promise<ParsedDietary> {
  if (!text.trim()) return { allergens: [], preferences: [] };
  if (!hasApiKey()) return offlineParse(text);

  const resp = await client().messages.create({
    model: MODELS.triage,
    max_tokens: 600,
    system: SYSTEM_PARSE,
    messages: [{ role: "user", content: text }],
  });
  const out = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text).join("\n").trim();
  const json = out.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    const parsed = JSON.parse(json);
    return coerce(parsed);
  } catch {
    return offlineParse(text);
  }
}

function coerce(raw: unknown): ParsedDietary {
  const r = (raw ?? {}) as Record<string, unknown>;
  const allergens: AllergenEntry[] = [];
  for (const a of Array.isArray(r.allergens) ? r.allergens : []) {
    const x = (a ?? {}) as Record<string, unknown>;
    if (!ALLERGEN_CODES.includes(x.code as AllergenCode)) continue;
    const sev = ["anaphylactic", "severe", "moderate", "intolerant"].includes(String(x.severity))
      ? (x.severity as AllergenEntry["severity"])
      : "moderate";
    allergens.push({ code: x.code as AllergenCode, severity: sev, notes: x.notes ? String(x.notes) : undefined });
  }
  const preferences: DietaryPref[] = [];
  for (const p of Array.isArray(r.preferences) ? r.preferences : []) {
    if (DIETARY_PREFS.includes(p as DietaryPref)) preferences.push(p as DietaryPref);
  }
  return { allergens, preferences, notes: r.notes ? String(r.notes) : undefined };
}

// Conservative offline parser. keyword/regex based. Used when ANTHROPIC_API_KEY is unset.
function offlineParse(text: string): ParsedDietary {
  const t = text.toLowerCase();
  const allergens: AllergenEntry[] = [];
  const preferences: DietaryPref[] = [];

  const sev = (): AllergenEntry["severity"] => {
    if (/anaphyla|epi.?pen|hospital/.test(t)) return "anaphylactic";
    if (/severe|seriou|cannot|life.?threat/.test(t)) return "severe";
    if (/intoleran|lactose/.test(t)) return "intolerant";
    return "moderate";
  };

  const has = (re: RegExp, code: AllergenCode) => {
    if (re.test(t) && !allergens.some((a) => a.code === code)) {
      allergens.push({ code, severity: sev() });
    }
  };

  has(/\bpeanut/, "peanut");
  has(/tree.?nut|almond|cashew|walnut|pecan|pistachio|hazelnut|brazil/, "tree_nut");
  has(/shellfish|shrimp|crab|lobster|prawn/, "shellfish");
  has(/\bfish\b|salmon|tuna|cod|halibut/, "fish");
  has(/dairy|milk|lactose|cheese|butter|cream/, "dairy");
  has(/gluten|wheat|celiac|coeliac/, "gluten");
  has(/\begg/, "egg");
  has(/\bsoy/, "soy");
  has(/sesame|tahini/, "sesame");
  has(/sulfite|sulphite/, "sulfites");
  has(/mustard/, "mustard");
  has(/celery/, "celery");

  const pref = (re: RegExp, p: DietaryPref) => { if (re.test(t)) preferences.push(p); };
  pref(/\bvegan\b/, "vegan");
  pref(/vegetarian/, "vegetarian");
  pref(/pescatarian/, "pescatarian");
  pref(/kosher/, "kosher");
  pref(/halal/, "halal");
  pref(/no.?pork|no pig/, "no_pork");
  pref(/no.?beef/, "no_beef");
  pref(/no.?alcohol|sober|in recovery|teetotal|pregnan/, "no_alcohol");
  pref(/gluten.?free|\bgf\b/, "gluten_free");
  pref(/dairy.?free|lactose.?free/, "dairy_free");
  pref(/low.?sodium|low.?salt|hypertension/, "low_sodium");
  pref(/diabet/, "diabetic");
  pref(/pregnan/, "pregnant_safe");

  const dedup = Array.from(new Set(preferences));
  return { allergens, preferences: dedup, notes: text.length > 4 ? text : undefined };
}

// --------------------------------------------------------------------
// 2. Compute conflicts between menu + guests
// --------------------------------------------------------------------

// Map a dietary preference to the set of allergen / non-vegan / etc. that it bans.
function banishedAllergensForPref(p: DietaryPref): AllergenCode[] {
  switch (p) {
    case "gluten_free": return ["gluten"];
    case "dairy_free": return ["dairy"];
    default: return [];
  }
}

export function computeConflicts(state: ProjectState): DietaryConflict[] {
  const out: DietaryConflict[] = [];
  // Only check guests who are coming.
  const yes = state.guests.filter((g) => g.rsvp === "yes" || g.rsvp === "maybe");

  // Fold the cake into the menu as a synthetic item so the cross-check covers it.
  const cakeItems: MenuItem[] = state.cake?.allergens?.length
    ? [{
        id: "cake_synthetic",
        course: "cake",
        name: `${state.cake.tiers}-tier wedding cake`,
        description: state.cake.flavors.join(" / "),
        containsAllergens: state.cake.allergens,
      }]
    : [];
  const allMenu = [...state.menu, ...cakeItems];

  for (const g of yes) {
    const allergens = g.allergens ?? [];
    const prefs = g.dietaryPreferences ?? [];

    // Convert the guest's "selected meal" into a single course filter, but if no meal
    // is chosen we cross-check against everything served.
    const relevantCourses = new Set<string>();
    if (g.meal) {
      // Loose mapping. meal text → course code (best-effort; users can override)
      const m = g.meal.toLowerCase();
      if (/beef|steak|chicken|lamb|pork|duck/.test(m)) relevantCourses.add("main_meat");
      else if (/fish|salmon|halibut|sea bass|cod/.test(m)) relevantCourses.add("main_fish");
      else if (/veg|pasta|risotto|gnocchi|squash/.test(m)) relevantCourses.add("main_veg");
      else if (/kid|child/.test(m)) relevantCourses.add("kids");
    }

    for (const item of allMenu) {
      // If the guest selected a specific meal class, only check items they'll actually be served.
      if (relevantCourses.size > 0 && !relevantCourses.has(item.course) && item.course !== "passed" && item.course !== "first" && item.course !== "dessert" && item.course !== "cake" && item.course !== "side") {
        continue;
      }

      // Allergen overlap
      for (const a of allergens) {
        if (item.containsAllergens.includes(a.code)) {
          out.push({
            guestId: g.id, guestName: g.fullName,
            menuItemId: item.id, menuItemName: item.name,
            course: item.course,
            reason: `${ALLERGEN_LABEL[a.code]} (${a.severity})`,
            severity: a.severity === "anaphylactic" || a.severity === "severe" ? "critical" : "warn",
          });
        }
      }

      // Preference checks
      for (const p of prefs) {
        const reason = checkPref(item, p);
        if (reason) {
          out.push({
            guestId: g.id, guestName: g.fullName,
            menuItemId: item.id, menuItemName: item.name,
            course: item.course,
            reason,
            severity: "warn",
          });
        }
      }
    }
  }
  // Attach resolutions
  for (const c of out) {
    const key = `${c.guestId}__${c.menuItemId}`;
    const r = state.dietaryResolutions?.[key];
    if (r) c.resolution = r;
  }
  // Sort: unresolved first, then critical, then by name.
  out.sort((a, b) => {
    const aR = a.resolution ? 1 : 0;
    const bR = b.resolution ? 1 : 0;
    if (aR !== bR) return aR - bR;
    if (a.severity !== b.severity) return a.severity === "critical" ? -1 : 1;
    return a.guestName.localeCompare(b.guestName);
  });
  return out;
}

function checkPref(item: MenuItem, p: DietaryPref): string | null {
  switch (p) {
    case "vegan":
      if (!item.isVegan && (item.course !== "non_alc" && item.course !== "alc")) return "Not vegan";
      return null;
    case "vegetarian":
      if (!item.isVegetarian && !item.isVegan && (item.course === "main_meat" || item.course === "main_fish")) return "Not vegetarian";
      return null;
    case "pescatarian":
      if (item.course === "main_meat") return "Contains meat";
      return null;
    case "kosher":
      if (!item.isKosher && (item.course === "main_meat" || item.course === "main_fish" || item.course === "passed")) return "Not certified kosher";
      return null;
    case "halal":
      if (!item.isHalal && (item.course === "main_meat" || item.course === "passed")) return "Not certified halal";
      return null;
    case "no_pork":
      if (/pork|bacon|prosciutto|ham|sausage/i.test(item.name + " " + item.description)) return "Contains pork";
      return null;
    case "no_beef":
      if (/beef|steak|brisket|short rib/i.test(item.name + " " + item.description)) return "Contains beef";
      return null;
    case "gluten_free":
      if (item.containsAllergens.includes("gluten") || (!item.isGlutenFree && /pasta|bread|risotto|crouton|breaded/i.test(item.name + " " + item.description))) return "Contains gluten";
      return null;
    case "dairy_free":
      if (item.containsAllergens.includes("dairy") || (!item.isDairyFree && /cream|butter|cheese|milk/i.test(item.name + " " + item.description))) return "Contains dairy";
      return null;
    case "no_alcohol":
      if (item.isAlcoholic) return "Contains alcohol";
      return null;
    default:
      return null;
  }
}

// --------------------------------------------------------------------
// 3. Caterer brief + day-of table service notes
// --------------------------------------------------------------------

export interface CatererBrief {
  guestCount: number;
  allergenSummary: { allergen: AllergenCode; severity: string; count: number }[];
  preferenceSummary: { preference: DietaryPref; count: number }[];
  criticalGuests: { name: string; allergens: AllergenEntry[] }[];
  body: string;          // ready-to-send email body
}

export function catererBrief(state: ProjectState): CatererBrief {
  const yes = state.guests.filter((g) => g.rsvp === "yes" || g.rsvp === "maybe");

  // Allergen rollup with worst-severity per allergen
  const sevRank: Record<string, number> = { anaphylactic: 4, severe: 3, moderate: 2, intolerant: 1 };
  const allergenMap: Record<string, { severity: string; count: number }> = {};
  for (const g of yes) {
    for (const a of g.allergens ?? []) {
      const cur = allergenMap[a.code];
      if (!cur) {
        allergenMap[a.code] = { severity: a.severity, count: 1 };
      } else {
        cur.count += 1;
        if ((sevRank[a.severity] ?? 0) > (sevRank[cur.severity] ?? 0)) cur.severity = a.severity;
      }
    }
  }
  const allergenSummary = Object.entries(allergenMap)
    .map(([allergen, v]) => ({ allergen: allergen as AllergenCode, severity: v.severity, count: v.count }))
    .sort((a, b) => (sevRank[b.severity] ?? 0) - (sevRank[a.severity] ?? 0) || b.count - a.count);

  const prefMap: Record<string, number> = {};
  for (const g of yes) {
    for (const p of g.dietaryPreferences ?? []) {
      prefMap[p] = (prefMap[p] ?? 0) + 1;
    }
  }
  const preferenceSummary = Object.entries(prefMap)
    .map(([preference, count]) => ({ preference: preference as DietaryPref, count }))
    .sort((a, b) => b.count - a.count);

  const critical = yes
    .filter((g) => (g.allergens ?? []).some((a) => a.severity === "anaphylactic" || a.severity === "severe"))
    .map((g) => ({ name: g.fullName, allergens: (g.allergens ?? []).filter((a) => a.severity === "anaphylactic" || a.severity === "severe") }));

  const lines: string[] = [];
  const couple = state.brief ? `${state.brief.organizerName} & ${state.brief.partnerName}` : "the couple";
  lines.push(`Hello,`);
  lines.push("");
  lines.push(`Sharing the dietary brief for ${couple}'s wedding (${state.brief?.dateWindow ?? "TBC"}, ${state.brief?.region ?? ""}). Final headcount: ${yes.length}.`);
  lines.push("");

  if (critical.length) {
    lines.push(`CRITICAL. anaphylactic and severe allergens. Please confirm separate prep, dedicated utensils, and ServSafe protocol:`);
    for (const c of critical) {
      const tags = c.allergens.map((a) => `${ALLERGEN_LABEL[a.code]} (${a.severity})${a.notes ? `. ${a.notes}` : ""}`).join("; ");
      lines.push(`  • ${c.name}: ${tags}`);
    }
    lines.push("");
  }

  if (allergenSummary.length) {
    lines.push("Allergen rollup (count of guests affected):");
    for (const a of allergenSummary) {
      lines.push(`  • ${ALLERGEN_LABEL[a.allergen]}. ${a.count} guest${a.count === 1 ? "" : "s"} (worst severity: ${a.severity})`);
    }
    lines.push("");
  }

  if (preferenceSummary.length) {
    lines.push("Dietary preferences:");
    for (const p of preferenceSummary) {
      lines.push(`  • ${DIETARY_PREF_LABEL[p.preference]}: ${p.count}`);
    }
    lines.push("");
  }

  lines.push("Please confirm: (1) you can accommodate all of the above, (2) ingredient cross-contamination protocol for the critical entries, (3) which menu items will be flagged on place cards / menu cards.");
  lines.push("");
  lines.push(`Thanks,`);
  lines.push(`Corsia on behalf of ${couple}`);

  return {
    guestCount: yes.length,
    allergenSummary,
    preferenceSummary,
    criticalGuests: critical,
    body: lines.join("\n"),
  };
}

// One-liner per table for the day-of console + server briefing card.
export interface TableServiceNote {
  tableId: string;
  tableLabel: string;
  notes: { guestId: string; guestName: string; flag: string; severity: "critical" | "warn" }[];
}

export function tableServiceNotes(state: ProjectState): TableServiceNote[] {
  const out: TableServiceNote[] = [];
  for (const t of state.seating.tables) {
    const seated: TableServiceNote = { tableId: t.id, tableLabel: t.label, notes: [] };
    for (const [guestId, tid] of Object.entries(state.seating.assignments)) {
      if (tid !== t.id) continue;
      const g = state.guests.find((x) => x.id === guestId);
      if (!g) continue;
      for (const a of g.allergens ?? []) {
        seated.notes.push({
          guestId, guestName: g.preferredName ?? g.fullName,
          flag: `${ALLERGEN_LABEL[a.code]}. ${a.severity}${a.notes ? ` · ${a.notes}` : ""}`,
          severity: a.severity === "anaphylactic" || a.severity === "severe" ? "critical" : "warn",
        });
      }
      for (const p of g.dietaryPreferences ?? []) {
        seated.notes.push({
          guestId, guestName: g.preferredName ?? g.fullName,
          flag: DIETARY_PREF_LABEL[p],
          severity: "warn",
        });
      }
    }
    if (seated.notes.length) out.push(seated);
  }
  return out;
}

// Stat helpers used by the dietary screen
export function dietaryStats(guests: Guest[]) {
  const yes = guests.filter((g) => g.rsvp === "yes" || g.rsvp === "maybe");
  const withAny = yes.filter((g) => (g.allergens?.length ?? 0) + (g.dietaryPreferences?.length ?? 0) > 0).length;
  const withCritical = yes.filter((g) => (g.allergens ?? []).some((a) => a.severity === "anaphylactic" || a.severity === "severe")).length;
  return { totalGuests: yes.length, withAny, withCritical };
}
