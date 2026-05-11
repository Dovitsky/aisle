"use client";

// LockCelebration. the dramatic full-screen moment when the brief locks.
//
// Watches state.brief.locked and renders a 4-second takeover when it
// transitions false → true. Editorial magazine-cover reveal — paper-cream
// backdrop, ink names, sage ampersand, champagne ribbon sweep, specialist
// cascade in mono. Airy, refined, never dark.

import { useEffect, useRef, useState } from "react";
import { useProject } from "./StateProvider";
import { LetterReveal } from "./Atmosphere";

const SPECIALISTS = [
  "Scout. searching venues",
  "Outreach. drafting first emails",
  "Treasurer. laying out the budget",
  "Designer. mood directions",
  "Cleric. ceremony script",
  "Watcher. risk monitor live",
];

export function LockCelebration() {
  const { state } = useProject();
  const [show, setShow] = useState(false);
  const [phase, setPhase] = useState<"intro" | "names" | "specialists" | "outro">("intro");
  const prevLocked = useRef<boolean | undefined>(undefined);

  useEffect(() => {
    const locked = state?.brief?.locked ?? false;
    // Only celebrate on the false → true transition (and not on first load
    // when the locked state arrives already true from server).
    if (prevLocked.current === false && locked) {
      setShow(true);
      setPhase("intro");
      const t1 = setTimeout(() => setPhase("names"), 600);
      const t2 = setTimeout(() => setPhase("specialists"), 1700);
      const t3 = setTimeout(() => setPhase("outro"), 4200);
      const t4 = setTimeout(() => setShow(false), 5000);
      return () => {
        clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4);
      };
    }
    prevLocked.current = locked;
  }, [state?.brief?.locked]);

  if (!show || !state?.brief) return null;
  const b = state.brief;

  return (
    <div
      className={`fixed inset-0 z-[200] flex flex-col items-center justify-center px-6 transition-opacity duration-700 ${phase === "outro" ? "opacity-0" : "opacity-100"}`}
      style={{
        background:
          "radial-gradient(ellipse 65% 50% at 50% 30%, rgba(168,181,160,0.22), transparent 70%), radial-gradient(ellipse 55% 40% at 80% 80%, rgba(214,182,118,0.16), transparent 65%), linear-gradient(180deg, #FFFFFF 0%, #FBF8F1 60%, #F4ECDC 100%)",
      }}
      aria-hidden
    >
      {/* Fine paper grain */}
      <div
        className="absolute inset-0 pointer-events-none opacity-50 mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.05 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
          backgroundSize: "240px 240px",
        }}
      />

      {/* Botanical accents — a stylized olive sprig drawn on each side */}
      <svg
        className="absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none hidden lg:block"
        width="240"
        height="640"
        viewBox="0 0 240 640"
        fill="none"
        aria-hidden
        style={{
          animation: "lock-sprig-in 1200ms cubic-bezier(0.2,0.7,0.2,1) 200ms both",
        }}
      >
        <g stroke="#6E8068" strokeWidth="1" opacity="0.55" fill="none">
          <path d="M30 80 Q 60 180, 80 280 Q 100 380, 90 480 Q 80 560, 60 620"
                strokeLinecap="round" />
          <ellipse cx="50" cy="140" rx="18" ry="6" transform="rotate(40 50 140)" />
          <ellipse cx="78" cy="230" rx="18" ry="6" transform="rotate(-25 78 230)" />
          <ellipse cx="92" cy="320" rx="18" ry="6" transform="rotate(40 92 320)" />
          <ellipse cx="100" cy="410" rx="18" ry="6" transform="rotate(-30 100 410)" />
          <ellipse cx="90" cy="500" rx="18" ry="6" transform="rotate(40 90 500)" />
          <ellipse cx="78" cy="580" rx="18" ry="6" transform="rotate(-30 78 580)" />
        </g>
      </svg>
      <svg
        className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none hidden lg:block scale-x-[-1]"
        width="240"
        height="640"
        viewBox="0 0 240 640"
        fill="none"
        aria-hidden
        style={{
          animation: "lock-sprig-in 1200ms cubic-bezier(0.2,0.7,0.2,1) 350ms both",
        }}
      >
        <g stroke="#B89968" strokeWidth="1" opacity="0.50" fill="none">
          <path d="M30 60 Q 70 160, 80 260 Q 90 360, 100 460 Q 110 560, 90 620"
                strokeLinecap="round" />
          <ellipse cx="58" cy="120" rx="15" ry="5" transform="rotate(35 58 120)" />
          <ellipse cx="80" cy="210" rx="15" ry="5" transform="rotate(-30 80 210)" />
          <ellipse cx="92" cy="300" rx="15" ry="5" transform="rotate(35 92 300)" />
          <ellipse cx="100" cy="390" rx="15" ry="5" transform="rotate(-25 100 390)" />
          <ellipse cx="106" cy="490" rx="15" ry="5" transform="rotate(35 106 490)" />
          <ellipse cx="98" cy="580" rx="15" ry="5" transform="rotate(-30 98 580)" />
        </g>
      </svg>

      {/* Top eyebrow */}
      <p
        className="relative text-[10.5px] uppercase tracking-[0.36em] font-mono mb-10 opacity-0"
        style={{
          color: "#6E8068",
          animation: "fade-in-soft 480ms ease-out 200ms forwards",
        }}
      >
        Dossier sealed
        <span className="mx-3" style={{ color: "rgba(110,128,104,0.35)" }}>·</span>
        Foundation phase
      </p>

      {/* Names. letter cascade reveal, ink-on-paper */}
      <h1
        className="relative text-center leading-[0.92] tracking-[-0.018em] max-w-[14ch]"
        style={{
          fontFamily: '"Cormorant Garamond","Cormorant",Georgia,serif',
          fontWeight: 400,
          fontSize: "clamp(56px, 9vw, 132px)",
          color: "#1A1A18",
        }}
      >
        <span className="block">
          <LetterReveal text={b.organizerName} />
        </span>
        <span
          className="block italic my-1"
          style={{
            fontSize: "clamp(36px, 5.4vw, 76px)",
            color: "#6E8068",
          }}
        >
          &
        </span>
        <span className="block">
          <LetterReveal text={b.partnerName} step={1.2} />
        </span>
      </h1>

      {/* Champagne ribbon sweep — animates left to right under names */}
      <div
        className="relative mt-12 h-px w-[320px] overflow-hidden"
        style={{ background: "rgba(184,153,104,0.18)" }}
        aria-hidden
      >
        <span
          className="absolute inset-0 block"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(184,153,104,0) 25%, rgba(184,153,104,0.95) 50%, rgba(184,153,104,0) 75%, transparent 100%)",
            transform: "translateX(-100%)",
            animation: "lock-ribbon 1400ms cubic-bezier(0.2,0.7,0.2,1) 1.3s forwards",
          }}
        />
      </div>

      {/* Specialist cascade. mono caps in ink */}
      <div className="relative mt-10 flex flex-col gap-2 items-center min-h-[130px]">
        {phase !== "intro" &&
          SPECIALISTS.map((s, i) => (
            <p
              key={s}
              className="text-[12.5px] uppercase tracking-[0.26em] font-mono opacity-0"
              style={{
                color: "rgba(26,26,24,0.78)",
                animation: "lock-line 380ms cubic-bezier(0.2,0.7,0.2,1) forwards",
                animationDelay: `${1700 + i * 220}ms`,
              }}
            >
              <span style={{ color: "#6E8068" }}>+</span> {s}
            </p>
          ))}
      </div>

      {/* Bottom note */}
      <div
        className="absolute bottom-10 opacity-0"
        style={{
          animation: "fade-in-soft 500ms ease-out 3.6s forwards",
        }}
      >
        <p
          className="text-[10px] uppercase tracking-[0.32em] font-mono text-center"
          style={{ color: "rgba(26,26,24,0.32)" }}
        >
          Settling you in
        </p>
      </div>

      <style jsx>{`
        @keyframes lock-ribbon {
          to { transform: translateX(100%); }
        }
        @keyframes lock-sprig-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
