import { redirect } from "next/navigation";

// /approvals merged into the home command center. Kept as a 308
// redirect so old bookmarks, ChatDock hrefs, and email notifications
// still resolve cleanly.
export default function ApprovalsRedirect() {
  redirect("/");
}
