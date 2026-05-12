"use client";

// SectionSidebar. A sticky left navigation rail rendered alongside any
// route that belongs to a section group (Build, The Day). Lists the
// rooms in that section so the user always knows where they are and
// can hop between rooms in one tap, no menu opening required.
//
// Items can either be a flat link (href) or a deep-linked search-param
// filter (href + query.category). Groups split a section into visual
// subheads. Build splits into "Vendors" + "Plan", The Day stays flat.

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export type SectionItem = {
  href: string;
  label: string;
  /** When set, the sidebar link includes `?category=<value>` and the
   *  active match also checks that the URL's `category` matches. */
  category?: string;
};

export type SectionGroup = {
  label: string;
  items: SectionItem[];
};

// ---- Build: vendor categories first, planning rooms second ----------------

const BUILD_VENDOR_ITEMS: SectionItem[] = [
  { href: "/vendors", label: "Venue", category: "Venue" },
  { href: "/vendors", label: "Photographer", category: "Photographer" },
  { href: "/vendors", label: "Florist", category: "Florist" },
  { href: "/vendors", label: "Caterer", category: "Caterer" },
  { href: "/vendors", label: "Officiant", category: "Officiant" },
  { href: "/vendors", label: "Band", category: "Band" },
  { href: "/vendors", label: "DJ", category: "DJ" },
  { href: "/vendors", label: "Cake", category: "Cake" },
  { href: "/vendors", label: "Bar", category: "Bartending" },
  { href: "/vendors", label: "Hair & makeup", category: "Hair & Makeup" },
  { href: "/vendors", label: "Stationer", category: "Stationer" },
  { href: "/vendors", label: "Videographer", category: "Videographer" },
  { href: "/vendors", label: "Rentals", category: "Rentals" },
  { href: "/vendors", label: "Transportation", category: "Transportation" },
  { href: "/vendors", label: "Calligrapher", category: "Calligrapher" },
];

const BUILD_PLAN_ITEMS: SectionItem[] = [
  { href: "/budget", label: "Budget" },
  { href: "/guests", label: "Guests" },
  { href: "/wedding-party", label: "Wedding party" },
  { href: "/design", label: "Design" },
  { href: "/atelier", label: "Atelier. the dress" },
  { href: "/music", label: "Music" },
  { href: "/seating", label: "Seating" },
  { href: "/stationery", label: "Stationery" },
  { href: "/website", label: "Website" },
  { href: "/logistics", label: "Logistics" },
  { href: "/dietary", label: "Dietary" },
];

export const BUILD_GROUPS: SectionGroup[] = [
  { label: "Vendors", items: BUILD_VENDOR_ITEMS },
  { label: "Plan", items: BUILD_PLAN_ITEMS },
];

// Flat list kept for back-compat with anything that imports BUILD_ITEMS.
export const BUILD_ITEMS: SectionItem[] = [
  ...BUILD_VENDOR_ITEMS,
  ...BUILD_PLAN_ITEMS,
];

export const DAY_ITEMS: SectionItem[] = [
  { href: "/day-of", label: "Day-of console" },
  { href: "/ceremony", label: "Ceremony" },
  { href: "/pre-events", label: "Other events" },
  { href: "/memorials", label: "Memorials" },
  { href: "/tips", label: "Tips" },
];

export const DAY_GROUPS: SectionGroup[] = [
  { label: "The Day", items: DAY_ITEMS },
];

export function SectionSidebar({
  label,
  items,
  groups,
}: {
  label: string;
  /** Flat fallback when no groups are provided. */
  items?: SectionItem[];
  groups?: SectionGroup[];
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("category");

  const isActive = (it: SectionItem) => {
    const pathMatch =
      it.href === "/"
        ? pathname === "/"
        : pathname === it.href || pathname.startsWith(it.href + "/");
    if (!pathMatch) return false;
    if (it.category) return it.category === activeCategory;
    // For non-category items on a category-bearing route, treat as active
    // ONLY if no category is selected (otherwise the category sub-item owns it).
    if (it.href === "/vendors") return !activeCategory;
    return true;
  };

  const renderItem = (it: SectionItem) => {
    const active = isActive(it);
    const href = it.category
      ? `${it.href}?category=${encodeURIComponent(it.category)}`
      : it.href;
    return (
      <li key={`${it.href}:${it.category ?? ""}`}>
        <Link
          href={href}
          className={`group flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[14px] leading-tight transition-all ${
            active
              ? "bg-ink text-paper-50"
              : "text-ink-400 hover:text-ink hover:bg-ink/[0.04]"
          }`}
          style={{ fontWeight: active ? 500 : 400 }}
        >
          <span
            aria-hidden
            className={`inline-block w-1 h-1 rounded-full shrink-0 transition-all ${
              active ? "bg-paper-50" : "bg-transparent group-hover:bg-sage-500"
            }`}
          />
          {it.label}
        </Link>
      </li>
    );
  };

  return (
    <aside
      className="hidden lg:flex flex-col sticky self-start no-scrollbar"
      style={{
        top: 96,
        // Pin to the viewport with its own scroll. The list is long
        // (30+ items between vendors + plan) and the page itself scrolls
        // independently, so the sidebar stays glued and only its own
        // contents move when overflowed.
        maxHeight: "calc(100vh - 96px - 16px)",
        overflowY: "auto",
        overscrollBehavior: "contain",
      }}
      aria-label={`${label} navigation`}
    >
      <div className="text-[10px] uppercase tracking-[0.30em] font-mono text-ink-300 mb-4 pl-3 sticky top-0 bg-paper-50/95 backdrop-blur-sm py-1 z-10">
        {label}
      </div>
      <nav className="flex flex-col gap-6 pb-4">
        {(groups ?? [{ label: "", items: items ?? [] }]).map((g, gi) => (
          <div key={`${g.label}-${gi}`}>
            {g.label && groups && groups.length > 1 && (
              <div className="text-[9.5px] uppercase tracking-[0.24em] font-mono text-ink-200 mb-2 pl-3">
                {g.label}
              </div>
            )}
            <ul className="flex flex-col">{g.items.map(renderItem)}</ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
