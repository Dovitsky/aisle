import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { appendApproval, readState, setLicense } from "@/lib/store";

export const dynamic = "force-dynamic";

const Body = z.discriminatedUnion("op", [
  z.object({ op: z.literal("seed"), state: z.string(), county: z.string() }),
  z.object({ op: z.literal("update"), patch: z.object({
    applicationDate: z.string().optional(), appointmentDate: z.string().optional(),
    pickedUpAt: z.string().optional(), expiresAt: z.string().optional(),
    filedAt: z.string().optional(), notes: z.string().optional(),
  })}),
  z.object({ op: z.literal("propose_file") }),
]);

// Reasonable per-state defaults. Real implementation would query a maintained
// table of county clerk requirements.
function requirementsFor(state: string, county: string): { reqs: string[]; expiresAfterDays: number } {
  const norm = state.toUpperCase().slice(0, 2);
  const STATE_RULES: Record<string, { reqs: string[]; expiresAfterDays: number }> = {
    NY: { reqs: ["Both parties present at the county clerk", "Government-issued photo ID", "Birth certificate (long form)", "24-hour waiting period before ceremony", "$40 license fee"], expiresAfterDays: 60 },
    CA: { reqs: ["Both parties present", "Photo ID", "Public license $35-100 by county", "No waiting period", "Marriage must occur within 90 days"], expiresAfterDays: 90 },
    TX: { reqs: ["Both parties present", "Photo ID", "72-hour waiting period (waivers possible)", "License fee ~$70-85"], expiresAfterDays: 90 },
    IL: { reqs: ["Both parties present", "Photo ID", "1-day waiting period", "License fee ~$60"], expiresAfterDays: 60 },
  };
  return STATE_RULES[norm] ?? {
    reqs: ["Both parties present at clerk's office", "Photo ID", "Check county-specific waiting period", `License fee varies by ${county}, ${state}`],
    expiresAfterDays: 60,
  };
}

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const state = await readState();
  const data = parsed.data;

  switch (data.op) {
    case "seed": {
      const { reqs, expiresAfterDays } = requirementsFor(data.state, data.county);
      const after = await setLicense({
        id: "lic_" + Date.now().toString(36),
        state: data.state, county: data.county,
        requirements: reqs,
        expiresAt: expiresAfterDays ? "(set on pickup; valid " + expiresAfterDays + " days)" : undefined,
      });
      return NextResponse.json({ state: after });
    }
    case "update": {
      if (!state.license) return NextResponse.json({ error: "Seed the license first" }, { status: 412 });
      const after = await setLicense({ ...state.license, ...data.patch });
      return NextResponse.json({ state: after });
    }
    case "propose_file": {
      if (!state.license) return NextResponse.json({ error: "No license seeded" }, { status: 412 });
      const after = await appendApproval({
        agent: "Clerk", phase: "personal_prep",
        title: `Confirm marriage license filing in ${state.license.county}, ${state.license.state}?`,
        rationale: `Approving will mark the license as filed. After the ceremony, the officiant signs and returns it to the county clerk within the state-required window.`,
        risk: "high",
        action: { kind: "file_marriage_license", state: state.license.state, county: state.license.county },
      });
      return NextResponse.json({ state: after });
    }
  }
}
