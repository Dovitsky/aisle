"use client";

// The public wedding website. the artifact guests visit at
// corsia.wedding/{slug}. This file is the *only* renderer; the builder's
// right pane embeds it inline, and a future /w/[slug] route can wrap it
// with no behavior change.
//
// Single-prop-deep theming: pass a Vibe and a WebsiteDraft and every
// section re-skins. No section component reaches outside its vibe.

import { useEffect, useState } from "react";
import type { WebsiteDraft } from "@/lib/website/draft";
import { VIBES, type VibeId } from "@/lib/website/vibes";

interface Props {
  draft: WebsiteDraft;
  vibe: VibeId;
  /** Constrain the inner layout to phone widths so the builder's mobile
   *  toggle can render the mobile composition. */
  viewport?: "desktop" | "mobile";
}

export function PublicSite({ draft, vibe, viewport = "desktop" }: Props) {
  const v = VIBES[vibe];
  const mobile = viewport === "mobile";
  return (
    <div
      className="public-site relative"
      data-vibe={vibe}
      style={
        {
          "--ps-bg": v.palette.bg,
          "--ps-surface": v.palette.surface,
          "--ps-ink": v.palette.ink,
          "--ps-ink-soft": v.palette.inkSoft,
          "--ps-ink-faint": v.palette.inkFaint,
          "--ps-accent": v.palette.accent,
          "--ps-accent-soft": v.palette.accentSoft,
          "--ps-hairline": v.palette.hairline,
          "--ps-accent2": v.palette.accent2 ?? v.palette.accent,
          "--ps-display": v.fonts.display,
          "--ps-body": v.fonts.body,
          "--ps-mono": v.fonts.mono,
          "--ps-card-radius": `${v.card.radius}px`,
          "--ps-card-border": v.card.border,
          "--ps-card-shadow": v.card.shadow,
          "--ps-btn-radius": `${v.button.radius}px`,
          background: v.palette.bg,
          color: v.palette.ink,
          fontFamily: v.fonts.body,
        } as React.CSSProperties
      }
    >
      <Hero draft={draft} vibe={v} mobile={mobile} />
      <Story draft={draft} vibe={v} />
      <Schedule draft={draft} vibe={v} mobile={mobile} />
      <Gallery draft={draft} vibe={v} mobile={mobile} />
      <Travel draft={draft} vibe={v} />
      <FAQs draft={draft} vibe={v} />
      <Songs draft={draft} vibe={v} />
      <Guestbook draft={draft} vibe={v} />
      <Registry draft={draft} vibe={v} />
      <RSVPBlock draft={draft} vibe={v} />
      <Footer draft={draft} vibe={v} />
      <Concierge draft={draft} vibe={v} />
    </div>
  );
}

// ---------------------------------------------------------------- hero ---

