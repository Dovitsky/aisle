// Project bootstrap and resolution.
//
// On first sign-in the user has no project yet. We auto-create one with them as
// the organizer. After that, `currentProjectId()` resolves their active project
// (the most recently created one they belong to).
//
// In offline JSON mode (no Supabase), every operation uses the literal string
// "demo" as the project id. single-tenant.

import { adminClient, hasSupabase } from "../db/supabase";
import { getSessionUser } from "./clients";

export const DEMO_PROJECT_ID = "demo";

export async function currentProjectId(): Promise<string> {
  if (!hasSupabase()) return DEMO_PROJECT_ID;
  const user = await getSessionUser();
  if (!user) return DEMO_PROJECT_ID;
  const supa = adminClient();
  const { data } = await supa
    .from("project_members")
    .select("project_id, projects!inner(created_at)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false, foreignTable: "projects" })
    .limit(1)
    .maybeSingle();
  return data?.project_id ?? DEMO_PROJECT_ID;
}

// Called once after first sign-in. creates an empty project + organizer membership
// if the user has none yet. Idempotent.
export async function ensureUserHasProject(userId: string, displayName: string | null): Promise<string> {
  const supa = adminClient();
  const { data: existing } = await supa
    .from("project_members")
    .select("project_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (existing?.project_id) return existing.project_id;

  const initialName = displayName ? displayName.split(/[\s@]/)[0] || "First" : "First";
  const { data: project, error: pErr } = await supa
    .from("projects")
    .insert({
      name: `${initialName}'s wedding`,
      organizer_name: initialName,
      partner_name: "Partner",
      ceremony_tradition: "humanist",
    })
    .select("id")
    .single();
  if (pErr || !project) throw new Error(`Could not create project: ${pErr?.message}`);

  const { error: mErr } = await supa.from("project_members").insert({
    project_id: project.id,
    user_id: userId,
    role: "organizer",
  });
  if (mErr) throw new Error(`Could not enroll organizer: ${mErr.message}`);

  return project.id;
}
