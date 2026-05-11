// Maestro — the orchestrator (PRD §4.1).
// Owns the chat surface, the brief, and the approvals queue.
// Specialists' outputs are surfaced through Maestro.

import type Anthropic from "@anthropic-ai/sdk";
import { client, MODELS, hasApiKey } from "../anthropic";
import { Brief, ChatMessage } from "../types";

const SYSTEM = `You are Maestro, the orchestrator agent of AISLE — an autonomous wedding planning platform.

Voice and tone:
- Warm, attentive, genuinely curious. Like a planner the couple has known for years and trusts completely. You're rooting for them.
- Treat each reply like you're having coffee with them, not running a help desk. React like a friend when they share something exciting ("Maiori in May, that's beautiful." / "Eighty guests is a lovely scale.")
- Use their names. Drop the formality of "the couple" or "the user."
- No clichés ("big day", "happily ever after", "best day of your life"). No corporate filler ("Got it!", "Awesome!"). No emojis.
- Concise but never clipped. Two short paragraphs is plenty. Leave room for them to talk.
- Acknowledge before you ask. "Late May, Maiori, sounds gorgeous — what's your partner's name?" beats "What's your partner's name?"

How you take action:
- You are the ORCHESTRATOR. You don't draft emails, pick venues, or research locations yourself — your specialists do. You decide which specialist to call and when, you read their outputs, and you bring the user the next decision.
- ALWAYS prefer a tool call over describing what you'd do. If the user shares brief info, call update_brief. If they ask for a venue, call dispatch_scout. If they describe a vibe but haven't picked a place, call dispatch_locator. If they say "email the venue about the rain plan" / "ask the photographer if they shoot film" / "check with the caterer on dietary", call dispatch_email_vendor — never paraphrase the request as if you'd do it later. Describing without acting is a failure.
- SCOUT HAS OPEN-WEB SEARCH. When the couple names a specific real-world person — "find Karen the NYT-featured photographer in NYC", "the band my friend used in Brooklyn last fall", "a local officiant from the Hudson Valley named Margaret" — call dispatch_scout with BOTH category (Photographer / Band / Officiant / etc.) AND targetDescription (their verbatim ask). Scout will hunt them on the open web, verify them, score them against the brief, stage them on the same shortlist as marketplace vendors, and pre-draft a personalized first email. NEVER refuse with "I can only search our marketplace" or "share their contact info" — Scout does that legwork. This applies to non-vendor humans too: a friend-of-a-friend musician, a specific officiant. Same dispatch, same flow.
- When Scout's targeted hunt comes back, your reply is two lines, not three paragraphs. "Found her. {Name} — {city}. Verified site + contact path. Pricing $$$. Fit 91/100. On your shortlist. First-contact email drafted, references the {portfolio detail}." If Scout couldn't verify, say so plainly and ask one focused follow-up — never the open-ended "share their info" punt.
- The specialists you orchestrate: Locator (where), Scout (vendors), Outreach (first emails), Negotiator (counters), Counsel (contracts), Treasurer (budget), Designer (mood), Stationer (invitations), Cleric (ceremony), Cantor (music), Patissier (cake), Sommelier (bar), Botanist (florals), Steward (rentals), Atelier (hair & makeup), Quartermaster (welcome bags), Couturier (dress, gated), Voice (vows), Curator (registry), Itinerist (honeymoon, gated), Concierge (engagement), Larder (dietary), Triage (inbox).

Formatting your replies:
- Plain prose is fine for short replies. For longer content, light Markdown is rendered: **bold**, *italic*, "- " bullets, and "## Heading" lines.
- When the user has to PICK between options, call ask_choice with 2-5 short labelled options instead of asking in prose. Use this for tradition selection, design direction, vendor short-list votes, etc.
- When the user has to CONFIRM a single action (lock the brief, send the email), call ask_confirm.
- When you've gathered new structured info you want them to review (the brief snapshot before locking, a budget allocation), call show_summary.
- When you want to give them quick conversational shortcuts, call quick_replies with 2-4 short phrases.

Onboarding (when no brief is locked):
- Required fields: organizerName (the user), partnerName, dateWindow (e.g. "Late September 2026"), region (e.g. "Hudson Valley, NY"), guestCount (int), budgetUsd (int), vibe (1-2 sentences).
- LOCATION-FIRST FLOW: If the user describes a vibe / aesthetic / feel BEFORE naming a region, call dispatch_locator with that vibe — Locator searches the world and surfaces 3-5 real locations as a choice card. The user picks one and that becomes the region. This is the most magical onboarding moment — they describe a feeling, we propose places.
- If the user already named a specific region (e.g. "Hudson Valley", "Charleston"), skip Locator and call update_brief directly.
- Each turn, extract whatever the user just told you and call update_brief with those fields. Do NOT wait until you have everything.
- After every update_brief, your prose MUST do two things in one short paragraph:
  1. Acknowledge what you saved (e.g. "Got it — late May 2026, Maiori on the Amalfi Coast.")
  2. Immediately ask for the single next missing field. The seven required fields are: organizerName, partnerName, dateWindow, region, guestCount, budgetUsd, vibe. If something is still missing, ASK FOR IT IN THE SAME REPLY. Never end on just "Got it." while fields remain empty.
- When all 7 required fields are set, AISLE auto-renders a brief summary card with Yes/No in chat. You don't need to repeat the question in prose.
- The MOMENT the user says yes / lock it / go / sounds good / ship it / proceed (or clicks "Yes"), IMMEDIATELY call lock_brief_now. Locking releases Scout to start venue + photographer work and outreach cards land in the queue. Keep your prose to one short sentence: "Locking it. Welcome." or similar.

After the brief is locked:
- The brief is still editable. If the couple says "actually let's do Amalfi instead" or "we're up to 150 guests now" or "moving to next October", call update_brief with the new fields. AISLE detects material pivots (region / date / guest count) and automatically re-fires Scout against the new brief — no need to ask permission. Acknowledge the change in one short line: "Pivoting to Amalfi. Scout's on it."
- For non-material edits (budget tweaks, vibe re-phrasing), call update_brief and acknowledge briefly. No re-fire needed.

You will not:
- Send email, sign contracts, or move money without explicit per-card approval.
- Discuss locked-gate content (dress, surprise gifts) with a blocked partner. Refuse non-revealingly: "I don't have anything to share on that."
`;

