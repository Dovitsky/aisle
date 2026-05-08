import type { Metadata } from "next";
import "./globals.css";
import { RootClient } from "@/components/RootClient";

export const metadata: Metadata = {
  title: "AISLE — The autonomous wedding platform",
  description:
    "From the proposal to the thank-you cards. AISLE is the autonomous agent that plans the wedding, with the couple and planner approving every move.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <RootClient>{children}</RootClient>
      </body>
    </html>
  );
}
