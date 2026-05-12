"use client";

// DossierBuilder. the interactive, visual replacement for the boring
// BriefForm. Dark, rich background; sage + cream accents; one focused
// stage at a time. Designed to feel like a luxury quiz, not a form.

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useProject } from "./StateProvider";
import type { CulturalTradition, ProjectState } from "@/lib/types";

type Stage =
  | "names"
  | "place"
  | "when"
  | "size"
  | "vibe"
  | "scale"
  | "tradition"
  | "review";

const STAGES: Stage[] = [
  "names", "place", "when", "size", "vibe", "scale", "tradition", "review",
];

// ---------- Palette ----------
const INK = "#0F0E0B";
const PAPER = "#FAF7EE";
const CREAM = "#F0E9D8";
const SAGE = "#A8B5A0";
const SAGE_DEEP = "#6E8068";
const GOLD = "#B89968";
const MUTED = "rgba(248,246,241,0.55)";
const FAINT = "rgba(248,246,241,0.40)";
const HAIRLINE = "rgba(248,246,241,0.14)";

const DISPLAY = '"Cormorant Garamond", "EB Garamond", Georgia, serif';
const SANS = '"Helvetica Neue", Helvetica, Arial, sans-serif';

// ---------- Stage data ----------

const MONTHS = [
  { idx: 1,  name: "January",   season: "winter", hint: "candles, cedar, fireside" },
  { idx: 2,  name: "February",  season: "winter", hint: "fireside, intimate, citrus" },
  { idx: 3,  name: "March",     season: "spring", hint: "tulips, soft air" },
  { idx: 4,  name: "April",     season: "spring", hint: "blossom, lengthening light" },
  { idx: 5,  name: "May",       season: "spring", hint: "garden roses, long evenings" },
  { idx: 6,  name: "June",      season: "summer", hint: "peonies, full sun" },
  { idx: 7,  name: "July",      season: "summer", hint: "heatwave, late dinner" },
  { idx: 8,  name: "August",    season: "summer", hint: "sunflowers, warm nights" },
  { idx: 9,  name: "September", season: "autumn", hint: "golden light, dahlias" },
  { idx: 10, name: "October",   season: "autumn", hint: "foliage, candlelit, bourbon" },
  { idx: 11, name: "November",  season: "autumn", hint: "amber, mulled wine" },
  { idx: 12, name: "December",  season: "winter", hint: "evergreen, gold, snow" },
];

const REGIONS = [
  { key: "anywhere",  label: "Anywhere",       blurb: "Open to suggestions" },
  { key: "europe",    label: "Europe",         blurb: "Tuscany, Provence, the Cotswolds" },
  { key: "north_am",  label: "North America",  blurb: "Hudson Valley, Napa, Charleston" },
  { key: "carib",     label: "Caribbean & Mexico", blurb: "Tulum, Riviera Maya" },
  { key: "south_am",  label: "South America",  blurb: "Patagonia, Cartagena, Lima" },
  { key: "asia",      label: "Asia & Pacific", blurb: "Bali, Kyoto, Marrakech-of-the-East" },
  { key: "africa",    label: "Africa",         blurb: "Cape Town, Marrakech, the Serengeti" },
] as const;

const GUEST_SIZES = [
  { count: 30,  label: "Intimate",  blurb: "Just the people you'd call at 3 a.m." },
  { count: 60,  label: "Small",     blurb: "A long table you can see across" },
  { count: 100, label: "Mid",       blurb: "The classic full-room scale" },
  { count: 150, label: "Full",      blurb: "Everyone who matters and their plus-one" },
  { count: 220, label: "Grand",     blurb: "All of them. The whole village." },
];

