// Public RSVP submission endpoint.
//
// Takes a guest's name + answers, finds the matching guest by case-insensitive
// fullName/preferredName lookup, updates their RSVP, dietary, and song
// request fields based on the routesTo flag on each question.
//
// Privacy: invite-only. The guest must type a name that matches our list.
// We don't reveal whether a name is or isn't on the list (return generic
// "we couldn't find that name" if no match).

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { mutate, readState } from "@/lib/store";
import type { Guest, RsvpState } from "@/lib/types";

export const dynamic = "force-dynamic";

const Body = z.object({
  name: z.string().min(1),
  rsvp: z.enum(["yes", "no", "maybe"]),
  plusOneName: z.string().optional(),
  answers: z.record(z.string(), z.string()).optional(),
});

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function findGuest(state: ReturnType<typeof readState> extends Promise<infer T> ? T : never, name: string): Guest | null {
  const n = norm(name);
  return (
    state.guests.find((g) => norm(g.fullName) === n) ??
    state.guests.find((g) => g.preferredName && norm(g.preferredName) === n) ??
    state.guests.find((g) => norm(g.fullName).startsWith(n) && n.length >= 3) ??
    null
  );
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid form" }, { status: 400 });
  }
  const state = await readState();
  if (!state.site || state.site.slug !== slug) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!state.site.rsvpEnabled) {
    return NextResponse.json({ error: "RSVPs aren't open yet." }, { status: 423 });
  }

  const guest = findGuest(state, parsed.data.name);
  if (!guest) {
    return NextResponse.json(
      { error: "We can't find that name. Try the spelling on your invitation." },
      { status: 404 },
    );
  }

  const questions = state.site.customRsvpQuestions ?? [];
  const answers = parsed.data.answers ?? {};

  // Aggregate route-to fields. Multiple questions can route to the same
  // agent — concatenate answers into the relevant guest field.
  let dietaryAdd = "";
  let songAdd = "";
  for (const q of questions) {
    const a = answers[q.id]?.trim();
    if (!a) continue;
    if (q.routesTo === "larder") {
      dietaryAdd += (dietaryAdd ? " · " : "") + a;
    } else if (q.routesTo === "cantor") {
      songAdd += (songAdd ? " · " : "") + a;
    }
  }

  await mutate((s) => {
    const target = s.guests.find((x) => x.id === guest.id);
    if (!target) return s;
    target.rsvp = parsed.data.rsvp as RsvpState;
    if (parsed.data.plusOneName?.trim()) {
      target.plusOneName = parsed.data.plusOneName.trim();
    }
    if (dietaryAdd) {
      target.dietary = (target.dietary ? target.dietary + " · " : "") + dietaryAdd;
    }
    if (songAdd) {
      target.songRequest = (target.songRequest ? target.songRequest + " · " : "") + songAdd;
    }
    // Stash full answer map under notes for transparency.
    const allAnswered = Object.entries(answers)
      .filter(([, v]) => v?.trim())
      .map(([k, v]) => {
        const q = questions.find((x) => x.id === k);
        return q ? `${q.question} — ${v}` : null;
      })
      .filter(Boolean)
      .join("\n");
    if (allAnswered) {
      target.notes = (target.notes ? target.notes + "\n\n" : "") + `RSVP submission:\n${allAnswered}`;
    }
    return s;
  });

  return NextResponse.json({ ok: true, name: guest.preferredName || guest.fullName });
}
