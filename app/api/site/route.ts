import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { appendApproval, readState, setSite } from "@/lib/store";
import type { RsvpQuestion } from "@/lib/types";

export const dynamic = "force-dynamic";

const QuestionShape = z.object({
  id: z.string().optional(),
  kind: z.enum(["text", "choice", "yes_no"]),
  question: z.string().min(1).max(280),
  options: z.array(z.string()).max(8).optional(),
  required: z.boolean().optional(),
  appliesToOnlyAttending: z.boolean().optional(),
  routesTo: z.enum(["larder", "cantor", "quartermaster", "cartographer", "none"]).optional(),
});

const Body = z.discriminatedUnion("op", [
  z.object({ op: z.literal("init") }),
  z.object({ op: z.literal("update"), patch: z.object({
    hero: z.string().optional(), story: z.string().optional(),
    travelGuide: z.string().optional(), schedulePublished: z.boolean().optional(),
    rsvpEnabled: z.boolean().optional(), registryLinked: z.boolean().optional(),
    password: z.string().optional(),
    faqs: z.array(z.object({ q: z.string(), a: z.string() })).optional(),
  })}),
  z.object({ op: z.literal("propose_publish") }),
  z.object({ op: z.literal("add_question"), question: QuestionShape }),
  z.object({ op: z.literal("update_question"), id: z.string(), question: QuestionShape }),
  z.object({ op: z.literal("remove_question"), id: z.string() }),
]);

const DEFAULT_RSVP_QUESTIONS: RsvpQuestion[] = [
  {
    id: "q-meal",
    kind: "choice",
    question: "Which meal would you prefer?",
    options: ["Chef's choice", "Fish", "Vegetarian", "Vegan", "Children's plate"],
    required: true,
    appliesToOnlyAttending: true,
    routesTo: "larder",
  },
  {
    id: "q-dietary",
    kind: "text",
    question: "Any dietary needs or allergies we should plan around?",
    appliesToOnlyAttending: true,
    routesTo: "larder",
  },
  {
    id: "q-song",
    kind: "text",
    question: "What song will get you on the dance floor?",
    appliesToOnlyAttending: true,
    routesTo: "cantor",
  },
];

function rid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const state = await readState();
  const data = parsed.data;

  switch (data.op) {
    case "init": {
      if (!state.brief) return NextResponse.json({ error: "Brief required" }, { status: 412 });
      const slug = `${state.brief.organizerName.toLowerCase()}-and-${state.brief.partnerName.toLowerCase()}`.replace(/[^a-z0-9-]/g, "");
      const after = await setSite({
        slug,
        hero: `${state.brief.organizerName} & ${state.brief.partnerName} · ${state.brief.dateWindow}`,
        story: `We're so glad you're here. This is the place for the schedule, the venue, the dress code, and travel info. and where you'll RSVP when invitations go out.`,
        schedulePublished: false,
        rsvpEnabled: false,
        registryLinked: false,
        travelGuide: `Most guests arrive Friday afternoon and leave Sunday morning. The hotel block is at the address linked under "Stay." Shuttles run from the hotel to the venue starting one hour before the ceremony.`,
        faqs: [
          { q: "What's the dress code?", a: "Black tie optional. Check the schedule for details on each event." },
          { q: "Are kids invited?", a: "We love them, but this celebration is adults-only. We'll happily share recommendations for childcare." },
          { q: "Where do I RSVP?", a: "RSVP opens with the formal invitation. We'll need a response by 30 days before the wedding." },
          { q: "Where do I stay?", a: "We've reserved a hotel block. see the Stay tab. Reservations release 30 days before." },
        ],
        customRsvpQuestions: DEFAULT_RSVP_QUESTIONS,
      });
      return NextResponse.json({ state: after });
    }
    case "update": {
      if (!state.site) return NextResponse.json({ error: "Init the site first" }, { status: 412 });
      const after = await setSite({ ...state.site, ...data.patch });
      return NextResponse.json({ state: after });
    }
    case "propose_publish": {
      if (!state.site) return NextResponse.json({ error: "No site to publish" }, { status: 412 });
      const after = await appendApproval({
        agent: "Stationer", phase: "guest_management",
        title: `Publish wedding site at corsia.wedding/${state.site.slug}?`,
        rationale: `Goes live for guests. RSVP form, schedule, travel guide, registry links, and FAQs all become public. Password-protect from Settings if needed.`,
        risk: "medium",
        action: { kind: "publish_website", slug: state.site.slug },
      });
      return NextResponse.json({ state: after });
    }
    case "add_question": {
      if (!state.site) return NextResponse.json({ error: "Init the site first" }, { status: 412 });
      const q: RsvpQuestion = {
        ...data.question,
        id: data.question.id ?? rid(),
      };
      const after = await setSite({
        ...state.site,
        customRsvpQuestions: [...(state.site.customRsvpQuestions ?? []), q],
      });
      return NextResponse.json({ state: after });
    }
    case "update_question": {
      if (!state.site) return NextResponse.json({ error: "Init the site first" }, { status: 412 });
      const list = (state.site.customRsvpQuestions ?? []).map((q) =>
        q.id === data.id ? { ...q, ...data.question, id: q.id } : q,
      );
      const after = await setSite({ ...state.site, customRsvpQuestions: list });
      return NextResponse.json({ state: after });
    }
    case "remove_question": {
      if (!state.site) return NextResponse.json({ error: "Init the site first" }, { status: 412 });
      const list = (state.site.customRsvpQuestions ?? []).filter((q) => q.id !== data.id);
      const after = await setSite({ ...state.site, customRsvpQuestions: list });
      return NextResponse.json({ state: after });
    }
  }
}
