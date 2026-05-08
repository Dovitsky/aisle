"use client";

// HeroAtmosphere — editorial photo stack on the right of the Welcome hero.
//
// Three small framed photographs, slightly rotated, with tiny serif captions.
// Each fades in with a stagger after the headline, then settles. On hover the
// active card lifts slightly. Hidden below the lg breakpoint to keep the
// mobile hero focused on the headline.
//
// The photos are atmospheric — they're not the brand, they're the *mood*.
// Sage tinted, slightly desaturated, treated like Polaroids in a designer's
// scrapbook.

import { useEffect, useState } from "react";

interface Frame {
  src: string;
  caption: string;
  meta: string;
  // small visual offsets so the stack feels hand-arranged
  rotate: string;
  translateX: string;
  delayMs: number;
}

const FRAMES: Frame[] = [
  {
    src: "https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?auto=format&fit=crop&w=900&q=80",
    caption: "Amalfi",
    meta: "golden hour · September",
    rotate: "-3.2deg",
    translateX: "0px",
    delayMs: 1400,
  },
  {
    src: "https://images.unsplash.com/photo-1738510341339-394a8b8ae2de?auto=format&fit=crop&w=900&q=80",
    caption: "Val d'Orcia",
    meta: "cypress drive · May",
    rotate: "1.8deg",
    translateX: "-32px",
    delayMs: 1700,
  },
  {
    src: "https://images.unsplash.com/photo-1559779085-2090b6ce411b?auto=format&fit=crop&w=900&q=80",
    caption: "Joshua Tree",
    meta: "dusk · October",
    rotate: "-1.4deg",
    translateX: "16px",
    delayMs: 2000,
  },
];

export function HeroAtmosphere() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div
      aria-hidden
      className="hidden lg:block absolute right-0 top-[120px] xl:top-[140px] w-[300px] xl:w-[360px] pointer-events-none select-none"
      style={{ perspective: "1200px" }}
    >
      <div className="relative h-[520px]">
        {FRAMES.map((f, i) => (
          <div
            key={i}
            className="absolute right-0"
            style={{
              top: `${i * 132}px`,
              transform: `translateX(${f.translateX})`,
              opacity: 0,
              animation: mounted
                ? `frame-rise 1100ms cubic-bezier(0.2,0.7,0.2,1) ${f.delayMs}ms both`
                : undefined,
            }}
          >
            <figure
              className="origin-bottom-right"
              style={{
                transform: `rotate(${mounted ? f.rotate : "0deg"})`,
                transition: "transform 1400ms cubic-bezier(0.2,0.7,0.2,1)",
                transitionDelay: `${f.delayMs + 200}ms`,
              }}
            >
              {/* Polaroid-style frame */}
              <div className="relative w-[200px] xl:w-[230px] bg-paper-50 border hairline rounded-[3px] p-2.5 shadow-[0_22px_44px_-22px_rgba(14,14,12,0.40),0_8px_18px_-10px_rgba(79,93,68,0.18)]">
                <div className="relative aspect-[4/5] overflow-hidden bg-paper-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={f.src}
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover"
                    style={{
                      filter: "saturate(0.78) contrast(0.96)",
                      animation: mounted
                        ? `ken-burns 14s ease-in-out ${f.delayMs}ms infinite alternate`
                        : undefined,
                    }}
                  />
                  {/* sage tint to bind into brand palette */}
                  <div
                    className="absolute inset-0 mix-blend-multiply opacity-30"
                    style={{
                      background:
                        "linear-gradient(160deg, rgba(168,181,160,0.55), rgba(232,217,164,0.18) 60%, transparent)",
                    }}
                  />
                </div>
                <figcaption className="px-1 pt-2 pb-0.5 flex items-baseline justify-between">
                  <span
                    className="display italic text-[13px] text-ink leading-none"
                    style={{ fontFamily: '"Cormorant", "Cormorant Garamond", serif' }}
                  >
                    {f.caption}
                  </span>
                  <span className="text-[8.5px] uppercase tracking-[0.22em] text-ink-300 font-mono">
                    {f.meta}
                  </span>
                </figcaption>
              </div>
            </figure>
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes frame-rise {
          0% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }
        @keyframes ken-burns {
          0% {
            transform: scale(1);
          }
          100% {
            transform: scale(1.08) translate(-1.5%, -1%);
          }
        }
      `}</style>
    </div>
  );
}