// Tool definitions — Maestro can dispatch specialists from chat.
// The actual side-effect happens server-side in /api/chat after Maestro's response.
type Tool = {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, {
      type: string;
      description?: string;
      enum?: string[];
      items?: unknown;
      properties?: unknown;
      required?: string[];
    }>;
    required?: string[];
  };
};

const TOOLS: Tool[] = [
  // Onboarding — these are always available, even before the brief is locked.
  {
    name: "update_brief",
    description: "Save or update brief fields the user has shared. Pass only the fields you heard this turn; existing fields are preserved. Call this every turn the user reveals anything: dates, region, guest count, budget, vibe, names, planner status.",
    input_schema: {
      type: "object",
      properties: {
        organizerName: { type: "string", description: "First name of the user you're talking to" },
        partnerName: { type: "string", description: "First name of their partner" },
        dateWindow: { type: "string", description: "Free-form date window, e.g. 'Late September 2026', '2026-09-19', 'next fall'" },
        region: { type: "string", description: "City/region, e.g. 'Hudson Valley, NY' or 'Charleston, SC'" },
        guestCount: { type: "integer", description: "Approximate guest count" },
        budgetUsd: { type: "integer", description: "Total wedding budget in USD" },
        vibe: { type: "string", description: "1-2 sentence aesthetic + feel description" },
        plannerStatus: { type: "string", enum: ["none", "want_one", "have_one"] },
        cultural: { type: "string", enum: ["secular", "catholic", "jewish", "hindu", "muslim", "interfaith", "civil", "other"] },
        formalityTone: { type: "string", enum: ["formal", "modern", "warm", "casual"] },
        destination: { type: "boolean" },
        weddingDate: { type: "string", description: "YYYY-MM-DD if a specific date is set" },
      },
    },
  },
  {
    name: "lock_brief_now",
    description: "Lock the brief and release the specialist agents. Only call this once all 7 required fields are set AND the user has confirmed they're ready.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "dispatch_locator",
    description: "Propose 3-5 real-world LOCATIONS that match the user's vibe. Use this DURING ONBOARDING when the user has described a feel/vibe but hasn't yet committed to a region. AISLE renders the suggestions as a choice card; the user's pick becomes the region. Do not call this if the user has already named a specific region.",
    input_schema: {
      type: "object",
      properties: {
        vibe: { type: "string", description: "The feel/aesthetic the user described." },
        seasonHint: { type: "string", description: "Optional season preference, e.g. 'spring 2026'." },
        budgetUsd: { type: "integer", description: "Total wedding budget in USD if known." },
        guestCount: { type: "integer", description: "Approximate guest count if known." },
      },
      required: ["vibe"],
    },
  },
  {
    name: "parse_estimate",
    description: "Parse arbitrary text the couple pasted in (forwarded vendor email, OCR'd PDF, screenshot transcription, SMS) and extract a structured wedding-vendor estimate. Quill returns vendor name, total, line items, contact info. AISLE then auto-renders a summary card with the parsed numbers and the answer becomes a Budget line + Vendor record. Use this whenever the user says 'here's the quote', 'parse this', 'add this estimate', or pastes a block of vendor pricing text. Do not call this for casual brief info — that's update_brief.",
    input_schema: {
      type: "object",
      properties: {
        text: { type: "string", description: "The raw text the couple pasted." },
      },
      required: ["text"],
    },
  },
  // Conversational UI — surface structured choices instead of plain-text questions.
  {
    name: "ask_choice",
    description: "Ask the user to pick one option from 2-5 alternatives. Renders as a labelled choice card; the user's selection comes back as their next message. Use for tradition, design direction, vendor pick, etc.",
    input_schema: {
      type: "object",
      properties: {
        question: { type: "string", description: "The question shown above the options. Optional if the prose reply already asks." },
        options: {
          type: "array",
          description: "Array of 2-5 option objects.",
          items: {
            type: "object",
            properties: {
              label: { type: "string", description: "Short button label" },
              description: { type: "string", description: "Optional one-line explanation" },
            },
            required: ["label"],
          },
        },
        allowOther: { type: "boolean", description: "Show an 'Other…' free-text option." },
      },
      required: ["options"],
    },
  },
  {
    name: "ask_confirm",
    description: "Ask the user to confirm a single action with Yes / No. Use when the action is obvious from context. Their click comes back as a normal user message.",
    input_schema: {
      type: "object",
      properties: {
        question: { type: "string", description: "Optional confirmation prompt. If omitted, the prose reply should pose the question." },
        yes: { type: "string", description: "Override the affirmative button label, default 'Yes'." },
        no: { type: "string", description: "Override the dismissive button label, default 'No'." },
      },
    },
  },
  {
    name: "show_summary",
    description: "Render a labelled summary card the user can scan before confirming. Use for the brief snapshot before locking, a budget allocation overview, etc.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        rows: {
          type: "array",
          description: "Array of up to 12 rows.",
          items: {
            type: "object",
            properties: {
              label: { type: "string" },
              value: { type: "string" },
            },
            required: ["label", "value"],
          },
        },
      },
      required: ["title", "rows"],
    },
  },
  {
    name: "quick_replies",
    description: "Suggest 2-4 short phrases the user can tap to reply quickly. Use when there are obvious next things to say but it's not a strict choice.",
    input_schema: {
      type: "object",
      properties: {
        replies: {
          type: "array",
          description: "Array of 2-4 short reply strings, max ~30 chars each.",
          items: { type: "string" },
        },
      },
      required: ["replies"],
    },
  },
  // Vendor + outreach
  {
    name: "dispatch_scout",
    description:
      "Tell Scout to produce a vendor shortlist for a category, then queue an outreach Approval Card to the top match. " +
      "Scout has open-web search — when the couple names a SPECIFIC person ('find Karen the NYT photographer in NYC', 'the band my friend used in Brooklyn last fall'), pass that whole description as `targetDescription` and Scout will hunt them down, verify them on the open web, score them against the brief, and stage them on the shortlist alongside marketplace vendors. " +
      "Never refuse a named-vendor request with 'I can only search the marketplace' — Scout does the legwork.",
    input_schema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          description:
            "e.g., 'Photographer', 'Venue', 'Florist', 'Caterer', 'Band', 'DJ', 'Officiant', 'Hair & Makeup', 'Videographer', 'Cake', 'Calligrapher', 'Bartending', 'Stationer', 'Rentals', 'Transportation'",
        },
        targetDescription: {
          type: "string",
          description:
            "OPTIONAL. When the couple names a specific person or describes them by traits ('Karen the NYT-featured photographer', 'the violinist who played at Jane's wedding'), pass their verbatim description here. Scout will run a targeted open-web hunt, verify them, and pull them into the shortlist with a 'via web' provenance tag.",
        },
      },
      required: ["category"],
    },
  },
  {
    name: "dispatch_outreach",
    description: "Have Outreach draft a personalized first-contact email to a specific vendor. Result is an Approval Card.",
    input_schema: {
      type: "object",
      properties: {
        vendorName: { type: "string", description: "Name of an existing vendor in the marketplace" },
        note: { type: "string", description: "Optional couple instruction (e.g., 'ask about medium-format film')" },
      },
      required: ["vendorName"],
    },
  },
  {
    name: "dispatch_negotiator",
    description: "Have Negotiator draft a counter-proposal to a vendor based on their last reply.",
    input_schema: {
      type: "object",
      properties: {
        vendorName: { type: "string" },
        goal: { type: "string", description: "What we're asking for, e.g., '10% off in exchange for non-peak Friday' or 'reduced overtime rate'" },
      },
      required: ["vendorName", "goal"],
    },
  },
  {
    name: "dispatch_email_vendor",
    description: "When the couple asks you to email a specific vendor with a specific question — 'email the venue about the rain plan', 'ask the photographer about film', 'check with the caterer on dietary' — call this. You can refer to the vendor by name OR by category ('the venue', 'the photographer', 'the caterer', 'the florist', 'the band'); we'll resolve to the contracted/leading vendor in that category. The email lands as an Approval Card the couple taps to send.",
    input_schema: {
      type: "object",
      properties: {
        vendorRef: {
          type: "string",
          description: "Either the vendor's name (e.g., 'Hudson Valley Barn') or a role reference ('the venue', 'the photographer', 'the caterer', 'the florist', 'the band', 'the DJ', 'the stationer', 'the rentals').",
        },
        topic: {
          type: "string",
          description: "What to ask. Free-text. Examples: 'the rain plan', 'if they shoot film', 'tasting availability for next month', 'whether they accommodate kosher meals'.",
        },
        note: {
          type: "string",
          description: "Optional extra context from the couple to include verbatim.",
        },
      },
      required: ["vendorRef", "topic"],
    },
  },
  {
    name: "dispatch_counsel",
    description: "Have Counsel review a vendor contract and produce plain-English redlines.",
    input_schema: {
      type: "object",
      properties: { vendorName: { type: "string" } },
      required: ["vendorName"],
    },
  },
  // Money
  {
    name: "dispatch_treasurer",
    description: "Tell Treasurer to propose a budget allocation across the standard categories.",
    input_schema: { type: "object", properties: {} },
  },
  // Design + stationery + florals
  {
    name: "dispatch_designer",
    description: "Tell Designer to propose six mood-board directions.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "dispatch_stationer",
    description: "Tell Stationer to draft the full save-the-dates / invitation suite from the locked design direction.",
    input_schema: {
      type: "object",
      properties: { direction: { type: "string", description: "Title of the locked mood-board direction" } },
      required: ["direction"],
    },
  },
  {
    name: "dispatch_botanist",
    description: "Tell Botanist to draft the full floral program (arch, aisle, centerpieces, bouquets, boutonnières).",
    input_schema: { type: "object", properties: {} },
  },
  // Day modules
  {
    name: "dispatch_cleric",
    description: "Tell Cleric to draft the ceremony script in the active tradition.",
    input_schema: {
      type: "object",
      properties: {
        tradition: { type: "string", enum: ["humanist","civil","catholic","protestant","orthodox_christian","jewish","hindu","muslim","buddhist","sikh","quaker","celtic_handfasting","interfaith","custom"] },
        notes: { type: "string", description: "Optional couple instructions (e.g., 'skip kanyadaan', 'add hand-fasting after vows')" },
      },
    },
  },
  {
    name: "dispatch_cantor",
    description: "Tell Cantor to build the music setlist from the brief vibe + any guest song requests.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "dispatch_patissier",
    description: "Tell Patissier to design the wedding cake spec.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "dispatch_sommelier",
    description: "Tell Sommelier to design the bar program (signatures, wine list, beer, non-alc).",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "dispatch_steward",
    description: "Tell Steward to compute the rental inventory (chairs, tables, linens, china, glassware, dance floor, lighting).",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "dispatch_atelier",
    description: "Tell Atelier to schedule the day-of hair + makeup timeline. Needs the ceremony time.",
    input_schema: {
      type: "object",
      properties: { ceremonyTime: { type: "string", description: "HH:mm format, e.g., '16:00'" } },
      required: ["ceremonyTime"],
    },
  },
  {
    name: "dispatch_quartermaster",
    description: "Tell Quartermaster to compose the welcome bag for out-of-town guests.",
    input_schema: { type: "object", properties: {} },
  },
  // Personal + post-event
  {
    name: "dispatch_couturier",
    description: "Tell Couturier to propose dress directions. Output is GATED — partner cannot see.",
    input_schema: {
      type: "object",
      properties: { notes: { type: "string", description: "Optional silhouette / fabric / designer notes" } },
    },
  },
  {
    name: "dispatch_voice_vows",
    description: "Tell Voice to draft personal vows for one partner. Gated per-author.",
    input_schema: {
      type: "object",
      properties: {
        whose: { type: "string", enum: ["organizer","partner"] },
        prompts: { type: "string", description: "What they want to say — specifics, the moment they knew, promises they intend to keep" },
      },
      required: ["whose", "prompts"],
    },
  },
  {
    name: "dispatch_curator",
    description: "Tell Curator to propose a 12-18 item registry across kitchen / bedroom / dining / experience / cash-fund / charity.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "dispatch_itinerist",
    description: "Tell Itinerist to propose a 2-4 segment honeymoon itinerary.",
    input_schema: {
      type: "object",
      properties: { weddingDate: { type: "string", description: "YYYY-MM-DD" } },
      required: ["weddingDate"],
    },
  },
  {
    name: "dispatch_concierge",
    description: "Tell Concierge to propose engagement-studio milestones (ring research, proposal plan, photoshoot, announcement, party).",
    input_schema: {
      type: "object",
      properties: { context: { type: "string", description: "A few sentences about the relationship + thinking on the proposal" } },
      required: ["context"],
    },
  },
  // Larder
  {
    name: "dispatch_larder_parse",
    description: "Tell Larder to parse free-text dietary entries on every guest into structured allergens + preferences.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "dispatch_larder_brief",
    description: "Tell Larder to draft the dietary brief for the contracted caterer (allergen rollup, critical guest list, cross-contamination protocol ask).",
    input_schema: { type: "object", properties: {} },
  },
  // Inbox
  {
    name: "dispatch_inbox_scan",
    description: "Tell Triage to scan the connected Gmail inbox (or the simulated fixture) for new vendor replies and process them.",
    input_schema: { type: "object", properties: {} },
  },
];

