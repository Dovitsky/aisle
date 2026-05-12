"use client";

// Landing. THE CATALOG.
//
// A magazine spread, not a typography poster. Asymmetric two-column:
// full-bleed wedding photograph on the left, ivory editorial column on
// the right with restrained type and one unmistakable CTA. Below the
// fold, a single trust monument and a product moment showing the
// decision card on cream so the user actually sees what Corsia does.
//
// Aesthetic: refined editorial. Cream / ink / sage. No tan-warm SaaS
// background; no obsidian poster. Photography carries the mood.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useProject } from "./StateProvider";
import type { ProjectState } from "@/lib/types";
import { Spinner } from "./Pending";

// =====================================================================
// COLOR + TYPE TOKENS. kept local so this page can carry its own
// editorial identity without leaking into the dashboard.
// =====================================================================
const IVORY = "#F8F6F1";
const PAPER = "#FFFFFF";
const INK = "#0E0F0D";
const INK_MUTED = "#5A5C57";
const INK_FAINT = "#9A9C97";
const SAGE = "#6E8068";
const SAGE_DEEP = "#4F5D44";
const SAGE_DARK = "#2F3A29";
const SAGE_PALE = "#E2E6DC";
const HAIRLINE = "#E5E2D8";
// Canonical primary-CTA gradient. Matches `.cta-sage` in globals.css so
// Landing's editorial buttons feel like the rest of the app.
const CTA_BG = `linear-gradient(135deg, ${SAGE} 0%, ${SAGE_DEEP} 100%)`;
const CTA_BG_HOVER = `linear-gradient(135deg, ${SAGE_DEEP} 0%, ${SAGE_DARK} 100%)`;

const DISPLAY = '"Cormorant Garamond","Cormorant",Georgia,serif';
// Helvetica-first system stack. The mono caps "AI startup" look came
// from JetBrains Mono — gone. This constant kept its old name so the
// many inline `fontFamily: MONO` refs in this file keep working.
const MONO = '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif';

export function Landing() {
  return (
    <div
      style={{
        background: IVORY,
        color: INK,
        minHeight: "100vh",
        width: "100%",
      }}
    >
      <Header />
      <Hero />
      <Trust />
      <ProductMoment />
      <Footer />

      {/* Page-load orchestration. one-time stagger */}
      <style jsx global>{`
        @keyframes cat-rise {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes cat-fade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes cat-pulse {
          0%, 100% { opacity: 0.85; transform: scale(1); }
          50%      { opacity: 0.45; transform: scale(0.85); }
        }
        @keyframes cat-pan {
          from { transform: scale(1.05) translateX(0); }
          to   { transform: scale(1.10) translateX(-1.5%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .cat-rise, .cat-fade, .cat-pulse, .cat-pan { animation: none !important; }
        }

        /* =========================================================
           MOBILE LANDING — strip-down. Photo + headline overlay,
           one input below, sign-in link. EVERYTHING ELSE pushed
           below ~100vh of whitespace so the first two scrolls feel
           like an App Store hero page, not a magazine article.
           Global so it beats styled-jsx scoping. !important to
           overpower inline styles.
           ========================================================= */
        @media (max-width: 720px) {
          /* Header: kill the SIGN IN + BEGIN nav. Just the "aisle"
             mark in the top-left. One action — the input below —
             is enough. */
          .header-nav {
            display: none !important;
          }

          /* Hero grid collapses to single column with no min-height */
          .hero-spread {
            grid-template-columns: 1fr !important;
            min-height: 0 !important;
          }
          /* Photo capped at ~58vh, never more than ~500px */
          .hero-photo {
            min-height: 0 !important;
            height: 58vh !important;
            max-height: 500px !important;
          }
          /* Show mobile overlay headline on the photo */
          .hero-photo-mobile-headline {
            display: block !important;
          }
          /* Hide the desktop photo decorations */
          .hero-figcaption,
          .hero-est-mark {
            display: none !important;
          }
          /* Tighten the editorial column to JUST the input + sign-in. */
          .hero-editorial {
            padding: 22px 22px 32px !important;
            gap: 0 !important;
          }
          /* Hide everything in the editorial column except the input */
          .hero-mobile-hide,
          .hero-ornament {
            display: none !important;
          }
          /* Sign-in link centered + close beneath the input */
          .hero-editorial form > div:last-child {
            margin-top: 22px !important;
            text-align: center !important;
          }
          /* Stack the input and BEGIN button vertically on mobile so
             the full placeholder ("Tell us about your dream wedding…")
             has room to render. Side-by-side at desktop > 720px. */
          .hero-action-row {
            flex-direction: column !important;
            gap: 12px !important;
          }
          .hero-action-row > input {
            width: 100% !important;
            font-size: 16px !important; /* prevents iOS zoom on focus */
          }
          .hero-action-row > button {
            width: 100% !important;
            padding: 16px 26px !important;
          }

          /* Trust / "OUR PROMISE" — natural continuation. Single column,
             tighter padding. Combined with hero-editorial's 32px bottom
             padding, gap between input and trust = ~88px (premium, not
             crammed, not a void). */
          .trust-section {
            padding: 56px 24px !important;
          }
          .trust-grid {
            grid-template-columns: 1fr !important;
            gap: 28px !important;
          }
          .trust-rows {
            gap: 20px !important;
            padding-top: 4px !important;
          }

          /* ProductMoment — single column on mobile */
          .product-moment {
            padding: 56px 24px !important;
          }
          .product-moment .moment-grid {
            grid-template-columns: 1fr !important;
            gap: 32px !important;
          }

          /* Footer — slimmer on mobile */
          .landing-footer {
            padding: 36px 24px !important;
          }
        }
      `}</style>
    </div>
  );
}

