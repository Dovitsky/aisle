"use client";

// AppShell — minimal top bar + full-screen menu overlay (Cmd/K).
//
// The sidebar is gone. Primary navigation is the overlay. The top bar shows
// only what's actually needed at a glance: the brand, the couple's names + a
// pending-decisions chip, the menu trigger, and the viewer switch.
// Mobile keeps a 4-tab bottom nav for thumb reach; the More tab opens the
// overlay.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useProject } from "./StateProvider";
import { ViewerSwitch } from "./ViewerSwitch";
import { ChatDock } from "./ChatDock";
import { MenuOverlay } from "./MenuOverlay";
import { LockCelebration } from "./LockCelebration";

const MOBILE_TABS = [
  { href: "/", label: "Home" },
  { href: "/timeline", label: "Phases" },
  { href: "/approvals", label: "Decisions" },
  { href: "__menu__", label: "More" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { state } = useProject();
  const [menuOpen, setMenuOpen] = useState(false);

  const pendingCount = state?.approvals.filter((a) => a.status === "pending").length ?? 0;
  const dockOff = pathname.startsWith("/login") || pathname.startsWith("/portal");

  // Cmd/Ctrl+K opens the menu from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setMenuOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="min-h-screen w-full flex flex-col">
      {/* Top bar — slim glass */}
      <header className="sticky top-0 z-30 glass border-b hairline">
        <div className="max-w-[1280px] mx-auto px-5 lg:px-12 py-3.5 flex items-center justify-between gap-4">
          {/* Left: brand + couple summary */}
          <div className="flex items-baseline gap-4 min-w-0">
            <Link
              href="/"
              className="display italic text-[24px] tracking-tight leading-none hover:text-sage-500 transition-colors shrink-0"
            >
              aisle
            </Link>
            {state?.brief?.locked && (
              <div className="hidden md:flex items-baseline gap-2 text-[12.5px] text-ink-300 truncate">
                <span className="text-ink truncate">
                  {state.brief.organizerName}
                  <span className="text-sage-500 mx-1">&</span>
                  {state.brief.partnerName}
                </span>
                <span className="text-ink-200">·</span>
                <span className="truncate">{state.brief.region}</span>
              </div>
            )}
            {state?.dayOfMode && (
              <span className="text-[10px] uppercase tracking-[0.18em] text-risk-high border border-risk-high/30 rounded-full px-2 py-0.5 bg-risk-high/5 animate-pulse-soft shrink-0">
                today
              </span>
            )}
            {state?.paused && !state?.dayOfMode && (
              <span className="text-[10px] uppercase tracking-[0.18em] text-ink-300 border hairline rounded-full px-2 py-0.5 shrink-0">
                paused
              </span>
            )}
          </div>

          {/* Right: decisions chip + menu trigger + viewer switch */}
          <div className="flex items-center gap-3 lg:gap-5 shrink-0">
            <Link
              href="/approvals"
              className="relative text-[11px] uppercase tracking-[0.18em] text-ink hover:text-sage-500 transition-colors hidden sm:inline-flex items-center gap-2"
            >
              Decisions
              {pendingCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-4 px-1 rounded-full text-[10px] font-medium text-ink bg-sage-300">
                  {pendingCount}
                </span>
              )}
            </Link>

            <button
              onClick={() => setMenuOpen(true)}
              className="group flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-ink hover:text-sage-500 transition-colors"
              aria-label="Open menu"
            >
              <span>Menu</span>
              <span className="hidden lg:inline-flex items-center gap-1 text-[10px] text-ink-300 font-mono">
                <kbd className="inline-flex items-center justify-center w-5 h-5 border hairline rounded-md bg-white/60">⌘</kbd>
                <kbd className="inline-flex items-center justify-center w-5 h-5 border hairline rounded-md bg-white/60">K</kbd>
              </span>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden className="lg:hidden">
                <line x1="3" y1="6" x2="15" y2="6" />
                <line x1="3" y1="12" x2="15" y2="12" />
              </svg>
            </button>

            <div className="hidden sm:block">
              <ViewerSwitch compact />
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 px-5 lg:px-12 pt-6 lg:pt-12 max-w-[1180px] mx-auto w-full animate-fade-in-soft">
        {children}
      </main>

      {/* Mobile bottom tab nav */}
      <nav className="lg:hidden fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-phone glass border-t hairline z-30 pb-[env(safe-area-inset-bottom)]">
        <ul className="flex items-stretch justify-between">
          {MOBILE_TABS.map((t) => {
            const isMenu = t.href === "__menu__";
            const active = !isMenu && (t.href === "/" ? pathname === "/" : pathname.startsWith(t.href));
            const showBadge = t.href === "/approvals" && pendingCount > 0;
            const inner = (
              <span className="flex flex-col items-center pt-2.5 pb-2 text-[10px] uppercase tracking-[0.16em]">
                <span className={`relative ${active ? "text-ink" : "text-ink-300"}`}>
                  {t.label}
                  {showBadge && (
                    <span className="absolute -top-1.5 -right-3 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full text-[10px] font-medium text-ink bg-sage-300">
                      {pendingCount}
                    </span>
                  )}
                </span>
                <span className={`mt-1 block h-[2px] w-6 rounded-full transition-colors ${active ? "bg-sage-400" : "bg-transparent"}`} />
              </span>
            );
            return (
              <li key={t.href} className="flex-1">
                {isMenu ? (
                  <button onClick={() => setMenuOpen(true)} className="w-full">{inner}</button>
                ) : (
                  <Link href={t.href}>{inner}</Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {!dockOff && <ChatDock />}
      <MenuOverlay open={menuOpen} onClose={() => setMenuOpen(false)} state={state} />
      <LockCelebration />
    </div>
  );
}