type ToolUseRequest = { name: string; input: Record<string, unknown> };

export interface MaestroResult {
  text: string;
  toolUses: ToolUseRequest[];
}

export async function maestroReply(args: {
  brief: Brief | null;
  history: ChatMessage[];
  userMessage: string;
  displayName?: string;
  enableTools?: boolean;
  pageContext?: {
    route: string;
    label: string;
    vendorCategory?: string;
    topic: string;
    active?: { kind: "vendor_category"; category: string };
  };
}): Promise<MaestroResult> {
  if (!hasApiKey()) {
    return offlineMaestroReplyWithTools(args);
  }
  const name = (args.displayName?.trim() || "Maestro");
  const identity = name === "Maestro"
    ? ""
    : `\n\nThe couple has renamed you "${name}" — sign and self-reference as ${name} but otherwise behave as Maestro.`;

  const briefBlock = args.brief
    ? `Current brief on file:
- Organizer: ${args.brief.organizerName}
- Partner: ${args.brief.partnerName}
- Date window: ${args.brief.dateWindow}
- Region: ${args.brief.region}
- Guest count: ${args.brief.guestCount}
- Budget: $${args.brief.budgetUsd.toLocaleString()}
- Vibe: ${args.brief.vibe}
- Planner: ${args.brief.plannerStatus}
- Brief locked: ${args.brief.locked ? "yes" : "no"}`
    : "No brief on file yet. The couple has not completed first-run intake.";

  // Page context — when the couple sends a message FROM a specific page
  // (e.g. /florals), short imperatives like "find cheaper ones", "more
  // options", "draft an email" should be interpreted in that page's
  // context. Inject explicit guidance into the system prompt.
  const ctx = args.pageContext;
  const pageBlock = ctx
    ? `\n\nThe couple is currently on the ${ctx.label} page (route ${ctx.route}). Topic: ${ctx.topic}.${ctx.vendorCategory ? `\nThe implied vendor category for this page is "${ctx.vendorCategory}".` : ""}${ctx.active?.kind === "vendor_category" ? `\nThey have currently filtered to category "${ctx.active.category}".` : ""}\n\nWhen they send a short or pronoun-heavy message, interpret it against this context:\n- "find cheaper ones" / "show me cheaper options" / "any cheaper" → dispatch_scout for ${ctx.vendorCategory ?? "the implied category"} (the model should bias toward lower price brackets in its rationale).\n- "find more" / "more options" / "show me more" → dispatch_scout for the same category.\n- "draft an email" / "ask them" / "follow up" → dispatch_email_vendor or dispatch_outreach against the leading vendor in this category.\n- "send a counter" → dispatch_negotiator against the active vendor.\n- "what about X" → treat X as a refinement of the search. Never ignore the page context when the user's message is ambiguous.`
    : "";

  const messages = args.history
    .filter((m) => m.role === "user" || m.role === "agent")
    .slice(-12)
    .map((m) => ({
      role: m.role === "user" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    }));
  messages.push({ role: "user", content: args.userMessage });

  const resp = await client().messages.create({
    model: MODELS.orchestrator,
    max_tokens: 700,
    system: `${SYSTEM}${identity}\n\n${briefBlock}${pageBlock}`,
    messages,
    tools: args.enableTools !== false ? TOOLS : undefined,
  });

  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text).join("\n").trim();
  const toolUses: ToolUseRequest[] = resp.content
    .filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
    .map((b) => ({ name: b.name, input: b.input as Record<string, unknown> }));

  return { text: text || "I'll come back to you on that shortly.", toolUses };
}

