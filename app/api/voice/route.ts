import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  addSpeech, appendApproval, readState, updateSpeech, upsertVow,
} from "@/lib/store";
import { voiceSpeech, voiceVows } from "@/lib/agents/voice";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Body = z.discriminatedUnion("op", [
  z.object({ op: z.literal("draft_vows"), whose: z.enum(["organizer", "partner"]), prompts: z.string().min(1) }),
  z.object({ op: z.literal("update_vow"), whose: z.enum(["organizer", "partner"]), patch: z.object({
    draft: z.string().optional(),
    notes: z.string().optional(),
  })}),
  z.object({ op: z.literal("propose_lock_vows"), whose: z.enum(["organizer", "partner"]) }),
  z.object({ op: z.literal("draft_speech"), speaker: z.string().min(1), relationship: z.string().min(1), prompts: z.string().min(1) }),
  z.object({ op: z.literal("update_speech"), id: z.string(), patch: z.object({
    draft: z.string().optional(),
    approved: z.boolean().optional(),
  })}),
]);

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const state = await readState();
  const data = parsed.data;

  // Vows are gated per author.
  if (data.op === "draft_vows" || data.op === "update_vow" || data.op === "propose_lock_vows") {
    if (state.viewer === "partner" && data.whose === "organizer") {
      return NextResponse.json({ error: "I don't have anything to share on that." }, { status: 404 });
    }
    if (state.viewer === "organizer" && data.whose === "partner" && state.gates.vows_partner) {
      return NextResponse.json({ error: "I don't have anything to share on that." }, { status: 404 });
    }
  }

  switch (data.op) {
    case "draft_vows": {
      const out = await voiceVows({ whose: data.whose, prompts: data.prompts });
      const after = await upsertVow(data.whose, { draft: out.draft, notes: out.notes });
      return NextResponse.json({ state: after });
    }
    case "update_vow": {
      const after = await upsertVow(data.whose, data.patch);
      return NextResponse.json({ state: after });
    }
    case "propose_lock_vows": {
      const v = state.vows.find((x) => x.whose === data.whose);
      const after = await appendApproval({
        agent: "Voice", phase: "personal_prep",
        title: `Lock the ${data.whose}'s vows (${v?.wordCount ?? 0} words)?`,
        rationale: `Locking freezes the wording for the ceremony program. You can always read different lines aloud — this just stops the working draft.`,
        risk: "low",
        action: { kind: "lock_vows", whose: data.whose, wordCount: v?.wordCount ?? 0 },
        gateScope: data.whose === "organizer" ? "vows_organizer" : "vows_partner",
      });
      return NextResponse.json({ state: after });
    }
    case "draft_speech": {
      const out = await voiceSpeech({ speaker: data.speaker, relationship: data.relationship, prompts: data.prompts });
      const after = await addSpeech({
        speaker: data.speaker,
        draft: out.draft,
        wordCount: out.draft.trim().split(/\s+/).filter(Boolean).length,
        approved: false,
      });
      return NextResponse.json({ state: after });
    }
    case "update_speech": {
      const after = await updateSpeech(data.id, data.patch);
      return NextResponse.json({ state: after });
    }
  }
}
