import type { Metadata } from "next";
import "./globals.css";
import { RootClient } from "@/components/RootClient";

export const metadata: Metadata = {
  title: "AISLE — The autonomous wedding platform",
  description:
    "From the proposal to the thank-you cards. AISLE is the autonomous agent that plans the wedding, with the couple and planner approving every move.",
};

// Every page reads from the JSON store / Anthropic / OpenAI at request
// time and uses useSearchParams in SectionSidebar — disable static
// prerendering globally so Next 15 doesn't try to bake state into the
// build. Required for Vercel deploys.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <RootClient>{children}</RootClient>
      </body>
    </html>
  );
}
