"use client";

// Visual atmosphere primitives. All low-cost, all subtle, all luxe.
//   <AuroraBackground /> — fixed sage mesh + film grain, mounted once globally.
//   <Spotlight />        — wraps cards, paints a sage glow under the cursor.
//   <CountUp value={N} /> — animates a number in.
//   <Reveal>             — fades + lifts children when they scroll into view.
//   <LetterReveal>       — letter-by-letter typographic reveal for hero copy.
//   <BreathingDot />     — soft pulsing dot for "alive" indicators.

import { useEffect, useRef, useState } from "react";

// --------------------------------------------------------------------
// Aurora — mounted once at the top of the tree, fixed behind everything.
// --------------------------------------------------------------------
export function AuroraBackground() {
  return (
    <>
      <div className="aurora-root" aria-hidden>
        <div className="aurora-blob aurora-1" />
        <div className="aurora-blob aurora-2" />
        <div className="aurora-blob aurora-3" />
      </div>
      <div className="grain" aria-hidden />
    </>
  );
}

// --------------------------------------------------------------------
// Spotlight — pointer-tracking glow.
// Renders a div that listens for mousemove and writes --mx / --my.
// Add the .spotlight class on the element you want lit.
// --------------------------------------------------------------------
export function Spotlight({
  children,
  className = "",
  as: Tag = "div",
  ...rest
}: React.HTMLAttributes<HTMLElement> & { as?: React.ElementType }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    el.addEventListener("mousemove", onMove);
    return () => el.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <Tag ref={ref as React.RefObject<HTMLElement>} className={`spotlight ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

// --------------------------------------------------------------------
// CountUp — animates from 0 to value when it scrolls into view.
// --------------------------------------------------------------------
export function CountUp({
  value,
  durationMs = 1100,
  className = "",
  format = (n: number) => n.toLocaleString(),
}: {
  value: number;
  durationMs?: number;
  className?: string;
  format?: (n: number) => string;
}) {
  const [shown, setShown] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting || started.current) continue;
          started.current = true;
          const start = performance.now();
          const from = 0;
          const to = value;
          const tick = (t: number) => {
            const p = Math.min(1, (t - start) / durationMs);
            // ease-out-cubic
            const eased = 1 - Math.pow(1 - p, 3);
            setShown(Math.round(from + (to - from) * eased));
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [value, durationMs]);

  return <span ref={ref} className={className}>{format(shown)}</span>;
}

// --------------------------------------------------------------------
// Reveal — fades + lifts children when scrolled into view.
// --------------------------------------------------------------------
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setTimeout(() => el.classList.add("reveal-in"), delay);
            io.unobserve(el);
          }
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [delay]);

  return (
    <div ref={ref} className={`reveal ${className}`}>
      {children}
    </div>
  );
}

// --------------------------------------------------------------------
// LetterReveal — splits text into spans with cascading rise+blur.
// Use sparingly — best for the marquee headline.
// --------------------------------------------------------------------
export function LetterReveal({
  text,
  className = "",
  step = 1,
}: {
  text: string;
  className?: string;
  step?: number;     // index multiplier, useful when chaining lines
}) {
  // Per-letter rise+blur cascade. Words wrap as nowrap inline-block units so
  // the browser only line-breaks at real spaces, never inside a word.
  const words = text.split(" ");
  let cursor = 0;
  const nodes: React.ReactNode[] = [];
  words.forEach((word, wi) => {
    const letters = Array.from(word);
    nodes.push(
      <span
        key={`w${wi}`}
        className="lr-word"
        style={{ display: "inline-block", whiteSpace: "nowrap" }}
        aria-hidden
      >
        {letters.map((ch, li) => {
          const i = cursor + li;
          return (
            <span key={li} className="lr-ltr" style={{ ["--i" as never]: i * step }}>{ch}</span>
          );
        })}
      </span>
    );
    cursor += letters.length;
    if (wi < words.length - 1) {
      nodes.push(<span key={`s${wi}`}>{"\u00A0"}</span>);
    }
  });
  return (
    <span className={`letter-reveal ${className}`} aria-label={text}>{nodes}</span>
  );
}

// --------------------------------------------------------------------
// BreathingDot — alive indicator.
// --------------------------------------------------------------------
export function BreathingDot({
  className = "bg-sage-400",
  size = 6,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <span className="relative inline-block" style={{ width: size, height: size }} aria-hidden>
      <span
        className={`absolute inset-0 rounded-full ${className} animate-breathe`}
      />
      <span
        className={`absolute inset-0 rounded-full ${className}`}
      />
    </span>
  );
}
