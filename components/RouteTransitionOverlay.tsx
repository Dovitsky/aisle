"use client";

// Global route-transition indicator. Detects internal navigation by
// delegating on document-level clicks, then mounts the SketchLoader
// over a soft backdrop until the new pathname registers. A 180ms grace
// period suppresses the loader when navigation is instant (cached
// pages, same-route) so we never flash for a single frame.

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { SketchLoader } from "./SketchLoader";

const GRACE_MS = 180;

export function RouteTransitionOverlay() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const pendingRef = useRef<{ targetPath: string; timer: ReturnType<typeof setTimeout> } | null>(null);

  // End the loader when the URL actually changes.
  useEffect(() => {
    if (!pendingRef.current) return;
    if (pendingRef.current.targetPath !== pathname) return;
    clearTimeout(pendingRef.current.timer);
    pendingRef.current = null;
    // Hold the sketch one extra beat so the user reads the caption.
    const t = setTimeout(() => setVisible(false), 80);
    return () => clearTimeout(t);
  }, [pathname]);

  // Listen for Link clicks anywhere in the document.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      // Skip modifier-clicks (new tab / window) so the user's intent is honored.
      if (e.defaultPrevented) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (e.button !== 0) return;

      const anchor = (e.target as HTMLElement | null)?.closest?.("a");
      if (!anchor) return;
      const target = anchor.getAttribute("target");
      if (target && target !== "_self") return;
      const href = anchor.getAttribute("href");
      if (!href) return;
      // Only intercept same-origin, non-hash internal links.
      if (!href.startsWith("/") || href.startsWith("//")) return;
      // Strip query / hash for the comparison.
      const targetPath = href.split("?")[0].split("#")[0];
      if (targetPath === pathname) return;

      // Clear any in-flight pending timer.
      if (pendingRef.current) clearTimeout(pendingRef.current.timer);
      const timer = setTimeout(() => setVisible(true), GRACE_MS);
      pendingRef.current = { targetPath, timer };
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [pathname]);

  // Listen for browser back / forward — the same pathname-change effect
  // above handles the end of those too once the URL updates.
  useEffect(() => {
    const onPop = () => {
      if (pendingRef.current) clearTimeout(pendingRef.current.timer);
      const timer = setTimeout(() => setVisible(true), GRACE_MS);
      pendingRef.current = { targetPath: window.location.pathname, timer };
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  return (
    <div
      aria-hidden={!visible}
      className="fixed inset-0 pointer-events-none flex items-center justify-center z-[55] transition-opacity duration-200"
      style={{
        opacity: visible ? 1 : 0,
        background: visible ? "rgba(251,248,242,0.62)" : "transparent",
        backdropFilter: visible ? "blur(2px)" : undefined,
        WebkitBackdropFilter: visible ? "blur(2px)" : undefined,
      }}
    >
      {visible && <SketchLoader />}
    </div>
  );
}
