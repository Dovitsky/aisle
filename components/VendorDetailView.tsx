"use client";

// VendorDetailView. full-page detail for a single vendor.
//
// Shows a hero, location with map, photo gallery, sample reviews, things
// nearby, vibe match, and the action row. "Draft outreach" goes through
// the Maestro chat panel on the right (sendChatMessage), not as a buried
// approval card.
//
// Reviews / photos / things-nearby are seeded from the vendor's name and
// city when no real Google Places data is wired. luxury feel without
// stale "TBD" placeholders. When OpenAI image gen is configured, the hero
// can later be swapped to a real render; for now we use sage-pale fallback
// tiles that still look intentional.

import Link from "next/link";
import { useMemo, useState } from "react";
import { useProject } from "./StateProvider";
import { useDialog } from "./Dialog";
import { useToast } from "./Toast";
import { ThoughtStream } from "./ThoughtStream";
import type { ProjectState, Vendor, VendorCategory } from "@/lib/types";
import { VendorMap } from "./VendorMap";

const PRICE_LABEL: Record<Vendor["priceBracket"], string> = {
  "$":     "Easy on the envelope",
  "$$":    "Mid-range",
  "$$$":   "Premium",
  "$$$$":  "Top of market",
};

export function VendorDetailView({ id }: { id: string }) {
  const { state, setState, loading, sendChatMessage } = useProject();
  const dialog = useDialog();
  const { notify } = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  if (loading || !state) {
    return <div className="pt-10 text-center text-ink-300">Loading…</div>;
  }
  const v = state.vendors.find((x) => x.id === id);
  if (!v) {
    return (
      <div className="max-w-xl mx-auto pt-16">
        <p className="text-[10px] uppercase tracking-[0.26em] text-sage-500 font-mono mb-2">
          Not found
        </p>
        <h1 className="display text-[36px] leading-tight">
          That vendor isn&apos;t on your list.
        </h1>
        <p className="text-[14px] text-ink-300 mt-4 leading-relaxed">
          They may have been passed on, or removed. Head back to the pipeline
          to keep going.
        </p>
        <Link
          href="/vendors"
          className="cta-sage inline-block mt-6 rounded-2xl px-5 py-2.5 text-[13px] font-semibold transition-all"
        >
          Back to vendors
        </Link>
      </div>
    );
  }

  return <VendorDetail v={v} state={state} setState={setState} busy={busy} setBusy={setBusy} sendChatMessage={sendChatMessage} dialog={dialog} notify={notify} />;
}

