// Stationer — generates suite copy and SVG mockups for save-the-dates,
// invitations, response cards, details cards (PRD §5.4.2-5.4.3, §5.4.8).

import type Anthropic from "@anthropic-ai/sdk";
import { client, MODELS, hasApiKey } from "../anthropic";
import { ALLERGEN_LABEL, AllergenCode, Brief, MenuItem, StationeryPiece, StationerySuiteItem } from "../types";

const PIECES: { piece: StationeryPiece; label: string }[] = [
  { piece: "save_the_date", label: "Save the date" },
  { piece: "invitation", label: "Invitation" },
  { piece: "response_card", label: "Response card" },
  { piece: "details_card", label: "Details card" },
  { piece: "menu_card", label: "Menu card" },
  { piece: "place_card", label: "Place card" },
  { piece: "program", label: "Ceremony program" },
  { piece: "thank_you", label: "Thank-you card" },
];

const SYSTEM = `You are Stationer, AISLE's invitation-suite agent.
You write the actual paper-card copy for a couple's full stationery suite.

Voice depends on cultural/formality fields; default is "modern formal" — host line
"Together with their families", names in full, no exclamation points.

Output JSON only:
{ "items": [ { "piece": "save_the_date" | "invitation" | "response_card" | "details_card" | "menu_card" | "place_card" | "program" | "thank_you", "copy": "the literal card text, with newlines between lines" } ] }

Eight items. The copy must be print-ready text — write the literal lines that go on the paper.
For invitations include host line, request line, names, date written long-form, time, place, reception line.
For details card include attire ("Black tie optional" etc.), accommodations line, transportation line.
For response card include reply-by date and meal selection prompt.`;

export async function stationerSuite(args: {
  brief: Brief;
  direction: string;
  menu?: MenuItem[];
}): Promise<StationerySuiteItem[]> {
  if (!hasApiKey()) return offline(args);

  const menuBlock = args.menu && args.menu.length > 0
    ? `\n\nMenu items already locked for the menu_card piece (use these verbatim, with allergen icons V / VG / GF / DF / N / F / K / H in parentheses after each dish):\n${args.menu.map((m) => `- ${m.name}${m.description ? ` — ${m.description}` : ""}${allergenIcons(m) ? "  " + allergenIcons(m) : ""}`).join("\n")}`
    : "";

  const userPrompt = `Brief:
- Couple: ${args.brief.organizerName} & ${args.brief.partnerName}
- Date window: ${args.brief.dateWindow}
- Region: ${args.brief.region}
- Vibe: ${args.brief.vibe}
- Cultural tradition: ${args.brief.cultural ?? "secular"}
- Formality tone: ${args.brief.formalityTone ?? "modern"}

Design direction: ${args.direction}${menuBlock}

Return the eight pieces now.`;

  const resp = await client().messages.create({
    model: MODELS.specialist,
    max_tokens: 2500,
    system: SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
  });
  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text).join("\n").trim();
  const json = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    const parsed = JSON.parse(json);
    const items = Array.isArray(parsed.items) ? parsed.items : [];
    return items.slice(0, 8).map(coerce).filter(Boolean) as StationerySuiteItem[];
  } catch {
    return offline(args);
  }
}

function coerce(raw: unknown): StationerySuiteItem | null {
  const r = (raw ?? {}) as Record<string, unknown>;
  const valid = ["save_the_date", "invitation", "response_card", "details_card", "menu_card", "place_card", "program", "thank_you"];
  if (!valid.includes(String(r.piece))) return null;
  return {
    piece: r.piece as StationeryPiece,
    copy: String(r.copy ?? ""),
  };
}

