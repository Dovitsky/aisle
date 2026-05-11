"use client";

// Discover. browse-and-be-inspired surface. Five sections per
// AISLE_DISCOVER_MOODBOARD spec: Trending now, Venues, Vibes, Real
// weddings, Editorial. Pin to a board with one tap from any image card.

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useProject } from "./StateProvider";
import { Reveal, BreathingDot } from "./Atmosphere";
import { TRENDING, type TrendingItem } from "@/lib/discover/trending";
import { VIBES, type Vibe } from "@/lib/discover/vibes";
import { DISCOVER_VENUES, type DiscoverVenue, type VenueRegion } from "@/lib/discover/venues";
import { REAL_WEDDINGS, type RealWedding } from "@/lib/discover/weddings";
import { EDITORIAL, type EditorialArticle } from "@/lib/discover/editorial";
import type { MoodBoard } from "@/lib/types";

export function DiscoverView() {
  const { state } = useProject();
  const [boards, setBoards] = useState<MoodBoard[]>([]);
  const [pinTarget, setPinTarget] = useState<{ image: string; sourceMetadata: Record<string, unknown> } | null>(null);

  useEffect(() => {
    void fetch("/api/mood-boards").then((r) => r.json()).then((j: { boards: MoodBoard[] }) => {
      setBoards(j.boards ?? []);
    });
  }, []);

  const friday = new Date();
  friday.setDate(friday.getDate() - ((friday.getDay() + 5) % 7)); // last Tuesday-ish

  const openPin = (image: string, sourceMetadata: Record<string, unknown>) =>
    setPinTarget({ image, sourceMetadata });

  return (
    <div className="flex flex-col gap-14 lg:gap-16 pb-24">
      {/* HEADER. single tight line. Eyebrow + headline + "updated"
          inline microcopy. Trending content starts directly below. */}
      <header className="flex items-end justify-between gap-6 flex-wrap">
        <div>
          <p className="eyebrow flex items-center gap-2.5 text-[10.5px]">
            <BreathingDot />
            Discover · Trending now
          </p>
          <h1 className="display text-[34px] sm:text-[42px] lg:text-[52px] mt-2 leading-[1.02] tracking-[-0.01em] max-w-[760px]">
            What couples are loving this week.
          </h1>
        </div>
        <p className="text-[10.5px] text-ink-300 font-mono uppercase tracking-[0.22em] pb-2 shrink-0">
          Updated Tuesday
        </p>
      </header>

      {/* SECTION 1. TRENDING (no redundant section header. the page
          headline already says it) */}
      <Reveal>
        <TrendingMasonry items={TRENDING} onPin={(img, meta) => openPin(img, meta)} />
      </Reveal>

      {/* SECTION 2. VENUES */}
      <Reveal>
        <SectionHeader eyebrow="Venues" title="Where couples are saying yes" />
        <VenuesGrid venues={DISCOVER_VENUES} onPin={(img, meta) => openPin(img, meta)} />
      </Reveal>

      {/* SECTION 3. VIBES */}
      <Reveal>
        <SectionHeader eyebrow="Vibes" title="Aesthetics of the season" />
        <VibesScroller vibes={VIBES} />
      </Reveal>

      {/* SECTION 4. REAL WEDDINGS */}
      <Reveal>
        <SectionHeader eyebrow="Real weddings" title="Couples who decided" />
        <WeddingsGrid weddings={REAL_WEDDINGS} onPin={(img, meta) => openPin(img, meta)} />
      </Reveal>

      {/* SECTION 5. EDITORIAL */}
      <Reveal>
        <SectionHeader
          eyebrow="Editorial"
          title="Reading for the planning year"
          sub="From AISLE and friends."
        />
        <EditorialScroller articles={EDITORIAL} />
      </Reveal>

      {/* PIN-TO-BOARD MODAL */}
      {pinTarget && (
        <PinToBoardModal
          image={pinTarget.image}
          sourceMetadata={pinTarget.sourceMetadata}
          boards={boards.filter((b) => b.gateScope === null || b.gateScope === undefined || state?.viewer === "organizer")}
          onClose={() => setPinTarget(null)}
        />
      )}
    </div>
  );
}

