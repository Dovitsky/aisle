"use client";

// AppShell. minimal top bar + full-screen menu overlay (Cmd/K).
//
// The sidebar is gone. Primary navigation is the overlay. The top bar shows
// only what's actually needed at a glance: the brand, the couple's names + a
// pending-decisions chip, the menu trigger, and the viewer switch.
// Mobile keeps a 4-tab bottom nav for thumb reach; the More tab opens the
// overlay.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useProject } from "./StateProvider";
import { ViewerSwitch } from "./ViewerSwitch";
import { ChatDock } from "./ChatDock";
import { MenuOverlay } from "./MenuOverlay";
import { LockCelebration } from "./LockCelebration";
import { SectionSidebar, BUILD_GROUPS, DAY_GROUPS } from "./SectionSidebar";

const BUILD_PATHS = [
  "/vendors", "/budget", "/guests", "/wedding-party",
  "/design", "/florals", "/cake", "/bar", "/music",
  "/beauty", "/seating", "/stationery", "/website",
  "/logistics", "/rentals", "/dietary", "/atelier",
];
const DAY_PATHS = [
  "/day-of", "/ceremony", "/pre-events",
  "/memorials", "/tips",
];

function activeSection(pathname: string): "build" | "day" | null {
  if (BUILD_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) return "build";
  if (DAY_PATHS.some((p)   => pathname === p || pathname.startsWith(p + "/"))) return "day";
  return null;
}

const MOBILE_TABS = [
  { href: "/discover", label: "Discover" },
  { href: "/", label: "Wedding" },
  { href: "/vendors", label: "Build" },
  { href: "/timeline", label: "The Day" },
  { href: "__menu__", label: "More" },
];

// Top-bar primary categories. Each has a "home" page (where clicking the
// label sends you) and a list of rooms shown in a hover/tap-open subnav.
const PRIMARY_NAV: {
  label: string;
  href: string;
  match: string[];
  items: { href: string; label: string }[];
}[] = [
  {
    label: "Discover",
    href: "/discover",
    match: ["/discover"],
    items: [],
  },
  {
    label: "The Wedding",
    href: "/mood-board",
    match: ["/mood-board", "/", "/timeline", "/inbox"],
    items: [
      { href: "/mood-board", label: "Mood" },
      { href: "/", label: "Home" },
      { href: "/timeline", label: "Phases" },
      { href: "/inbox", label: "Inbox" },
    ],
  },
  {
    label: "Build",
    href: "/vendors",
    match: [
      "/vendors", "/budget", "/guests", "/dietary", "/wedding-party",
      "/design", "/florals", "/stationery", "/website", "/seating",
      "/logistics", "/rentals", "/music", "/cake", "/bar",
    ],
    items: [
      { href: "/vendors", label: "Vendors" },
      { href: "/budget", label: "Budget" },
      { href: "/guests", label: "Guests" },
      { href: "/dietary", label: "Dietary" },
      { href: "/wedding-party", label: "Wedding party" },
      { href: "/design", label: "Design" },
      { href: "/florals", label: "Florals" },
      { href: "/stationery", label: "Stationery" },
      { href: "/website", label: "Website" },
      { href: "/seating", label: "Seating" },
      { href: "/logistics", label: "Logistics" },
      { href: "/rentals", label: "Rentals" },
      { href: "/music", label: "Music" },
      { href: "/cake", label: "Cake" },
      { href: "/bar", label: "Bar" },
    ],
  },
  {
    label: "The Day",
    href: "/day-of",
    match: [
      "/day-of", "/ceremony", "/beauty",
      "/pre-events", "/memorials", "/tips",
    ],
    items: [
      { href: "/day-of", label: "Day-of console" },
      { href: "/ceremony", label: "Ceremony" },
      { href: "/beauty", label: "Hair & makeup" },
      { href: "/pre-events", label: "Other events" },
      { href: "/memorials", label: "Memorials" },
      { href: "/tips", label: "Tips" },
    ],
  },
];

