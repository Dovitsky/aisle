"use client";

import { StateProvider } from "./StateProvider";
import { AppShell } from "./AppShell";
import { AuroraBackground } from "./Atmosphere";

export function RootClient({ children }: { children: React.ReactNode }) {
  return (
    <StateProvider>
      <AuroraBackground />
      <AppShell>{children}</AppShell>
    </StateProvider>
  );
}