// ---------- Section header ----------

function SectionHeader({ eyebrow, title, sub }: { eyebrow: string; title: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-8 lg:mb-10">
      <div className="text-[10.5px] uppercase tracking-[0.28em] text-sage-500 font-mono mb-2">
        {eyebrow}
      </div>
      <h2 className="display text-[28px] sm:text-[36px] leading-[1.05] tracking-[-0.005em] text-ink">
        {title}
      </h2>
      {sub && <p className="display italic text-[16px] text-ink-300 mt-2 max-w-[560px]">{sub}</p>}
    </div>
  );
}

// ---------- Trending masonry ----------

function TrendingMasonry({ items, onPin }: {
  items: TrendingItem[];
  onPin: (image: string, sourceMetadata: Record<string, unknown>) => void;
}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 stagger">
      {items.map((it) => {
        if (it.kind === "photo") {
          return (
            <div key={it.id} className="group relative overflow-hidden rounded-card bg-paper-200 cursor-zoom-in"
              style={{ aspectRatio: "4 / 5" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.image} alt={it.place} loading="lazy"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
              <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/60 via-black/15 to-transparent text-paper-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="text-[10.5px] uppercase tracking-[0.18em] font-mono">{it.place}</div>
                <div className="text-[11px] mt-0.5 italic opacity-80">{it.credit} · {it.pinnedThisWeek.toLocaleString()} pinned this week</div>
              </div>
              <button
                onClick={() => onPin(it.image, { sourceKind: "trending-photo", id: it.id, credit: it.credit, place: it.place })}
                className="absolute top-2.5 right-2.5 rounded-full bg-white/85 backdrop-blur text-ink px-3 py-1 text-[10.5px] uppercase tracking-[0.18em] font-mono opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-white"
              >
                Pin
              </button>
            </div>
          );
        }
        if (it.kind === "vibe") {
          return (
            <Link
              key={it.id}
              href={`/discover/vibe/${it.vibeSlug}`}
              className="group relative overflow-hidden rounded-card bg-sage-100 hover:bg-sage-200 transition-colors flex flex-col justify-between p-5"
              style={{ aspectRatio: "4 / 5" }}
            >
              <div className="text-[10.5px] uppercase tracking-[0.22em] text-sage-500 font-mono">A vibe</div>
              <div>
                <div className="display italic text-[24px] sm:text-[28px] text-ink leading-tight">{it.vibeName}</div>
                <div className="text-[12px] text-ink-300 mt-2">{it.planningCount} couples planning this</div>
              </div>
            </Link>
          );
        }
        if (it.kind === "trend") {
          return (
            <article key={it.id} className="rounded-card bg-paper-50 border hairline p-5 flex flex-col"
              style={{ aspectRatio: "4 / 5" }}>
              <div className="text-[10.5px] uppercase tracking-[0.22em] text-sage-500 font-mono">{it.eyebrow}</div>
              <h3 className="display text-[22px] mt-2 text-ink leading-tight">{it.headline}</h3>
              <p className="text-[13px] text-ink-300 mt-3 leading-relaxed flex-1">{it.excerpt}</p>
              <div className="text-[11px] uppercase tracking-[0.18em] text-ink-400 font-mono mt-3 italic">
                {it.stat}
              </div>
              <span className="mt-3 text-[11px] uppercase tracking-[0.18em] text-sage-500">Read more →</span>
            </article>
          );
        }
        // wedding
        return (
          <Link key={it.id} href={`/discover/wedding/${it.weddingId}`}
            className="group relative overflow-hidden rounded-card bg-paper-200"
            style={{ aspectRatio: "4 / 5" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={it.image} alt={it.couple} loading="lazy"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
            <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/70 via-black/20 to-transparent text-paper-50">
              <div className="text-[10.5px] uppercase tracking-[0.18em] font-mono opacity-80">A real wedding</div>
              <div className="display italic text-[20px] mt-1">{it.couple}</div>
              <div className="text-[12px] opacity-80 mt-0.5">{it.region} · {it.season}</div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// ---------- Venues grid with filter chips ----------

function VenuesGrid({ venues, onPin }: { venues: DiscoverVenue[]; onPin: (image: string, m: Record<string, unknown>) => void }) {
  const [filter, setFilter] = useState<"All" | VenueRegion>("All");
  const filtered = useMemo(
    () => filter === "All" ? venues : venues.filter((v) => v.region === filter),
    [filter, venues],
  );
  const filters: ("All" | VenueRegion)[] = ["All", "Coastal", "Vineyard", "Urban", "Garden", "Destination"];
  return (
    <>
      <div className="flex gap-1.5 mb-6 flex-wrap">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-[11px] uppercase tracking-[0.18em] px-3.5 py-1.5 rounded-full transition-colors ${
              filter === f ? "bg-ink text-paper-50" : "border hairline text-ink-300 hover:text-ink hover:border-sage-300"
            }`}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 stagger">
        {filtered.map((v) => (
          <article key={v.id} className="group surface rounded-card border hairline shadow-card hover:shadow-cardHover overflow-hidden transition-shadow">
            <div className="relative bg-paper-200" style={{ aspectRatio: "16 / 9" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={v.image} alt={v.name} loading="lazy"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
              <button
                onClick={() => onPin(v.image, { sourceKind: "venue", id: v.id, name: v.name, region: v.region, city: v.city })}
                className="absolute top-3 right-3 rounded-full bg-white/85 backdrop-blur text-ink px-3 py-1 text-[10.5px] uppercase tracking-[0.18em] font-mono opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
              >
                Pin
              </button>
            </div>
            <div className="p-4">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="display text-[18px] text-ink leading-tight truncate">{v.name}</h3>
                <span className="text-[10.5px] uppercase tracking-[0.18em] font-mono text-ink-300 shrink-0">{v.region}</span>
              </div>
              <p className="text-[12.5px] text-ink-300 mt-0.5">{v.city}</p>
              <p className="display italic text-[14px] text-ink-400 mt-2 leading-relaxed">{v.description}</p>
              <div className="flex items-baseline justify-between mt-4 text-[10.5px] uppercase tracking-[0.18em] font-mono">
                <span className="text-sage-500">{v.bookingsTrend}</span>
                <span className="text-ink-300">{v.availability}</span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

// ---------- Vibes horizontal scroller ----------

function VibesScroller({ vibes }: { vibes: Vibe[] }) {
  return (
    <div className="-mx-5 lg:-mx-12 overflow-x-auto no-scrollbar pl-5 lg:pl-12 pr-5 lg:pr-12">
      <ul className="flex gap-3 lg:gap-4 stagger" style={{ width: "max-content" }}>
        {vibes.map((v) => (
          <li key={v.slug} style={{ width: 240 }}>
            <Link
              href={`/discover/vibe/${v.slug}`}
              className="group relative block overflow-hidden rounded-card bg-paper-200"
              style={{ aspectRatio: "2 / 3" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={v.image} alt={v.name} loading="lazy"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.05]" />
              <div className="absolute inset-x-0 bottom-0 p-4"
                style={{
                  background:
                    "linear-gradient(to top, rgba(60,80,70,0.85) 0%, rgba(60,80,70,0.55) 30%, transparent 65%)",
                }}>
                <div className="display italic text-[24px] text-paper-50 leading-tight">{v.name}</div>
                <div className="text-[11px] text-paper-50/80 mt-1 font-mono uppercase tracking-[0.18em]">{v.boardCount} boards</div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- Real weddings grid ----------

function WeddingsGrid({ weddings, onPin }: { weddings: RealWedding[]; onPin: (image: string, m: Record<string, unknown>) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 stagger">
      {weddings.map((w) => (
        <article key={w.id} className="group surface rounded-card border hairline shadow-card hover:shadow-cardHover overflow-hidden transition-shadow">
          <div className="relative bg-paper-200" style={{ aspectRatio: "16 / 9" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={w.hero} alt={w.couple} loading="lazy"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
            <button
              onClick={() => onPin(w.hero, { sourceKind: "wedding", id: w.id, couple: w.couple })}
              className="absolute top-3 right-3 rounded-full bg-white/85 backdrop-blur text-ink px-3 py-1 text-[10.5px] uppercase tracking-[0.18em] font-mono opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
            >
              Pin
            </button>
          </div>
          <div className="p-4">
            <h3 className="display text-[20px] text-ink leading-tight">{w.couple}</h3>
            <div className="text-[12px] text-ink-300 mt-0.5 font-mono uppercase tracking-[0.16em]">
              {w.region} · {w.season}
            </div>
            <p className="display italic text-[14px] text-ink-400 mt-2 leading-relaxed line-clamp-2">
              &ldquo;{w.pullQuote}&rdquo;
            </p>
            <div className="flex items-baseline justify-between mt-4 text-[10.5px] uppercase tracking-[0.18em] font-mono">
              <span className="text-ink-400">{w.guestCount} guests</span>
              <span className="text-sage-500">{w.budgetBand}</span>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

// ---------- Editorial scroller ----------

function EditorialScroller({ articles }: { articles: EditorialArticle[] }) {
  return (
    <div className="-mx-5 lg:-mx-12 overflow-x-auto no-scrollbar pl-5 lg:pl-12 pr-5 lg:pr-12">
      <ul className="flex gap-3 lg:gap-4 stagger" style={{ width: "max-content" }}>
        {articles.map((a) => (
          <li key={a.slug} style={{ width: 280 }}>
            <Link
              href={`/discover/editorial/${a.slug}`}
              className="group block surface rounded-card border hairline shadow-card hover:shadow-cardHover overflow-hidden transition-shadow"
            >
              <div className="relative bg-paper-200" style={{ aspectRatio: "5 / 3" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.cover} alt={a.title} loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
              </div>
              <div className="p-4">
                <div className="text-[10.5px] uppercase tracking-[0.22em] text-sage-500 font-mono">{a.category}</div>
                <h3 className="display text-[18px] text-ink mt-1 leading-tight">{a.title}</h3>
                <p className="text-[12.5px] text-ink-300 mt-2 leading-relaxed line-clamp-2">{a.excerpt}</p>
                <div className="text-[10.5px] uppercase tracking-[0.18em] text-ink-300 font-mono mt-3">{a.readMinutes} min</div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- Pin-to-board modal ----------

function PinToBoardModal({
  image, sourceMetadata, boards, onClose,
}: { image: string; sourceMetadata: Record<string, unknown>; boards: MoodBoard[]; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const pin = async (boardId: string) => {
    setBusy(true); setErr(null);
    try {
      const r = await fetch(`/api/mood-boards/${boardId}/pins`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source: "discover", imageUrl: image, sourceMetadata }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "Failed.");
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}>
      <div className="surface rounded-card border hairline shadow-card max-w-md w-full p-5"
        onClick={(e) => e.stopPropagation()}>
        <div className="text-[10.5px] uppercase tracking-[0.26em] text-sage-500 font-mono mb-3">
          Pin to a board
        </div>
        <div className="rounded-md overflow-hidden bg-paper-200 mb-4" style={{ aspectRatio: "16 / 10" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="" className="w-full h-full object-cover" />
        </div>
        <ul className="flex flex-col gap-1.5">
          {boards.map((b) => (
            <li key={b.id}>
              <button
                onClick={() => pin(b.id)}
                disabled={busy}
                className="w-full text-left rounded-xl border hairline bg-white/70 hover:bg-white hover:border-sage-300 px-4 py-3 transition-all flex items-baseline justify-between gap-3 disabled:opacity-50"
              >
                <span className="display italic text-[16px] text-ink">{b.name}</span>
                <span className="text-[10.5px] uppercase tracking-[0.18em] text-ink-300 font-mono">
                  {b.pinCount} pins{b.gateScope ? " · gated" : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
        {err && <p className="text-[12px] text-risk-high mt-3">{err}</p>}
        <div className="flex justify-between mt-4">
          <button onClick={onClose} className="text-[11px] uppercase tracking-[0.18em] text-ink-300 hover:text-ink transition-colors">
            Cancel
          </button>
          <Link href="/mood-board" onClick={onClose} className="text-[11px] uppercase tracking-[0.18em] text-sage-500 hover:text-ink transition-colors">
            Open mood boards →
          </Link>
        </div>
      </div>
    </div>
  );
}