const VIBES = [
  { key: "candlelit_editorial", label: "Candlelit editorial",  hint: "Moody, romantic, dark florals, taper candles" },
  { key: "garden_party",        label: "Garden party",         hint: "Wildflowers, white linen, daylight" },
  { key: "coastal_villa",       label: "Coastal villa",        hint: "Olive branches, citrus, sea air" },
  { key: "barn_rustic",         label: "Barn rustic",          hint: "String lights, long tables, dancing on hay" },
  { key: "modern_minimal",      label: "Modern minimal",       hint: "Clean lines, sculpture, single statement floral" },
  { key: "black_tie",           label: "Black tie",            hint: "Ballroom, taffeta, a string quartet" },
  { key: "mountain_lodge",      label: "Mountain lodge",       hint: "Pine, plaid, fire pits, hot toddies" },
  { key: "bohemian",            label: "Bohemian",             hint: "Pampas, kilims, low seating, mismatched glassware" },
];

const SCALES = [
  { budget: 35000,  label: "Considered",  blurb: "$35–50k. Beautiful, careful, focused." },
  { budget: 75000,  label: "Generous",    blurb: "$50–100k. The classic full-spread wedding." },
  { budget: 150000, label: "Lavish",      blurb: "$100–200k. Champagne, oysters, no shortcuts." },
  { budget: 300000, label: "Limitless",   blurb: "$200k+. Whatever it takes. We've seen it." },
];

const CULTURES: { key: CulturalTradition; label: string }[] = [
  { key: "secular",    label: "Secular" },
  { key: "catholic",   label: "Catholic" },
  { key: "jewish",     label: "Jewish" },
  { key: "hindu",      label: "Hindu" },
  { key: "muslim",     label: "Muslim" },
  { key: "interfaith", label: "Interfaith" },
  { key: "civil",      label: "Civil" },
  { key: "other",      label: "Other" },
];

const FORMALITIES = [
  { key: "casual",  label: "Casual",  blurb: "Linen suits, sneakers welcome" },
  { key: "warm",    label: "Warm",    blurb: "Jackets, no ties, candles on every table" },
  { key: "modern",  label: "Modern",  blurb: "Suits, dresses, cocktail attire" },
  { key: "formal",  label: "Formal",  blurb: "Black tie. The full register." },
] as const;

// ---------- Main ----------

