// Six vibes. Each one is a complete, single-prop-deep theme that
// re-skins the public site. palette, typography, hero composition,
// card shape, button shape, gallery layout, copy tone.

export type VibeId =
  | "amalfi-editorial"
  | "cinematic-dark"
  | "soft-modernist"
  | "garden-party"
  | "seaside-minimal"
  | "brutalist-editorial";

export interface Vibe {
  id: VibeId;
  label: string;
  blurb: string;
  palette: {
    /** Page background */
    bg: string;
    /** Secondary surface. cards, accordion bodies */
    surface: string;
    /** Primary type colour */
    ink: string;
    /** Subdued type */
    inkSoft: string;
    /** Faded type */
    inkFaint: string;
    /** Brand accent. used sparingly on CTAs, dots, dividers */
    accent: string;
    /** Accent at lower alpha for halos */
    accentSoft: string;
    /** Hairline rule */
    hairline: string;
    /** Optional second accent for two-tone visuals */
    accent2?: string;
  };
  fonts: {
    display: string;
    body: string;
    mono: string;
  };
  hero: {
    /** Full CSS background value. gradient meshes welcomed */
    background: string;
    /** Text colour for hero copy */
    foreground: string;
    /** Whether the date typography is set in roman numerals */
    romanDate: boolean;
    /** Tagline layout. center stacked, left aligned, justified */
    layout: "centered" | "left" | "justified";
  };
  card: {
    radius: number;
    border: string;
    shadow: string;
  };
  button: {
    radius: number;
    style: "pill" | "square" | "underline";
  };
  gallery: {
    /** Grid composition */
    style: "warm-masonry" | "dark-masonry" | "minimal-grid" | "floral-masonry" | "vertical-strip" | "magazine-grid";
    /** Overlay tone on AI badges and captions */
    overlayTone: "warm" | "cool" | "neutral";
  };
  voice: {
    /** Adjective set used by the AI Concierge tone and the auto-drafted
     *  story / FAQ copy. */
    descriptors: string[];
    /** Suggested concierge opener */
    conciergeGreeting: string;
  };
}

