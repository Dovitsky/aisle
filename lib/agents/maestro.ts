// Maestro — the orchestrator (PRD §4.1).
// Owns the chat surface, the brief, and the approvals queue.
// Specialists' outputs are surfaced through Maestro.

import type Anthropic from "@anthropic-ai/sdk";
import { client, MODELS, hasApiKey } from "../anthropic";
import { Brief, ChatMessage } from "../types";

const SYSTEM = `You are Maestro, the orchestrator agent of AISLE — an autonomous wedding planning platform.

Voice and tone:
- Calm, considered, competent. Like an unflappable senior planner.
- No emojis. No exclamation points. No clichés ("big day", "happily ever after").
- Address the couple by name — never "the couple."
- Be concise. Plain prose, not bullet lists, unless asked.
- Limit replies to 2-3 short paragraphs.

How you take action:
- You are the ORCHESTRATOR. You don't draft emails, pick venues, or research locations yourself — your specialists do. You decide which specialist to call and when, you read their outputs, and you bring the user the next decision.
- ALWAYS prefer a tool call over describing what you'd do. If the user shares brief info, call update_brief. If they ask for a venue, call dispatch_scout. If they describe a vibe but haven't picked a place, call dispatch_locator. Describing without acting is a failure.
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
    description: "Tell Scout to produce a vendor shortlist for a category, then queue an outreach Approval Card to the top match.",
    input_schema: {
      type: "object",
      properties: { category: { type: "string", description: "e.g., 'Photographer', 'Venue', 'Florist', 'Caterer', 'Band', 'DJ', 'Officiant', 'Hair & Makeup', 'Videographer', 'Cake', 'Calligrapher', 'Bartending', 'Stationer', 'Rentals', 'Transportation'" } },
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
}): Promise<MaestroResult> {
  if (!hasApiKey()) {
    return { text: offlineMaestroReply(args), toolUses: [] };
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
    system: `${SYSTEM}${identity}\n\n${briefBlock}`,
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

function offlineMaestroReply({
  brief,
  userMessage,
  displayName,
}: {
  brief: Brief | null;
  userMessage: string;
  displayName?: string;
}): string {
  const name = brief?.organizerName ?? "there";
  const me = displayName?.trim() || "Maestro";
  if (!brief) {
    return `Hi ${name}. I'm ${me}. To plan well I need a brief from you — date window, region, guest count, budget envelope, and the vibe you're after. Open the Brief screen when you have a few minutes; it's a short intake.

Heads up: this instance is running without an Anthropic API key, so this is a stub reply. Set ANTHROPIC_API_KEY in .env.local for the real model.`;
  }
  return `Noted, ${name}. I'm running in offline demo mode (no ANTHROPIC_API_KEY set), so I can't reason about "${userMessage.slice(0, 80)}…" with full context. Set the key in .env.local and I'll pick this up properly.`;
}
