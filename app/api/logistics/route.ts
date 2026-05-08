import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  addHotelBlock, addShuttle, appendApproval, mutate, readState, setWelcomeBag,
  updateHotelBlock, updateShuttle,
} from "@/lib/store";
import { quartermasterPropose } from "@/lib/agents/quartermaster";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Body = z.discriminatedUnion("op", [
  z.object({ op: z.literal("seed_blocks") }),
  z.object({ op: z.literal("propose_block"), hotel: z.string(), nightlyRate: z.number().min(0), rooms: z.number().int().min(1) }),
  z.object({ op: z.literal("update_block"), id: z.string(), patch: z.record(z.unknown()) }),
  z.object({ op: z.literal("seed_shuttles") }),
  z.object({ op: z.literal("update_shuttle"), id: z.string(), patch: z.record(z.unknown()) }),
  z.object({ op: z.literal("propose_welcome_bag") }),
]);

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const state = await readState();
  if (!state.brief?.locked && parsed.data.op !== "seed_blocks") {
    return NextResponse.json({ error: "Lock the brief first." }, { status: 412 });
  }

  switch (parsed.data.op) {
    case "seed_blocks": {
      if (state.hotelBlocks.length) return NextResponse.json({ state });
      const region = state.brief?.region ?? "—";
      const after = await mutate((s) => {
        s.hotelBlocks = [
          { id: "hb1", hotel: "The Roundhouse", city: region, nightlyRateUsd: 320, roomsBlocked: 20, roomsBooked: 0, releaseDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) },
          { id: "hb2", hotel: "Hampton Inn", city: region, nightlyRateUsd: 180, roomsBlocked: 30, roomsBooked: 0, releaseDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) },
        ];
        return s;
      });
      return NextResponse.json({ state: after });
    }
    case "propose_block": {
      const after = await appendApproval({
        agent: "Treasurer", phase: "logistics",
        title: `Block ${parsed.data.rooms} rooms at ${parsed.data.hotel} at $${parsed.data.nightlyRate}/night?`,
        rationale: `Hotel block negotiation. Rooms held under a 30-day release. Out-of-town guests will be routed to the block on the invitation details card.`,
        risk: "medium",
        action: { kind: "block_hotel_rooms", hotel: parsed.data.hotel, rooms: parsed.data.rooms, nightlyRate: parsed.data.nightlyRate },
      });
      return NextResponse.json({ state: after });
    }
    case "update_block": {
      const after = await updateHotelBlock(parsed.data.id, parsed.data.patch);
      return NextResponse.json({ state: after });
    }
    case "seed_shuttles": {
      if (state.shuttles.length) return NextResponse.json({ state });
      const after = await mutate((s) => {
        s.shuttles = [
          { id: "sh1", route: "Hotel → Venue", pickupTime: "15:00", capacity: 30, reservedSeats: 0 },
          { id: "sh2", route: "Hotel → Venue", pickupTime: "15:30", capacity: 30, reservedSeats: 0 },
          { id: "sh3", route: "Venue → Hotel", pickupTime: "23:00", capacity: 30, reservedSeats: 0 },
          { id: "sh4", route: "Venue → Hotel", pickupTime: "23:45", capacity: 30, reservedSeats: 0 },
        ];
        return s;
      });
      return NextResponse.json({ state: after });
    }
    case "update_shuttle": {
      const after = await updateShuttle(parsed.data.id, parsed.data.patch);
      return NextResponse.json({ state: after });
    }
    case "propose_welcome_bag": {
      const items = await quartermasterPropose(state.brief!);
      const after = await setWelcomeBag(items);
      return NextResponse.json({ state: after, count: items.length });
    }
  }
}