export const VIBES: Record<VibeId, Vibe> = {
  "amalfi-editorial": {
    id: "amalfi-editorial",
    label: "Amalfi editorial",
    blurb: "Sun-bleached terracotta. Italiana display. Lemon-grove warmth.",
    palette: {
      bg: "#F4ECDD",
      surface: "#FBF5E9",
      ink: "#2A1A12",
      inkSoft: "rgba(42,26,18,0.66)",
      inkFaint: "rgba(42,26,18,0.40)",
      accent: "#B05323",
      accentSoft: "rgba(176,83,35,0.16)",
      hairline: "rgba(42,26,18,0.14)",
      accent2: "#D9A455",
    },
    fonts: {
      display: '"Italiana", "Cormorant Garamond", Georgia, serif',
      body: '"Cardo", "EB Garamond", Georgia, serif',
      mono: '"JetBrains Mono", ui-monospace, monospace',
    },
    hero: {
      background:
        "radial-gradient(ellipse 80% 60% at 25% 30%, #F8C677 0%, transparent 55%), " +
        "radial-gradient(ellipse 60% 50% at 80% 70%, #E48A4A 0%, transparent 50%), " +
        "linear-gradient(170deg, #F4ECDD 0%, #E8C9A4 70%, #D9925A 100%)",
      foreground: "#2A1A12",
      romanDate: true,
      layout: "centered",
    },
    card: {
      radius: 4,
      border: "1px solid rgba(42,26,18,0.14)",
      shadow: "0 16px 38px -22px rgba(176,83,35,0.40)",
    },
    button: {
      radius: 999,
      style: "pill",
    },
    gallery: {
      style: "warm-masonry",
      overlayTone: "warm",
    },
    voice: {
      descriptors: ["sun-drenched", "warm", "lemon-bright", "old-world"],
      conciergeGreeting:
        "Buongiorno. I'm the wedding concierge. ask me anything about the weekend in {region}.",
    },
  },

  "cinematic-dark": {
    id: "cinematic-dark",
    label: "Cinematic dark",
    blurb: "Near-black with gold. After-hours. Playfair drama.",
    palette: {
      bg: "#0E0C09",
      surface: "#1A1612",
      ink: "#F5EBD3",
      inkSoft: "rgba(245,235,211,0.70)",
      inkFaint: "rgba(245,235,211,0.42)",
      accent: "#D2A24A",
      accentSoft: "rgba(210,162,74,0.18)",
      hairline: "rgba(245,235,211,0.12)",
      accent2: "#8C6A2C",
    },
    fonts: {
      display: '"Playfair Display", "DM Serif Display", Georgia, serif',
      body: '"DM Serif Text", "Cardo", Georgia, serif',
      mono: '"JetBrains Mono", ui-monospace, monospace',
    },
    hero: {
      background:
        "radial-gradient(ellipse 60% 50% at 50% 35%, rgba(210,162,74,0.30) 0%, transparent 55%), " +
        "radial-gradient(circle at 50% 100%, rgba(140,106,44,0.18) 0%, transparent 60%), " +
        "linear-gradient(180deg, #0E0C09 0%, #110D08 100%)",
      foreground: "#F5EBD3",
      romanDate: true,
      layout: "centered",
    },
    card: {
      radius: 2,
      border: "1px solid rgba(210,162,74,0.22)",
      shadow: "0 22px 50px -20px rgba(0,0,0,0.70)",
    },
    button: {
      radius: 999,
      style: "pill",
    },
    gallery: {
      style: "dark-masonry",
      overlayTone: "warm",
    },
    voice: {
      descriptors: ["refined", "after-hours", "moody", "cinematic"],
      conciergeGreeting:
        "Good evening. The concierge desk is open. any question about the weekend.",
    },
  },

  "soft-modernist": {
    id: "soft-modernist",
    label: "Soft modernist",
    blurb: "Cream and sage. Cormorant. Quiet, deliberate whitespace.",
    palette: {
      bg: "#FBF8F2",
      surface: "#FFFFFF",
      ink: "#1A1A18",
      inkSoft: "rgba(26,26,24,0.66)",
      inkFaint: "rgba(26,26,24,0.42)",
      accent: "#4F5D44",
      accentSoft: "rgba(79,93,68,0.14)",
      hairline: "rgba(26,26,24,0.10)",
      accent2: "#A8B5A0",
    },
    fonts: {
      display: '"Cormorant Garamond", "Cormorant", Georgia, serif',
      body: '"Cormorant Garamond", Georgia, serif',
      mono: '"JetBrains Mono", ui-monospace, monospace',
    },
    hero: {
      background:
        "radial-gradient(ellipse 80% 60% at 70% 20%, rgba(168,181,160,0.20) 0%, transparent 60%), " +
        "linear-gradient(180deg, #FFFFFF 0%, #FBF8F2 60%, #F2EDE2 100%)",
      foreground: "#1A1A18",
      romanDate: false,
      layout: "left",
    },
    card: {
      radius: 16,
      border: "1px solid rgba(26,26,24,0.08)",
      shadow: "0 1px 0 rgba(26,26,24,0.02)",
    },
    button: {
      radius: 999,
      style: "pill",
    },
    gallery: {
      style: "minimal-grid",
      overlayTone: "neutral",
    },
    voice: {
      descriptors: ["quiet", "considered", "modern", "warm"],
      conciergeGreeting:
        "Hi there. I know the weekend down to the small details. ask away.",
    },
  },

  "garden-party": {
    id: "garden-party",
    label: "Garden party",
    blurb: "Dusty mauve and pressed greens. DM Serif. Pressed-floral hero.",
    palette: {
      bg: "#F6EEEA",
      surface: "#FBF5F1",
      ink: "#3A2A3C",
      inkSoft: "rgba(58,42,60,0.70)",
      inkFaint: "rgba(58,42,60,0.42)",
      accent: "#8E5B7A",
      accentSoft: "rgba(142,91,122,0.18)",
      hairline: "rgba(58,42,60,0.12)",
      accent2: "#6E8068",
    },
    fonts: {
      display: '"DM Serif Display", "Playfair Display", Georgia, serif',
      body: '"EB Garamond", "Cardo", Georgia, serif',
      mono: '"JetBrains Mono", ui-monospace, monospace',
    },
    hero: {
      background:
        "radial-gradient(ellipse 70% 50% at 20% 30%, rgba(142,91,122,0.22) 0%, transparent 50%), " +
        "radial-gradient(ellipse 60% 50% at 80% 70%, rgba(110,128,104,0.20) 0%, transparent 55%), " +
        "linear-gradient(180deg, #F6EEEA 0%, #EBDCD4 100%)",
      foreground: "#3A2A3C",
      romanDate: false,
      layout: "centered",
    },
    card: {
      radius: 24,
      border: "1px solid rgba(58,42,60,0.10)",
      shadow: "0 18px 40px -22px rgba(142,91,122,0.30)",
    },
    button: {
      radius: 999,
      style: "pill",
    },
    gallery: {
      style: "floral-masonry",
      overlayTone: "warm",
    },
    voice: {
      descriptors: ["soft", "warm", "garden-pressed", "tender"],
      conciergeGreeting:
        "Hello. so glad you're here. Ask me anything about the weekend.",
    },
  },

  "seaside-minimal": {
    id: "seaside-minimal",
    label: "Seaside minimal",
    blurb: "Linen and deep teal. Italiana. Vertical-gradient hero.",
    palette: {
      bg: "#F3EFE6",
      surface: "#FBF8F1",
      ink: "#13343E",
      inkSoft: "rgba(19,52,62,0.66)",
      inkFaint: "rgba(19,52,62,0.40)",
      accent: "#1C5664",
      accentSoft: "rgba(28,86,100,0.16)",
      hairline: "rgba(19,52,62,0.14)",
      accent2: "#C9B583",
    },
    fonts: {
      display: '"Italiana", "Playfair Display", Georgia, serif',
      body: '"Cardo", Georgia, serif',
      mono: '"JetBrains Mono", ui-monospace, monospace',
    },
    hero: {
      background:
        "linear-gradient(180deg, #F3EFE6 0%, #DAD3C2 45%, #5A8390 80%, #1C5664 100%)",
      foreground: "#13343E",
      romanDate: false,
      layout: "centered",
    },
    card: {
      radius: 0,
      border: "1px solid rgba(19,52,62,0.14)",
      shadow: "none",
    },
    button: {
      radius: 0,
      style: "square",
    },
    gallery: {
      style: "vertical-strip",
      overlayTone: "cool",
    },
    voice: {
      descriptors: ["spacious", "salt-air", "restrained", "considered"],
      conciergeGreeting:
        "Hello. I'm the wedding concierge. drop a question, I'll have an answer.",
    },
  },

  "brutalist-editorial": {
    id: "brutalist-editorial",
    label: "Brutalist editorial",
    blurb: "Magazine-loud. Bold red. Hard borders. Playfair italic.",
    palette: {
      bg: "#F4F1EA",
      surface: "#FFFFFF",
      ink: "#111111",
      inkSoft: "rgba(17,17,17,0.66)",
      inkFaint: "rgba(17,17,17,0.42)",
      accent: "#D6321F",
      accentSoft: "rgba(214,50,31,0.10)",
      hairline: "#111111",
      accent2: "#111111",
    },
    fonts: {
      display: '"Playfair Display", "DM Serif Display", Georgia, serif',
      body: '"Cardo", Georgia, serif',
      mono: '"JetBrains Mono", ui-monospace, monospace',
    },
    hero: {
      background:
        "linear-gradient(180deg, #F4F1EA 0%, #ECE7DA 100%)",
      foreground: "#111111",
      romanDate: false,
      layout: "justified",
    },
    card: {
      radius: 0,
      border: "1.5px solid #111111",
      shadow: "none",
    },
    button: {
      radius: 0,
      style: "square",
    },
    gallery: {
      style: "magazine-grid",
      overlayTone: "neutral",
    },
    voice: {
      descriptors: ["sharp", "magazine", "loud", "editorial"],
      conciergeGreeting:
        "Concierge. Ask me anything about the weekend.",
    },
  },
};