export function DossierBuilder() {
  const router = useRouter();
  const { state, setState, loading } = useProject();

  // All seven required brief fields, derived as we go.
  const [organizerName, setOrganizerName] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [regionKey, setRegionKey] = useState<string | null>(null);
  const [regionFree, setRegionFree] = useState("");
  const [monthIdx, setMonthIdx] = useState<number | null>(null);
  const [year, setYear] = useState<number>(new Date().getFullYear() + 1);
  const [guestCount, setGuestCount] = useState<number | null>(null);
  const [vibeKey, setVibeKey] = useState<string | null>(null);
  const [vibeFree, setVibeFree] = useState("");
  const [budgetUsd, setBudgetUsd] = useState<number | null>(null);
  const [cultural, setCultural] = useState<CulturalTradition>("secular");
  const [formality, setFormality] =
    useState<"formal" | "modern" | "warm" | "casual">("modern");
  const [destination, setDestination] = useState(false);

  const [stage, setStage] = useState<Stage>("names");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hydrate from an existing brief if we're editing.
  useEffect(() => {
    const b = state?.brief;
    if (!b) return;
    setOrganizerName(b.organizerName);
    setPartnerName(b.partnerName);
    setRegionFree(b.region);
    setGuestCount(b.guestCount || null);
    setBudgetUsd(b.budgetUsd || null);
    setVibeFree(b.vibe);
    setCultural(b.cultural ?? "secular");
    setFormality(b.formalityTone ?? "modern");
    setDestination(b.destination ?? false);
    // Try to parse a month from dateWindow.
    const m = b.dateWindow.match(/(\d{4})-(\d{2})/);
    if (m) {
      setYear(Number(m[1]));
      setMonthIdx(Number(m[2]));
    } else {
      for (const mo of MONTHS) {
        if (b.dateWindow.toLowerCase().includes(mo.name.toLowerCase())) {
          setMonthIdx(mo.idx);
          const yearMatch = b.dateWindow.match(/20\d{2}/);
          if (yearMatch) setYear(Number(yearMatch[0]));
          break;
        }
      }
    }
  }, [state?.brief]);

  // Derived values. must run UNCONDITIONALLY (hooks first, early
  // returns after) so React's hook count is stable across renders.
  const dateWindow = useMemo(() => {
    if (!monthIdx) return "";
    const mm = String(monthIdx).padStart(2, "0");
    return `${year}-${mm}-15`;
  }, [monthIdx, year]);

  const region = regionFree || (regionKey
    ? REGIONS.find((r) => r.key === regionKey)?.label ?? ""
    : "");

  const vibe = vibeFree
    ? vibeFree
    : vibeKey
    ? VIBES.find((v) => v.key === vibeKey)?.label + ". " + VIBES.find((v) => v.key === vibeKey)?.hint
    : "";

  if (loading || !state) {
    return (
      <div
        style={{ background: INK, minHeight: "100vh" }}
        className="flex items-center justify-center"
      >
        <p style={{ color: MUTED, fontFamily: SANS, fontSize: 12, letterSpacing: "0.2em" }}>
          loading…
        </p>
      </div>
    );
  }

  const canAdvance: Record<Stage, boolean> = {
    names:    organizerName.trim().length > 0 && partnerName.trim().length > 0,
    place:    region.trim().length > 0,
    when:     monthIdx !== null,
    size:     guestCount !== null && guestCount > 0,
    vibe:     vibe.trim().length > 0,
    scale:    budgetUsd !== null && budgetUsd > 0,
    tradition: true,
    review:   true,
  };

  const goNext = () => {
    const i = STAGES.indexOf(stage);
    if (i < STAGES.length - 1) setStage(STAGES[i + 1]);
  };
  const goBack = () => {
    const i = STAGES.indexOf(stage);
    if (i > 0) setStage(STAGES[i - 1]);
  };

  const seal = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/brief", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          organizerName,
          partnerName,
          dateWindow,
          region,
          guestCount: guestCount ?? 100,
          budgetUsd: budgetUsd ?? 75000,
          vibe,
          plannerStatus: "want_one",
          cultural,
          formalityTone: formality,
          destination,
          weddingDate: dateWindow,
          lock: true,
        }),
      });
      const j = (await r.json()) as { state?: ProjectState; error?: string };
      if (!r.ok) {
        setError(j.error ?? `Error ${r.status}`);
        return;
      }
      if (j.state) setState(j.state);
      router.push("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const stageIdx = STAGES.indexOf(stage);

  return (
    <div
      style={{
        background: `radial-gradient(ellipse 90% 80% at 50% 0%, #1a1814 0%, ${INK} 60%)`,
        minHeight: "100vh",
        color: PAPER,
        fontFamily: SANS,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle film grain */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.05,
          pointerEvents: "none",
          mixBlendMode: "screen",
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.5 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")",
          backgroundSize: "220px 220px",
        }}
      />

      {/* Page chrome */}
      <div
        style={{
          position: "relative",
          maxWidth: 780,
          margin: "0 auto",
          padding: "56px 28px 140px",
        }}
      >
        {/* Top bar */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 56,
          }}
        >
          <p
            style={{
              fontFamily: SANS,
              fontSize: 11,
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              color: GOLD,
              margin: 0,
            }}
          >
            Your dossier
          </p>
          <p
            style={{
              fontFamily: SANS,
              fontSize: 11,
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              color: FAINT,
              margin: 0,
            }}
          >
            Step {stageIdx + 1} of {STAGES.length}
          </p>
        </header>

        {/* Progress rail */}
        <div
          style={{
            display: "flex",
            gap: 6,
            marginBottom: 64,
          }}
        >
          {STAGES.map((s, i) => (
            <span
              key={s}
              style={{
                flex: 1,
                height: 2,
                background:
                  i < stageIdx
                    ? SAGE_DEEP
                    : i === stageIdx
                    ? GOLD
                    : HAIRLINE,
                transition: "background 600ms",
              }}
            />
          ))}
        </div>

        {/* Stage content */}
        <main key={stage} className="dossier-stage-fade">
          {stage === "names" && (
            <NamesStage
              organizerName={organizerName}
              partnerName={partnerName}
              setOrganizerName={setOrganizerName}
              setPartnerName={setPartnerName}
            />
          )}
          {stage === "place" && (
            <PlaceStage
              regionKey={regionKey}
              regionFree={regionFree}
              setRegionKey={setRegionKey}
              setRegionFree={setRegionFree}
              destination={destination}
              setDestination={setDestination}
            />
          )}
          {stage === "when" && (
            <WhenStage
              monthIdx={monthIdx}
              year={year}
              setMonthIdx={setMonthIdx}
              setYear={setYear}
            />
          )}
          {stage === "size" && (
            <SizeStage
              guestCount={guestCount}
              setGuestCount={setGuestCount}
            />
          )}
          {stage === "vibe" && (
            <VibeStage
              vibeKey={vibeKey}
              vibeFree={vibeFree}
              setVibeKey={setVibeKey}
              setVibeFree={setVibeFree}
            />
          )}
          {stage === "scale" && (
            <ScaleStage
              budgetUsd={budgetUsd}
              setBudgetUsd={setBudgetUsd}
            />
          )}
          {stage === "tradition" && (
            <TraditionStage
              cultural={cultural}
              setCultural={setCultural}
              formality={formality}
              setFormality={setFormality}
            />
          )}
          {stage === "review" && (
            <ReviewStage
              organizerName={organizerName}
              partnerName={partnerName}
              region={region}
              dateWindow={dateWindow}
              monthName={monthIdx ? MONTHS[monthIdx - 1].name : ""}
              year={year}
              guestCount={guestCount}
              vibe={vibe}
              budgetUsd={budgetUsd}
              cultural={cultural}
              formality={formality}
              destination={destination}
            />
          )}
        </main>

        {/* Error */}
        {error && (
          <p
            style={{
              marginTop: 24,
              fontFamily: SANS,
              fontSize: 12,
              color: "#E8AFA9",
              textAlign: "center",
            }}
          >
            {error}
          </p>
        )}

        {/* Footer nav */}
        <footer
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            background: `linear-gradient(180deg, transparent 0%, rgba(15,14,11,0.85) 30%, ${INK} 100%)`,
            padding: "32px 28px 32px",
            zIndex: 10,
          }}
        >
          <div
            style={{
              maxWidth: 780,
              margin: "0 auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <button
              type="button"
              onClick={goBack}
              disabled={stageIdx === 0 || busy}
              style={{
                fontFamily: SANS,
                fontSize: 13,
                color: stageIdx === 0 ? "rgba(248,246,241,0.20)" : MUTED,
                background: "transparent",
                border: "none",
                padding: "12px 4px",
                cursor: stageIdx === 0 ? "default" : "pointer",
              }}
            >
              ← Back
            </button>

            {stage !== "review" ? (
              <button
                type="button"
                onClick={goNext}
                disabled={!canAdvance[stage]}
                style={{
                  fontFamily: SANS,
                  fontSize: 13,
                  fontWeight: 500,
                  padding: "14px 32px",
                  background: canAdvance[stage] ? CREAM : "rgba(248,246,241,0.15)",
                  color: canAdvance[stage] ? INK : FAINT,
                  border: "none",
                  borderRadius: 999,
                  cursor: canAdvance[stage] ? "pointer" : "not-allowed",
                  transition: "background 200ms, transform 200ms",
                  letterSpacing: "0.04em",
                }}
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void seal()}
                disabled={busy}
                style={{
                  fontFamily: SANS,
                  fontSize: 13,
                  fontWeight: 500,
                  padding: "14px 36px",
                  background: SAGE_DEEP,
                  color: PAPER,
                  border: "none",
                  borderRadius: 999,
                  cursor: busy ? "wait" : "pointer",
                  boxShadow: "0 12px 28px -10px rgba(110,128,104,0.55)",
                  letterSpacing: "0.04em",
                }}
              >
                {busy ? "Sealing…" : "Seal the dossier"}
              </button>
            )}
          </div>
        </footer>
      </div>

      <style jsx>{`
        @keyframes dossier-fade {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .dossier-stage-fade {
          animation: dossier-fade 420ms ease-out both;
        }
      `}</style>
    </div>
  );
}