// =====================================================================
// HEADER
// =====================================================================

function Header() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className="cat-fade"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 30,
        background: scrolled ? "rgba(248,246,241,0.86)" : "transparent",
        backdropFilter: scrolled ? "saturate(160%) blur(16px)" : undefined,
        WebkitBackdropFilter: scrolled ? "saturate(160%) blur(16px)" : undefined,
        borderBottom: scrolled
          ? `1px solid ${HAIRLINE}`
          : "1px solid transparent",
        transition: "background 220ms, border-color 220ms",
        animation: "cat-fade 600ms ease-out both",
      }}
    >
      <div
        style={{
          maxWidth: 1440,
          margin: "0 auto",
          padding: "22px clamp(20px, 4vw, 40px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <Link
          href="/"
          aria-label="Corsia"
          style={{
            display: "inline-flex",
            alignItems: "center",
            textDecoration: "none",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/api/brand/logo"
            alt="Corsia"
            style={{ height: 28, width: "auto", display: "block" }}
          />
        </Link>

        <nav
          className="header-nav"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 28,
          }}
        >
          <Link
            href="/login"
            style={{
              fontFamily: MONO,
              fontSize: 11,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: INK_FAINT,
              textDecoration: "none",
              transition: "color 200ms",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = INK)}
            onMouseLeave={(e) => (e.currentTarget.style.color = INK_FAINT)}
          >
            Sign in
          </Link>
          <Link
            href="#begin"
            style={{
              padding: "10px 22px",
              borderRadius: 999,
              background: CTA_BG,
              color: IVORY,
              fontFamily: MONO,
              fontSize: 14,
              letterSpacing: "0.01em",
              fontWeight: 500,
              textDecoration: "none",
              transition: "background 200ms, transform 200ms",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.20), 0 10px 22px -10px rgba(79,93,68,0.45)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = CTA_BG_HOVER;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = CTA_BG;
            }}
          >
            Go
          </Link>
        </nav>
      </div>
    </header>
  );
}

// =====================================================================
// HERO. full-height catalog spread
// =====================================================================

function Hero() {
  return (
    <section
      style={{
        position: "relative",
        display: "grid",
        gridTemplateColumns: "minmax(0, 1.05fr) minmax(0, 1fr)",
        background: IVORY,
      }}
      className="hero-spread"
    >
      <HeroPhoto />
      <HeroEditorial />

      <style jsx>{`
        .hero-spread { min-height: 100vh; }
      `}</style>
    </section>
  );
}