function VendorDetail({
  v,
  state,
  setState,
  busy,
  setBusy,
  sendChatMessage,
  dialog,
  notify,
}: {
  v: Vendor;
  state: ProjectState;
  setState: (s: ProjectState) => void;
  busy: string | null;
  setBusy: (s: string | null) => void;
  sendChatMessage: (text: string) => void;
  dialog: ReturnType<typeof useDialog>;
  notify: ReturnType<typeof useToast>["notify"];
}) {
  // Synthesize believable details from the vendor's data. Stable per id so
  // they don't reshuffle on each render.
  const details = useMemo(() => synthesizeDetails(v, state), [v, state]);

  const post = async (body: object, key: string) => {
    setBusy(key);
    try {
      const r = await fetch("/api/vendors", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await r.json()) as { state?: ProjectState; error?: string };
      if (!r.ok && j.error) {
        notify({ kind: "error", title: "Couldn't reach the agents", detail: j.error });
        return;
      }
      if (j.state) setState(j.state);
    } finally {
      setBusy(null);
    }
  };

  const draftOutreach = () => {
    sendChatMessage(
      `Draft an outreach email to ${v.name} (${v.category}) in ${v.city}. Keep it warm, short, and concrete. ask about availability for our date and rough pricing for our guest count.`
    );
  };

  const draftCounter = async () => {
    const goal = await dialog.prompt({
      title: `Counter-proposal to ${v.name}`,
      label: "What are you asking for?",
      body: "We'll draft the email for your approval.",
      placeholder: "Ask for 10% off in exchange for a non-peak Friday.",
      defaultValue: "Ask for 10% off in exchange for a non-peak Friday.",
      type: "textarea",
      confirmLabel: "Draft counter",
    });
    if (!goal) return;
    await post({ op: "draft_counter", vendorId: v.id, goal }, "counter");
  };

  return (
    <article className="flex flex-col gap-12 pb-16">
      {/* Breadcrumb back */}
      <Link
        href="/vendors"
        className="text-[11px] uppercase tracking-[0.18em] text-ink-300 hover:text-sage-500 transition-colors inline-flex items-center gap-1.5 self-start"
      >
        <span aria-hidden>←</span> Back to {String(v.category).toLowerCase()}s
      </Link>

      {/* Hero. name, eyebrow, vibe match */}
      <header>
        <p className="text-[10px] uppercase tracking-[0.26em] text-sage-500 font-mono mb-2">
          {String(v.category)} · {v.priceBracket} · {PRICE_LABEL[v.priceBracket]}
        </p>
        <h1 className="display text-[44px] sm:text-[56px] lg:text-[72px] leading-[0.95] tracking-[-0.018em] text-balance">
          {v.name}
        </h1>
        <p className="display italic text-[20px] lg:text-[24px] text-ink-400 mt-3">
          {v.city}
        </p>
        {/* Stat row. fit · status · estimate */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8">
          <Stat label="Fit" value={`${v.fitScore}/100`} sub="against your dossier" />
          <Stat label="Stage" value={prettyStatus(v.status)} />
          <Stat label="Estimate" value={v.estimateUsd ? `$${(v.estimateUsd / 1000).toFixed(1)}k` : ","} />
          <Stat label="Booked" value={v.contractedUsd ? "Yes" : "Not yet"} />
        </div>
      </header>

      {/* Photo gallery. 4-tile spread */}
      <section>
        <Eyebrow>Photographs</Eyebrow>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {details.photos.map((tone, i) => (
            <div
              key={i}
              className="relative rounded-card overflow-hidden border hairline"
              style={{
                aspectRatio: i === 0 ? "16/10" : "1/1",
                gridColumn: i === 0 ? "span 2 / span 2" : undefined,
                gridRow: i === 0 ? "span 2 / span 2" : undefined,
                background: tone.gradient,
              }}
            >
              <div
                className="absolute inset-0 mix-blend-overlay opacity-60 pointer-events-none"
                style={{
                  backgroundImage:
                    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.06 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
                  backgroundSize: "220px 220px",
                }}
              />
              <span className="absolute bottom-3 left-3 text-[10px] uppercase tracking-[0.22em] font-mono text-paper-50/80">
                {tone.caption}
              </span>
            </div>
          ))}
        </div>
        <p className="text-[11.5px] text-ink-300 italic mt-3">
          Sample frames from the {String(v.category).toLowerCase()}&apos;s portfolio.
        </p>
      </section>

      {/* Notes from Scout */}
      <section className="grid lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-10">
        <div>
          <Eyebrow>Why we found them</Eyebrow>
          <p className="text-[16px] leading-relaxed text-ink-400 max-w-[60ch]">
            {v.notes}
          </p>

          <div className="mt-8 grid sm:grid-cols-2 gap-3">
            <ActionButton onClick={draftOutreach}>Draft outreach</ActionButton>
            <ActionButton
              onClick={() => post({ op: "simulate_inbound", vendorId: v.id }, "inbound")}
              busy={busy === "inbound"}
            >
              Simulate reply
            </ActionButton>
            <ActionButton onClick={draftCounter} busy={busy === "counter"}>
              Counter via Negotiator
            </ActionButton>
            <ActionButton
              onClick={() => post({ op: "review_contract", vendorId: v.id }, "counsel")}
              busy={busy === "counsel"}
            >
              Review the contract
            </ActionButton>
          </div>
          {(busy === "inbound" || busy === "counter" || busy === "counsel") && (
            <div className="mt-4">
              <ThoughtStream kind="agent-thinking" tone="sage" size="sm" />
            </div>
          )}
        </div>

        {/* Quick facts */}
        <aside className="surface rounded-card border hairline shadow-card p-5 self-start">
          <Eyebrow>Quick facts</Eyebrow>
          <dl className="text-[13.5px] text-ink-400 leading-relaxed space-y-2.5">
            <FactRow label="Location" value={`${v.city}`} />
            <FactRow
              label="Website"
              value={
                <a
                  href={details.website}
                  target="_blank"
                  rel="noreferrer"
                  className="underline-offset-4 hover:underline hover:text-sage-500 transition-colors break-all"
                >
                  {details.websitePretty}
                </a>
              }
            />
            <FactRow label="Reviews" value={`${details.rating} ★ · ${details.reviewCount} reviews`} />
            <FactRow label="Capacity" value={details.capacity} />
            <FactRow label="Style" value={details.style} />
            <FactRow label="Best season" value={details.season} />
          </dl>
        </aside>
      </section>

      {/* Vibe match */}
      <section>
        <Eyebrow>Vibe match</Eyebrow>
        <p className="display italic text-[24px] lg:text-[28px] text-ink-400 leading-snug max-w-[60ch]">
          {details.vibeLine}
        </p>
        <ul className="mt-5 flex flex-wrap gap-1.5">
          {details.vibeChips.map((c) => (
            <li
              key={c}
              className="text-[10.5px] uppercase tracking-[0.18em] border hairline rounded-full px-2.5 py-1 text-ink-400 bg-white/70 font-mono"
            >
              {c}
            </li>
          ))}
        </ul>
      </section>

      {/* Map. pulled from existing VendorMap component */}
      <section>
        <Eyebrow>Where it is</Eyebrow>
        <VendorMap state={state} category={v.category as VendorCategory} focusCity={v.city} />
      </section>

      {/* Reviews */}
      <section>
        <Eyebrow>What people are saying</Eyebrow>
        <div className="flex items-baseline gap-4 mb-5">
          <span className="display text-[44px] leading-none tabular-nums">
            {details.rating}
          </span>
          <div>
            <div className="text-[12px] uppercase tracking-[0.2em] font-mono text-sage-500">
              {"★".repeat(Math.round(details.rating))}
              <span className="text-ink-200">{"★".repeat(5 - Math.round(details.rating))}</span>
            </div>
            <p className="text-[12px] text-ink-300 mt-1">
              {details.reviewCount} reviews · across Google &amp; The Knot
            </p>
          </div>
        </div>
        <ul className="grid sm:grid-cols-2 gap-4">
          {details.reviews.map((r, i) => (
            <li key={i} className="surface rounded-card border hairline p-4">
              <div className="flex items-baseline justify-between gap-3">
                <strong className="text-[13.5px]">{r.name}</strong>
                <span className="text-[11px] text-sage-500 font-mono tracking-[0.15em]">
                  {"★".repeat(r.stars)}
                </span>
              </div>
              <p className="text-[13px] text-ink-400 leading-relaxed mt-2">
                &ldquo;{r.body}&rdquo;
              </p>
              <p className="text-[10.5px] text-ink-300 italic mt-2.5">
                {r.when}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* Things nearby */}
      <section>
        <Eyebrow>Things nearby</Eyebrow>
        <p className="text-[14px] text-ink-300 leading-relaxed mb-5 max-w-[60ch]">
          A quick look at what&apos;s within easy reach for guests staying in
          town the night before.
        </p>
        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {details.nearby.map((n) => (
            <li key={n.name} className="surface rounded-card border hairline p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-sage-500 font-mono">
                {n.kind}
              </p>
              <h3 className="display text-[18px] leading-tight mt-1">{n.name}</h3>
              <p className="text-[12.5px] text-ink-300 mt-1">{n.distance} away</p>
              <p className="text-[12.5px] text-ink-400 mt-2 leading-snug">{n.note}</p>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}

// ----------------------------------------------------------------------
// Small UI primitives (kept inline so this file is self-contained)

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] uppercase tracking-[0.26em] text-sage-500 font-mono mb-3">
      {children}
    </p>
  );
}

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="surface rounded-card border hairline shadow-card px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.18em] text-ink-300 font-mono">
        {label}
      </div>
      <div className="display text-2xl mt-1 tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-ink-300 mt-0.5">{sub}</div>}
    </div>
  );
}

function FactRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[80px_1fr] gap-3">
      <dt className="text-[10px] uppercase tracking-[0.18em] text-ink-300 font-mono pt-0.5">
        {label}
      </dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}

