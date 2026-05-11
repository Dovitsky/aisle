"use client";

import { StateProvider } from "./StateProvider";
import { AppShell } from "./AppShell";
import { AuroraBackground } from "./Atmosphere";
import { ToastProvider } from "./Toast";
import { DialogProvider } from "./Dialog";
import { ErrorBoundary } from "./ErrorBoundary";
import { RouteTransitionOverlay } from "./RouteTransitionOverlay";

export function RootClient({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <DialogProvider>
          <StateProvider>
            <AuroraBackground />
            <AppShell>{children}</AppShell>
            <RouteTransitionOverlay />
          </StateProvider>
        </DialogProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