function HeroPhoto() {
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        background: "#1A1A18",
        minHeight: "min(100vh, 880px)",
      }}
      className="hero-photo"
    >
      {/* The actual photograph. long candlelit dinner, treated warm */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1800&q=80"
        alt="A long candlelit wedding table at golden hour"
        loading="eager"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          animation: "cat-pan 22s ease-in-out alternate infinite",
        }}
      />

      {/* Warm vignette + a stronger bottom gradient so the caption + "Issue №01"
          read cleanly against the photograph on every screen size. */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(20,18,12,0.18) 0%, transparent 22%, transparent 55%, rgba(20,18,12,0.68) 100%), radial-gradient(ellipse 80% 70% at 50% 60%, transparent 50%, rgba(20,18,12,0.30) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Editorial caption. bottom left. desktop only; mobile shows
          the headline overlay below instead. */}
      <figcaption
        className="cat-fade hero-figcaption"
        style={{
          position: "absolute",
          left: "clamp(20px, 4vw, 44px)",
          bottom: "clamp(20px, 4vw, 36px)",
          color: IVORY,
          maxWidth: 360,
          animation: "cat-fade 1200ms 700ms ease-out both",
        }}
      >
        <div
          style={{
            fontFamily: MONO,
            fontSize: 10,
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "rgba(248,246,241,0.92)",
            textShadow: "0 1px 8px rgba(0,0,0,0.5)",
            marginBottom: 10,
          }}
        >
          Issue №01 · Spring
        </div>
        <p
          style={{
            fontFamily: DISPLAY,
            fontStyle: "italic",
            fontWeight: 300,
            fontSize: 18,
            lineHeight: 1.45,
            color: "rgba(248,246,241,1)",
            textShadow: "0 2px 12px rgba(0,0,0,0.55)",
            margin: 0,
            letterSpacing: "-0.005em",
          }}
        >
          Val d&apos;Orcia, April. A hundred and twenty around one table, the
          last olive light, then candles.
        </p>
      </figcaption>

      {/* Top-right tiny mark on the image. desktop only. */}
      <span
        className="hero-est-mark"
        style={{
          position: "absolute",
          top: "clamp(20px, 3vw, 28px)",
          right: "clamp(20px, 3vw, 28px)",
          fontFamily: MONO,
          fontSize: 10,
          letterSpacing: "0.30em",
          textTransform: "uppercase",
          color: "rgba(248,246,241,0.55)",
        }}
      >
        Corsia · est. 2026
      </span>

      {/* MOBILE-ONLY headline overlay at the bottom of the photo. Hidden on
          desktop (HeroEditorial owns the headline there). Display flipped
          to block in the global mobile media query. */}
      <div
        className="hero-photo-mobile-headline"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          padding: "0 22px 26px",
          color: IVORY,
          display: "none",
          pointerEvents: "none",
          zIndex: 2,
        }}
      >
        <h1
          style={{
            fontFamily: DISPLAY,
            fontWeight: 300,
            fontSize: 40,
            lineHeight: 1.0,
            letterSpacing: "-0.022em",
            margin: 0,
            color: IVORY,
            textShadow: "0 2px 18px rgba(0,0,0,0.6)",
          }}
        >
          <span style={{ display: "block" }}>Yours to dream.</span>
          <span
            style={{
              display: "block",
              fontStyle: "italic",
              color: "#D9E1CD",
            }}
          >
            Ours to tend.
          </span>
        </h1>
      </div>
    </div>
  );
}

