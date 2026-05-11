"use client";

// Shared chrome for every /atelier/* surface. Warmer paper tint, sub-nav,
// a quiet "private" indicator (the dress firewall lives down at the data
// layer; here it's just signaled).

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/atelier", label: "Atelier" },
  { href: "/atelier/dress", label: "Dress" },
  { href: "/atelier/veil", label: "Veil" },
  { href: "/atelier/fittings", label: "Fittings" },
];

export function AtelierShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div
      className="min-h-[calc(100dvh-72px)] -mx-5 lg:-mx-12 px-5 lg:px-12 pt-2 pb-16"
      style={{ background: "#FBF8F2" }}
    >
      <div className="flex items-baseline justify-between gap-4 flex-wrap pb-5 mb-6 border-b border-ink/8">
        <nav className="flex items-baseline gap-6 flex-wrap">
          {TABS.map((t) => {
            const active = pathname === t.href;
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`text-[12px] uppercase tracking-[0.22em] font-mono transition-colors ${
                  active ? "text-ink" : "text-ink-300 hover:text-ink"
                }`}
                style={{ fontWeight: active ? 600 : 400 }}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
        <span
          className="text-[10px] uppercase tracking-[0.30em] font-mono inline-flex items-center gap-2"
          style={{ color: "rgba(14,15,13,0.42)" }}
        >
          <span
            aria-hidden
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ background: "#6E8068" }}
          />
          Private to you
        </span>
      </div>
      {children}
    </div>
  );
}
