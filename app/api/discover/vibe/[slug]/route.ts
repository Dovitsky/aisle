import { NextRequest, NextResponse } from "next/server";
import { findVibe } from "@/lib/discover/vibes";
import { DISCOVER_VENUES } from "@/lib/discover/venues";
import { REAL_WEDDINGS } from "@/lib/discover/weddings";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const vibe = findVibe(slug);
  if (!vibe) return NextResponse.json({ error: "Vibe not found." }, { status: 404 });
  const matchingVenues = DISCOVER_VENUES.filter((v) => v.vibeTags.includes(slug));
  const matchingWeddings = REAL_WEDDINGS.filter((w) => w.vibeTags.includes(slug));
  return NextResponse.json({ vibe, venues: matchingVenues, weddings: matchingWeddings });
}
