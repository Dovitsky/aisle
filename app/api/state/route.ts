import { NextResponse } from "next/server";
import { filterForViewer, readState } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = await readState();
  return NextResponse.json(filterForViewer(state));
}
