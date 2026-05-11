import { redirect } from "next/navigation";

// Old /brief URL preserved as a 308 redirect to the canonical /dossier
// route. Keep this file forever — external links and old screenshots
// still point here.
export default function BriefRedirect() {
  redirect("/dossier");
}