function HeroEditorial() {
  return (
    <div
      className="hero-editorial"
      style={{
        position: "relative",
        background: IVORY,
        padding:
          "clamp(120px, 14vh, 160px) clamp(28px, 5vw, 80px) clamp(48px, 8vh, 96px)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 0,
      }}
    >
      {/* Eyebrow */}
      <p
        className="cat-rise hero-mobile-hide"
        style={{
          fontFamily: MONO,
          fontSize: 11,
          letterSpacing: "0.32em",
          textTransform: "uppercase",
          color: SAGE_DEEP,
          margin: 0,
          marginBottom: 28,
          animation: "cat-rise 700ms 100ms ease-out both",
        }}
      >
        <span
          aria-hidden
          style={{
            display: "inline-block",
            width: 32,
            height: 1,
            background: SAGE,
            marginRight: 14,
            verticalAlign: "middle",
          }}
        />
        By invitation
      </p>

      {/* Headline. refined scale, fits. mobile shows headline over the
          photo instead — this h1 is hidden via .hero-mobile-hide. */}
      <h1
        className="cat-rise hero-mobile-hide"
        style={{
          fontFamily: DISPLAY,
          fontWeight: 300,
          fontSize: "clamp(44px, 5.4vw, 78px)",
          lineHeight: 1.0,
          letterSpacing: "-0.022em",
          color: INK,
          margin: 0,
          animation: "cat-rise 800ms 200ms ease-out both",
        }}
      >
        <span style={{ display: "block" }}>Yours to dream.</span>
        <span
          style={{
            display: "block",
            fontStyle: "italic",
            color: SAGE_DEEP,
          }}
        >
          Ours to tend.
        </span>
      </h1>

      {/* Sub-line. single italic, restrained */}
      <p
        className="cat-rise hero-mobile-hide"
        style={{
          fontFamily: DISPLAY,
          fontWeight: 300,
          fontSize: "clamp(16px, 1.5vw, 19px)",
          lineHeight: 1.5,
          color: INK_MUTED,
          margin: "32px 0 0",
          maxWidth: 460,
          letterSpacing: "-0.005em",
          animation: "cat-rise 800ms 320ms ease-out both",
        }}
      >
        <span style={{ color: INK, fontStyle: "italic" }}>
          You decide what matters.
        </span>{" "}
        We handle everything else.
      </p>

      {/* Hairline rule */}
      <div
        aria-hidden
        className="cat-fade hero-mobile-hide"
        style={{
          height: 1,
          background: HAIRLINE,
          margin: "44px 0 36px",
          maxWidth: 460,
          animation: "cat-fade 800ms 460ms ease-out both",
        }}
      />

      {/* The action. single decisive composition */}
      <div
        id="begin"
        className="cat-rise"
        style={{
          maxWidth: 460,
          animation: "cat-rise 900ms 540ms ease-out both",
        }}
      >
        <HeroAction />
      </div>

      {/* Microcopy below action */}
      <p
        className="cat-fade hero-mobile-hide"
        style={{
          fontFamily: MONO,
          fontSize: 10.5,
          letterSpacing: "0.24em",
          textTransform: "uppercase",
          color: INK_FAINT,
          margin: "20px 0 0",
          animation: "cat-fade 900ms 740ms ease-out both",
        }}
      >
        Takes about a minute · No card required
      </p>

      {/* Bottom-right ornamental mark on the column — hidden on mobile
          via the consolidated style block at the end of this component. */}
      <div
        aria-hidden
        className="hero-ornament"
        style={{
          position: "absolute",
          right: "clamp(28px, 5vw, 80px)",
          bottom: "clamp(36px, 6vh, 56px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 8,
        }}
      >
        <span
          style={{
            fontFamily: MONO,
            fontSize: 10,
            letterSpacing: "0.30em",
            textTransform: "uppercase",
            color: INK_FAINT,
          }}
        >
          № 01
        </span>
        <span
          style={{
            display: "block",
            width: 60,
            height: 1,
            background: HAIRLINE,
          }}
        />
      </div>

      {/* All mobile overrides live in the GLOBAL style block at the
          top-level Landing component — scoped <style jsx> didn't
          consistently win specificity over the inline minHeight on
          .hero-photo. Global media query handles every mobile case. */}
    </div>
  );
}

