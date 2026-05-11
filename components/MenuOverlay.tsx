"use client";

// Full-screen editorial directory. Closes with Escape, click on the
// backdrop, or selecting a destination. Search filters across all rooms.
//
// Voice: a luxury concierge directory. No SaaS chrome. No keyboard-shortcut
// labels. The keybind still works; we just don't advertise it.
//
// Layout: centered editorial column. Search prompt at top, four tight
// sub-grids of rooms underneath, signature at bottom. The backdrop is
// fully opaque so nothing from the underlying page bleeds through.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ProjectState } from "@/lib/types";
import { NAV_GROUPS, isVisible } from "@/lib/nav";

export function MenuOverlay({
  open,
  onClose,
  state,
}: {
  open: boolean;
  onClose: () => void;
  state: ProjectState | null;
}) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 80);
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        clearTimeout(t);
        document.body.style.overflow = prevOverflow;
      };
    } else {
      setQuery("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Compose visible groups + items, applying the search filter.
  const visibleGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return NAV_GROUPS
      .map((g) => ({
        label: g.label,
        items: g.items
          .filter((i) => isVisible(i, state))
          .filter((i) => !q || i.label.toLowerCase().includes(q)),
      }))
      .filter((g) => g.items.length > 0);
  }, [query, state]);

  if (!open) return null;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  // First match. Enter on the search field jumps there.
  const firstMatch = visibleGroups[0]?.items[0];

  return (
    <div
      className="fixed inset-0 z-[100] animate-fade-in overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Directory"
    >
      {/* Backdrop. fully opaque so the underlying page never bleeds through.
          Sage-tinted ink, with a soft halo top-center to draw the eye. */}
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 18%, rgba(79,93,68,0.20), transparent 70%), linear-gradient(180deg, #15171A 0%, #0E0F11 100%)",
        }}
      />

      {/* Subtle film noise overlay for warmth */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04] mix-blend-screen"
        aria-hidden
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.6 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
          backgroundSize: "200px 200px",
        }}
      />

      <div className="relative h-full overflow-y-auto">
        <div className="mx-auto max-w-[1180px] px-6 lg:px-12 pt-8 lg:pt-10 pb-16 min-h-full flex flex-col">
          {/* Top. quiet eyebrow + close. */}
          <div className="flex items-center justify-between gap-6 shrink-0">
            <p
              className="text-[10px] uppercase tracking-[0.32em] text-sage-300/80 font-mono"
              style={{ animation: "menu-fade-in 500ms 80ms ease-out both" }}
            >
              Directory
            </p>
            <button
              onClick={onClose}
              className="shrink-0 text-paper-50/60 hover:text-paper-50 transition-colors w-9 h-9 rounded-full border border-white/12 flex items-center justify-center text-[18px] leading-none hover:border-white/30"
              aria-label="Close directory"
              style={{ animation: "menu-fade-in 500ms 80ms ease-out both" }}
            >
              ×
            </button>
          </div>

          {/* Centered editorial column */}
          <div className="flex-1 flex flex-col items-center justify-start pt-10 lg:pt-14">
            {/* Search prompt */}
            <div
              className="w-full max-w-[760px]"
              style={{ animation: "menu-fade-in 600ms 180ms ease-out both" }}
            >
              <p className="text-[10px] uppercase tracking-[0.28em] text-paper-50/40 font-mono mb-3 text-center">
                Where to?
              </p>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && firstMatch) {
                    onClose();
                    window.location.href = firstMatch.href;
                  }
                }}
                placeholder="A room, a vendor, a phase…"
                aria-label="Search the directory"
                className="bg-transparent w-full outline-none text-paper-50 placeholder:text-paper-50/22 leading-[1.05] border-b border-white/12 pb-3 focus:border-sage-300/70 transition-colors text-center"
                style={{
                  fontFamily: '"Cormorant","Cormorant Garamond",Georgia,serif',
                  fontWeight: 300,
                  fontStyle: "italic",
                  fontSize: "clamp(28px, 3.6vw, 44px)",
                  letterSpacing: "-0.01em",
                }}
              />
            </div>

            {/* Editorial directory grid */}
            <div className="w-full mt-12 lg:mt-16">
              {visibleGroups.length === 0 ? (
                <div
                  className="text-paper-50/55 italic text-[20px] text-center mt-10"
                  style={{
                    fontFamily:
                      '"Cormorant","Cormorant Garamond",Georgia,serif',
                  }}
                >
                  Nothing by that name.
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 lg:gap-x-12 gap-y-10">
                  {visibleGroups.map((g, gi) => (
                    <div
                      key={g.label}
                      style={{
                        animation: `menu-fade-in 500ms ${
                          240 + gi * 60
                        }ms ease-out both`,
                      }}
                    >
                      <div className="text-[10px] uppercase tracking-[0.30em] text-sage-300/85 mb-3.5 font-mono">
                        {g.label}
                      </div>
                      <ul className="flex flex-col">
                        {g.items.map((p) => {
                          const active = isActive(p.href);
                          return (
                            <li key={p.href}>
                              <Link
                                href={p.href}
                                onClick={onClose}
                                className={`group inline-flex items-baseline gap-2.5 py-1 transition-all ${
                                  active
                                    ? "text-sage-300"
                                    : "text-paper-50/85 hover:text-paper-50 hover:translate-x-1"
                                }`}
                                style={{
                                  fontFamily:
                                    '"Cormorant","Cormorant Garamond",Georgia,serif',
                                  fontWeight: 300,
                                  fontStyle: "italic",
                                  fontSize: "20px",
                                  lineHeight: 1.35,
                                  letterSpacing: "-0.005em",
                                }}
                              >
                                <span
                                  className={`inline-block w-1 h-1 rounded-full mt-[10px] transition-all ${
                                    active
                                      ? "bg-sage-300 scale-[1.6]"
                                      : "bg-transparent group-hover:bg-sage-300/60"
                                  }`}
                                  aria-hidden
                                />
                                <span>{p.label}</span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bottom signature */}
          <div className="mt-14 pt-6 border-t border-white/8 shrink-0">
            <p
              className="text-paper-50/40 italic text-[13px] leading-relaxed text-center"
              style={{
                fontFamily: '"Cormorant","Cormorant Garamond",Georgia,serif',
              }}
            >
              Every room is here. Wander as long as you like.
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes menu-fade-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="menu-fade-in"] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
