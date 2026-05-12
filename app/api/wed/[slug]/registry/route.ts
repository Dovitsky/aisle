// Public guest-facing registry endpoint. GET returns the published registry
// items. POST lets guests mark items as purchased or contribute to funds.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { readState, updateRegistryItem } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const state = await readState();
  if (!state.site || state.site.slug !== slug) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!state.site.registryLinked) {
    return NextResponse.json({ error: "Registry not published" }, { status: 404 });
  }
  if (!state.brief) {
    return NextResponse.json({ error: "Not ready" }, { status: 404 });
  }

  // Public projection of registry items — hide internal fields
  const items = state.registry.map((it) => ({
    id: it.id,
    item: it.item,
    vendor: it.vendor,
    priceUsd: it.priceUsd,
    category: it.category,
    url: it.url,
    imageUrl: it.imageUrl,
    status: it.status,
    quantityNeeded: it.quantityNeeded ?? 1,
    quantityFulfilled: it.quantityFulfilled ?? 0,
    groupGifting: it.groupGifting ?? false,
    fundTargetUsd: it.fundTargetUsd,
    fundRaisedUsd: it.fundRaisedUsd ?? 0,
    fundDescription: it.fundDescription,
  }));

  return NextResponse.json({
    couple: {
      organizerName: state.brief.organizerName,
      partnerName: state.brief.partnerName,
      dateWindow: state.brief.dateWindow,
      region: state.brief.region,
    },
    items,
  });
}

const PurchaseBody = z.discriminatedUnion("op", [
  z.object({ op: z.literal("purchase"), id: z.string(), guestName: z.string(), quantity: z.number().optional() }),
  z.object({ op: z.literal("contribute"), id: z.string(), guestName: z.string(), amountUsd: z.number().min(1) }),
]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const json = await req.json().catch(() => null);
  const parsed = PurchaseBody.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const state = await readState();
  if (!state.site || state.site.slug !== slug) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!state.site.registryLinked) {
    return NextResponse.json({ error: "Registry not published" }, { status: 404 });
  }

  const data = parsed.data;
  const it = state.registry.find((x) => x.id === data.id);
  if (!it) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  if (data.op === "purchase") {
    const qtyToPurchase = data.quantity ?? 1;
    const newFulfilled = Math.min((it.quantityFulfilled ?? 0) + qtyToPurchase, it.quantityNeeded ?? 1);
    const fullyDone = newFulfilled >= (it.quantityNeeded ?? 1);
    await updateRegistryItem(data.id, {
      quantityFulfilled: newFulfilled,
      status: fullyDone ? "purchased" : "wanted",
      purchasedBy: data.guestName,
    });
    return NextResponse.json({ ok: true });
  }

  if (data.op === "contribute") {
    if (!it.groupGifting) return NextResponse.json({ error: "Group gifting not enabled" }, { status: 400 });
    const contributions = [...(it.groupContributions ?? []), {
      name: data.guestName, amountUsd: data.amountUsd, at: new Date().toISOString(),
    }];
    const totalRaised = contributions.reduce((s, c) => s + c.amountUsd, 0);
    const fullyFunded = it.fundTargetUsd ? totalRaised >= it.fundTargetUsd : false;
    await updateRegistryItem(data.id, {
      groupContributions: contributions,
      fundRaisedUsd: totalRaised,
      status: fullyFunded ? "purchased" : "wanted",
    });
    return NextResponse.json({ ok: true });
  }
}