function HeroAction() {
  const router = useRouter();
  const { setChatOpen, setState, state } = useProject();
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    const m = draft.trim();
    if (!m) return;
    setBusy(true);
    setError(null);

    // Open the chat dock immediately so the destination is primed —
    // setChatOpen lives in React context and persists across the
    // client-side navigation below.
    setChatOpen(true);

    // Race the chat fetch against a 6s timeout. The button shows
    // "Going…" with a spinner during this window, which IS the
    // immediate feedback. If Maestro responds in <6s we propagate
    // the new state. If it stalls (slow region, key missing, etc.)
    // we navigate anyway so the user is never stuck.
    const navigateNext = () => {
      // /dossier is OFF the marketing-landing path so AppShell stops
      // gating the chat dock there. The brief form is the natural
      // next step. router.refresh() makes the destination re-fetch
      // the latest state so a partial brief (if Maestro created one)
      // shows up immediately.
      router.push("/dossier");
      router.refresh();
    };

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: m }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        setError(j.error || `Server returned ${r.status}`);
        // Even on error: navigate so the user isn't stranded on the
        // landing page. The chat record was attempted; the dock at
        // the destination will surface Maestro's state.
        navigateNext();
        return;
      }
      const j = (await r.json()) as { state?: ProjectState };
      if (j.state) setState(j.state);
      navigateNext();
    } catch (e) {
      // Network error, abort, or fetch-thrown. Don't strand the user.
      // eslint-disable-next-line no-console
      console.error("[HeroAction] /api/chat failed:", e);
      setError(
        e instanceof Error && e.name === "AbortError"
          ? "Maestro is taking a moment — continuing without waiting."
          : "Network hiccup — continuing without waiting.",
      );
      navigateNext();
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); void send(); }}>
      {/* Field label. hidden on mobile — placeholder carries the prompt. */}
      <label
        htmlFor="hero-input"
        className="hero-mobile-hide"
        style={{
          display: "block",
          fontFamily: MONO,
          fontSize: 10.5,
          letterSpacing: "0.26em",
          textTransform: "uppercase",
          color: INK_FAINT,
          marginBottom: 12,
        }}
      >
        Tell us when, where, who
      </label>

      {/* Input row. refined: input on top, button below at full width */}
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "stretch",
        }}
        className="hero-action-row"
      >
        <input
          id="hero-input"
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Tell us about your dream wedding…"
          disabled={busy || !!state?.paused}
          style={{
            flex: 1,
            minWidth: 0,
            fontFamily: DISPLAY,
            fontWeight: 400,
            fontStyle: "italic",
            fontSize: 17,
            color: INK,
            background: PAPER,
            border: `1px solid ${focused ? SAGE : HAIRLINE}`,
            borderRadius: 999,
            outline: "none",
            padding: "16px 22px",
            transition: "border-color 200ms, box-shadow 200ms",
            boxShadow: focused
              ? `0 0 0 4px ${SAGE_PALE}`
              : "0 1px 2px rgba(14,15,13,0.04)",
            letterSpacing: "-0.005em",
          }}
        />
        <button
          type="submit"
          disabled={busy}
          aria-label="Go"
          style={{
            position: "relative",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            padding: "0 30px",
            background: CTA_BG,
            color: IVORY,
            fontFamily: MONO,
            fontSize: 16,
            letterSpacing: "0",
            fontWeight: 500,
            border: "none",
            borderRadius: 999,
            cursor: busy ? "wait" : "pointer",
            // Stay sage even when the input is empty. the previous 0.5
            // opacity made the button read as a gray "disabled" blob.
            opacity: busy ? 0.6 : !draft.trim() ? 0.82 : 1,
            transition:
              "background 200ms, transform 200ms, box-shadow 200ms, opacity 200ms",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.22), 0 12px 28px -10px rgba(79,93,68,0.55), 0 3px 8px -2px rgba(110,128,104,0.30)",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            if (!busy && draft.trim()) {
              e.currentTarget.style.background = CTA_BG_HOVER;
              e.currentTarget.style.transform = "translateY(-1px)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = CTA_BG;
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          {busy ? (
            <>
              <Spinner size={13} tone="paper" />
              <span>Going</span>
            </>
          ) : (
            <>
              <span>Go</span>
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </>
          )}
        </button>
      </div>

      {/* Error surface — the user must always know something went wrong. */}
      {error && (
        <p
          style={{
            fontFamily: MONO,
            fontSize: 11,
            color: "#A8312C",
            margin: "12px 0 0",
            letterSpacing: "0.02em",
          }}
        >
          {error}
        </p>
      )}

      {/* Tertiary fallback */}
      <div style={{ marginTop: 14 }}>
        <Link
          href="/login"
          style={{
            fontFamily: DISPLAY,
            fontStyle: "italic",
            fontSize: 14,
            color: INK_FAINT,
            textDecoration: "none",
            borderBottom: `1px solid ${HAIRLINE}`,
            paddingBottom: 1,
            transition: "color 200ms, border-color 200ms",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = INK;
            e.currentTarget.style.borderColor = INK_MUTED;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = INK_FAINT;
            e.currentTarget.style.borderColor = HAIRLINE;
          }}
        >
          Already have an account? Sign in
        </Link>
      </div>
    </form>
  );
}