function offline(args: { brief: Brief; direction: string; menu?: MenuItem[] }): Omit<StationerySuiteItem, "id">[] {
  const b = args.brief;
  const dateLong = formatLongDate(b.dateWindow);
  const replyBy = formatReplyByDate(b.dateWindow);
  const menuLines = (args.menu ?? []).slice(0, 3).map((m) => {
    const allergens = (m.containsAllergens ?? []).map((a: AllergenCode) => ALLERGEN_LABEL[a]).join(", ");
    return `${m.name}${allergens ? ` (${allergens})` : ""}`;
  }).join("\n");

  return [
    { piece: "save_the_date",
      copy: `SAVE THE DATE\n\n${b.organizerName} ${maybeAmp()} ${b.partnerName}\n\n${dateLong}\n\n${b.region}\n\nInvitation to follow.` },
    { piece: "invitation",
      copy: `Together with their families\n\n${b.organizerName.toUpperCase()}\n${maybeAmp().toUpperCase()}\n${b.partnerName.toUpperCase()}\n\nrequest the pleasure of your company\nat the celebration of their marriage\n\n${dateLong}\nat four o'clock in the afternoon\n\n${b.region}\n\nReception to follow.` },
    { piece: "response_card",
      copy: `M ___________________________________\n\n☐ Joyfully accepts\n☐ Regretfully declines\n\nKindly reply by ${replyBy}\n\nMeal selection:\n☐ ${args.menu?.[0]?.name ?? "Chicken"}\n☐ ${args.menu?.[1]?.name ?? "Fish"}\n☐ ${args.menu?.[2]?.name ?? "Vegetarian"}\n\nDietary restrictions: __________________` },
    { piece: "details_card",
      copy: `THE WEEKEND\n\nAttire: ${b.formalityTone === "modern" ? "Cocktail attire" : "Black tie optional"}\n\nHotel block: details and code on our website\naisle.wedding/${slugify(b.organizerName)}-${slugify(b.partnerName)}\n\nTransportation: shuttles will run\nfrom the hotel block to the venue\nstarting at 3:30pm\n\nKindly arrive 30 minutes before the\nceremony so we can begin on time.` },
    { piece: "menu_card",
      copy: menuLines
        ? `THE MENU\n\nFirst\n  ${args.menu?.[0]?.name ?? "Seasonal salad"}\n\nSecond\n  ${args.menu?.[1]?.name ?? "Main course"}\n\nThird\n  ${args.menu?.[2]?.name ?? "Dessert"}\n\nWines paired throughout\n\nThank you for joining us.`
        : `THE MENU\n\nFirst\n  Seasonal salad with shaved fennel\n\nSecond\n  Pan-seared local fish OR\n  braised short rib OR\n  herbed mushroom risotto\n\nThird\n  Olive oil cake with seasonal fruit\n\nWines paired throughout` },
    { piece: "place_card",
      copy: `[Guest first name] [Guest last name]\nTable [N]\n\nHand-calligraphed.` },
    { piece: "program",
      copy: `THE CEREMONY\n\nProcessional\n  Selected by the couple\n\nWelcome\n  Officiant\n\nReadings\n  By [Family member]\n\nVows + Rings\n  ${b.organizerName} ${maybeAmp()} ${b.partnerName}\n\nPronouncement + Recessional\n\nThank you for being here.` },
    { piece: "thank_you",
      copy: `Dear [Guest first name],\n\nThank you for celebrating with us. Your presence on our wedding day meant more than we can say. ${(args.menu?.length ?? 0) > 0 ? "We hope you enjoyed the meal as much as we enjoyed sharing it with you. " : ""}We'll think about that night for the rest of our lives.\n\nWith love,\n${b.organizerName} ${maybeAmp()} ${b.partnerName}` },
  ];
}

function maybeAmp() { return "&"; }
function slugify(s: string): string {
  return (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "us";
}
function formatLongDate(window: string): string {
  // Try to extract month + year from the window string and format it as
  // "Saturday, the eighteenth of October, two thousand twenty-six".
  const iso = window.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const d = new Date(`${iso[1]}-${iso[2]}-${iso[3]}T12:00:00`);
    return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }
  return window;
}
function formatReplyByDate(window: string): string {
  const iso = window.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const d = new Date(`${iso[1]}-${iso[2]}-${iso[3]}T12:00:00`);
    d.setDate(d.getDate() - 30);
    return d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
  }
  // Fall back to "30 days before the wedding" prose.
  return `30 days before ${window}`;
}



export function suiteItemSvg(opts: { copy: string; palette: string[]; piece: StationeryPiece; font: string }): string {
  const bg = opts.palette[0] ?? "#FBF8F1";
  const fg = opts.palette[2] ?? "#1A1814";
  const accent = opts.palette[1] ?? "#7C5E3A";
  const lines = opts.copy.split("\n").slice(0, 8);
  const cy = 200 - (lines.length * 14);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 480"><rect width="360" height="480" fill="${bg}"/><line x1="48" y1="${cy - 30}" x2="312" y2="${cy - 30}" stroke="${accent}" stroke-width="0.5"/>${lines.map((l, i) => `<text x="180" y="${cy + i * 22}" text-anchor="middle" font-family="${opts.font}, serif" font-size="14" fill="${fg}">${escapeXml(l)}</text>`).join("")}<line x1="48" y1="${cy + lines.length * 22 + 14}" x2="312" y2="${cy + lines.length * 22 + 14}" stroke="${accent}" stroke-width="0.5"/></svg>`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}



export function regenerateMenuCard(brief: Brief, menu: MenuItem[]): StationerySuiteItem {
  const courseOrder: Record<string, number> = { hors_doeuvre: 0, first: 1, main: 2, dessert: 3, late_night: 4 };
  const sorted = [...menu].sort((a, b) => (courseOrder[a.course] ?? 9) - (courseOrder[b.course] ?? 9));
  const copy = [
    `${brief.organizerName} & ${brief.partnerName}`,
    "",
    ...sorted.map((m) => `${m.name}${m.description ? " — " + m.description : ""}`),
  ].join("\n");
  return { piece: "menu_card", copy };
}

export function allergenIcons(item: MenuItem): string {
  const tags: string[] = [];
  if (item.isVegan) tags.push("V");
  if (item.isVegetarian && !item.isVegan) tags.push("VG");
  if (item.isGlutenFree) tags.push("GF");
  if (item.isDairyFree) tags.push("DF");
  if (item.isKosher) tags.push("K");
  if (item.isHalal) tags.push("H");
  if ((item.containsAllergens ?? []).includes("tree_nut")) tags.push("N");
  if ((item.containsAllergens ?? []).includes("fish") || (item.containsAllergens ?? []).includes("shellfish")) tags.push("F");
  return tags.join(" / ");
}
