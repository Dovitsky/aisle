import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  addMusicCue, appendApproval, readState, setMusic, updateMusicCue,
} from "@/lib/store";
import { cantorPropose } from "@/lib/agents/cantor";
import { weddingContext } from "@/lib/agents/context";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Body = z.discriminatedUnion("op", [
  z.object({ op: z.literal("propose") }),
  z.object({ op: z.literal("add"), slot: z.string(), song: z.string(), artist: z.string(), notes: z.string().optional() }),
  z.object({ op: z.literal("update"), id: z.string(), patch: z.object({
    song: z.string().optional(), artist: z.string().optional(), notes: z.string().optional(),
    approved: z.boolean().optional(),
  })}),
  z.object({ op: z.literal("clear") }),
  z.object({ op: z.literal("propose_lock") }),
]);

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const state = await readState();
  const data = parsed.data;
  switch (data.op) {
    case "propose": {
      if (!state.brief?.locked) return NextResponse.json({ error: "Lock the brief first." }, { status: 412 });
      const guestRequests = state.guests.map((g) => g.songRequest).filter(Boolean) as string[];
      const ctx = weddingContext(state) ?? undefined;
      const cues = await cantorPropose({ brief: state.brief, context: ctx, guestRequests });
      let last = state;
      for (const c of cues) last = await addMusicCue(c);
      return NextResponse.json({ state: last, count: cues.length });
    }
    case "add": {
      const after = await addMusicCue({
        slot: data.slot as "first_dance",
        song: data.song, artist: data.artist, notes: data.notes,
      });
      return NextResponse.json({ state: after });
    }
    case "update": {
      const after = await updateMusicCue(data.id, data.patch);
      return NextResponse.json({ state: after });
    }
    case "clear": {
      const after = await setMusic([]);
      return NextResponse.json({ state: after });
    }
    case "propose_lock": {
      const after = await appendApproval({
        agent: "Cantor", phase: "design",
        title: `Lock the setlist (${state.music.length} cues)?`,
        rationale: `Locking sends the setlist to the band/DJ as their working brief. Do-not-play list, processional/recessional/first-dance picks, and the dinner curve are all included.`,
        risk: "low",
        action: { kind: "lock_setlist", cueCount: state.music.length },
      });
      return NextResponse.json({ state: after });
    }
  }
}
