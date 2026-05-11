import { NextResponse } from "next/server";
import { TRENDING } from "@/lib/discover/trending";
import { VIBES } from "@/lib/discover/vibes";
import { DISCOVER_VENUES } from "@/lib/discover/venues";
import { REAL_WEDDINGS } from "@/lib/discover/weddings";
import { EDITORIAL } from "@/lib/discover/editorial";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    trending: TRENDING,
    vibes: VIBES,
    venues: DISCOVER_VENUES,
    weddings: REAL_WEDDINGS,
    editorial: EDITORIAL,
    updatedAt: new Date().toISOString(),
  });
}
