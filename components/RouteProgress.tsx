"use client";

// RouteProgress. a thin top-of-page progress bar that gives the whole
// app a perceptible heartbeat. It listens to outgoing fetch calls and
// to Next.js route changes; whenever there's at least one in flight it
// shows a sage gradient bar that animates toward 80%, then completes
// and fades when everything settles.
//
// Implementation note: we monkey-patch window.fetch ONCE on mount so any
// component making a fetch automatically gets visual feedback without
// having to plumb busy state through every layer.

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const BAR_HEIGHT = 2;

export function RouteProgress() {
  const [active, setActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const inflight = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();

  // Animate the bar smoothly from 0 toward 80% while requests are in flight.
  const start = () => {
    if (completeRef.current) {
      clearTimeout(completeRef.current);
      completeRef.current = null;
    }
    setActive(true);
    setProgress((p) => (p < 6 ? 6 : p));
    if (tickRef.current) return;
    tickRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 80) return p; // park at 80; the response will close it
        // Ease: slower as we approach 80
        const remaining = 80 - p;
        const step = Math.max(0.6, remaining * 0.06);
        return Math.min(80, p + step);
      });
    }, 100);
  };

  const finish = () => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    setProgress(100);
    completeRef.current = setTimeout(() => {
      setActive(false);
      setProgress(0);
    }, 260);
  };

  // Patch window.fetch on mount so every request anywhere in the app
  // contributes to the bar.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const original = window.fetch;
    if ((window as unknown as { __aisleFetchPatched?: boolean }).__aisleFetchPatched) {
      // Already patched (HMR or double-mount). Bail.
      return;
    }
    (window as unknown as { __aisleFetchPatched: boolean }).__aisleFetchPatched = true;

    window.fetch = async (...args: Parameters<typeof fetch>) => {
      inflight.current += 1;
      start();
      try {
        const res = await original(...args);
        return res;
      } finally {
        inflight.current = Math.max(0, inflight.current - 1);
        if (inflight.current === 0) {
          finish();
        }
      }
    };

    return () => {
      // Don't unpatch. leaving the patch in place is safer across HMR.
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Brief flash on route change (Next.js client-side nav) so the user
  // sees a heartbeat even when nothing's fetching.
  useEffect(() => {
    start();
    const t = setTimeout(() => {
      if (inflight.current === 0) finish();
    }, 240);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!active) return null;

  return (
    <div
      role="status"
      aria-label="Loading"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: BAR_HEIGHT,
        zIndex: 9999,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${progress}%`,
          background:
            "linear-gradient(90deg, rgba(168,181,160,0.0) 0%, #A8B5A0 30%, #6E8068 65%, #C7D1BD 100%)",
          boxShadow:
            "0 0 12px rgba(168,181,160,0.55), 0 0 4px rgba(110,128,104,0.65)",
          transition: progress === 100
            ? "width 220ms ease-out, opacity 220ms 80ms"
            : "width 180ms ease-out",
          opacity: progress === 100 ? 0 : 1,
        }}
      />
    </div>
  );
}
