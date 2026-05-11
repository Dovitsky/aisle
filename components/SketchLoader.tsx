"use client";

// Pencil-sketch wedding scene that draws itself, stroke by stroke.
// Used as the route-transition loader so a click between tabs reveals a
// small atelier-style sketch animating in before the next page lands.
//
// Each path has its own dash array sized to its rough length; the CSS
// custom property --d holds the dash, --t the duration, and --o the
// stagger offset. The whole composition cycles every ~3.6s so if a nav
// is unusually slow the user just sees the scene drawn a second time.

export function SketchLoader({ caption }: { caption?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={caption ?? "Loading the next page"}
      className="sketch-loader inline-flex flex-col items-center justify-center"
      style={{
        background: "#FDFBF6",
        border: "1px solid rgba(26,26,24,0.10)",
        borderRadius: 14,
        padding: "20px 22px 16px",
        boxShadow: "0 24px 48px -22px rgba(26,26,24,0.28)",
        maxWidth: 260,
      }}
    >
      <svg
        viewBox="0 0 240 220"
        width={220}
        height={200}
        fill="none"
        stroke="#4F5D44"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {/* Faint paper grain underneath the sketch */}
        <rect x={0} y={0} width={240} height={220} fill="transparent" />

        {/* 1. Ground line — short wobble, drawn first */}
        <path
          className="s s-1"
          d="M28,192 q26,-2 52,-1 q40,2 80,0 q34,-1 52,2"
          style={{ ["--d" as string]: 220, ["--o" as string]: "0ms" } as React.CSSProperties}
        />

        {/* 2. Left arch column */}
        <path
          className="s s-2"
          d="M62,190 C 60,150 60,110 64,68"
          style={{ ["--d" as string]: 140, ["--o" as string]: "260ms" } as React.CSSProperties}
        />

        {/* 3. Right arch column */}
        <path
          className="s s-3"
          d="M178,190 C 180,150 180,110 176,68"
          style={{ ["--d" as string]: 140, ["--o" as string]: "460ms" } as React.CSSProperties}
        />

        {/* 4. Arch crown — soft arc from one column to the other */}
        <path
          className="s s-4"
          d="M64,68 C 80,32 160,32 176,68"
          style={{ ["--d" as string]: 140, ["--o" as string]: "660ms" } as React.CSSProperties}
        />

        {/* 5. Wreath/floral suggestion along the arch (two small loops) */}
        <path
          className="s s-5"
          d="M86,54 q4,-7 12,-4 q3,4 -2,7 q-7,3 -10,-3 M148,52 q5,-7 13,-3 q3,4 -2,7 q-7,3 -11,-4"
          style={{ ["--d" as string]: 150, ["--o" as string]: "860ms" } as React.CSSProperties}
        />

        {/* 6. Left figure — bride. Head + neck + dress (triangle skirt) + arm */}
        <path
          className="s s-6"
          d="M104,100 a8,8 0 1,0 0.1,0 Z"
          style={{ ["--d" as string]: 60, ["--o" as string]: "1100ms" } as React.CSSProperties}
        />
        <path
          className="s s-7"
          d="M104,116 L104,138 M86,184 L104,138 L118,184 Z"
          style={{ ["--d" as string]: 130, ["--o" as string]: "1240ms" } as React.CSSProperties}
        />

        {/* 7. Right figure — partner. Head + body + legs */}
        <path
          className="s s-8"
          d="M140,100 a8,8 0 1,0 0.1,0 Z"
          style={{ ["--d" as string]: 60, ["--o" as string]: "1420ms" } as React.CSSProperties}
        />
        <path
          className="s s-9"
          d="M140,116 L140,168 M132,168 L130,188 M148,168 L150,188"
          style={{ ["--d" as string]: 110, ["--o" as string]: "1560ms" } as React.CSSProperties}
        />

        {/* 8. Hands meeting at the center */}
        <path
          className="s s-10"
          d="M111,148 q8,-4 18,0"
          style={{ ["--d" as string]: 30, ["--o" as string]: "1720ms" } as React.CSSProperties}
        />

        {/* 9. A small bouquet (3 stems) */}
        <path
          className="s s-11"
          d="M118,158 q-3,8 -2,16 M122,158 q-1,9 0,17 M126,158 q2,8 3,15"
          style={{ ["--d" as string]: 90, ["--o" as string]: "1860ms" } as React.CSSProperties}
        />

        {/* 10. A few drifting petals at the top — the joyful finish */}
        <path
          className="s s-12"
          d="M42,42 q3,-4 6,0 q-3,4 -6,0 M198,46 q3,-4 6,0 q-3,4 -6,0 M120,18 q3,-4 6,0 q-3,4 -6,0"
          style={{ ["--d" as string]: 80, ["--o" as string]: "2080ms" } as React.CSSProperties}
        />
      </svg>

      <p
        className="mt-3 italic text-center"
        style={{
          fontFamily: '"Cormorant Garamond","Cormorant",Georgia,serif',
          fontStyle: "italic",
          fontSize: 14,
          lineHeight: 1.45,
          color: "rgba(26,26,24,0.55)",
        }}
      >
        {caption ?? "drawing the scene…"}
      </p>

      <style jsx>{`
        .s {
          stroke-dasharray: var(--d);
          stroke-dashoffset: var(--d);
          animation: sketch-draw 3600ms cubic-bezier(0.36, 0.21, 0.18, 1) var(--o) infinite;
        }
        @keyframes sketch-draw {
          0%   { stroke-dashoffset: var(--d); opacity: 0; }
          6%   { opacity: 1; }
          22%  { stroke-dashoffset: 0; opacity: 1; }
          82%  { stroke-dashoffset: 0; opacity: 1; }
          92%  { stroke-dashoffset: 0; opacity: 0; }
          100% { stroke-dashoffset: var(--d); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .s {
            animation: none;
            stroke-dashoffset: 0;
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
