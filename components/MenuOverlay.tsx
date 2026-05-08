"use client";

// Full-screen editorial navigation overlay.
//
// Opens with Cmd/Ctrl+K, the Menu button in the top bar, or the More tab on
// mobile. Closes with Escape, click-on-backdrop, or selecting a destination.
// Search input filters across all routes by label.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
      const t = setTimeout(() => inputRef.current?.focus(), 60);
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

  if (!open) return null;

  const q = query.trim().toLowerCase();
  const matches = (label: string) => !q || label.toLowerCase().includes(q);

  return (
    <div className="fixed inset-0 z-[100] menu-overlay-anim" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 menu-backdrop"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative mx-auto h-full max-w-[1280px] px-6 lg:px-12 py-8 lg:py-12 overflow-y-auto">
        {/* Top: brand + search + close */}
        <div className="flex items-start justify-between gap-6 mb-12 lg:mb-16">
          <div>
            <p className="text-[10px] uppercase tracking-[0.32em] text-sage-300/70 mb-3 font-mono">
              AISLE — VOL. 01 / TABLE OF CONTENTS
            </p>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find anything…"
              className="bg-transparent display italic font-light text-[36px] sm:text-[44px] lg:text-[56px] outline-none w-full max-w-[520px] text-paper-50 placeholder:text-paper-50/25 leading-none border-b border-white/15 pb-3 focus:border-sage-300 transition-colors"
              style={{ fontFamily: '"Cormorant","Cormorant Garamond",Georgia,serif', fontWeight: 300 }}
            />
          </div>
          <button
            onClick={onClose}
            className="shrink-0 text-paper-50/60 hover:text-paper-50 text-[11px] uppercase tracking-[0.22em] flex items-center gap-2 mt-2"
          >
            Close
            <span className="inline-flex w-7 h-7 rounded-full border border-white/15 items-center justify-center text-[12px]">×</span>
          </button>
        </div>

        {/* Editorial nav grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-10 gap-y-12">
          {NAV_GROUPS.map((g) => {
            const items = g.items
              .filter((i) => isVisible(i, state))
              .filter((i) => matches(i.label));
            if (!items.length) return null;
            return (
              <div key={g.label}>
                <div className="text-[10px] uppercase tracking-[0.28em] text-sage-300/80 mb-5 font-medium font-mono">
                  {g.label}
                </div>
                <ul className="flex flex-col gap-1.5">
                  {items.map((p) => {
                    const active =
                      p.href === "/" ? pathname === "/" : pathname.startsWith(p.href);
                    return (
                      <li key={p.href}>
                        <Link
                          href={p.href}
                          onClick={onClose}
                          className={`group flex items-baseline gap-3 transition-colors py-1 ${
                            active ? "text-sage-300" : "text-paper-50/85 hover:text-paper-50"
                          }`}
                          style={{
                            fontFamily: '"Cormorant","Cormorant Garamond",Georgia,serif',
                            fontWeight: 300,
                            fontStyle: "italic",
                            fontSize: "26px",
                            lineHeight: 1.15,
                          }}
                        >
                          <span
                            className={`inline-block w-1.5 h-1.5 rounded-full mt-2 transition-all ${
                              active ? "bg-sage-300" : "bg-transparent group-hover:bg-sage-300/50"
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
            );
          })}
        </div>

        {/* Bottom hint */}
        <div className="mt-16 lg:mt-20 pt-6 border-t border-white/8 flex items-center justify-between text-[10px] uppercase tracking-[0.24em] text-paper-50/40 font-mono">
          <span>Esc to close</span>
          <span>⌘ K to open from anywhere</span>
        </div>
      </div>
    </div>
  );
}