function Hero({
  draft,
  vibe,
  mobile,
}: {
  draft: WebsiteDraft;
  vibe: (typeof VIBES)[VibeId];
  mobile: boolean;
}) {
  const isDark = vibe.id === "cinematic-dark";
  const align =
    vibe.hero.layout === "left"
      ? "items-start text-left"
      : vibe.hero.layout === "justified"
      ? "items-stretch text-left"
      : "items-center text-center";

  return (
    <section
      id="top"
      className={`relative overflow-hidden flex flex-col justify-end ${align}`}
      style={{
        background: vibe.hero.background,
        color: vibe.hero.foreground,
        minHeight: mobile ? "640px" : "78vh",
        padding: mobile ? "48px 28px 36px" : "72px 64px 56px",
      }}
    >
      {/* Top nav */}
      <nav
        className={`absolute top-0 left-0 right-0 flex items-center ${
          mobile ? "justify-between px-6 pt-5" : "justify-between px-12 pt-7"
        }`}
        style={{ color: vibe.hero.foreground }}
      >
        <span
          className="font-mono uppercase"
          style={{
            fontFamily: vibe.fonts.mono,
            fontSize: 10,
            letterSpacing: "0.30em",
            opacity: 0.78,
          }}
        >
          {draft.publicUrl}
        </span>
        {!mobile && (
          <ul className="flex items-center gap-7">
            {["Story", "Schedule", "Travel", "FAQ", "RSVP"].map((label) => (
              <li key={label}>
                <a
                  href={`#${label.toLowerCase()}`}
                  className="font-mono uppercase transition-opacity hover:opacity-100"
                  style={{
                    fontFamily: vibe.fonts.mono,
                    fontSize: 10,
                    letterSpacing: "0.30em",
                    opacity: 0.74,
                  }}
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        )}
      </nav>

      {/* Names + date */}
      <div className={`relative z-10 max-w-[1100px] ${align === "items-center text-center" ? "mx-auto" : ""}`}>
        <p
          className="uppercase mb-6"
          style={{
            fontFamily: vibe.fonts.mono,
            fontSize: 10.5,
            letterSpacing: "0.42em",
            opacity: 0.78,
          }}
        >
          {draft.hero.eyebrow}
        </p>
        <h1
          className="leading-[0.92] tracking-[-0.018em]"
          style={{
            fontFamily: vibe.fonts.display,
            fontStyle: "italic",
            fontWeight: 400,
            fontSize: mobile ? 76 : 148,
            textShadow: isDark
              ? "0 2px 24px rgba(0,0,0,0.6)"
              : "0 2px 24px rgba(0,0,0,0.18)",
          }}
        >
          <span>{draft.hero.organizerName}</span>
          <span
            className="mx-3"
            style={{
              fontFamily: vibe.fonts.display,
              fontStyle: "italic",
              opacity: 0.62,
              color: vibe.palette.accent,
            }}
          >
            &amp;
          </span>
          <span>{draft.hero.partnerName}</span>
        </h1>

        <p
          className="mt-7 uppercase"
          style={{
            fontFamily: vibe.fonts.mono,
            fontSize: 11,
            letterSpacing: "0.42em",
            opacity: 0.82,
          }}
        >
          {draft.hero.dateLine}
          <span className="mx-3" style={{ opacity: 0.45 }}>·</span>
          {draft.hero.location}
        </p>

        {/* Countdown + RSVP */}
        <div
          className={`mt-12 flex flex-wrap gap-6 items-end ${
            vibe.hero.layout === "centered" ? "justify-center" : ""
          }`}
        >
          {draft.hero.ceremonyAtISO && (
            <Countdown iso={draft.hero.ceremonyAtISO} vibe={vibe} />
          )}
          <RSVPButton vibe={vibe} label="Open the invite" />
        </div>
      </div>
    </section>
  );
}

function Countdown({
  iso,
  vibe,
}: {
  iso: string;
  vibe: (typeof VIBES)[VibeId];
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const target = new Date(iso).getTime();
  let ms = Math.max(0, target - now);
  const days = Math.floor(ms / 86_400_000);
  ms -= days * 86_400_000;
  const hours = Math.floor(ms / 3_600_000);
  ms -= hours * 3_600_000;
  const mins = Math.floor(ms / 60_000);
  ms -= mins * 60_000;
  const secs = Math.floor(ms / 1000);
  const cells: [string, number][] = [
    ["days", days],
    ["hrs", hours],
    ["min", mins],
    ["sec", secs],
  ];
  return (
    <div className="flex items-end gap-5" aria-label="Live countdown">
      {cells.map(([label, n]) => (
        <div key={label} className="flex flex-col items-baseline">
          <span
            className="tabular-nums"
            style={{
              fontFamily: vibe.fonts.display,
              fontSize: 48,
              fontWeight: 400,
              lineHeight: 0.95,
              fontStyle: "italic",
              color: vibe.hero.foreground,
            }}
          >
            {String(n).padStart(2, "0")}
          </span>
          <span
            className="uppercase mt-1"
            style={{
              fontFamily: vibe.fonts.mono,
              fontSize: 9.5,
              letterSpacing: "0.32em",
              opacity: 0.72,
            }}
          >
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

function RSVPButton({
  vibe,
  label,
}: {
  vibe: (typeof VIBES)[VibeId];
  label: string;
}) {
  const isDark = vibe.id === "cinematic-dark";
  return (
    <a
      href="#rsvp"
      className="inline-flex items-center gap-3 transition-all"
      style={{
        fontFamily: vibe.fonts.mono,
        fontSize: 11,
        letterSpacing: "0.32em",
        textTransform: "uppercase",
        padding: vibe.button.style === "underline" ? "6px 0" : "14px 26px",
        borderRadius: vibe.button.radius,
        background:
          vibe.button.style === "underline"
            ? "transparent"
            : vibe.palette.accent,
        color:
          vibe.button.style === "underline"
            ? vibe.hero.foreground
            : isDark
            ? vibe.palette.bg
            : "#FFFFFF",
        border:
          vibe.button.style === "underline"
            ? `1px solid ${vibe.palette.accent}`
            : `1px solid ${vibe.palette.accent}`,
        textDecoration: vibe.button.style === "underline" ? "underline" : "none",
        textUnderlineOffset: 6,
      }}
    >
      {label}
      <span aria-hidden>→</span>
    </a>
  );
}

// --------------------------------------------------------------- story ---

function Story({
  draft,
  vibe,
}: {
  draft: WebsiteDraft;
  vibe: (typeof VIBES)[VibeId];
}) {
  return (
    <section
      id="story"
      className="py-24 lg:py-36 px-6 lg:px-16"
      style={{ background: vibe.palette.bg, color: vibe.palette.ink }}
    >
      <div className="max-w-[920px] mx-auto text-center">
        <p
          className="uppercase mb-8"
          style={{
            fontFamily: vibe.fonts.mono,
            fontSize: 10.5,
            letterSpacing: "0.42em",
            color: vibe.palette.accent,
          }}
        >
          The story so far
        </p>
        <blockquote
          className="relative"
          style={{
            fontFamily: vibe.fonts.display,
            fontStyle: "italic",
            fontWeight: 400,
            fontSize: 44,
            lineHeight: 1.18,
            color: vibe.palette.ink,
          }}
        >
          <span
            aria-hidden
            className="absolute -top-10 left-0"
            style={{
              fontFamily: vibe.fonts.display,
              fontSize: 120,
              color: vibe.palette.accent,
              opacity: 0.28,
              lineHeight: 1,
            }}
          >
            &ldquo;
          </span>
          {draft.story.pullQuote}
        </blockquote>
        {draft.story.detail && (
          <p
            className="mt-8 text-balance"
            style={{
              fontFamily: vibe.fonts.body,
              fontSize: 17,
              lineHeight: 1.6,
              color: vibe.palette.inkSoft,
            }}
          >
            {draft.story.detail}
          </p>
        )}
      </div>
    </section>
  );
}

// ------------------------------------------------------------ schedule ---

function Schedule({
  draft,
  vibe,
  mobile,
}: {
  draft: WebsiteDraft;
  vibe: (typeof VIBES)[VibeId];
  mobile: boolean;
}) {
  return (
    <section
      id="schedule"
      className="py-20 lg:py-28 px-6 lg:px-16"
      style={{ background: vibe.palette.surface, color: vibe.palette.ink }}
    >
      <div className="max-w-[1080px] mx-auto">
        <SectionHeading vibe={vibe} eyebrow="The weekend" title="Schedule" />
        <ol
          className="mt-12 grid gap-px"
          style={{
            background: vibe.palette.hairline,
            border: `1px solid ${vibe.palette.hairline}`,
            borderRadius: vibe.card.radius,
            overflow: "hidden",
          }}
        >
          {draft.schedule.map((s) => (
            <li
              key={s.id}
              className={`grid items-baseline gap-4 ${
                mobile
                  ? "grid-cols-[80px_1fr] p-5"
                  : "grid-cols-[140px_1fr_180px] p-7"
              }`}
              style={{
                background: vibe.palette.surface,
              }}
            >
              <div>
                <p
                  className="uppercase"
                  style={{
                    fontFamily: vibe.fonts.mono,
                    fontSize: 10.5,
                    letterSpacing: "0.30em",
                    color: vibe.palette.accent,
                  }}
                >
                  {s.day ?? "Day"}
                </p>
                <p
                  className="mt-1"
                  style={{
                    fontFamily: vibe.fonts.display,
                    fontSize: mobile ? 18 : 22,
                    fontStyle: "italic",
                    color: vibe.palette.ink,
                  }}
                >
                  {s.time ?? ", "}
                </p>
              </div>
              <div className="min-w-0">
                <h3
                  className="leading-tight"
                  style={{
                    fontFamily: vibe.fonts.display,
                    fontSize: mobile ? 24 : 30,
                    fontWeight: 400,
                    fontStyle: "italic",
                    color: vibe.palette.ink,
                  }}
                >
                  {s.title}
                </h3>
                {s.venue && (
                  <p
                    className="mt-1"
                    style={{
                      fontFamily: vibe.fonts.body,
                      fontSize: 14,
                      color: vibe.palette.inkSoft,
                    }}
                  >
                    {s.venue}
                  </p>
                )}
                {s.description && (
                  <p
                    className="mt-2"
                    style={{
                      fontFamily: vibe.fonts.body,
                      fontSize: 14.5,
                      lineHeight: 1.55,
                      color: vibe.palette.inkSoft,
                    }}
                  >
                    {s.description}
                  </p>
                )}
              </div>
              {!mobile && s.attire && (
                <AttirePill label={s.attire} vibe={vibe} />
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function AttirePill({
  label,
  vibe,
}: {
  label: string;
  vibe: (typeof VIBES)[VibeId];
}) {
  return (
    <span
      className="inline-flex items-center justify-self-end uppercase"
      style={{
        fontFamily: vibe.fonts.mono,
        fontSize: 9.5,
        letterSpacing: "0.32em",
        padding: "8px 14px",
        borderRadius: vibe.button.radius,
        border: `1px solid ${vibe.palette.accent}`,
        color: vibe.palette.accent,
      }}
    >
      {label}
    </span>
  );
}

// ------------------------------------------------------------- gallery ---

function Gallery({
  draft,
  vibe,
  mobile,
}: {
  draft: WebsiteDraft;
  vibe: (typeof VIBES)[VibeId];
  mobile: boolean;
}) {
  // Generate aspect ratios from the vibe.gallery.style.
  const ratios = ratiosForVibe(vibe.gallery.style, draft.gallery.length);
  const cols = mobile ? 2 : vibe.gallery.style === "vertical-strip" ? 4 : 3;
  return (
    <section
      id="gallery"
      className="py-20 lg:py-28 px-6 lg:px-16"
      style={{ background: vibe.palette.bg, color: vibe.palette.ink }}
    >
      <div className="max-w-[1180px] mx-auto">
        <SectionHeading vibe={vibe} eyebrow="The look" title="Gallery" />
        {draft.gallery.length === 0 ? (
          <p
            className="mt-10 text-center"
            style={{
              fontFamily: vibe.fonts.body,
              fontSize: 16,
              fontStyle: "italic",
              color: vibe.palette.inkFaint,
            }}
          >
            Photography lands here as the weekend unfolds.
          </p>
        ) : (
          <div
            className="mt-10 grid gap-3"
            style={{
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              gridAutoFlow: "dense",
            }}
          >
            {draft.gallery.map((img, i) => (
              <GalleryTile
                key={img.id}
                img={img}
                ratio={ratios[i % ratios.length]}
                vibe={vibe}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function ratiosForVibe(
  style: (typeof VIBES)[VibeId]["gallery"]["style"],
  n: number,
): string[] {
  switch (style) {
    case "warm-masonry":
      return ["4/5", "1/1", "3/4", "4/5", "5/4", "1/1", "4/5", "3/4"].slice(0, Math.max(8, n));
    case "dark-masonry":
      return ["5/4", "4/5", "1/1", "5/4", "3/4", "4/5", "5/4", "1/1"].slice(0, Math.max(8, n));
    case "minimal-grid":
      return Array.from({ length: Math.max(8, n) }, () => "1/1");
    case "floral-masonry":
      return ["3/4", "4/5", "5/4", "1/1", "4/5", "3/4", "5/4", "4/5"].slice(0, Math.max(8, n));
    case "vertical-strip":
      return Array.from({ length: Math.max(8, n) }, () => "3/5");
    case "magazine-grid":
      return ["3/4", "1/1", "1/1", "4/5", "1/1", "3/4", "4/5", "1/1"].slice(0, Math.max(8, n));
  }
}

function GalleryTile({
  img,
  ratio,
  vibe,
}: {
  img: WebsiteDraft["gallery"][number];
  ratio: string;
  vibe: (typeof VIBES)[VibeId];
}) {
  return (
    <figure
      className="relative overflow-hidden"
      style={{
        aspectRatio: ratio,
        background: vibe.palette.surface,
        borderRadius: vibe.card.radius,
        border: vibe.card.border,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={img.url}
        alt={img.caption ?? "Gallery image"}
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
      />
      {img.isAI && img.description && (
        <figcaption
          className="absolute top-2 left-2 uppercase inline-flex items-center gap-1.5"
          style={{
            fontFamily: vibe.fonts.mono,
            fontSize: 9.5,
            letterSpacing: "0.26em",
            padding: "4px 8px",
            borderRadius: vibe.button.radius,
            background:
              vibe.gallery.overlayTone === "warm"
                ? "rgba(42,26,18,0.42)"
                : vibe.gallery.overlayTone === "cool"
                ? "rgba(19,52,62,0.42)"
                : "rgba(0,0,0,0.36)",
            color: "#FFFFFF",
            backdropFilter: "blur(6px)",
          }}
        >
          <span aria-hidden>✦</span>
          <span className="truncate max-w-[180px]">AI · {img.description}</span>
        </figcaption>
      )}
    </figure>
  );
}

// -------------------------------------------------------------- travel ---

function Travel({
  draft,
  vibe,
}: {
  draft: WebsiteDraft;
  vibe: (typeof VIBES)[VibeId];
}) {
  const items = [draft.travel.stay, draft.travel.fly, draft.travel.shuttle];
  return (
    <section
      id="travel"
      className="py-20 lg:py-28 px-6 lg:px-16"
      style={{ background: vibe.palette.surface, color: vibe.palette.ink }}
    >
      <div className="max-w-[1100px] mx-auto">
        <SectionHeading
          vibe={vibe}
          eyebrow="Getting there"
          title="Travel & stay"
        />
        <div className="grid sm:grid-cols-3 gap-5 mt-10">
          {items.map((it, i) => (
            <article
              key={i}
              className="p-7"
              style={{
                background: vibe.palette.bg,
                border: vibe.card.border,
                borderRadius: vibe.card.radius,
                boxShadow: vibe.card.shadow,
              }}
            >
              <p
                className="uppercase mb-3"
                style={{
                  fontFamily: vibe.fonts.mono,
                  fontSize: 10,
                  letterSpacing: "0.30em",
                  color: vibe.palette.accent,
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </p>
              <h3
                style={{
                  fontFamily: vibe.fonts.display,
                  fontSize: 26,
                  fontWeight: 400,
                  fontStyle: "italic",
                  color: vibe.palette.ink,
                }}
              >
                {it.title}
              </h3>
              <p
                className="mt-4"
                style={{
                  fontFamily: vibe.fonts.body,
                  fontSize: 15,
                  lineHeight: 1.6,
                  color: vibe.palette.inkSoft,
                }}
              >
                {it.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

// ----------------------------------------------------------------- FAQs ---

function FAQs({
  draft,
  vibe,
}: {
  draft: WebsiteDraft;
  vibe: (typeof VIBES)[VibeId];
}) {
  const [open, setOpen] = useState<string | null>(draft.faqs[0]?.id ?? null);
  return (
    <section
      id="faq"
      className="py-20 lg:py-28 px-6 lg:px-16"
      style={{ background: vibe.palette.bg, color: vibe.palette.ink }}
    >
      <div className="max-w-[920px] mx-auto">
        <SectionHeading
          vibe={vibe}
          eyebrow="The fine details"
          title="Questions, answered"
        />
        <ul
          className="mt-10"
          style={{ borderTop: `1px solid ${vibe.palette.hairline}` }}
        >
          {draft.faqs.map((f) => {
            const isOpen = open === f.id;
            return (
              <li
                key={f.id}
                style={{ borderBottom: `1px solid ${vibe.palette.hairline}` }}
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : f.id)}
                  className="w-full flex items-baseline justify-between gap-4 py-6 text-left transition-colors"
                  style={{ color: vibe.palette.ink }}
                >
                  <span
                    style={{
                      fontFamily: vibe.fonts.display,
                      fontSize: 22,
                      fontStyle: "italic",
                      fontWeight: 400,
                    }}
                  >
                    {f.q}
                  </span>
                  <span
                    aria-hidden
                    className="font-mono transition-transform shrink-0"
                    style={{
                      fontSize: 14,
                      color: vibe.palette.accent,
                      transform: isOpen ? "rotate(45deg)" : "rotate(0deg)",
                    }}
                  >
                    +
                  </span>
                </button>
                {isOpen && (
                  <p
                    className="pb-7 pr-6"
                    style={{
                      fontFamily: vibe.fonts.body,
                      fontSize: 15.5,
                      lineHeight: 1.7,
                      color: vibe.palette.inkSoft,
                    }}
                  >
                    {f.a}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- songs ---

function Songs({
  draft,
  vibe,
}: {
  draft: WebsiteDraft;
  vibe: (typeof VIBES)[VibeId];
}) {
  const [draft2, setDraft2] = useState(draft.songRequests);
  const [input, setInput] = useState("");
  return (
    <section
      id="songs"
      className="py-20 lg:py-28 px-6 lg:px-16"
      style={{ background: vibe.palette.surface, color: vibe.palette.ink }}
    >
      <div className="max-w-[960px] mx-auto">
        <SectionHeading
          vibe={vibe}
          eyebrow="Make the dance floor"
          title="Song requests"
        />
        <form
          className="mt-10 flex items-stretch gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!input.trim()) return;
            setDraft2((prev) => [
              ...prev,
              { id: `local-${Date.now()}`, title: input.trim(), guestName: "You" },
            ]);
            setInput("");
          }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Add the song that gets you on the floor…"
            className="flex-1 px-5 py-4 outline-none transition-colors"
            style={{
              background: vibe.palette.bg,
              border: vibe.card.border,
              borderRadius: vibe.button.radius,
              fontFamily: vibe.fonts.body,
              fontSize: 16,
              color: vibe.palette.ink,
            }}
          />
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-6 py-4 uppercase"
            style={{
              fontFamily: vibe.fonts.mono,
              fontSize: 11,
              letterSpacing: "0.32em",
              background: vibe.palette.accent,
              color: vibe.id === "cinematic-dark" ? vibe.palette.bg : "#FFFFFF",
              border: `1px solid ${vibe.palette.accent}`,
              borderRadius: vibe.button.radius,
            }}
          >
            Add
          </button>
        </form>
        <ul className="mt-7 flex flex-wrap gap-2">
          {draft2.map((s) => (
            <li
              key={s.id}
              className="inline-flex items-baseline gap-2 px-3.5 py-1.5"
              style={{
                fontFamily: vibe.fonts.body,
                fontSize: 14,
                background: vibe.palette.bg,
                border: vibe.card.border,
                borderRadius: vibe.button.radius,
                color: vibe.palette.ink,
              }}
            >
              <span style={{ color: vibe.palette.accent }} aria-hidden>♪</span>
              {s.title}
              {s.guestName && (
                <span
                  style={{
                    fontFamily: vibe.fonts.mono,
                    fontSize: 9.5,
                    letterSpacing: "0.26em",
                    color: vibe.palette.inkFaint,
                    textTransform: "uppercase",
                  }}
                >
                  · {s.guestName}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ------------------------------------------------------------ guestbook ---

function Guestbook({
  draft,
  vibe,
}: {
  draft: WebsiteDraft;
  vibe: (typeof VIBES)[VibeId];
}) {
  const [entries, setEntries] = useState(draft.guestbook);
  const [text, setText] = useState("");
  return (
    <section
      id="guestbook"
      className="py-20 lg:py-28 px-6 lg:px-16"
      style={{ background: vibe.palette.bg, color: vibe.palette.ink }}
    >
      <div className="max-w-[1080px] mx-auto">
        <SectionHeading
          vibe={vibe}
          eyebrow="A note from you"
          title="Guestbook"
        />
        <form
          className="mt-10"
          onSubmit={(e) => {
            e.preventDefault();
            if (!text.trim()) return;
            setEntries((prev) => [
              { id: `note-${Date.now()}`, from: "You", message: text.trim() },
              ...prev,
            ]);
            setText("");
          }}
        >
          <textarea
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Leave a note for the couple. they'll receive a bound copy after the wedding."
            className="w-full px-5 py-4 outline-none resize-none"
            style={{
              background: vibe.palette.surface,
              border: vibe.card.border,
              borderRadius: vibe.card.radius,
              fontFamily: vibe.fonts.body,
              fontSize: 16,
              lineHeight: 1.6,
              color: vibe.palette.ink,
            }}
          />
          <button
            type="submit"
            className="mt-3 inline-flex items-center gap-2 px-6 py-3 uppercase"
            style={{
              fontFamily: vibe.fonts.mono,
              fontSize: 11,
              letterSpacing: "0.32em",
              background: vibe.palette.accent,
              color: vibe.id === "cinematic-dark" ? vibe.palette.bg : "#FFFFFF",
              border: `1px solid ${vibe.palette.accent}`,
              borderRadius: vibe.button.radius,
            }}
          >
            Sign the book
          </button>
        </form>
        <ul
          className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {entries.map((g) => (
            <li
              key={g.id}
              className="p-6"
              style={{
                background: vibe.palette.surface,
                border: vibe.card.border,
                borderRadius: vibe.card.radius,
                boxShadow: vibe.card.shadow,
              }}
            >
              <p
                style={{
                  fontFamily: vibe.fonts.display,
                  fontSize: 18,
                  fontStyle: "italic",
                  lineHeight: 1.4,
                  color: vibe.palette.ink,
                }}
              >
                &ldquo;{g.message}&rdquo;
              </p>
              <p
                className="mt-4 uppercase"
                style={{
                  fontFamily: vibe.fonts.mono,
                  fontSize: 10,
                  letterSpacing: "0.30em",
                  color: vibe.palette.accent,
                }}
              >
               . {g.from}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ------------------------------------------------------------ registry ---

function Registry({
  draft,
  vibe,
}: {
  draft: WebsiteDraft;
  vibe: (typeof VIBES)[VibeId];
}) {
  return (
    <section
      id="registry"
      className="py-20 lg:py-28 px-6 lg:px-16"
      style={{ background: vibe.palette.surface, color: vibe.palette.ink }}
    >
      <div className="max-w-[1080px] mx-auto">
        <SectionHeading vibe={vibe} eyebrow="Should you wish" title="Registry" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-10">
          {draft.registry.map((r) => (
            <a
              key={r.id}
              href={r.url}
              target="_blank"
              rel="noreferrer"
              className="group block p-7 transition-all"
              style={{
                background: vibe.palette.bg,
                border: vibe.card.border,
                borderRadius: vibe.card.radius,
                boxShadow: vibe.card.shadow,
              }}
            >
              <h3
                style={{
                  fontFamily: vibe.fonts.display,
                  fontSize: 26,
                  fontWeight: 400,
                  fontStyle: "italic",
                  color: vibe.palette.ink,
                }}
              >
                {r.label}
              </h3>
              {r.detail && (
                <p
                  className="mt-2"
                  style={{
                    fontFamily: vibe.fonts.body,
                    fontSize: 14.5,
                    color: vibe.palette.inkSoft,
                  }}
                >
                  {r.detail}
                </p>
              )}
              <p
                className="mt-6 uppercase inline-flex items-center gap-2"
                style={{
                  fontFamily: vibe.fonts.mono,
                  fontSize: 10.5,
                  letterSpacing: "0.32em",
                  color: vibe.palette.accent,
                }}
              >
                Visit <span aria-hidden>↗</span>
              </p>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- RSVP ---

function RSVPBlock({
  draft,
  vibe,
}: {
  draft: WebsiteDraft;
  vibe: (typeof VIBES)[VibeId];
}) {
  return (
    <section
      id="rsvp"
      className="py-24 lg:py-36 px-6 lg:px-16 text-center"
      style={{ background: vibe.palette.bg, color: vibe.palette.ink }}
    >
      <p
        className="uppercase mb-7"
        style={{
          fontFamily: vibe.fonts.mono,
          fontSize: 10.5,
          letterSpacing: "0.42em",
          color: vibe.palette.accent,
        }}
      >
        Now, the question
      </p>
      <h2
        className="leading-tight max-w-[860px] mx-auto"
        style={{
          fontFamily: vibe.fonts.display,
          fontSize: 56,
          fontWeight: 400,
          fontStyle: "italic",
          color: vibe.palette.ink,
        }}
      >
        Will you be there?
      </h2>
      {draft.rsvp.deadline && (
        <p
          className="mt-4 uppercase"
          style={{
            fontFamily: vibe.fonts.mono,
            fontSize: 11,
            letterSpacing: "0.36em",
            color: vibe.palette.inkFaint,
          }}
        >
          RSVP by {draft.rsvp.deadline}
        </p>
      )}
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          className="px-7 py-4 uppercase"
          style={{
            fontFamily: vibe.fonts.mono,
            fontSize: 11,
            letterSpacing: "0.36em",
            background: vibe.palette.accent,
            color: vibe.id === "cinematic-dark" ? vibe.palette.bg : "#FFFFFF",
            border: `1px solid ${vibe.palette.accent}`,
            borderRadius: vibe.button.radius,
          }}
        >
          Yes, I'll be there
        </button>
        <button
          type="button"
          className="px-7 py-4 uppercase"
          style={{
            fontFamily: vibe.fonts.mono,
            fontSize: 11,
            letterSpacing: "0.36em",
            background: "transparent",
            color: vibe.palette.ink,
            border: `1px solid ${vibe.palette.ink}`,
            borderRadius: vibe.button.radius,
          }}
        >
          Can't make it
        </button>
      </div>
    </section>
  );
}

// --------------------------------------------------------------- footer ---

function Footer({
  draft,
  vibe,
}: {
  draft: WebsiteDraft;
  vibe: (typeof VIBES)[VibeId];
}) {
  return (
    <footer
      className="py-12 px-6 lg:px-16 text-center"
      style={{
        background: vibe.palette.surface,
        color: vibe.palette.inkFaint,
        borderTop: `1px solid ${vibe.palette.hairline}`,
      }}
    >
      <p
        style={{
          fontFamily: vibe.fonts.display,
          fontSize: 28,
          fontStyle: "italic",
          color: vibe.palette.ink,
        }}
      >
        {draft.hero.organizerName[0]}
        <span style={{ color: vibe.palette.accent }}> &amp; </span>
        {draft.hero.partnerName[0]}
      </p>
      <p
        className="mt-3 uppercase"
        style={{
          fontFamily: vibe.fonts.mono,
          fontSize: 10,
          letterSpacing: "0.36em",
        }}
      >
        {draft.hero.dateLine}
        <span className="mx-2">·</span>
        {draft.hero.location}
        <span className="mx-2">·</span>
        with love
      </p>
    </footer>
  );
}

// ----------------------------------------------------------- concierge ---

function Concierge({
  draft,
  vibe,
}: {
  draft: WebsiteDraft;
  vibe: (typeof VIBES)[VibeId];
}) {
  const [open, setOpen] = useState(false);
  const greeting = vibe.voice.conciergeGreeting
    .replace("{region}", draft.hero.location)
    .replace(
      "{names}",
      `${draft.hero.organizerName} & ${draft.hero.partnerName}`,
    );
  const suggestions = [
    "What's the dress code?",
    "Where do I park?",
    "Are kids invited?",
    "What's the RSVP deadline?",
  ];
  return (
    <div className="fixed bottom-6 right-6 z-40">
      {open ? (
        <div
          className="w-[340px] max-w-[88vw] flex flex-col"
          style={{
            background: vibe.palette.surface,
            border: vibe.card.border,
            borderRadius: vibe.card.radius,
            boxShadow: "0 28px 64px -24px rgba(14,15,13,0.45)",
            color: vibe.palette.ink,
          }}
        >
          <div
            className="px-5 py-4 flex items-center justify-between"
            style={{ borderBottom: `1px solid ${vibe.palette.hairline}` }}
          >
            <p
              className="uppercase"
              style={{
                fontFamily: vibe.fonts.mono,
                fontSize: 10.5,
                letterSpacing: "0.30em",
                color: vibe.palette.accent,
              }}
            >
              Wedding concierge
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close concierge"
              className="text-[14px]"
              style={{ color: vibe.palette.inkFaint }}
            >
              ✕
            </button>
          </div>
          <div className="px-5 py-5">
            <p
              style={{
                fontFamily: vibe.fonts.display,
                fontSize: 18,
                fontStyle: "italic",
                lineHeight: 1.4,
                color: vibe.palette.ink,
              }}
            >
              {greeting}
            </p>
            <ul className="mt-5 flex flex-col gap-2">
              {suggestions.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2.5 transition-colors"
                    style={{
                      background: vibe.palette.bg,
                      border: vibe.card.border,
                      borderRadius: vibe.button.radius,
                      fontFamily: vibe.fonts.body,
                      fontSize: 14,
                      color: vibe.palette.ink,
                    }}
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
            <div
              className="mt-5 flex items-stretch gap-2"
            >
              <input
                type="text"
                placeholder="Ask anything…"
                className="flex-1 px-3 py-2.5 outline-none"
                style={{
                  background: vibe.palette.bg,
                  border: vibe.card.border,
                  borderRadius: vibe.button.radius,
                  fontFamily: vibe.fonts.body,
                  fontSize: 14,
                  color: vibe.palette.ink,
                }}
              />
              <button
                type="button"
                aria-label="Send"
                className="px-3 inline-flex items-center justify-center"
                style={{
                  background: vibe.palette.accent,
                  color: vibe.id === "cinematic-dark" ? vibe.palette.bg : "#FFFFFF",
                  borderRadius: vibe.button.radius,
                  border: `1px solid ${vibe.palette.accent}`,
                }}
              >
                →
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open wedding concierge"
          className="relative inline-flex items-center justify-center"
          style={{
            width: 56,
            height: 56,
            borderRadius: 9999,
            background: vibe.palette.accent,
            color: vibe.id === "cinematic-dark" ? vibe.palette.bg : "#FFFFFF",
            boxShadow: `0 18px 40px -16px ${vibe.palette.accent}, 0 0 0 6px ${vibe.palette.accentSoft}`,
            border: `1px solid ${vibe.palette.accent}`,
            fontFamily: vibe.fonts.display,
            fontSize: 22,
            fontStyle: "italic",
          }}
        >
          A
          <span
            aria-hidden
            className="absolute inset-0 rounded-full"
            style={{
              boxShadow: `0 0 0 4px ${vibe.palette.accentSoft}`,
              animation: "concierge-pulse 2.4s ease-in-out infinite",
            }}
          />
          <style jsx>{`
            @keyframes concierge-pulse {
              0%, 100% { opacity: 0.6; transform: scale(1); }
              50% { opacity: 0; transform: scale(1.25); }
            }
          `}</style>
        </button>
      )}
    </div>
  );
}

// --------------------------------------------------------------- shared ---

function SectionHeading({
  vibe,
  eyebrow,
  title,
}: {
  vibe: (typeof VIBES)[VibeId];
  eyebrow: string;
  title: string;
}) {
  return (
    <header className="flex items-baseline gap-5 flex-wrap">
      <p
        className="uppercase shrink-0"
        style={{
          fontFamily: vibe.fonts.mono,
          fontSize: 10.5,
          letterSpacing: "0.36em",
          color: vibe.palette.accent,
        }}
      >
        {eyebrow}
      </p>
      <span
        aria-hidden
        className="flex-1 min-w-[40px]"
        style={{ height: 1, background: vibe.palette.hairline }}
      />
      <h2
        className="leading-tight"
        style={{
          fontFamily: vibe.fonts.display,
          fontSize: 48,
          fontWeight: 400,
          fontStyle: "italic",
          color: vibe.palette.ink,
        }}
      >
        {title}
      </h2>
    </header>
  );
}