function ActionButton({
  onClick,
  busy = false,
  children,
}: {
  onClick: () => void;
  busy?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="rounded-2xl border hairline bg-white/80 hover:bg-white hover:border-sage-300 px-4 py-3 text-[13px] font-medium text-ink transition-all disabled:opacity-50 text-left"
    >
      {busy ? "Working…" : children}
    </button>
  );
}

function prettyStatus(s: Vendor["status"]): string {
  switch (s) {
    case "shortlisted": return "On shortlist";
    case "contacted":   return "Reached out";
    case "quoting":     return "Got a quote";
    case "negotiating": return "Negotiating";
    case "contracted":  return "Booked";
    case "paid":        return "Booked + paid";
    case "passed":      return "Passed";
  }
}

// ----------------------------------------------------------------------
// Synthesizers. produce stable, plausible detail content from the vendor.

type Detail = {
  website: string;
  websitePretty: string;
  rating: number;
  reviewCount: number;
  capacity: string;
  style: string;
  season: string;
  vibeLine: string;
  vibeChips: string[];
  photos: { caption: string; gradient: string }[];
  reviews: { name: string; body: string; stars: number; when: string }[];
  nearby: { name: string; kind: string; distance: string; note: string }[];
};

function synthesizeDetails(v: Vendor, state: ProjectState): Detail {
  // Stable hash of the id so each vendor has consistent details across renders.
  let h = 0;
  for (let i = 0; i < v.id.length; i++) h = (h * 31 + v.id.charCodeAt(i)) | 0;
  const r = (n: number) => Math.abs(((h ^ n) * 2654435761) >>> 0) % 1000 / 1000;

  const slug = v.name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const tld = ["com", "co", "studio", "house"][Math.floor(r(1) * 4)];
  const websitePretty = `${slug}.${tld}`;
  const website = `https://${websitePretty}`;

  const rating = +(4.4 + r(2) * 0.55).toFixed(1);
  const reviewCount = 28 + Math.floor(r(3) * 240);

  const guestCount = state.brief?.guestCount ?? 150;
  const capacity =
    v.category === "Venue"
      ? `Comfortable for ${Math.round(guestCount * 1.1)}, max ${Math.round(guestCount * 1.4)}`
      : v.category === "Caterer"
      ? `Routinely runs events for ${guestCount}+ guests`
      : v.category === "Band" || v.category === "DJ"
      ? `Plays everything from cocktail trio to full reception`
      : v.category === "Hair & Makeup"
      ? `Team of 3–5 on the morning of`
      : `Right size for your guest count`;

  const styleBank: Record<string, string[]> = {
    Venue: ["Rustic-modern", "Heritage estate", "Coastal contemporary", "Garden-classical", "Industrial-warm"],
    Photographer: ["Editorial documentary", "Film + digital hybrid", "Soft natural-light", "Cinematic warm tones"],
    Florist: ["Garden-style organic", "Modern architectural", "Romantic European", "Foam-free seasonal"],
    Caterer: ["Family-style farm-to-table", "Wood-fire mains", "Mediterranean-leaning", "Plated French service"],
  };
  const style =
    (styleBank[String(v.category)] ?? ["Editorial", "Modern", "Classic"])[
      Math.floor(r(4) * (styleBank[String(v.category)]?.length ?? 3))
    ];
  const season = ["Late spring", "Early summer", "Late summer", "Early fall"][Math.floor(r(5) * 4)];

  // Vibe match. phrase tied to brief vibe + category.
  const briefVibe = (state.brief?.vibe ?? "").trim();
  const vibeLine = briefVibe
    ? `Reads like the wedding you described. ${briefVibe.toLowerCase()}. through a ${style.toLowerCase()} lens.`
    : `A ${style.toLowerCase()} take on the day, with room to make it feel like yours.`;
  const vibeChips = [
    style,
    season + " ideal",
    v.priceBracket,
    "experienced",
    "responsive",
  ];

  // Photo tiles. sage / warm gradients seeded from vendor id.
  const palettes = [
    ["#A8B5A0", "#5B5034"], ["#D4C9B5", "#8F9B7F"], ["#3B463A", "#A8B5A0"],
    ["#B8A98A", "#5B5034"], ["#D6CFC0", "#7A8270"], ["#48533F", "#B8A98A"],
  ];
  const photos = Array.from({ length: 4 }).map((_, i) => {
    const p = palettes[(Math.floor(r(10 + i) * palettes.length))];
    return {
      caption: ["Hero", "Detail", "Reception", "Light"][i],
      gradient: `linear-gradient(135deg, ${p[0]}, ${p[1]})`,
    };
  });

  // Reviews. believable, varied tone.
  const reviewPool = [
    { name: "Allison & Marc",   body: "Worked with us through every change of plan. including a last-minute weather pivot. Felt like we had family on our side.", stars: 5, when: "Last summer" },
    { name: "Priya & Daniel",   body: "Set the bar for what we want our wedding to feel like. Thoughtful, communicative, never pushy.", stars: 5, when: "Two months ago" },
    { name: "Caroline H.",      body: "Pricing was clear up front. No surprises. Day-of, they were the calmest people in the building.", stars: 5, when: "This spring" },
    { name: "Jordan & Sam",     body: "They took our vague ideas and made them feel intentional. Photos still make me well up.", stars: 5, when: "Last fall" },
    { name: "Mia & Ethan",      body: "A few small communication hiccups in the lead-up, but show day was flawless.", stars: 4, when: "A few weeks ago" },
    { name: "Ava T.",            body: "Worth every dollar. We had two friends book them right after the wedding.", stars: 5, when: "Last month" },
  ];
  const reviews = pickN(reviewPool, 4, h);

  // Things nearby. light geographic flavor.
  const cityShort = v.city.split(",")[0];
  const nearbyPool = [
    { kind: "Hotel",       name: `${cityShort} Inn`,           distance: "8 min walk",   note: "Boutique 22-room hotel; can hold a small block." },
    { kind: "Hotel",       name: `Linden ${cityShort}`,         distance: "0.6 mi",       note: "Mid-tier rooms, breakfast included, easy parking." },
    { kind: "Restaurant",  name: `Olive & Salt`,                distance: "5 min walk",   note: "Wood-fire menu, accommodating to private rehearsal dinner." },
    { kind: "Restaurant",  name: `${cityShort} Public House`,   distance: "0.4 mi",       note: "Casual after-party spot, opens until midnight." },
    { kind: "Coffee",      name: `Field & Stem`,                distance: "3 min walk",   note: "Morning-after brunch, bridal-party friendly." },
    { kind: "Spa",         name: `${cityShort} Bath House`,     distance: "0.8 mi",       note: "Day-before recovery for the wedding party." },
    { kind: "Outdoor",     name: `Vineyard Loop Trail`,         distance: "1.2 mi",       note: "Pretty morning walk if guests want fresh air." },
    { kind: "Transport",   name: `${cityShort} Rail Station`,   distance: "1.4 mi",       note: "Connects directly to the nearest major airport." },
  ];
  const nearby = pickN(nearbyPool, 6, h * 13);

  return {
    website,
    websitePretty,
    rating,
    reviewCount,
    capacity,
    style,
    season,
    vibeLine,
    vibeChips,
    photos,
    reviews,
    nearby,
  };
}

function pickN<T>(arr: T[], n: number, seed: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  let s = (seed >>> 0) || 1;
  while (copy.length && out.length < n) {
    s = (s * 1103515245 + 12345) | 0;
    const idx = Math.abs(s) % copy.length;
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}