// ============================================================
// STAGES
// ============================================================

function StageHeader({ eyebrow, title }: { eyebrow: string; title: string | React.ReactNode }) {
  return (
    <div style={{ marginBottom: 44 }}>
      <p
        style={{
          fontFamily: SANS,
          fontSize: 11,
          letterSpacing: "0.32em",
          textTransform: "uppercase",
          color: SAGE,
          margin: 0,
          marginBottom: 18,
        }}
      >
        {eyebrow}
      </p>
      <h1
        style={{
          fontFamily: DISPLAY,
          fontWeight: 300,
          fontSize: "clamp(36px, 5vw, 56px)",
          lineHeight: 1.05,
          letterSpacing: "-0.015em",
          color: PAPER,
          margin: 0,
        }}
      >
        {title}
      </h1>
    </div>
  );
}

function NamesStage(props: {
  organizerName: string;
  partnerName: string;
  setOrganizerName: (s: string) => void;
  setPartnerName: (s: string) => void;
}) {
  return (
    <div>
      <StageHeader eyebrow="01 · The couple" title={<>What are <span style={{ fontStyle: "italic", color: SAGE }}>your names</span>?</>} />
      <div style={{ display: "grid", gap: 20 }}>
        <DarkInput
          label="You"
          value={props.organizerName}
          onChange={props.setOrganizerName}
          placeholder="First name"
          autoFocus
        />
        <DarkInput
          label="Your partner"
          value={props.partnerName}
          onChange={props.setPartnerName}
          placeholder="First name"
        />
      </div>
    </div>
  );
}