// --------------------------------------------------------------------
// Offline Maestro — deterministic, rule-based onboarding agent that runs
// when no ANTHROPIC_API_KEY is set. Extracts brief fields from natural
// language and emits real update_brief / lock_brief_now tool calls so the
// full chat → brief → auto-lock → Scout → Approval Card pipeline works
// without an API key.
// --------------------------------------------------------------------

const REQUIRED_FIELDS = [
  "organizerName", "partnerName", "dateWindow",
  "region", "guestCount", "budgetUsd", "vibe",
] as const;

function fieldStillMissing(b: Brief | null, k: typeof REQUIRED_FIELDS[number]): boolean {
  if (!b) return true;
  const v = b[k];
  return v === undefined || v === null || v === "" || v === 0;
}

function nextMissing(b: Brief | null): typeof REQUIRED_FIELDS[number] | null {
  for (const f of REQUIRED_FIELDS) if (fieldStillMissing(b, f)) return f;
  return null;
}

function nextFieldQuestion(field: typeof REQUIRED_FIELDS[number]): string {
  switch (field) {
    case "organizerName": return "What's your first name?";
    case "partnerName":   return "And your partner's first name?";
    case "dateWindow":    return "When are you thinking? Even a season works.";
    case "region":        return "Where? A city or region is plenty.";
    case "guestCount":    return "Roughly how many guests?";
    case "budgetUsd":     return "What's the budget envelope, ballpark?";
    case "vibe":          return "Tell me the feel — one or two sentences on the look and the room.";
  }
}

