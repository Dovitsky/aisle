// Public read-only endpoint for the wedding website. Exposes only the
// fields a guest should see — no internal state, no vendor data, no chat.

import { NextRequest, NextResponse } from "next/server";
import { readState } from "@/lib/store";

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
  if (!state.brief) {
    return NextResponse.json({ error: "Not ready" }, { status: 404 });
  }
  // Public projection — never leak internal state.
  return NextResponse.json({
    site: {
      slug: state.site.slug,
      hero: state.site.hero,
      story: state.site.story,
      schedulePublished: state.site.schedulePublished,
      rsvpEnabled: state.site.rsvpEnabled,
      registryLinked: state.site.registryLinked,
      travelGuide: state.site.travelGuide,
      faqs: state.site.faqs,
      customRsvpQuestions: state.site.customRsvpQuestions ?? [],
    },
    couple: {
      organizerName: state.brief.organizerName,
      partnerName: state.brief.partnerName,
      dateWindow: state.brief.dateWindow,
      region: state.brief.region,
    },
    schedule: state.site.schedulePublished
      ? state.preEvents.map((e) => ({
          kind: e.kind,
          date: e.date,
          location: e.location,
        }))
      : [],
  });
}