// =====================================================================
// TRUST. single monumental statement, three columns of consequence
// =====================================================================

function Trust() {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([e]) => e.isIntersecting && setVisible(true),
      { threshold: 0.18 },
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="trust-section"
      style={{
        background: PAPER,
        borderTop: `1px solid ${HAIRLINE}`,
        padding:
          "clamp(96px, 16vh, 180px) clamp(28px, 5vw, 80px)",
      }}
    >
      <div
        className="trust-grid"
        style={{
          maxWidth: 880,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 22,
          alignItems: "flex-start",
        }}
      >
        <h2
          style={{
            fontFamily: DISPLAY,
            fontWeight: 300,
            fontSize: "clamp(36px, 5vw, 64px)",
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            color: INK,
            margin: 0,
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 800ms, transform 800ms",
          }}
        >
          <span style={{ display: "block" }}>AI that plans.</span>
          <span
            style={{
              display: "block",
              fontStyle: "italic",
              color: SAGE_DEEP,
            }}
          >
            You that decides.
          </span>
        </h2>

        <p
          style={{
            fontFamily: DISPLAY,
            fontWeight: 300,
            fontStyle: "italic",
            fontSize: "clamp(17px, 1.6vw, 21px)",
            lineHeight: 1.55,
            color: INK_MUTED,
            margin: "8px 0 0",
            maxWidth: 720,
            letterSpacing: "-0.005em",
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(14px)",
            transition: "opacity 800ms 200ms, transform 800ms 200ms",
          }}
        >
          From venues to vendors to vows — your AI wedding planner handles
          every detail. Nothing happens without your say.
        </p>
      </div>

      <style jsx>{`
        @media (max-width: 900px) {
          .trust-grid {
            grid-template-columns: 1fr !important;
            gap: 32px !important;
          }
          .trust-section {
            padding: 56px 24px !important;
          }
          .trust-rows {
            gap: 22px !important;
            padding-top: 4px !important;
          }
        }
      `}</style>
    </section>
  );
}

// =====================================================================
// PRODUCT MOMENT. show the actual decision card on cream so the user
// sees what Corsia actually does.
// =====================================================================

function ProductMoment() {
  return (
    <section
      className="product-moment"
      style={{
        background: IVORY,
        padding: "clamp(96px, 16vh, 180px) clamp(28px, 5vw, 80px)",
        position: "relative",
      }}
    >
      <div
        className="moment-grid"
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.1fr)",
          gap: "clamp(48px, 7vw, 96px)",
          alignItems: "center",
        }}
      >
        {/* Left. three simple steps. */}
        <div>
          <h2
            style={{
              fontFamily: DISPLAY,
              fontWeight: 300,
              fontSize: "clamp(34px, 4.4vw, 56px)",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              color: INK,
              margin: 0,
            }}
          >
            How it works.
          </h2>

          <ol
            style={{
              listStyle: "none",
              padding: 0,
              margin: "36px 0 0",
              display: "flex",
              flexDirection: "column",
              gap: 24,
              counterReset: "step",
            }}
          >
            {[
              "Tell us your vision.",
              "AI finds, drafts, and negotiates.",
              "You approve with one tap.",
            ].map((step, i) => (
              <li
                key={step}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 18,
                  fontFamily: DISPLAY,
                  fontWeight: 300,
                  fontSize: "clamp(20px, 2vw, 26px)",
                  lineHeight: 1.3,
                  color: INK,
                  letterSpacing: "-0.005em",
                }}
              >
                <span
                  style={{
                    flexShrink: 0,
                    fontFamily: MONO,
                    fontSize: 11,
                    letterSpacing: "0.26em",
                    color: SAGE_DEEP,
                    minWidth: 22,
                  }}
                >
                  0{i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Right. the simplified decision card. */}
        <DecisionCard />
      </div>

      <style jsx>{`
        @media (max-width: 900px) {
          .moment-grid {
            grid-template-columns: 1fr !important;
            gap: 48px !important;
          }
        }
      `}</style>
    </section>
  );
}