function PrimaryNavLink({
  primary,
  pathname,
}: {
  primary: typeof PRIMARY_NAV[number];
  pathname: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const active = primary.match.some((m) =>
    m === "/" ? pathname === "/" : pathname.startsWith(m)
  );
  const hasSub = primary.items.length > 0;

  // Close on click-outside or Escape so click-to-toggle works on touch.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Close on route changes (so the dropdown collapses after the user picks).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Primaries without a submenu (Discover) render as a simple Link with
  // the same pressable affordance. subtle bg on hover, larger hit area.
  if (!hasSub) {
    return (
      <Link
        href={primary.href}
        className={`text-[12px] uppercase tracking-[0.18em] inline-flex items-center px-3 py-2 rounded-full transition-all ${
          active
            ? "text-sage-500 bg-sage-50/60"
            : "text-ink hover:text-sage-500 hover:bg-paper-200/70"
        }`}
      >
        {primary.label}
      </Link>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onFocus={() => setOpen(true)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`text-[12px] uppercase tracking-[0.18em] inline-flex items-center gap-1.5 px-3 py-2 rounded-full transition-all cursor-pointer ${
          active || open
            ? "text-sage-500 bg-sage-50/60"
            : "text-ink hover:text-sage-500 hover:bg-paper-200/70"
        }`}
      >
        {primary.label}
        <svg
          width="9"
          height="9"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path
            d="M3 5l3 3 3-3"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute top-full left-1/2 -translate-x-1/2 pt-2 z-50"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          <div
            className="surface rounded-2xl border hairline shadow-cardHover py-2.5 min-w-[210px] animate-fade-in-soft"
            style={{
              boxShadow:
                "0 18px 44px -22px rgba(14,14,12,0.28), 0 6px 18px -10px rgba(79,93,68,0.18)",
            }}
          >
            <ul className="flex flex-col">
              {primary.items.map((it) => {
                const isActive =
                  it.href === "/" ? pathname === "/" : pathname.startsWith(it.href);
                return (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      onClick={() => setOpen(false)}
                      className={`block px-4 py-2 italic text-[16px] transition-colors ${
                        isActive
                          ? "text-sage-500 bg-sage-50/60"
                          : "text-ink hover:text-sage-500 hover:bg-paper-200/50"
                      }`}
                      style={{
                        fontFamily:
                          '"Cormorant","Cormorant Garamond",Georgia,serif',
                        letterSpacing: "-0.005em",
                      }}
                    >
                      {it.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { state, chatOpen } = useProject();
  const [menuOpen, setMenuOpen] = useState(false);

  const pendingCount = state?.approvals.filter((a) => a.status === "pending").length ?? 0;
  const isPublic = pathname.startsWith("/wed/");
  // /dossier owns its own full-bleed dark layout. skip the dashboard chrome.
  const isDossier = pathname === "/dossier";
  // Marketing landing. kill the dashboard chrome (topbar, mobile-tab nav,
  // chat dock). The Landing component renders its own minimal header.
  // ONLY when there's NO brief at all. once the user has typed anything in
  // the landing hero, a partial brief is created and they're now an active
  // user who needs the chat dock and topbar back. Without this, the
  // "Continue with Maestro" CTA on the partial-brief surface has nothing
  // to open.
  // Marketing landing renders without dashboard chrome — BUT once the
  // user has engaged (hit Go and opened the chat with Maestro), we
  // flip out of marketing mode so the chat dock and full app surround
  // are available. Otherwise the welcome input would open a chat that
  // nothing on Landing can host.
  const isMarketingLanding = pathname === "/" && !state?.brief && !chatOpen;
  const dockOff = isPublic || isMarketingLanding || isDossier || pathname.startsWith("/login") || pathname.startsWith("/portal");
  // When the chat panel is open on lg+, push the entire app frame right by
  // the panel width so page content sits beside the chat instead of under
  // it. On mobile (<lg) the panel overlays with a backdrop instead. there
  // isn't room to host both side-by-side.
  const showChatPanel = !dockOff && chatOpen;

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

  // Public guest-facing site renders without any Corsia chrome.
  if (isPublic) {
    return <>{children}</>;
  }

  // Marketing landing renders without dashboard chrome. the Landing
  // component owns its own minimal header.
  if (isMarketingLanding) {
    return <>{children}</>;
  }

  // Dossier builder owns its own full-bleed dark stage.
  if (isDossier) {
    return <>{children}</>;
  }

  return (
    <div
      className={`min-h-screen w-full flex flex-col transition-[padding] duration-300 ease-out ${
        showChatPanel ? "lg:pr-[420px]" : ""
      }`}
    >
      {/* Top bar. slim glass */}
      <header className="sticky top-0 z-30 glass border-b hairline">
        <div className="max-w-[1280px] mx-auto px-5 lg:px-12 py-3.5 flex items-center justify-between gap-4">
          {/* Left: brand + couple summary */}
          <div className="flex items-baseline gap-4 min-w-0">
            <Link
              href="/"
              aria-label="Corsia"
              className="inline-flex items-center shrink-0 transition-opacity hover:opacity-80"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-corsia.svg"
                alt="Corsia"
                style={{ height: 36, width: "auto", display: "block" }}
              />
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
            {state?.demoMode && (
              <Link
                href="/settings"
                className="text-[10px] uppercase tracking-[0.18em] text-sage-500 border border-sage-300 rounded-full px-2.5 py-0.5 bg-sage-50/70 hover:bg-sage-100 transition-colors shrink-0"
                title="You're looking at an example wedding"
              >
                example
              </Link>
            )}
          </div>

          {/* Right: four primaries + decisions chip + menu trigger + viewer switch.
              Primaries hide below `lg` (tablets keep the menu trigger; mobile
              keeps bottom-tab nav) so the bar never gets cramped.
              They ALSO hide on Build/Day pages since the section sidebar is
              the canonical navigation there. no double-rendering. */}
          <div className="flex items-center gap-4 lg:gap-6 shrink-0">
            {!activeSection(pathname) && (
              <nav className="hidden lg:flex items-center gap-5 xl:gap-7">
                {PRIMARY_NAV.map((p) => (
                  <PrimaryNavLink key={p.label} primary={p} pathname={pathname} />
                ))}
              </nav>
            )}

            {pendingCount > 0 && (
              <Link
                href="/"
                title={`${pendingCount} pending decision${pendingCount === 1 ? "" : "s"}`}
                className="hidden sm:inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-medium text-ink bg-sage-300 hover:bg-sage-400 transition-colors"
              >
                {pendingCount}
              </Link>
            )}

            <button
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              title="All rooms"
              className="group inline-flex items-center justify-center w-9 h-9 rounded-full text-ink hover:text-sage-500 hover:bg-paper-200/60 transition-all"
            >
              {/* Three-dot "more" glyph. restrained, doesn't compete with the brand. */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="5"  cy="12" r="1.6" fill="currentColor" />
                <circle cx="12" cy="12" r="1.6" fill="currentColor" />
                <circle cx="19" cy="12" r="1.6" fill="currentColor" />
              </svg>
            </button>

            <div className="hidden sm:block">
              <ViewerSwitch compact />
            </div>
          </div>
        </div>
      </header>

      {/* Main. when the active route belongs to Build or The Day,
          render a sticky section sidebar alongside the page so the user
          can hop between rooms without opening a menu. */}
      {(() => {
        const section = activeSection(pathname);
        if (!section) {
          return (
            <main className="flex-1 px-5 lg:px-12 pt-6 lg:pt-12 max-w-[1180px] mx-auto w-full animate-fade-in-soft">
              {children}
            </main>
          );
        }
        const groups = section === "build" ? BUILD_GROUPS : DAY_GROUPS;
        const label = section === "build" ? "Build" : "The Day";
        return (
          <div className="flex-1 w-full max-w-[1320px] mx-auto px-5 lg:px-10 pt-6 lg:pt-10 grid lg:grid-cols-[220px_1fr] gap-x-10 lg:gap-x-12">
            <SectionSidebar label={label} groups={groups} />
            <main className="min-w-0 animate-fade-in-soft">{children}</main>
          </div>
        );
      })()}

      {/* Mobile bottom tab nav */}
      <nav className="lg:hidden fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-phone glass border-t hairline z-30 pb-[env(safe-area-inset-bottom)]">
        <ul className="flex items-stretch justify-between">
          {MOBILE_TABS.map((t) => {
            const isMenu = t.href === "__menu__";
            // Match against the broader category each tab represents so
            // sub-rooms still highlight the parent on mobile.
            const matched = PRIMARY_NAV.find(
              (p) => p.href === t.href || p.match.includes(t.href)
            );
            const active =
              !isMenu &&
              (matched
                ? matched.match.some((m) =>
                    m === "/" ? pathname === "/" : pathname.startsWith(m)
                  )
                : t.href === "/"
                ? pathname === "/"
                : pathname.startsWith(t.href));
            const showBadge = t.href === "/" && pendingCount > 0;
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
