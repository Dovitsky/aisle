// Vendor portal endpoint — returns only the slice a vendor should see (PRD §8.2).

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readState } from "@/lib/store";

export const dynamic = "force-dynamic";

const Body = z.object({ vendorId: z.string().optional() });

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => ({}));
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const state = await readState();
  // Vendor sees: themselves only, the wedding date window, the AISLE alias address,
  // their messages, their contracted scope, and a payment trail for THEIR work.
  const vendor = parsed.data.vendorId
    ? state.vendors.find((v) => v.id === parsed.data.vendorId)
    : state.vendors[0];
  if (!vendor) return NextResponse.json({ error: "No vendor selected" }, { status: 404 });

  return NextResponse.json({
    self: {
      id: vendor.id,
      name: vendor.name,
      category: vendor.category,
      city: vendor.city,
      status: vendor.status,
      contractedUsd: vendor.contractedUsd,
      paidUsd: vendor.paidUsd,
      thread: vendor.thread ?? [],
    },
    wedding: state.brief
      ? {
          dateWindow: state.brief.dateWindow,
          region: state.brief.region,
          guestCount: state.brief.guestCount,
          // Couple's full names not exposed — just initials.
          aliasFrom: `${state.brief.organizerName[0]}${state.brief.partnerName[0]}@aisle.email`,
        }
      : null,
    vendorList: state.vendors.map((v) => ({ id: v.id, name: v.name, category: v.category })),
  });
}
