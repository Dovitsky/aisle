"use client";

// LockCelebration — the dramatic full-screen moment when the brief locks.
//
// Watches state.brief.locked and renders a 4-second takeover when it
// transitions false → true. Big serif name reveal, cascading specialist
// activations, sage rule sweeping across, then auto-dismisses.

import { useEffect, useRef, useState } from "react";
import { useProject } from "./StateProvider";
import { LetterReveal } from "./Atmosphere";

const SPECIALISTS = [
  "Scout — searching venues",
  "Outreach — drafting first emails",
  "Treasurer — laying out the budget",
  "Designer — mood directions",
  "Cleric — ceremony script",
  "Watcher — risk monitor live",
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
          "radial-gradient(ellipse 70% 60% at 50% 30%, rgba(79,93,68,0.45), transparent 70%), linear-gradient(180deg, #0F1110 0%, #0A0C0B 100%)",
      }}
      aria-hidden
    >
      {/* Film noise */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30 mix-blend-screen"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.06 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
          backgroundSize: "220px 220px",
        }}
      />

      {/* Sage halo orb */}
      <div
        className="absolute pointer-events-none rounded-full"
        style={{
          width: "70vmax",
          height: "70vmax",
          background: "radial-gradient(closest-side, rgba(168,181,160,0.22), transparent 70%)",
          filter: "blur(60px)",
          animation: "lock-pulse 4s ease-out forwards",
        }}
      />

      {/* Top eyebrow */}
      <p
        className="relative text-[11px] uppercase tracking-[0.32em] text-sage-300/80 font-mono mb-8 animate-fade-in"
        style={{ animationDelay: "0.2s", animationFillMode: "both" }}
      >
        Brief locked
      </p>

      {/* Names — letter cascade reveal */}
      <h1
        className="relative text-paper-50 text-center leading-[0.92] tracking-[-0.015em] max-w-[14ch]"
        style={{
          fontFamily: '"Cormorant","Cormorant Garamond",Georgia,serif',
          fontWeight: 300,
          fontSize: "clamp(56px, 9vw, 124px)",
        }}
      >
        <span className="block">
          <LetterReveal text={b.organizerName} />
        </span>
        <span
          className="block italic text-sage-300 my-1"
          style={{ fontSize: "clamp(36px, 5.4vw, 72px)" }}
        >
          &
        </span>
        <span className="block">
          <LetterReveal text={b.partnerName} step={1.2} />
        </span>
      </h1>

      {/* Sage rule sweep */}
      <div
        className="relative mt-10 h-px w-[280px] bg-gradient-to-r from-transparent via-sage-300 to-transparent origin-left"
        style={{
          animation: "lock-rule 700ms cubic-bezier(0.2,0.7,0.2,1) 1.4s both",
        }}
      />

      {/* Specialist cascade */}
      <div className="relative mt-8 flex flex-col gap-1.5 items-center min-h-[120px]">
        {phase !== "intro" &&
          SPECIALISTS.map((s, i) => (
            <p
              key={s}
              className="text-paper-50/80 text-[13px] uppercase tracking-[0.22em] font-mono opacity-0"
              style={{
                animation: "lock-line 380ms cubic-bezier(0.2,0.7,0.2,1) forwards",
                animationDelay: `${1700 + i * 220}ms`,
              }}
            >
              <span className="text-sage-300">+</span> {s}
            </p>
          ))}
      </div>

      {/* Bottom hint */}
      <p
        className="absolute bottom-10 text-[10px] uppercase tracking-[0.28em] text-paper-50/35 font-mono opacity-0"
        style={{
          animation: "fade-in-soft 500ms ease-out forwards",
          animationDelay: "3.6s",
        }}
      >
        Settling you in
      </p>
    </div>
  );
}
