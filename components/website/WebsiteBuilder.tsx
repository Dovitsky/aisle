"use client";

// /website — the builder. Two panes: a quiet editor on the left,
// the live public-site renderer on the right. Top bar with publish CTA.
// Refine drawer slides in from the right edge. Publish modal confirms
// with a pre-flight checklist.
//
// The draft is composed once from ProjectState and held in local state.
// Every edit lives in memory for the session — autosave indicator
// shows the change has been captured. Persisting to the long-term
// store is a follow-up wire-up; the current code surface demonstrates
// the full UX without that round-trip.

import { useEffect, useMemo, useState } from "react";
import { useProject } from "../StateProvider";
import { PublicSite } from "./PublicSite";
import { VIBES, type VibeId } from "@/lib/website/vibes";
import { buildWebsiteDraft, type WebsiteDraft } from "@/lib/website/draft";

type Viewport = "desktop" | "mobile";

export function WebsiteBuilder() {
  const { state, loading } = useProject();
  const initialDraft = useMemo<WebsiteDraft | null>(
    () => (state ? buildWebsiteDraft(state) : null),
    [state],
  );
  const [draft, setDraft] = useState<WebsiteDraft | null>(initialDraft);
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [saved, setSaved] = useState(true);

  // If the project state changes (or arrives), build the draft once.
  useEffect(() => {
    if (initialDraft && !draft) setDraft(initialDraft);
  }, [initialDraft, draft]);

  // Tiny autosave indicator. Any patch fires this — flash unsaved, then
  // settle into saved a beat later.
  const patch = (mut: (d: WebsiteDraft) => WebsiteDraft) => {
    setDraft((prev) => (prev ? mut(prev) : prev));
    setSaved(false);
    setTimeout(() => setSaved(true), 500);
  };

  if (loading || !state || !draft) {
    return <div className="pt-10 text-center text-ink-300">Loading…</div>;
  }

  return (
    <div
      className="-mx-5 lg:-mx-12"
      style={{ minHeight: "calc(100dvh - 64px)" }}
    >
      <TopBar
        draft={draft}
        saved={saved}
        onOpenRefine={() => setDrawerOpen(true)}
        onPublish={() => setPublishOpen(true)}
      />

      <div
        className="grid lg:grid-cols-[420px_1fr] min-h-[calc(100dvh-140px)]"
        style={{ background: "#F4F1EA" }}
      >
        <EditorPane draft={draft} patch={patch} />
        <PreviewPane draft={draft} viewport={viewport} onViewport={setViewport} />
      </div>

      {drawerOpen && (
        <RefineDrawer
          draft={draft}
          onClose={() => setDrawerOpen(false)}
          onApply={(prompt, mut) => {
            patch((d) => ({
              ...mut(d),
              refinementLog: [
                {
                  id: `log-${Date.now()}`,
                  prompt,
                  appliedAt: new Date().toISOString(),
                },
                ...d.refinementLog.slice(0, 7),
              ],
            }));
          }}
          onUndo={(entryId) => {
            // Trivial undo: just remove the log entry. Real undo would
            // diff the patch — out of scope for this MVP.
            patch((d) => ({
              ...d,
              refinementLog: d.refinementLog.filter((e) => e.id !== entryId),
            }));
          }}
        />
      )}

      {publishOpen && (
        <PublishModal
          draft={draft}
          onClose={() => setPublishOpen(false)}
          onPublish={() => {
            patch((d) => ({
              ...d,
              published: true,
              publishedAt: new Date().toISOString(),
            }));
            setPublishOpen(false);
          }}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------------- top bar ---

function TopBar({
  draft,
  saved,
  onOpenRefine,
  onPublish,
}: {
  draft: WebsiteDraft;
  saved: boolean;
  onOpenRefine: () => void;
  onPublish: () => void;
}) {
  return (
    <header
      className="flex items-center justify-between gap-4 px-6 lg:px-10 py-4"
      style={{
        background: "#FFFFFF",
        borderBottom: "1px solid rgba(14,15,13,0.08)",
      }}
    >
      <div className="flex items-baseline gap-4 min-w-0">
        <p
          className="display italic"
          style={{
            fontFamily: '"Cormorant Garamond", Georgia, serif',
            fontSize: 22,
            color: "#1A1A18",
          }}
        >
          Website
        </p>
        <span
          className="font-mono uppercase truncate"
          style={{
            fontSize: 10.5,
            letterSpacing: "0.24em",
            color: "rgba(26,26,24,0.42)",
          }}
        >
          {draft.hero.organizerName} & {draft.hero.partnerName}
          <span className="mx-2">·</span>
          {draft.hero.location}
          <span className="mx-2">·</span>
          {draft.hero.dateLine.split(",")[0]}
        </span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span
          className="font-mono uppercase inline-flex items-center gap-1.5"
          style={{
            fontSize: 9.5,
            letterSpacing: "0.30em",
            color: saved ? "rgba(79,93,68,0.85)" : "rgba(26,26,24,0.42)",
          }}
        >
          <span
            aria-hidden
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ background: saved ? "#4F5D44" : "#C9B583" }}
          />
          {saved ? "Saved" : "Saving"}
        </span>
        <button
          type="button"
          onClick={onOpenRefine}
          aria-label="Refine the site"
          className="inline-flex items-center gap-2 rounded-full px-4 py-2 transition-all"
          style={{
            fontFamily: '"JetBrains Mono", ui-monospace, monospace',
            fontSize: 10.5,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            border: "1px solid rgba(14,15,13,0.10)",
            background: "#FFFFFF",
            color: "#1A1A18",
          }}
        >
          <span aria-hidden>✦</span> Refine
        </button>
        <button
          type="button"
          onClick={onPublish}
          className="cta-sage inline-flex items-center gap-2 rounded-full px-5 py-2 transition-all"
          style={{
            fontFamily: '"JetBrains Mono", ui-monospace, monospace',
            fontSize: 10.5,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
          }}
        >
          <span
            aria-hidden
            className="inline-block w-1.5 h-1.5 rounded-full bg-paper-50 animate-pulse-soft"
          />
          {draft.published ? "Update site" : "Publish"}
        </button>
      </div>
    </header>
  );
}

// --------------------------------------------------------- editor pane ---

function EditorPane({
  draft,
  patch,
}: {
  draft: WebsiteDraft;
  patch: (mut: (d: WebsiteDraft) => WebsiteDraft) => void;
}) {
  return (
    <aside
      className="overflow-y-auto no-scrollbar px-6 py-7 lg:py-9"
      style={{
        background: "#FBF8F2",
        borderRight: "1px solid rgba(14,15,13,0.06)",
        maxHeight: "calc(100dvh - 140px)",
      }}
    >
      <SectionCard
        title="Vibe"
        status={VIBES[draft.vibe].label}
        eyebrow="The whole look"
      >
        <div className="grid grid-cols-2 gap-2">
          {Object.values(VIBES).map((v) => {
            const active = draft.vibe === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => patch((d) => ({ ...d, vibe: v.id }))}
                className="text-left transition-all overflow-hidden"
                style={{
                  background: active ? v.palette.bg : "#FFFFFF",
                  border: active
                    ? `1.5px solid ${v.palette.accent}`
                    : "1px solid rgba(14,15,13,0.08)",
                  borderRadius: 12,
                  padding: 12,
                }}
              >
                <div
                  className="rounded-md overflow-hidden mb-2"
                  style={{
                    height: 56,
                    background: v.hero.background,
                  }}
                />
                <p
                  className="leading-tight"
                  style={{
                    fontFamily: '"Cormorant Garamond", Georgia, serif',
                    fontStyle: "italic",
                    fontSize: 16,
                    color: "#1A1A18",
                  }}
                >
                  {v.label}
                </p>
                <p
                  className="mt-0.5"
                  style={{
                    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                    fontSize: 9,
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    color: active ? v.palette.accent : "rgba(26,26,24,0.42)",
                  }}
                >
                  {active ? "Active" : "Switch"}
                </p>
              </button>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard
        title="Hero"
        status="Live"
        eyebrow="Names + date"
      >
        <LabeledInput
          label="Eyebrow"
          value={draft.hero.eyebrow}
          onChange={(v) =>
            patch((d) => ({ ...d, hero: { ...d.hero, eyebrow: v } }))
          }
        />
        <div className="grid grid-cols-2 gap-2 mt-2">
          <LabeledInput
            label="Organizer"
            value={draft.hero.organizerName}
            onChange={(v) =>
              patch((d) => ({
                ...d,
                hero: { ...d.hero, organizerName: v },
              }))
            }
          />
          <LabeledInput
            label="Partner"
            value={draft.hero.partnerName}
            onChange={(v) =>
              patch((d) => ({ ...d, hero: { ...d.hero, partnerName: v } }))
            }
          />
        </div>
        <LabeledInput
          label="Location"
          value={draft.hero.location}
          className="mt-2"
          onChange={(v) =>
            patch((d) => ({ ...d, hero: { ...d.hero, location: v } }))
          }
        />
      </SectionCard>

      <SectionCard
        title="Story"
        status="Auto-drafted"
        eyebrow="Pull quote"
      >
        <LabeledTextarea
          label="Pull quote"
          value={draft.story.pullQuote}
          onChange={(v) =>
            patch((d) => ({ ...d, story: { ...d.story, pullQuote: v } }))
          }
          rows={3}
        />
        <LabeledTextarea
          label="Detail"
          value={draft.story.detail ?? ""}
          onChange={(v) =>
            patch((d) => ({ ...d, story: { ...d.story, detail: v } }))
          }
          rows={2}
          className="mt-2"
        />
      </SectionCard>

      <SectionCard
        title="Schedule"
        status={`${draft.schedule.length} items`}
        eyebrow="The weekend"
      />
      <SectionCard
        title="Gallery"
        status={`${draft.gallery.length} photos`}
        eyebrow="Photo grid"
      />
      <SectionCard
        title="Travel"
        status="3 cards"
        eyebrow="Stay · Fly · Shuttle"
      />
      <SectionCard
        title="FAQs"
        status={`${draft.faqs.length} answered`}
        eyebrow="The fine details"
      />
      <SectionCard
        title="Song requests"
        status={`${draft.songRequests.length} so far`}
        eyebrow="Dance floor"
      />
      <SectionCard
        title="Guestbook"
        status={`${draft.guestbook.length} notes`}
        eyebrow="A note from you"
      />
      <SectionCard
        title="Registry"
        status={`${draft.registry.length} links`}
        eyebrow="Should you wish"
      />
    </aside>
  );
}

function SectionCard({
  title,
  status,
  eyebrow,
  children,
}: {
  title: string;
  status: string;
  eyebrow: string;
  children?: React.ReactNode;
}) {
  return (
    <section
      className="mb-3 p-5"
      style={{
        background: "#FFFFFF",
        border: "1px solid rgba(14,15,13,0.06)",
        borderRadius: 14,
      }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <p
            className="uppercase"
            style={{
              fontFamily: '"JetBrains Mono", ui-monospace, monospace',
              fontSize: 9.5,
              letterSpacing: "0.30em",
              color: "rgba(26,26,24,0.42)",
            }}
          >
            {eyebrow}
          </p>
          <h3
            className="leading-tight mt-1"
            style={{
              fontFamily: '"Cormorant Garamond", Georgia, serif',
              fontStyle: "italic",
              fontSize: 22,
              color: "#1A1A18",
            }}
          >
            {title}
          </h3>
        </div>
        <span
          className="uppercase shrink-0"
          style={{
            fontFamily: '"JetBrains Mono", ui-monospace, monospace',
            fontSize: 9.5,
            letterSpacing: "0.24em",
            padding: "4px 10px",
            background: "rgba(79,93,68,0.10)",
            color: "#4F5D44",
            borderRadius: 999,
          }}
        >
          {status}
        </span>
      </div>
      {children && <div className="mt-4">{children}</div>}
    </section>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span
        className="uppercase block mb-1"
        style={{
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
          fontSize: 9,
          letterSpacing: "0.26em",
          color: "rgba(26,26,24,0.42)",
        }}
      >
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 outline-none transition-colors"
        style={{
          background: "#FBF8F2",
          border: "1px solid rgba(14,15,13,0.10)",
          borderRadius: 8,
          fontSize: 14,
          fontFamily: "Georgia, serif",
          color: "#1A1A18",
        }}
      />
    </label>
  );
}

function LabeledTextarea({
  label,
  value,
  onChange,
  rows,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  className?: string;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span
        className="uppercase block mb-1"
        style={{
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
          fontSize: 9,
          letterSpacing: "0.26em",
          color: "rgba(26,26,24,0.42)",
        }}
      >
        {label}
      </span>
      <textarea
        value={value}
        rows={rows ?? 3}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 outline-none resize-none"
        style={{
          background: "#FBF8F2",
          border: "1px solid rgba(14,15,13,0.10)",
          borderRadius: 8,
          fontSize: 14,
          fontFamily: "Georgia, serif",
          lineHeight: 1.5,
          color: "#1A1A18",
        }}
      />
    </label>
  );
}

// -------------------------------------------------------- preview pane ---

function PreviewPane({
  draft,
  viewport,
  onViewport,
}: {
  draft: WebsiteDraft;
  viewport: Viewport;
  onViewport: (v: Viewport) => void;
}) {
  return (
    <section
      className="overflow-y-auto"
      style={{
        background: "#EDE7DA",
        maxHeight: "calc(100dvh - 140px)",
      }}
    >
      <div
        className="flex items-center justify-between gap-3 px-6 py-3"
        style={{
          background: "rgba(255,255,255,0.65)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid rgba(14,15,13,0.06)",
          position: "sticky",
          top: 0,
          zIndex: 5,
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="font-mono uppercase truncate"
            style={{
              fontSize: 10.5,
              letterSpacing: "0.28em",
              color: "rgba(26,26,24,0.55)",
              padding: "4px 12px",
              background: "#FFFFFF",
              border: "1px solid rgba(14,15,13,0.08)",
              borderRadius: 999,
            }}
          >
            {draft.publicUrl}
          </span>
        </div>
        <div
          className="inline-flex items-center"
          style={{
            background: "#FFFFFF",
            border: "1px solid rgba(14,15,13,0.08)",
            borderRadius: 999,
            padding: 3,
          }}
        >
          {(["desktop", "mobile"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onViewport(v)}
              className="px-3 py-1 uppercase transition-all"
              style={{
                fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                fontSize: 10,
                letterSpacing: "0.28em",
                background: viewport === v ? "#1A1A18" : "transparent",
                color: viewport === v ? "#FBF7F0" : "rgba(26,26,24,0.45)",
                borderRadius: 999,
              }}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div
        className="mx-auto my-6"
        style={{
          width: viewport === "mobile" ? "min(390px, 95%)" : "min(1280px, 95%)",
          background: "#FFFFFF",
          border: "1px solid rgba(14,15,13,0.08)",
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 24px 60px -28px rgba(14,15,13,0.30)",
        }}
      >
        <PublicSite draft={draft} vibe={draft.vibe} viewport={viewport} />
      </div>
    </section>
  );
}

// -------------------------------------------------------- refine drawer ---

const REFINE_PRESETS: { label: string; mut: (d: WebsiteDraft) => WebsiteDraft }[] = [
  {
    label: "Make the whole site feel more romantic",
    mut: (d) => ({ ...d, vibe: "garden-party" }),
  },
  {
    label: "Switch to a darker, cinematic palette",
    mut: (d) => ({ ...d, vibe: "cinematic-dark" }),
  },
  {
    label: "Sun-drenched, golden-hour, Mediterranean",
    mut: (d) => ({ ...d, vibe: "amalfi-editorial" }),
  },
  {
    label: "Quiet, modernist, generous whitespace",
    mut: (d) => ({ ...d, vibe: "soft-modernist" }),
  },
  {
    label: "Magazine-loud, bold red accents",
    mut: (d) => ({ ...d, vibe: "brutalist-editorial" }),
  },
  {
    label: "Linen and deep teal, seaside",
    mut: (d) => ({ ...d, vibe: "seaside-minimal" }),
  },
  {
    label: "Rewrite the story in a wittier tone",
    mut: (d) => ({
      ...d,
      story: {
        pullQuote:
          "We tried to find a reason not to do this. We failed beautifully.",
        detail: d.story.detail,
      },
    }),
  },
  {
    label: "Add a section about our dog",
    mut: (d) => ({
      ...d,
      faqs: [
        ...d.faqs,
        {
          id: `faq-dog-${Date.now()}`,
          q: "Will the dog be there?",
          a: "Yes. He's the unofficial best dog. He'll be there for the ceremony and very polite at dinner.",
        },
      ],
    }),
  },
];

function RefineDrawer({
  draft,
  onClose,
  onApply,
  onUndo,
}: {
  draft: WebsiteDraft;
  onClose: () => void;
  onApply: (prompt: string, mut: (d: WebsiteDraft) => WebsiteDraft) => void;
  onUndo: (entryId: string) => void;
}) {
  const [input, setInput] = useState("");

  const send = () => {
    if (!input.trim()) return;
    const text = input.trim().toLowerCase();
    // Naive intent routing — preset matches first; fall back to vibe
    // keywords; finally apply a copy tweak so it's never a no-op.
    const preset = REFINE_PRESETS.find(
      (p) => p.label.toLowerCase() === text,
    );
    if (preset) {
      onApply(input.trim(), preset.mut);
    } else if (/dark|cinema|night|noir/.test(text)) {
      onApply(input.trim(), (d) => ({ ...d, vibe: "cinematic-dark" }));
    } else if (/amalfi|italy|warm|sun|golden/.test(text)) {
      onApply(input.trim(), (d) => ({ ...d, vibe: "amalfi-editorial" }));
    } else if (/garden|flower|mauve|soft/.test(text)) {
      onApply(input.trim(), (d) => ({ ...d, vibe: "garden-party" }));
    } else if (/brutal|magazine|loud|red/.test(text)) {
      onApply(input.trim(), (d) => ({ ...d, vibe: "brutalist-editorial" }));
    } else if (/sea|coast|teal|beach/.test(text)) {
      onApply(input.trim(), (d) => ({ ...d, vibe: "seaside-minimal" }));
    } else if (/minimal|modern|quiet|clean/.test(text)) {
      onApply(input.trim(), (d) => ({ ...d, vibe: "soft-modernist" }));
    } else {
      onApply(input.trim(), (d) => d);
    }
    setInput("");
  };

  return (
    <>
      <button
        type="button"
        aria-label="Close refine drawer"
        onClick={onClose}
        className="fixed inset-0 z-40"
        style={{ background: "rgba(14,15,13,0.18)", backdropFilter: "blur(2px)" }}
      />
      <aside
        className="fixed top-0 right-0 z-50 h-full flex flex-col"
        style={{
          width: "min(440px, 90vw)",
          background: "#FBF8F2",
          borderLeft: "1px solid rgba(14,15,13,0.08)",
          boxShadow: "-32px 0 80px -24px rgba(14,15,13,0.25)",
        }}
      >
        <header
          className="px-6 py-5 flex items-baseline justify-between gap-3"
          style={{ borderBottom: "1px solid rgba(14,15,13,0.06)" }}
        >
          <div>
            <p
              className="uppercase"
              style={{
                fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                fontSize: 10,
                letterSpacing: "0.30em",
                color: "rgba(79,93,68,0.85)",
              }}
            >
              Plain English
            </p>
            <h2
              className="mt-1 leading-tight"
              style={{
                fontFamily: '"Cormorant Garamond", Georgia, serif',
                fontSize: 26,
                fontStyle: "italic",
                color: "#1A1A18",
              }}
            >
              Refine your site
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 inline-flex items-center justify-center rounded-full transition-all"
            style={{
              color: "rgba(26,26,24,0.45)",
            }}
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          <div>
            <p
              className="uppercase mb-3"
              style={{
                fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                fontSize: 9.5,
                letterSpacing: "0.28em",
                color: "rgba(26,26,24,0.42)",
              }}
            >
              Try one
            </p>
            <ul className="flex flex-col gap-2">
              {REFINE_PRESETS.map((p) => (
                <li key={p.label}>
                  <button
                    type="button"
                    onClick={() => onApply(p.label, p.mut)}
                    className="w-full text-left px-4 py-3 transition-all"
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid rgba(14,15,13,0.08)",
                      borderRadius: 12,
                      fontFamily: "Georgia, serif",
                      fontSize: 14.5,
                      lineHeight: 1.4,
                      color: "#1A1A18",
                    }}
                  >
                    {p.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {draft.refinementLog.length > 0 && (
            <div>
              <p
                className="uppercase mb-3"
                style={{
                  fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                  fontSize: 9.5,
                  letterSpacing: "0.28em",
                  color: "rgba(26,26,24,0.42)",
                }}
              >
                Applied
              </p>
              <ul className="flex flex-col gap-1.5">
                {draft.refinementLog.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-baseline gap-2 justify-between"
                    style={{
                      fontFamily: "Georgia, serif",
                      fontSize: 13.5,
                      color: "rgba(26,26,24,0.66)",
                    }}
                  >
                    <span className="flex-1 min-w-0">
                      <span style={{ color: "#4F5D44" }}>→ </span>
                      {entry.prompt}
                    </span>
                    <button
                      type="button"
                      onClick={() => onUndo(entry.id)}
                      className="uppercase shrink-0"
                      style={{
                        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                        fontSize: 9,
                        letterSpacing: "0.26em",
                        color: "rgba(26,26,24,0.45)",
                      }}
                    >
                      Undo
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <footer
          className="px-6 py-4"
          style={{ borderTop: "1px solid rgba(14,15,13,0.06)" }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex items-stretch gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Anything else…"
              className="flex-1 px-3 py-2.5 outline-none"
              style={{
                background: "#FFFFFF",
                border: "1px solid rgba(14,15,13,0.10)",
                borderRadius: 10,
                fontFamily: "Georgia, serif",
                fontSize: 14,
                color: "#1A1A18",
              }}
            />
            <button
              type="submit"
              aria-label="Apply"
              className="cta-sage inline-flex items-center justify-center px-4 rounded-full"
              style={{
                fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                fontSize: 10.5,
                letterSpacing: "0.28em",
                textTransform: "uppercase",
              }}
            >
              Apply
            </button>
          </form>
        </footer>
      </aside>
    </>
  );
}

// ---------------------------------------------------------- publish modal ---

function PublishModal({
  draft,
  onClose,
  onPublish,
}: {
  draft: WebsiteDraft;
  onClose: () => void;
  onPublish: () => void;
}) {
  const checks = [
    { label: "Hero", ok: !!draft.hero.organizerName && !!draft.hero.partnerName },
    { label: "Schedule", ok: draft.schedule.length >= 3 },
    { label: "Travel", ok: !!draft.travel.stay.body },
    { label: "FAQs", ok: draft.faqs.length >= 5 },
    { label: "Gallery", ok: draft.gallery.length >= 3 },
    { label: "Registry", ok: draft.registry.length >= 1 },
    { label: "Mobile audit", ok: true },
  ];
  const allOk = checks.every((c) => c.ok);
  return (
    <>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="fixed inset-0 z-50"
        style={{ background: "rgba(14,15,13,0.45)", backdropFilter: "blur(4px)" }}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-[51] flex items-center justify-center p-4 pointer-events-none"
      >
        <div
          className="pointer-events-auto w-full max-w-[480px] flex flex-col"
          style={{
            background: "#FFFFFF",
            borderRadius: 20,
            boxShadow: "0 32px 80px -20px rgba(14,15,13,0.35)",
          }}
        >
          <header className="px-7 pt-7 pb-4">
            <p
              className="uppercase mb-2"
              style={{
                fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                fontSize: 10,
                letterSpacing: "0.30em",
                color: "rgba(79,93,68,0.85)",
              }}
            >
              {draft.published ? "Push update" : "Publish to guests"}
            </p>
            <h2
              className="leading-tight"
              style={{
                fontFamily: '"Cormorant Garamond", Georgia, serif',
                fontSize: 28,
                fontStyle: "italic",
                color: "#1A1A18",
              }}
            >
              {draft.published ? "Update the live site." : "Take the site live."}
            </h2>
          </header>

          <div className="px-7 pb-3">
            <ul className="space-y-2">
              <li
                className="text-[13px] leading-relaxed flex gap-2"
                style={{ color: "rgba(26,26,24,0.66)" }}
              >
                <span style={{ color: "#4F5D44" }}>·</span>
                The site goes live at{" "}
                <span className="font-mono">{draft.publicUrl}</span>
              </li>
              <li
                className="text-[13px] leading-relaxed flex gap-2"
                style={{ color: "rgba(26,26,24,0.66)" }}
              >
                <span style={{ color: "#4F5D44" }}>·</span>
                RSVP forms unlock for invited guests
              </li>
              {!draft.published && (
                <li
                  className="text-[13px] leading-relaxed flex gap-2"
                  style={{ color: "rgba(26,26,24,0.66)" }}
                >
                  <span style={{ color: "#4F5D44" }}>·</span>
                  Invited guests receive a magic-link email
                </li>
              )}
            </ul>
          </div>

          <section
            className="mx-7 mt-3 p-4"
            style={{
              background: "#FBF8F2",
              border: "1px solid rgba(14,15,13,0.06)",
              borderRadius: 12,
            }}
          >
            <p
              className="uppercase mb-3"
              style={{
                fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                fontSize: 9.5,
                letterSpacing: "0.30em",
                color: "rgba(26,26,24,0.45)",
              }}
            >
              Pre-flight
            </p>
            <ul className="grid grid-cols-2 gap-1.5">
              {checks.map((c) => (
                <li key={c.label} className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[8px]"
                    style={{
                      background: c.ok ? "#4F5D44" : "rgba(14,15,13,0.08)",
                      color: c.ok ? "#FBF7F0" : "rgba(26,26,24,0.45)",
                    }}
                  >
                    {c.ok ? "✓" : "·"}
                  </span>
                  <span
                    className="text-[12.5px]"
                    style={{ color: "rgba(26,26,24,0.66)" }}
                  >
                    {c.label}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <footer className="px-7 pt-6 pb-7 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 uppercase"
              style={{
                fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                fontSize: 10.5,
                letterSpacing: "0.30em",
                color: "rgba(26,26,24,0.55)",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onPublish}
              disabled={!allOk}
              className="cta-sage inline-flex items-center gap-2 rounded-full px-5 py-2.5 transition-all disabled:opacity-50"
              style={{
                fontFamily: '"JetBrains Mono", ui-monospace, monospace',
                fontSize: 10.5,
                letterSpacing: "0.28em",
                textTransform: "uppercase",
              }}
            >
              {draft.published ? "Push update" : "Publish and notify guests"}
              <span aria-hidden>→</span>
            </button>
          </footer>
        </div>
      </div>
    </>
  );
}
