import { DossierBuilder } from "@/components/DossierBuilder";

// The interactive, visual dossier builder. Dark theme, multi-stage,
// chip selectors + mood cards instead of a wall of inputs. Replaces
// the old BriefForm (which is still available as a fallback on
// /dossier/form for the admin/edit view).
export default function DossierPage() {
  return <DossierBuilder />;
}
