"use client";

// NavSpread — the entire navigation rendered inline on the home page as a
// magazine-style table of contents. Each group is a column. Hover reveals a
// sage dot; the active route is highlighted in sage.

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ProjectState } from "@/lib/types";
import { NAV_GROUPS, isVisible } from "@/lib/nav";

export function NavSpread({ state }: { state: ProjectState | null }) {
  const pathname = usePathname();

  return (
    <section
      aria-label="All sections"
      className="border-t hairline pt-10 lg:pt-14"
    >
      <div className="flex items-baseline justify-between mb-8 lg:mb-10">
        <h2 className="display italic text-[22px] lg:text-[26px] text-ink leading-tight">
          The whole wedding,{" "}
          <span className="text-sage-500">in one place</span>.
        </h2>
        <p className="text-[10px] uppercase tracking-[0.24em] text-ink-300 font-mono hidden sm:block">
          Table of contents
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-8 gap-y-10">
        {NAV_GROUPS.map((g) => {
          const items = g.items.filter((i) => isVisible(i, state));
          if (!items.length) return null;
          return (
            <div key={g.label}>
              <div className="text-[10px] uppercase tracking-[0.26em] text-sage-500 font-mono mb-3.5">
                {g.label}
              </div>
              <ul className="flex flex-col gap-1">
                {items.map((p) => {
                  const active =
                    p.href === "/" ? pathname === "/" : pathname.startsWith(p.href);
                  return (
                    <li key={p.href}>
                      <Link
                        href={p.href}
                        className={`group inline-flex items-baseline gap-2 transition-colors py-0.5 ${
                          active ? "text-sage-500" : "text-ink hover:text-sage-500"
                        }`}
                        style={{
                          fontFamily:
                            '"Cormorant","Cormorant Garamond",Georgia,serif',
                          fontWeight: 300,
                          fontStyle: "italic",
                          fontSize: "20px",
                          lineHeight: 1.2,
                        }}
                      >
                        <span
                          className={`inline-block w-1 h-1 rounded-full transition-all ${
                            active
                              ? "bg-sage-500"
                              : "bg-transparent group-hover:bg-sage-400"
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
    </section>
  );
}
