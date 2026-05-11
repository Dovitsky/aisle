"use client";

// Pending. small loading primitives used inside primary CTAs and
// anywhere a click should produce immediate visual feedback.
//
// Three exports:
//   <Spinner />      . a quiet rotating sage ring
//   <DotsPulse />    . three pulsing dots, ink or paper tinted
//   <ButtonContent />. wraps button label so the spinner replaces
//                       the icon-area when busy is true

import * as React from "react";

export function Spinner({
  size = 14,
  tone = "auto",
}: {
  size?: number;
  tone?: "auto" | "ink" | "paper" | "sage";
}) {
  const stroke =
    tone === "paper"
      ? "rgba(248,246,241,0.85)"
      : tone === "ink"
      ? "#0E0F0D"
      : tone === "sage"
      ? "#6E8068"
      : "currentColor";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      style={{
        animation: "spin-pending 720ms linear infinite",
        flexShrink: 0,
      }}
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke={stroke}
        strokeOpacity="0.18"
        strokeWidth="2.4"
      />
      <path
        d="M21 12a9 9 0 0 1-9 9"
        stroke={stroke}
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <style jsx>{`
        @keyframes spin-pending {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </svg>
  );
}

export function DotsPulse({
  tone = "ink",
}: {
  tone?: "ink" | "paper" | "sage";
}) {
  const dot =
    tone === "paper"
      ? "rgba(248,246,241,0.9)"
      : tone === "sage"
      ? "#6E8068"
      : "#0E0F0D";

  return (
    <span
      aria-hidden
      style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            display: "inline-block",
            width: 5,
            height: 5,
            borderRadius: 999,
            background: dot,
            animation: "pending-dot-pulse 900ms ease-in-out infinite",
            animationDelay: `${i * 110}ms`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes pending-dot-pulse {
          0%, 60%, 100% { opacity: 0.25; transform: scale(0.7); }
          30% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </span>
  );
}

/**
 * Use inside any button to show a label that swaps to a spinner-and-text
 * when busy. Example:
 *   <button>
 *     <ButtonContent busy={busy} idle={<>Begin <Arrow /></>} busyLabel="Going" />
 *   </button>
 */
export function ButtonContent({
  busy,
  idle,
  busyLabel = "Working",
  spinnerTone = "auto",
}: {
  busy: boolean;
  idle: React.ReactNode;
  busyLabel?: string;
  spinnerTone?: "auto" | "ink" | "paper" | "sage";
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        position: "relative",
      }}
    >
      <span
        style={{
          opacity: busy ? 0 : 1,
          transition: "opacity 180ms",
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        {idle}
      </span>
      {busy && (
        <span
          style={{
            position: "absolute",
            inset: 0,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            animation: "btn-busy-fade 240ms ease-out both",
          }}
        >
          <Spinner size={14} tone={spinnerTone} />
          <span>{busyLabel}…</span>
        </span>
      )}
      <style jsx>{`
        @keyframes btn-busy-fade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </span>
  );
}
