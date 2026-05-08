"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ProjectState } from "@/lib/types";

type Ctx = {
  state: ProjectState | null;
  refresh: () => Promise<void>;
  setState: (s: ProjectState) => void;
  /** Briefly poll /api/state so background work (Scout, etc.) lands. */
  pollForUpdates: (durationMs?: number) => void;
  loading: boolean;
};

const StateCtx = createContext<Ctx | null>(null);

export function StateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ProjectState | null>(null);
  const [loading, setLoading] = useState(true);
  const pollUntilRef = useRef<number>(0);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/state", { cache: "no-store" });
    const j = (await r.json()) as ProjectState;
    setState(j);
    setLoading(false);
  }, []);

  const refreshSilent = useCallback(async () => {
    try {
      const r = await fetch("/api/state", { cache: "no-store" });
      const j = (await r.json()) as ProjectState;
      setState(j);
    } catch {
      // ignore — next tick will retry
    }
  }, []);

  // Poll /api/state every 4s while a deadline hasn't passed. Used after
  // events that kick off background work (brief lock, refire, inbox scan).
  const pollForUpdates = useCallback((durationMs = 90_000) => {
    pollUntilRef.current = Math.max(pollUntilRef.current, Date.now() + durationMs);
    if (pollTimerRef.current) return; // already polling
    const tick = async () => {
      if (Date.now() > pollUntilRef.current) {
        pollTimerRef.current = null;
        return;
      }
      await refreshSilent();
      pollTimerRef.current = setTimeout(tick, 4_000);
    };
    pollTimerRef.current = setTimeout(tick, 2_000);
  }, [refreshSilent]);

  useEffect(() => {
    void refresh();
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [refresh]);

  return (
    <StateCtx.Provider value={{ state, refresh, setState, pollForUpdates, loading }}>
      {children}
    </StateCtx.Provider>
  );
}

export function useProject() {
  const ctx = useContext(StateCtx);
  if (!ctx) throw new Error("useProject must be used inside <StateProvider>");
  return ctx;
}
