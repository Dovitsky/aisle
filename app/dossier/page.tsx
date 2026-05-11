import { BriefForm } from "@/components/BriefForm";

// The wedding dossier intake. The internal data shape is still called
// `brief` (PRD §5.1, `state.brief`) so all downstream agents work
// unchanged — only the URL and user-facing copy use "dossier".
export default function DossierPage() {
  return <BriefForm />;
}