function PlaceStage(props: {
  regionKey: string | null;
  regionFree: string;
  setRegionKey: (s: string | null) => void;
  setRegionFree: (s: string) => void;
  destination: boolean;
  setDestination: (b: boolean) => void;
}) {
  return (
    <div>
      <StageHeader eyebrow="02 · The place" title={<>Where in the <span style={{ fontStyle: "italic", color: SAGE }}>world</span>?</>} />
      <div style={{ marginBottom: 28 }}>
        <DarkInput
          label="A specific place"
          value={props.regionFree}
          onChange={(v) => { props.setRegionFree(v); if (v) props.setRegionKey(null); }}
          placeholder="Hudson Valley · Tuscany · Cape Town"
        />
      </div>
      <p
        style={{
          fontFamily: SANS,
          fontSize: 11,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: FAINT,
          margin: "0 0 16px",
        }}
      >
        Or a region we'll narrow with you
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {REGIONS.map((r) => (
          <Chip
            key={r.key}
            selected={props.regionKey === r.key && !props.regionFree}
            onClick={() => {
              props.setRegionKey(r.key);
              props.setRegionFree(r.label);
            }}
          >
            {r.label}
          </Chip>
        ))}
      </div>
      <label
        style={{
          marginTop: 32,
          display: "inline-flex",
          alignItems: "center",
          gap: 12,
          cursor: "pointer",
          fontFamily: SANS,
          fontSize: 13,
          color: MUTED,
        }}
      >
        <input
          type="checkbox"
          checked={props.destination}
          onChange={(e) => props.setDestination(e.target.checked)}
          style={{ width: 18, height: 18, accentColor: SAGE_DEEP }}
        />
        Destination wedding (changes save-the-date timing)
      </label>
    </div>
  );
}

