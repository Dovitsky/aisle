"use client";

// ThoughtStream. surfaces a soft cycle of "thoughts" while AI work is in
// flight. Replaces silent skeletons / dots / blank space with the feeling
// of a planner audibly thinking on your behalf.
//
// Pick a `kind` for the situation. Phrases rotate with a gentle crossfade
// every ~2.4s, randomized order so it doesn't feel scripted on retries.
// Optional `extra` prepends one user-specific phrase (e.g. their region).

import { useEffect, useMemo, useRef, useState } from "react";

type Kind =
  | "image-gen"
  | "design-render"
  | "dress-render"
  | "agent-thinking"
  | "chat-thinking"
  | "lock-cascade"
  | "scout-search"
  | "demo-load"
  | "negotiation"
  | "discover-search";

const BANKS: Record<Kind, string[]> = {
  "image-gen": [
    "Curating vibes",
    "Studying your reference photos",
    "Mixing the palette",
    "Dialing in the light",
    "Composing the frame",
    "Refining textures",
    "Balancing warm and cool",
    "Letting the florals breathe",
    "One more pass on color",
    "Sketching the silhouette",
  ],
  "design-render": [
    "Translating your mood into a hero shot",
    "Holding the palette steady",
    "Letting the candles speak",
    "Pulling silver thread through the linen",
    "Rendering the room at golden hour",
    "Photographing it the way you'd want it shot",
    "Dressing the table",
    "Closing the aperture",
  ],
  "dress-render": [
    "Imagining silhouettes",
    "Studying necklines",
    "Letting the fabric drape",
    "Considering the train",
    "Modeling movement on the dance floor",
    "Pinning the bodice",
    "Drawing the hem",
  ],
  "agent-thinking": [
    "Thinking about your wedding",
    "Cross-checking your style notes",
    "Pulling threads together",
    "Reading the dossier one more time",
    "Talking with the right specialist",
    "Looking at it the way a planner would",
  ],
  "chat-thinking": [
    "Reading",
    "Considering",
    "Drafting",
    "Looking it over",
    "Putting words to it",
  ],
  "lock-cascade": [
    "Maestro is taking it from here",
    "Foundation specialists are fanning out",
    "Scout is opening venue searches",
    "Designer is shaping mood directions",
    "Treasurer is laying out the envelope",
    "Concierge is queuing up the wedding website",
    "Cleric is reviewing ceremony scripts",
    "Watcher is now monitoring risks",
  ],
  "scout-search": [
    "Calling around",
    "Reading reviews like a planner would",
    "Checking calendars",
    "Pricing in your taxes & service fees",
    "Comparing capacity to your guest count",
    "Filtering on your aesthetic",
  ],
  "demo-load": [
    "Setting up an example wedding",
    "Filling in eight months of decisions",
    "Booking the vendors",
    "Drafting the menu",
    "Locking in the foundation",
    "Lighting the candles",
  ],
  negotiation: [
    "Reading the proposal",
    "Looking for the soft levers",
    "Drafting a counter",
    "Polishing the tone",
  ],
  "discover-search": [
    "Pulling references",
    "Filtering on your vibe",
    "Looking at recent shoots",
  ],
};

type Tone = "ink" | "sage" | "paper" | "auto";

export function ThoughtStream({
  kind,
  extra,
  tone = "auto",
  size = "sm",
  align = "left",
  intervalMs = 2400,
  className = "",
  withDot = true,
}: {
  kind: Kind;
  extra?: string;
  tone?: Tone;
  size?: "xs" | "sm" | "md" | "lg";
  align?: "left" | "center";
  intervalMs?: number;
  className?: string;
  withDot?: boolean;
}) {
  const phrases = useMemo(() => {
    const bank = BANKS[kind];
    // Shuffle on mount so the ordering feels different each time without
    // hammering the same first phrase on every retry.
    const arr = [...bank];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    if (extra) arr.unshift(extra);
    return arr;
  }, [kind, extra]);

  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  const tickRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      // Fade out, swap, fade back.
      setVisible(false);
      tickRef.current = window.setTimeout(() => {
        if (cancelled) return;
        setIdx((i) => (i + 1) % phrases.length);
        setVisible(true);
      }, 320);
    };
    const id = window.setInterval(tick, intervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      if (tickRef.current) window.clearTimeout(tickRef.current);
    };
  }, [phrases.length, intervalMs]);

  // Resolve tone defaults per kind when "auto"
  const resolvedTone: Exclude<Tone, "auto"> =
    tone !== "auto"
      ? tone
      : kind === "lock-cascade"
      ? "paper"
      : kind === "chat-thinking"
      ? "ink"
      : "sage";

  const toneText =
    resolvedTone === "paper"
      ? "text-paper-50/85"
      : resolvedTone === "sage"
      ? "text-sage-500"
      : "text-ink-300";
  const toneDot =
    resolvedTone === "paper"
      ? "bg-sage-300"
      : resolvedTone === "sage"
      ? "bg-sage-400"
      : "bg-ink-300";

  const fontSize =
    size === "lg"
      ? "text-[15px]"
      : size === "md"
      ? "text-[13.5px]"
      : size === "xs"
      ? "text-[11px]"
      : "text-[12.5px]";

  return (
    <div
      className={`flex items-center gap-2 ${align === "center" ? "justify-center" : ""} ${className}`}
      role="status"
      aria-live="polite"
      aria-label={phrases[idx]}
    >
      {withDot && (
        <span
          className={`inline-block w-1.5 h-1.5 rounded-full ${toneDot} animate-pulse-soft shrink-0`}
          aria-hidden
        />
      )}
      <span
        className={`italic ${fontSize} ${toneText} transition-opacity duration-300 ease-out ${visible ? "opacity-100" : "opacity-0"}`}
        style={{ fontFamily: '"Cormorant","Cormorant Garamond",Georgia,serif', letterSpacing: "0.005em" }}
      >
        {phrases[idx]}…
      </span>
    </div>
  );
}

// Variant that overlays a thought onto a placeholder tile (mood board /
// design hero / dress render). Subtle gradient wash + centered phrase.
export function ThoughtTileOverlay({
  kind,
  delayMs = 0,
  className = "",
}: {
  kind: Kind;
  delayMs?: number;
  className?: string;
}) {
  return (
    <div
      className={`absolute inset-0 flex items-end justify-start p-4 pointer-events-none ${className}`}
      style={{
        background:
          "linear-gradient(180deg, rgba(247,244,237,0) 40%, rgba(247,244,237,0.55) 100%)",
        animation: `fade-in-soft 600ms ${delayMs}ms ease-out both`,
      }}
    >
      <ThoughtStream kind={kind} size="xs" tone="ink" align="left" />
    </div>
  );
}

// Compact pill for use inside buttons / above grids.
export function ThoughtPill({
  kind,
  extra,
  className = "",
}: {
  kind: Kind;
  extra?: string;
  className?: string;
}) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full bg-sage-50/80 border border-sage-100 px-3.5 py-1.5 backdrop-blur-sm ${className}`}
    >
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-sage-400 animate-pulse-soft" aria-hidden />
      <ThoughtStream kind={kind} extra={extra} size="xs" tone="sage" withDot={false} />
    </div>
  );
}