/** Best-guess vibe from the brief's vibe-string + region. */
export function suggestVibeFromBrief(args: {
  vibe?: string;
  region?: string;
}): VibeId {
  const v = (args.vibe ?? "").toLowerCase();
  const r = (args.region ?? "").toLowerCase();
  if (
    r.includes("amalfi") ||
    r.includes("positano") ||
    r.includes("italy") ||
    v.includes("italian") ||
    v.includes("amalfi") ||
    v.includes("mediterranean")
  ) {
    return "amalfi-editorial";
  }
  if (
    v.includes("cinema") ||
    v.includes("noir") ||
    v.includes("late-night") ||
    v.includes("after-hours") ||
    v.includes("dark")
  ) {
    return "cinematic-dark";
  }
  if (
    r.includes("english countryside") ||
    v.includes("garden") ||
    v.includes("pressed flower") ||
    v.includes("countryside")
  ) {
    return "garden-party";
  }
  if (
    r.includes("hamptons") ||
    r.includes("coastal") ||
    r.includes("seaside") ||
    v.includes("coastal") ||
    v.includes("beach")
  ) {
    return "seaside-minimal";
  }
  if (v.includes("brutal") || v.includes("magazine") || v.includes("editorial")) {
    return "brutalist-editorial";
  }
  return "soft-modernist";
}