function WhenStage(props: {
  monthIdx: number | null;
  year: number;
  setMonthIdx: (i: number) => void;
  setYear: (y: number) => void;
}) {
  const currentYear = new Date().getFullYear();
  return (
    <div>
      <StageHeader eyebrow="03 · The when" title={<>Which <span style={{ fontStyle: "italic", color: SAGE }}>month</span>?</>} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 10,
          marginBottom: 32,
        }}
        className="month-grid"
      >
        {MONTHS.map((m) => {
          const sel = props.monthIdx === m.idx;
          return (
            <button
              key={m.idx}
              type="button"
              onClick={() => props.setMonthIdx(m.idx)}
              style={{
                background: sel ? CREAM : "rgba(248,246,241,0.04)",
                color: sel ? INK : PAPER,
                border: `1px solid ${sel ? CREAM : HAIRLINE}`,
                borderRadius: 14,
                padding: "18px 12px",
                textAlign: "left",
                cursor: "pointer",
                transition: "background 200ms, transform 200ms, border-color 200ms",
                fontFamily: SANS,
              }}
            >
              <div
                style={{
                  fontFamily: DISPLAY,
                  fontStyle: "italic",
                  fontSize: 22,
                  fontWeight: 400,
                  letterSpacing: "-0.01em",
                  marginBottom: 4,
                }}
              >
                {m.name}
              </div>
              <div
                style={{
                  fontFamily: SANS,
                  fontSize: 10.5,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: sel ? "rgba(15,14,11,0.55)" : FAINT,
                }}
              >
                {m.season}
              </div>
            </button>
          );
        })}
      </div>

      <p
        style={{
          fontFamily: SANS,
          fontSize: 11,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: FAINT,
          margin: "0 0 12px",
        }}
      >
        Year
      </p>
      <div style={{ display: "flex", gap: 8 }}>
        {[currentYear, currentYear + 1, currentYear + 2, currentYear + 3].map((y) => (
          <Chip
            key={y}
            selected={props.year === y}
            onClick={() => props.setYear(y)}
          >
            {y}
          </Chip>
        ))}
      </div>

      <style jsx>{`
        @media (max-width: 560px) {
          .month-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </div>
  );
}

function SizeStage(props: {
  guestCount: number | null;
  setGuestCount: (n: number) => void;
}) {
  return (
    <div>
      <StageHeader eyebrow="04 · The scale" title={<>How <span style={{ fontStyle: "italic", color: SAGE }}>many</span>?</>} />
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {GUEST_SIZES.map((g) => {
          const sel = props.guestCount === g.count;
          return (
            <button
              key={g.count}
              type="button"
              onClick={() => props.setGuestCount(g.count)}
              style={{
                background: sel ? CREAM : "rgba(248,246,241,0.04)",
                color: sel ? INK : PAPER,
                border: `1px solid ${sel ? CREAM : HAIRLINE}`,
                borderRadius: 16,
                padding: "20px 24px",
                textAlign: "left",
                cursor: "pointer",
                transition: "background 200ms, border-color 200ms",
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                gap: 16,
                fontFamily: SANS,
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: DISPLAY,
                    fontStyle: "italic",
                    fontSize: 26,
                    fontWeight: 400,
                  }}
                >
                  {g.label}
                </div>
                <div
                  style={{
                    fontFamily: SANS,
                    fontSize: 13,
                    color: sel ? "rgba(15,14,11,0.65)" : MUTED,
                    marginTop: 2,
                  }}
                >
                  {g.blurb}
                </div>
              </div>
              <div
                style={{
                  fontFamily: DISPLAY,
                  fontSize: 38,
                  letterSpacing: "-0.02em",
                  color: sel ? SAGE_DEEP : FAINT,
                  flexShrink: 0,
                }}
              >
                {g.count}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function VibeStage(props: {
  vibeKey: string | null;
  vibeFree: string;
  setVibeKey: (s: string | null) => void;
  setVibeFree: (s: string) => void;
}) {
  return (
    <div>
      <StageHeader eyebrow="05 · The feeling" title={<>What's the <span style={{ fontStyle: "italic", color: SAGE }}>feeling</span>?</>} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 10,
          marginBottom: 28,
        }}
        className="vibe-grid"
      >
        {VIBES.map((v) => {
          const sel = props.vibeKey === v.key;
          return (
            <button
              key={v.key}
              type="button"
              onClick={() => {
                props.setVibeKey(v.key);
                props.setVibeFree("");
              }}
              style={{
                background: sel ? CREAM : "rgba(248,246,241,0.04)",
                color: sel ? INK : PAPER,
                border: `1px solid ${sel ? CREAM : HAIRLINE}`,
                borderRadius: 14,
                padding: "18px 18px",
                textAlign: "left",
                cursor: "pointer",
                transition: "background 200ms, border-color 200ms",
                fontFamily: SANS,
              }}
            >
              <div
                style={{
                  fontFamily: DISPLAY,
                  fontStyle: "italic",
                  fontSize: 20,
                  fontWeight: 400,
                  marginBottom: 6,
                }}
              >
                {v.label}
              </div>
              <div
                style={{
                  fontFamily: SANS,
                  fontSize: 12,
                  color: sel ? "rgba(15,14,11,0.60)" : MUTED,
                  lineHeight: 1.4,
                }}
              >
                {v.hint}
              </div>
            </button>
          );
        })}
      </div>
      <p
        style={{
          fontFamily: SANS,
          fontSize: 11,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: FAINT,
          margin: "0 0 12px",
        }}
      >
        Or describe it your way
      </p>
      <DarkInput
        label=""
        value={props.vibeFree}
        onChange={(v) => { props.setVibeFree(v); if (v) props.setVibeKey(null); }}
        placeholder="Something we can't pin down. Try us."
        multiline
      />

      <style jsx>{`
        @media (max-width: 560px) {
          .vibe-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function ScaleStage(props: {
  budgetUsd: number | null;
  setBudgetUsd: (n: number) => void;
}) {
  return (
    <div>
      <StageHeader eyebrow="06 · The envelope" title={<>What's the <span style={{ fontStyle: "italic", color: SAGE }}>scale</span>?</>} />
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {SCALES.map((s) => {
          const sel = props.budgetUsd === s.budget;
          return (
            <button
              key={s.label}
              type="button"
              onClick={() => props.setBudgetUsd(s.budget)}
              style={{
                background: sel ? CREAM : "rgba(248,246,241,0.04)",
                color: sel ? INK : PAPER,
                border: `1px solid ${sel ? CREAM : HAIRLINE}`,
                borderRadius: 16,
                padding: "20px 24px",
                textAlign: "left",
                cursor: "pointer",
                transition: "background 200ms, border-color 200ms",
                fontFamily: SANS,
              }}
            >
              <div
                style={{
                  fontFamily: DISPLAY,
                  fontStyle: "italic",
                  fontSize: 24,
                  fontWeight: 400,
                }}
              >
                {s.label}
              </div>
              <div
                style={{
                  fontFamily: SANS,
                  fontSize: 13,
                  color: sel ? "rgba(15,14,11,0.65)" : MUTED,
                  marginTop: 4,
                }}
              >
                {s.blurb}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TraditionStage(props: {
  cultural: CulturalTradition;
  setCultural: (c: CulturalTradition) => void;
  formality: "formal" | "modern" | "warm" | "casual";
  setFormality: (f: "formal" | "modern" | "warm" | "casual") => void;
}) {
  return (
    <div>
      <StageHeader eyebrow="07 · The register" title={<>Any <span style={{ fontStyle: "italic", color: SAGE }}>tradition</span> to honor?</>} />
      <p
        style={{
          fontFamily: SANS,
          fontSize: 11,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: FAINT,
          margin: "0 0 14px",
        }}
      >
        Cultural or religious
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 36 }}>
        {CULTURES.map((c) => (
          <Chip
            key={c.key}
            selected={props.cultural === c.key}
            onClick={() => props.setCultural(c.key)}
          >
            {c.label}
          </Chip>
        ))}
      </div>

      <p
        style={{
          fontFamily: SANS,
          fontSize: 11,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: FAINT,
          margin: "0 0 14px",
        }}
      >
        Formality
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
        {FORMALITIES.map((f) => {
          const sel = props.formality === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => props.setFormality(f.key)}
              style={{
                background: sel ? CREAM : "rgba(248,246,241,0.04)",
                color: sel ? INK : PAPER,
                border: `1px solid ${sel ? CREAM : HAIRLINE}`,
                borderRadius: 14,
                padding: "16px 18px",
                textAlign: "left",
                cursor: "pointer",
                transition: "background 200ms, border-color 200ms",
                fontFamily: SANS,
              }}
            >
              <div style={{ fontFamily: DISPLAY, fontStyle: "italic", fontSize: 18, marginBottom: 4 }}>
                {f.label}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: sel ? "rgba(15,14,11,0.55)" : MUTED,
                }}
              >
                {f.blurb}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ReviewStage(props: {
  organizerName: string;
  partnerName: string;
  region: string;
  dateWindow: string;
  monthName: string;
  year: number;
  guestCount: number | null;
  vibe: string;
  budgetUsd: number | null;
  cultural: CulturalTradition;
  formality: string;
  destination: boolean;
}) {
  const fmtBudget = (n: number | null) =>
    n ? `$${(n / 1000).toFixed(0)}k` : ", ";
  return (
    <div>
      <StageHeader eyebrow="Final · Your dossier" title={<>One <span style={{ fontStyle: "italic", color: SAGE }}>last look</span>.</>} />

      <div
        style={{
          border: `1px solid ${HAIRLINE}`,
          borderRadius: 18,
          background: "rgba(248,246,241,0.03)",
          padding: 32,
        }}
      >
        <Row label="Couple"     value={`${props.organizerName} & ${props.partnerName}`} />
        <Row label="When"       value={props.monthName ? `${props.monthName} ${props.year}` : ", "} />
        <Row label="Where"      value={props.region || ", "} />
        <Row label="Guests"     value={props.guestCount ? String(props.guestCount) : ", "} />
        <Row label="Vibe"       value={props.vibe || ", "} multiline />
        <Row label="Envelope"   value={fmtBudget(props.budgetUsd)} />
        <Row label="Tradition"  value={`${props.cultural} · ${props.formality}${props.destination ? " · destination" : ""}`} />
      </div>

      <p
        style={{
          marginTop: 28,
          fontFamily: SANS,
          fontSize: 13,
          lineHeight: 1.55,
          color: MUTED,
          textAlign: "center",
          maxWidth: 540,
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        Sealing the dossier releases your team. Scout starts on venues and photographers within the hour. You can change any field later, and Maestro picks up where it makes sense.
      </p>
    </div>
  );
}

// ============================================================
// ATOMS
// ============================================================

function DarkInput(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <label style={{ display: "block" }}>
      {props.label && (
        <span
          style={{
            display: "block",
            fontFamily: SANS,
            fontSize: 11,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: FAINT,
            marginBottom: 10,
          }}
        >
          {props.label}
        </span>
      )}
      {props.multiline ? (
        <textarea
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          placeholder={props.placeholder}
          rows={3}
          style={inputStyle}
        />
      ) : (
        <input
          type="text"
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          placeholder={props.placeholder}
          autoFocus={props.autoFocus}
          style={inputStyle}
        />
      )}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  fontFamily: DISPLAY,
  fontStyle: "italic",
  fontWeight: 300,
  fontSize: 22,
  letterSpacing: "-0.005em",
  color: PAPER,
  background: "rgba(248,246,241,0.04)",
  border: `1px solid ${HAIRLINE}`,
  borderRadius: 14,
  padding: "16px 20px",
  outline: "none",
  resize: "none",
};

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontFamily: SANS,
        fontSize: 13,
        padding: "10px 18px",
        border: `1px solid ${selected ? CREAM : HAIRLINE}`,
        background: selected ? CREAM : "transparent",
        color: selected ? INK : PAPER,
        borderRadius: 999,
        cursor: "pointer",
        transition: "background 200ms, border-color 200ms, color 200ms",
        letterSpacing: "0.02em",
      }}
    >
      {children}
    </button>
  );
}

function Row({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "120px 1fr",
        gap: 24,
        padding: "14px 0",
        borderBottom: `1px solid ${HAIRLINE}`,
        alignItems: multiline ? "flex-start" : "baseline",
      }}
    >
      <span
        style={{
          fontFamily: SANS,
          fontSize: 11,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: FAINT,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: DISPLAY,
          fontStyle: "italic",
          fontSize: 18,
          fontWeight: 300,
          color: PAPER,
          letterSpacing: "-0.005em",
          lineHeight: 1.45,
        }}
      >
        {value}
      </span>
    </div>
  );
}