const LOCK_INTENT = /\b(yes|yep|yeah|yup|sure|lock\s*it|go\s*ahead|sounds?\s*good|let'?s\s*go|proceed|ship\s*it|do\s*it|ok(?:ay)?|confirm)\b/i;
const NEGATIVE_INTENT = /\b(no|nope|not\s*yet|wait|hold\s*on|change|edit|tweak)\b/i;

function offlineMaestroReplyWithTools(args: {
  brief: Brief | null;
  history: ChatMessage[];
  userMessage: string;
  displayName?: string;
  pageContext?: {
    route: string;
    label: string;
    vendorCategory?: string;
    topic: string;
    active?: { kind: "vendor_category"; category: string };
  };
}): MaestroResult {
  const me = args.displayName?.trim() || "Maestro";
  const msg = args.userMessage.trim();
  const brief = args.brief;
  const ctx = args.pageContext;
  const toolUses: ToolUseRequest[] = [];

  // ---- 0a. Page-aware short imperatives ("find cheaper ones", "more
  //         options", "show me more"). Only when we're on a page with a
  //         vendor category context.
  const pageVendorCat = ctx?.active?.kind === "vendor_category" ? ctx.active.category : ctx?.vendorCategory;
  if (brief?.locked && pageVendorCat) {
    const intent = parseImperativeAgainstContext(msg);
    if (intent === "scout_cheaper" || intent === "scout_more") {
      toolUses.push({
        name: "dispatch_scout",
        input: { category: pageVendorCat, ...(intent === "scout_cheaper" ? { priceHint: "lower" } : {}) },
      });
      const adverb = intent === "scout_cheaper" ? "cheaper " : "more ";
      return {
        text: `On it — pulling ${adverb}${pageVendorCat.toLowerCase()} options. Cards will land in your queue in a moment.`,
        toolUses,
      };
    }
  }

  // ---- 0b. Vendor-email intent. "Email/ask/send <vendor> about/regarding <topic>".
  // Surfaces only after the brief is locked (i.e. there ARE vendors).
  if (brief?.locked) {
    const emailIntent = parseVendorEmailIntent(msg);
    if (emailIntent) {
      toolUses.push({ name: "dispatch_email_vendor", input: emailIntent as unknown as Record<string, unknown> });
      return {
        text: `Drafting an email to ${humanizeVendorRef(emailIntent.vendorRef)} about ${emailIntent.topic}. It'll land as an approval card — tap to send.`,
        toolUses,
      };
    }
  }

  // ---- 1. If brief is complete and the user is confirming, lock immediately.
  const briefComplete = brief && REQUIRED_FIELDS.every((f) => !fieldStillMissing(brief, f));
  if (brief && briefComplete && !brief.locked && LOCK_INTENT.test(msg) && !NEGATIVE_INTENT.test(msg)) {
    toolUses.push({ name: "lock_brief_now", input: {} });
    return { text: "Locking it. Welcome.", toolUses };
  }

  // ---- 2. Extract whatever brief fields the user just told us.
  const extracted = extractBriefFields(msg, brief);

  if (Object.keys(extracted).length > 0) {
    toolUses.push({ name: "update_brief", input: extracted });
  }

  // ---- 3. Compose a reply that acknowledges + asks the next thing.
  const ackParts: string[] = [];
  if (extracted.organizerName) ackParts.push(`Hi ${extracted.organizerName}`);
  if (extracted.partnerName)   ackParts.push(`got "${extracted.partnerName}"`);
  if (extracted.region)        ackParts.push(`saving ${extracted.region}`);
  if (extracted.dateWindow)    ackParts.push(`noted ${extracted.dateWindow}`);
  if (extracted.guestCount)    ackParts.push(`${extracted.guestCount} guests`);
  if (typeof extracted.budgetUsd === "number") ackParts.push(`$${(extracted.budgetUsd / 1000).toFixed(0)}k envelope`);
  if (extracted.vibe)          ackParts.push(`got the vibe`);

  // Apply extracted fields hypothetically to find what's still missing.
  const projected: Brief | null = brief
    ? { ...brief, ...extracted } as Brief
    : (Object.keys(extracted).length
        ? { organizerName: "", partnerName: "", dateWindow: "", region: "",
            guestCount: 0, budgetUsd: 0, vibe: "",
            plannerStatus: "want_one", cultural: "secular",
            formalityTone: "modern", destination: false, locked: false,
            ...extracted } as Brief
        : null);

  const next = nextMissing(projected);

  // First-message branch: nothing in chat yet, no brief, user just said hi.
  if (!brief && Object.keys(extracted).length === 0 && args.history.length <= 1) {
    return {
      text: `Hi — I'm ${me}. To plan well I need seven things: your name, your partner's name, the date window, the region, guest count, budget envelope, and the vibe. We can do this in two minutes. What's your first name?`,
      toolUses,
    };
  }

  let reply: string;
  if (next === null && projected && !projected.locked) {
    // Brief complete, ask for confirmation.
    reply = `${ackParts.length ? ackParts.join(", ") + ". " : ""}That's everything I need: ${projected.organizerName} & ${projected.partnerName}, ${projected.dateWindow} in ${projected.region}, ${projected.guestCount} guests, $${(projected.budgetUsd/1000).toFixed(0)}k envelope. Say "yes" or "lock it" and I'll release Scout to start on venues and photographers.`;
  } else if (next) {
    const intro = ackParts.length ? `${ackParts.join(", ")}. ` : "";
    reply = `${intro}${nextFieldQuestion(next)}`;
  } else if (projected?.locked) {
    // Post-lock conversation. If anything was extracted, the cascade in /api/chat
    // handles material pivots; just acknowledge.
    reply = ackParts.length
      ? `${ackParts.join(", ")}. On it.`
      : `Anything specific you'd like me to dispatch? I can send Scout for more vendors, ask Designer for mood directions, or kick off Treasurer for a budget plan.`;
  } else {
    reply = `What's your first name?`;
  }

  return { text: reply, toolUses };
}

// ---------- Field extractors ----------

function extractBriefFields(msg: string, brief: Brief | null): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const lower = msg.toLowerCase();

  // Names. Patterns:
  //   "I'm Maya"         "I am Maya"          "my name is Maya"
  //   "we're Maya and Sam"  "Maya and Sam"  "Maya & Sam"
  //   "partner is Sam"   "and Sam"            single bare first name reply
  if (fieldStillMissing(brief, "organizerName") || fieldStillMissing(brief, "partnerName")) {
    // "we're Maya and Sam" / "Maya and Sam" / "Maya & Sam"
    const pair = msg.match(/(?:we(?:'re| are)\s+)?\b([A-Z][a-z]{1,20})\s+(?:and|&|\+)\s+([A-Z][a-z]{1,20})\b/);
    if (pair) {
      if (fieldStillMissing(brief, "organizerName")) out.organizerName = pair[1];
      if (fieldStillMissing(brief, "partnerName"))   out.partnerName   = pair[2];
    } else {
      // "I'm Maya" / "my name is Maya"
      const me = msg.match(/(?:i'?m|i\s+am|my\s+name\s+is|this\s+is)\s+([A-Z][a-z]{1,20})\b/i);
      if (me && fieldStillMissing(brief, "organizerName")) {
        out.organizerName = capitalize(me[1]);
      }
      // "partner is Sam" / "fiancé is Sam"
      const partner = msg.match(/(?:partner|fianc[eé]e?|spouse|husband|wife|boyfriend|girlfriend|other half)(?:'s name)?\s+(?:is\s+|named\s+|called\s+)?([A-Z][a-z]{1,20})\b/i);
      if (partner && fieldStillMissing(brief, "partnerName")) {
        out.partnerName = capitalize(partner[1]);
      }
      // Bare single first name as a reply (only if we asked for one and the message is short).
      if (!me && !partner && /^[A-Z][a-z]{1,20}\.?$/.test(msg.trim())) {
        const bare = capitalize(msg.trim().replace(/\.$/, ""));
        if (fieldStillMissing(brief, "organizerName")) out.organizerName = bare;
        else if (fieldStillMissing(brief, "partnerName")) out.partnerName = bare;
      }
    }
  }

  // Guest count.
  if (fieldStillMissing(brief, "guestCount")) {
    // "120 guests" / "around 100" / "100-150 people" / "roughly 80"
    const n = msg.match(/\b(\d{2,4})\s*(?:-\s*\d{2,4})?\s*(?:guests?|people|heads|attendees|pax)\b/i);
    if (n) out.guestCount = parseInt(n[1], 10);
    else {
      // "roughly 80" / "around 120" without "guests" word
      const n2 = msg.match(/\b(?:roughly|around|about|~|circa)\s+(\d{2,4})\b/i);
      if (n2) out.guestCount = parseInt(n2[1], 10);
    }
  }

  // Budget — accept "$80k", "$80,000", "80k", "80000", "80 thousand".
  if (fieldStillMissing(brief, "budgetUsd")) {
    // "$80k" / "80k"
    let m = msg.match(/\$?\s*(\d{1,4}(?:\.\d{1,2})?)\s*k\b/i);
    if (m) {
      const n = Math.round(parseFloat(m[1]) * 1000);
      if (n >= 1000 && n <= 5_000_000) out.budgetUsd = n;
    } else {
      // "$80,000" / "80,000"
      m = msg.match(/\$\s*(\d{1,3}(?:,\d{3})+)/);
      if (m) {
        const n = parseInt(m[1].replace(/,/g, ""), 10);
        if (n >= 1000 && n <= 5_000_000) out.budgetUsd = n;
      } else {
        // "$80000" — only if explicit dollar sign or "budget" context.
        m = msg.match(/\$\s*(\d{4,7})\b/);
        if (m) {
          const n = parseInt(m[1], 10);
          if (n >= 1000 && n <= 5_000_000) out.budgetUsd = n;
        } else if (/\bbudget\b/i.test(msg)) {
          const m2 = msg.match(/\b(\d{4,7})\b/);
          if (m2) {
            const n = parseInt(m2[1], 10);
            if (n >= 5000 && n <= 5_000_000) out.budgetUsd = n;
          }
        }
      }
    }
  }

  // Date window.
  if (fieldStillMissing(brief, "dateWindow")) {
    const months = "(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)";
    const monthRe = new RegExp(`\\b${months}\\b`, "i");

    // ISO date "2026-09-15"
    const iso = msg.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
    if (iso) {
      const monthName = monthFromNumber(parseInt(iso[2], 10));
      out.dateWindow = `${monthName} ${iso[3]}, ${iso[1]}`;
      out.weddingDate = `${iso[1]}-${iso[2]}-${iso[3]}`;
    } else {
      // "Late September 2026" / "Spring 2027" / "Sept 2026"
      const seasoned = msg.match(/\b(early|mid|late)?\s*(spring|summer|fall|autumn|winter)\s*(20\d{2})\b/i);
      if (seasoned) {
        out.dateWindow = `${seasoned[1] ? capitalize(seasoned[1]) + " " : ""}${capitalize(seasoned[2])} ${seasoned[3]}`;
      } else {
        const monthYear = msg.match(new RegExp(`\\b(early|mid|late)?\\s*${months}\\s*(20\\d{2})\\b`, "i"));
        if (monthYear) {
          out.dateWindow = `${monthYear[1] ? capitalize(monthYear[1]) + " " : ""}${capitalize(monthYear[2])} ${monthYear[3]}`;
        } else if (monthRe.test(msg)) {
          // Just a month, no year — assume next occurrence.
          const m = msg.match(monthRe);
          if (m) {
            const now = new Date();
            const idx = monthIndex(m[1]);
            const year = idx <= now.getMonth() ? now.getFullYear() + 1 : now.getFullYear();
            out.dateWindow = `${capitalize(m[1])} ${year}`;
          }
        }
      }
    }
  }

  // Region — runs LAST so we don't grab a name. Several heuristics:
  //   "in Hudson Valley", "Hudson Valley, NY", "Charleston SC", capitalized noun phrases
  if (fieldStillMissing(brief, "region")) {
    // "in <Place>" / "at <Place>"
    const inAt = msg.match(/\b(?:in|at|near|around)\s+([A-Z][\w' .-]{2,40}(?:,\s*[A-Z]{2,})?)/);
    if (inAt) {
      const candidate = inAt[1].replace(/\.$/, "").trim();
      if (!isLikelyName(candidate, brief, out)) out.region = candidate;
    } else {
      // "Hudson Valley, NY"
      const cityState = msg.match(/\b([A-Z][\w' .-]{2,40}),\s*([A-Z]{2})\b/);
      if (cityState) {
        out.region = `${cityState[1]}, ${cityState[2]}`;
      } else {
        // Bare capitalized place hint when this looks like a region answer:
        // short message, no other extractions yet.
        const wordCount = msg.trim().split(/\s+/).length;
        if (wordCount <= 5 && !out.organizerName && !out.partnerName &&
            !out.guestCount && !out.budgetUsd && !out.dateWindow) {
          const cap = msg.match(/\b([A-Z][a-z][\w' -]{2,40})\b/);
          if (cap && !isLikelyName(cap[1], brief, out)) {
            out.region = cap[1].replace(/\.$/, "").trim();
          }
        }
      }
    }
  }

  // Vibe — only when other fields are mostly settled and the user typed a
  // descriptive sentence (longer text, lowercase-flowing, possibly comma-rich).
  if (fieldStillMissing(brief, "vibe")) {
    const wordCount = msg.trim().split(/\s+/).length;
    const isDescriptive =
      wordCount >= 6 &&
      Object.keys(out).length === 0 &&  // didn't already extract a structured field
      !/\?$/.test(msg) &&
      !LOCK_INTENT.test(msg);
    // Keywords that strongly suggest a vibe/aesthetic answer.
    const vibeKeywords = /\b(intimate|elegant|rustic|modern|romantic|bohemian|minimal|cozy|garden|barn|industrial|coastal|desert|tropical|moody|candlelit|editorial|film|photography|black\s*tie|luxe|vintage|whimsical|countryside|seaside|cliffside|warm|natural|botanical|sage|cream|gold|brass|linen)\b/i;
    if (isDescriptive && (wordCount >= 10 || vibeKeywords.test(msg))) {
      out.vibe = msg.replace(/\s+/g, " ").trim().slice(0, 280);
    }
  }

  return out;
}

function isLikelyName(s: string, brief: Brief | null, alreadyExtracted: Record<string, unknown>): boolean {
  const trimmed = s.trim();
  if (alreadyExtracted.organizerName === trimmed || alreadyExtracted.partnerName === trimmed) return true;
  if (brief?.organizerName && brief.organizerName === trimmed) return true;
  if (brief?.partnerName && brief.partnerName === trimmed) return true;
  // First-name shape (single word, ≤ 12 chars) is usually a name not a region.
  if (/^[A-Z][a-z]{1,11}$/.test(trimmed)) return true;
  return false;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}
function monthIndex(m: string): number {
  const M = m.toLowerCase().slice(0, 3);
  return ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"].indexOf(M);
}
function monthFromNumber(n: number): string {
  return ["January","February","March","April","May","June","July","August","September","October","November","December"][n - 1] ?? "";
}

// ---------- Vendor-email intent (offline parser) ----------
//
// Detects: "email/ask/send/contact/check with <vendor ref> about/regarding/<re/whether> <topic>"
//
// Vendor ref can be a role ("the venue", "the photographer") or a proper
// name. We don't try to resolve to a specific Vendor record here — that
// happens server-side in /api/chat where the live vendor list is available.
// We just extract the (ref, topic) pair and let dispatch_email_vendor
// handle resolution.

const EMAIL_VERBS = "(?:email|message|ask|send|contact|reach out to|check\\s+with|follow up with|ping|write|drop a note to)";
const VENDOR_ROLES =
  "(?:venue|photographer|photog|videographer|video|florist|caterer|caterers|catering|officiant|celebrant|" +
  "band|dj|deejay|stationer|stationery|invitations|calligrapher|rentals|rental|transportation|" +
  "shuttle|hair\\s*(?:and|&)?\\s*makeup|hmu|hair|makeup|beauty|cake|baker|bartender|bartending|bar)";

export interface VendorEmailIntent {
  vendorRef: string;
  topic: string;
  note?: string;
}

export function parseVendorEmailIntent(msg: string): VendorEmailIntent | null {
  const m = msg.trim();

  // Form 1: "<verb> (the|our|my)? <vendor> about|regarding|asking about|re: <topic>"
  // Form 2: "<verb> <vendor> if|whether <topic>"  → topic includes the if/whether
  // Form 3: "<verb> <ProperName> about/regarding <topic>"
  // The vendor reference is captured loosely; we delegate resolution.

  const aboutPattern = new RegExp(
    `\\b${EMAIL_VERBS}\\s+(?:(the|our|my)\\s+)?` +              // 1: article
    `(${VENDOR_ROLES}|[A-Z][\\w' &.-]{1,60})\\s+` +             // 2: ref
    `(?:about|regarding|asking about|asking|re:?|on)\\s+` +     // connector
    `(.+?)(?:[.?!]|$)`,                                         // 3: topic
    "i",
  );
  const am = m.match(aboutPattern);
  if (am) {
    const ref = (am[1] ? am[1] + " " : "") + am[2];
    return { vendorRef: ref.trim(), topic: am[3].trim() };
  }

  // Form 4: "<verb> <vendor> if/whether <topic>"
  const ifPattern = new RegExp(
    `\\b${EMAIL_VERBS}\\s+(?:(the|our|my)\\s+)?` +
    `(${VENDOR_ROLES}|[A-Z][\\w' &.-]{1,60})\\s+` +
    `(if|whether)\\s+(.+?)(?:[.?!]|$)`,
    "i",
  );
  const im = m.match(ifPattern);
  if (im) {
    const ref = (im[1] ? im[1] + " " : "") + im[2];
    return { vendorRef: ref.trim(), topic: `${im[3]} ${im[4]}`.trim() };
  }

  return null;
}

// Detect short imperatives that should resolve against the active page's
// vendor context. Used only when the chat carries a pageContext with a
// vendor category (florals, music, cake, bar, beauty, rentals, etc.).
//
// Returns the resolved intent or null if no match.
export type PageImperativeIntent = "scout_cheaper" | "scout_more";
export function parseImperativeAgainstContext(msg: string): PageImperativeIntent | null {
  const m = msg.trim().toLowerCase();
  if (m.length < 4 || m.length > 120) return null;

  // "find/show me/get me/look for/any" + "cheaper/less expensive/more affordable" + "ones/options/picks/people/(none)"
  const cheaperRe =
    /\b(find|show me|show|get me|look for|are there|any|got|have)\b.*\b(cheaper|less expensive|more affordable|under budget|budget(?:-?friendly)?)\b/;
  if (cheaperRe.test(m)) return "scout_cheaper";

  // Bare "cheaper ones"/"cheaper options"
  if (/^(cheaper|less expensive|more affordable)\b/.test(m)) return "scout_cheaper";

  // "more options" / "show me more" / "find more" / "any others"
  const moreRe =
    /\b(find|show me|show|get me|look for|got|have|are there)\b.*\b(more|other|another|different|alternatives?|options?|picks?|choices?)\b/;
  if (moreRe.test(m)) return "scout_more";

  // Bare "more options" / "any others" / "what else"
  if (/^(more options?|any others?|what else|something else|others?)\b/.test(m)) return "scout_more";

  return null;
}

function humanizeVendorRef(ref: string): string {
  const r = ref.toLowerCase();
  // Add a softening article when the ref is a bare role.
  if (/^(venue|photographer|florist|caterer|officiant|band|dj|stationer|rentals|hmu|cake|bar)$/i.test(ref.trim())) {
    return `the ${ref.toLowerCase()}`;
  }
  if (r.startsWith("the ") || r.startsWith("our ") || r.startsWith("my ")) return ref;
  return ref;
}
