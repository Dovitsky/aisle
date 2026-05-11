"use client";

// VendorMap. geographic visualization of the vendor pipeline.
//
// Uses Google Maps' free iframe embed (no API key required) to render a
// search-result-style map. The query string combines the brief region with
// the active category filter so the visible result set matches what the
// /vendors pipeline below shows.
//
// When a vendor city is hovered or clicked in the pipeline, the iframe
// re-loads with that city as the focus.

import { useMemo, useState } from "react";
import type { ProjectState, VendorCategory } from "@/lib/types";

interface Props {
  state: ProjectState;
  category?: VendorCategory | "all";
  /** Optional override. if a specific vendor is selected, focus the map on its city. */
  focusCity?: string | null;
}

export function VendorMap({ state, category = "all", focusCity = null }: Props) {
  const [zoom, setZoom] = useState<"region" | "city">(focusCity ? "city" : "region");

  const region = state.brief?.region ?? "";

  const query = useMemo(() => {
    if (focusCity) return focusCity;
    if (category && category !== "all") {
      return `${categoryToSearchQuery(category)} near ${region}`;
    }
    return `wedding venues near ${region}`;
  }, [region, category, focusCity]);

  const src = `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed&z=${zoom === "city" ? 13 : 9}`;

  if (!region) {
    return (
      <div className="rounded-card border hairline glass px-7 py-12 text-center">
        <p className="display text-xl text-ink leading-tight">Lock the brief to see the map.</p>
        <p className="text-[13px] text-ink-300 mt-2">
          Once you've picked a region, AISLE plots every shortlisted vendor here.
        </p>
      </div>
    );
  }

  // Build a tiny pin legend keyed off vendors in the relevant categories.
  const visibleVendors = state.vendors.filter((v) => {
    if (v.status === "passed") return false;
    if (category === "all") return true;
    return v.category === category;
  });
  const cities = Array.from(new Set(visibleVendors.map((v) => v.city).filter(Boolean)));

  return (
    <section className="rounded-card border hairline overflow-hidden bg-paper-50 shadow-card">
      <header className="px-5 pt-4 pb-3 flex items-baseline justify-between gap-3 border-b hairline">
        <div>
          <div className="eyebrow text-[10px]">Geography</div>
          <h3 className="display text-[20px] leading-tight mt-0.5">
            {focusCity
              ? <>Showing <span className="italic text-sage-500">{focusCity}</span></>
              : category && category !== "all"
                ? <>{category} near <span className="italic text-sage-500">{region}</span></>
                : <>{region}</>
            }
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setZoom("region")}
            className={`text-[10.5px] uppercase tracking-[0.18em] px-2.5 py-1 rounded-full transition-colors ${
              zoom === "region" ? "bg-ink text-paper-50" : "text-ink-300 hover:text-ink hover:bg-paper-200"
            }`}
          >
            Region
          </button>
          <button
            type="button"
            onClick={() => setZoom("city")}
            className={`text-[10.5px] uppercase tracking-[0.18em] px-2.5 py-1 rounded-full transition-colors ${
              zoom === "city" ? "bg-ink text-paper-50" : "text-ink-300 hover:text-ink hover:bg-paper-200"
            }`}
          >
            City
          </button>
        </div>
      </header>

      <div className="relative aspect-[16/9] bg-paper-200">
        <iframe
          key={src /* force-reload when query changes */}
          src={src}
          className="absolute inset-0 w-full h-full"
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          title={`Map of ${query}`}
        />
      </div>

      {cities.length > 0 && (
        <div className="px-5 py-3 border-t hairline">
          <div className="eyebrow text-[10px] mb-2">Active in</div>
          <ul className="flex flex-wrap gap-1.5">
            {cities.map((c) => {
              const count = visibleVendors.filter((v) => v.city === c).length;
              return (
                <li key={c}>
                  <span className="inline-flex items-baseline gap-1.5 rounded-full border hairline bg-white/80 px-3 py-1 text-[12px]">
                    <span className="font-medium">{c}</span>
                    <span className="text-ink-300">·</span>
                    <span className="text-ink-300">{count} {count === 1 ? "shortlisted" : "shortlisted"}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

function categoryToSearchQuery(c: VendorCategory): string {
  switch (c) {
    case "Venue":           return "wedding venues";
    case "Photographer":    return "wedding photographers";
    case "Videographer":    return "wedding videographers";
    case "Florist":         return "wedding florists";
    case "Caterer":         return "wedding caterers";
    case "Band":            return "wedding bands";
    case "DJ":              return "wedding DJs";
    case "Cake":            return "wedding cake bakers";
    case "Bartending":      return "bartending services";
    case "Hair & Makeup":   return "wedding hair and makeup";
    case "Officiant":       return "wedding officiants";
    case "Stationer":       return "wedding stationers";
    case "Calligrapher":    return "wedding calligraphers";
    case "Rentals":         return "wedding rental companies";
    case "Transportation":  return "wedding transportation";
    default:                return "wedding vendors";
  }
}