function DecisionCard() {
  return (
    <div style={{ position: "relative", width: "100%", maxWidth: 520, justifySelf: "center" }}>
      {/* Stacked card behind for depth */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: -16,
          background: PAPER,
          borderRadius: 28,
          border: `1px solid ${HAIRLINE}`,
          opacity: 0.5,
          transform: "rotate(-1.4deg) translateY(20px)",
          zIndex: 0,
        }}
      />

      {/* Live card. stripped to the bone — headline + three buttons. */}
      <article
        style={{
          position: "relative",
          background: PAPER,
          borderRadius: 28,
          border: `1px solid ${HAIRLINE}`,
          padding: 28,
          boxShadow:
            "0 30px 60px -28px rgba(14,15,13,0.18), 0 8px 22px -8px rgba(110,128,104,0.12)",
          zIndex: 1,
        }}
      >
        {/* Headline */}
        <h3
          style={{
            fontFamily: DISPLAY,
            fontWeight: 300,
            fontSize: 28,
            lineHeight: 1.15,
            letterSpacing: "-0.012em",
            color: INK,
            margin: 0,
          }}
        >
          Tre Posti revised the contract.
        </h3>

        {/* Hairline */}
        <div
          aria-hidden
          style={{
            margin: "24px 0",
            height: 1,
            background: HAIRLINE,
          }}
        />

        {/* Actions. three clear, decisive buttons */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto auto",
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={(e) => e.preventDefault()}
            style={{
              padding: "14px 22px",
              borderRadius: 999,
              background: CTA_BG,
              color: IVORY,
              fontFamily: MONO,
              fontSize: 11,
              letterSpacing: "0.26em",
              textTransform: "uppercase",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.22), 0 12px 26px -10px rgba(79,93,68,0.50)",
              transition: "background 200ms, transform 200ms",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = CTA_BG_HOVER;
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = CTA_BG;
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            Approve
          </button>
          <button
            type="button"
            onClick={(e) => e.preventDefault()}
            style={{
              padding: "14px 18px",
              borderRadius: 999,
              background: PAPER,
              color: INK,
              fontFamily: MONO,
              fontSize: 11,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              fontWeight: 500,
              border: `1px solid ${HAIRLINE}`,
              cursor: "pointer",
              transition: "border-color 200ms, color 200ms",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = INK;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = HAIRLINE;
            }}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={(e) => e.preventDefault()}
            style={{
              padding: "14px 14px",
              borderRadius: 999,
              background: "transparent",
              color: INK_FAINT,
              fontFamily: MONO,
              fontSize: 11,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
              transition: "color 200ms",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = INK;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = INK_FAINT;
            }}
          >
            Pass
          </button>
        </div>
      </article>
    </div>
  );
}

// =====================================================================
// FOOTER
// =====================================================================

function Footer() {
  return (
    <footer
      className="landing-footer"
      style={{
        background: PAPER,
        borderTop: `1px solid ${HAIRLINE}`,
        padding: "44px clamp(28px, 5vw, 80px)",
      }}
    >
      <div
        style={{
          maxWidth: 1320,
          margin: "0 auto",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/api/brand/logo"
          alt="Corsia"
          style={{ height: 22, width: "auto", display: "block" }}
        />
        <span
          style={{
            fontFamily: MONO,
            fontSize: 10.5,
            letterSpacing: "0.30em",
            textTransform: "uppercase",
            color: INK_FAINT,
          }}
        >
          Plan less · Decide better
        </span>
        <a
          href="mailto:hello@corsia.com"
          style={{
            fontFamily: MONO,
            fontSize: 10.5,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: INK_FAINT,
            textDecoration: "none",
            transition: "color 200ms",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = INK)}
          onMouseLeave={(e) => (e.currentTarget.style.color = INK_FAINT)}
        >
          hello@corsia.com
        </a>
      </div>
    </footer>
  );
}
