import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  addGuest, addHousehold, deleteGuest, mutate, readState, updateGuest,
} from "@/lib/store";

export const dynamic = "force-dynamic";

const SideEnum = z.enum(["organizer", "partner", "both", "neither"]);
const RsvpEnum = z.enum(["no_response", "yes", "no", "maybe"]);
const RelEnum = z.enum(["immediate_family", "extended_family", "college_friend", "work", "neighbor", "plus_one", "child", "other"]);

const Body = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("add_household"),
    label: z.string().min(1),
    side: SideEnum,
    mailingAddress: z.string().optional(),
    email: z.string().optional(),
    outOfTown: z.boolean().optional(),
    initialGuest: z.object({
      fullName: z.string().min(1),
      side: SideEnum,
      relationship: RelEnum,
      isChild: z.boolean().optional(),
    }).optional(),
  }),
  z.object({
    op: z.literal("add_guest"),
    householdId: z.string(),
    fullName: z.string().min(1),
    side: SideEnum,
    relationship: RelEnum,
    isChild: z.boolean().optional(),
    plusOnePolicy: z.enum(["none", "named", "open"]).default("none"),
  }),
  z.object({
    op: z.literal("update_guest"),
    id: z.string(),
    patch: z.object({
      fullName: z.string().optional(),
      side: SideEnum.optional(),
      rsvp: RsvpEnum.optional(),
      meal: z.string().optional(),
      dietary: z.string().optional(),
      notes: z.string().optional(),
      relationship: RelEnum.optional(),
      plusOnePolicy: z.enum(["none", "named", "open"]).optional(),
      plusOneName: z.string().optional(),
    }),
  }),
  z.object({ op: z.literal("delete_guest"), id: z.string() }),
  z.object({ op: z.literal("seed_demo") }),
]);

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body", issues: parsed.error.issues }, { status: 400 });

  switch (parsed.data.op) {
    case "add_household": {
      const d = parsed.data;
      const after = await mutate((s) => {
        const hid = Math.random().toString(36).slice(2, 12);
        s.households.push({
          id: hid,
          label: d.label,
          side: d.side,
          mailingAddress: d.mailingAddress,
          email: d.email,
          outOfTown: d.outOfTown,
        });
        if (d.initialGuest) {
          s.guests.push({
            id: Math.random().toString(36).slice(2, 12),
            householdId: hid,
            fullName: d.initialGuest.fullName,
            side: d.initialGuest.side,
            relationship: d.initialGuest.relationship,
            isChild: d.initialGuest.isChild,
            plusOnePolicy: "none",
            rsvp: "no_response",
          });
        }
        return s;
      });
      return NextResponse.json({ state: after });
    }
    case "add_guest": {
      const after = await addGuest(parsed.data);
      return NextResponse.json({ state: after });
    }
    case "update_guest": {
      const after = await updateGuest(parsed.data.id, parsed.data.patch);
      return NextResponse.json({ state: after });
    }
    case "delete_guest": {
      const after = await deleteGuest(parsed.data.id);
      return NextResponse.json({ state: after });
    }
    case "seed_demo": {
      const after = await mutate((s) => {
        if (s.households.length) return s;
        const seed = [
          { household: "The Kim family", side: "organizer" as const, members: [
            { name: "Min-jun Kim", side: "organizer" as const, rel: "immediate_family" as const },
            { name: "So-young Kim", side: "organizer" as const, rel: "immediate_family" as const },
          ]},
          { household: "The Patel household", side: "partner" as const, members: [
            { name: "Anish Patel", side: "partner" as const, rel: "immediate_family" as const },
            { name: "Reema Patel", side: "partner" as const, rel: "immediate_family" as const },
          ]},
          { household: "Aunt Karen", side: "organizer" as const, members: [
            { name: "Karen Lee", side: "organizer" as const, rel: "extended_family" as const },
          ]},
          { household: "Uncle James", side: "organizer" as const, members: [
            { name: "James Lee", side: "organizer" as const, rel: "extended_family" as const },
          ]},
          { household: "The Cohen household", side: "both" as const, members: [
            { name: "Maya Cohen", side: "both" as const, rel: "college_friend" as const },
            { name: "Jordan Cohen", side: "both" as const, rel: "college_friend" as const },
          ]},
          { household: "Priya & Sam", side: "partner" as const, members: [
            { name: "Priya Iyer", side: "partner" as const, rel: "college_friend" as const },
            { name: "Sam Iyer", side: "partner" as const, rel: "college_friend" as const },
          ]},
          { household: "The Garcia family", side: "organizer" as const, members: [
            { name: "Elena Garcia", side: "organizer" as const, rel: "work" as const },
            { name: "Diego Garcia", side: "organizer" as const, rel: "work" as const },
          ]},
          { household: "Theo Brown", side: "partner" as const, members: [
            { name: "Theo Brown", side: "partner" as const, rel: "college_friend" as const },
          ]},
          { household: "Olivia + plus one", side: "organizer" as const, members: [
            { name: "Olivia Tran", side: "organizer" as const, rel: "college_friend" as const, plusOne: "open" as const },
          ]},
          { household: "The Nakamura household", side: "both" as const, members: [
            { name: "Hana Nakamura", side: "both" as const, rel: "neighbor" as const },
            { name: "Ren Nakamura", side: "both" as const, rel: "neighbor" as const },
          ]},
        ];
        for (const h of seed) {
          const hid = Math.random().toString(36).slice(2, 12);
          s.households.push({ id: hid, label: h.household, side: h.side });
          for (const m of h.members) {
            s.guests.push({
              id: Math.random().toString(36).slice(2, 12),
              householdId: hid,
              fullName: m.name,
              side: m.side,
              relationship: m.rel,
              plusOnePolicy: "plusOne" in m ? m.plusOne : "none",
              rsvp: "no_response",
            });
          }
        }
        return s;
      });
      return NextResponse.json({ state: after });
    }
  }
}
