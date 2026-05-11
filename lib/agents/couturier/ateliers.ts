// A small, hand-curated network of representative bridal ateliers.
// In production this is a real database of verified couture houses.
// For v1, hardcoded so the match flow is exercisable end-to-end.

import type { AtelierVendor } from "@/lib/types";

export const ATELIER_NETWORK: AtelierVendor[] = [
  {
    id: "alma-couture",
    name: "Alma Couture",
    region: "New York, NY",
    specialties: ["structured", "modern", "minimal", "silk-crepe", "column"],
    priceBand: 12000,
    leadTimeMonths: 9,
    sampleGownUrls: [],
    profileImageUrl: undefined,
  },
  {
    id: "atelier-louise-rivers",
    name: "Atelier Louise Rivers",
    region: "Brooklyn, NY",
    specialties: ["fluid", "draped", "silk-charmeuse", "modern", "back-detail"],
    priceBand: 8500,
    leadTimeMonths: 7,
    sampleGownUrls: [],
  },
  {
    id: "maison-corval",
    name: "Maison Corval",
    region: "Paris, France",
    specialties: ["lace", "classical", "embroidery", "couture", "drama"],
    priceBand: 24000,
    leadTimeMonths: 12,
    sampleGownUrls: [],
  },
  {
    id: "rosa-celeste",
    name: "Rosa Celeste",
    region: "Florence, Italy",
    specialties: ["mikado", "structured", "classical", "ball-gown", "cathedral-train"],
    priceBand: 16000,
    leadTimeMonths: 10,
    sampleGownUrls: [],
  },
  {
    id: "ines-and-mira",
    name: "Inés & Mira",
    region: "Los Angeles, CA",
    specialties: ["modern", "minimal", "silk-satin", "column", "low-back"],
    priceBand: 9500,
    leadTimeMonths: 6,
    sampleGownUrls: [],
  },
  {
    id: "noor-atelier",
    name: "Noor Atelier",
    region: "London, UK",
    specialties: ["modest", "long-sleeve", "lace", "high-neck", "classical"],
    priceBand: 11000,
    leadTimeMonths: 8,
    sampleGownUrls: [],
  },
  {
    id: "verbena",
    name: "Verbena",
    region: "Mexico City, Mexico",
    specialties: ["embroidery", "color", "structured", "modern", "drama"],
    priceBand: 7000,
    leadTimeMonths: 7,
    sampleGownUrls: [],
  },
  {
    id: "shore-house",
    name: "Shore House",
    region: "Charleston, SC",
    specialties: ["fluid", "silk-crepe", "summer", "modern", "minimal"],
    priceBand: 6500,
    leadTimeMonths: 6,
    sampleGownUrls: [],
  },
];

/** Score each atelier against the concept's taxonomy and the brief's
 *  region + lead time. Returns the top 5 with a short "why this match"
 *  paragraph populated. */
export function rankAteliers(args: {
  silhouette?: string;
  fabric?: string[];
  back?: string;
  embellishment?: string[];
  weddingDateISO?: string;
  region?: string;
}): AtelierVendor[] {
  const today = new Date();
  const monthsUntilWedding = args.weddingDateISO
    ? Math.max(
        0,
        Math.round(
          (new Date(args.weddingDateISO).getTime() - today.getTime()) /
            (1000 * 60 * 60 * 24 * 30),
        ),
      )
    : 12;

  const ranked = ATELIER_NETWORK.map((a) => {
    let score = 0;
    const reasons: string[] = [];
    // Lead time: must fit within the time available, with 2-month buffer.
    if (a.leadTimeMonths <= monthsUntilWedding - 2) {
      score += 10;
    } else if (a.leadTimeMonths <= monthsUntilWedding) {
      score += 3;
      reasons.push(`tight on lead time (${a.leadTimeMonths}mo of ${monthsUntilWedding}mo)`);
    } else {
      score -= 10;
    }

    // Silhouette match
    if (args.silhouette) {
      const sLower = args.silhouette.toLowerCase();
      if (sLower.includes("column") && a.specialties.includes("column")) {
        score += 8;
        reasons.push("specializes in clean columns");
      }
      if (sLower.includes("ball") && a.specialties.includes("ball-gown")) {
        score += 8;
        reasons.push("ball-gown construction is their language");
      }
      if (sLower.includes("mermaid") && a.specialties.includes("structured")) {
        score += 5;
        reasons.push("structured silhouettes their forte");
      }
    }

    // Fabric match
    if (args.fabric) {
      if (args.fabric.some((f) => f.toLowerCase().includes("silk crepe")) && a.specialties.includes("silk-crepe")) {
        score += 6;
        reasons.push("silk crepe a signature");
      }
      if (args.fabric.some((f) => f.toLowerCase().includes("satin") || f.toLowerCase().includes("mikado")) && (a.specialties.includes("silk-satin") || a.specialties.includes("mikado"))) {
        score += 6;
        reasons.push("works in heavier silks");
      }
      if (args.fabric.some((f) => f.toLowerCase().includes("lace")) && a.specialties.includes("lace")) {
        score += 6;
        reasons.push("lace is house bread and butter");
      }
    }

    // Back / drama
    if (args.back && args.back.toLowerCase().includes("low") && a.specialties.includes("low-back")) {
      score += 4;
      reasons.push("knows how to build a low back");
    }
    if (args.embellishment?.some((e) => e.toLowerCase().includes("beading")) && a.specialties.includes("embroidery")) {
      score += 4;
      reasons.push("in-house embroidery atelier");
    }

    // Region heuristic
    if (args.region) {
      const wReg = args.region.toLowerCase();
      const aReg = a.region.toLowerCase();
      const sameCountry =
        (wReg.includes("ny") && aReg.includes("ny")) ||
        (wReg.includes("italy") && aReg.includes("italy")) ||
        (wReg.includes("france") && aReg.includes("france"));
      if (sameCountry) {
        score += 5;
        reasons.push("near the wedding region");
      }
    }

    const why =
      reasons.length > 0
        ? capitalize(reasons.slice(0, 3).join(", ") + ".")
        : "A versatile house with a quiet, modern hand.";

    return { ...a, whyMatch: why, _score: score };
  });

  ranked.sort((a, b) => b._score - a._score);
  return ranked.slice(0, 5).map(({ _score, ...rest }) => {
    void _score;
    return rest;
  });
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ----------------------------------------------------------- fittings ---

/** Working back from the wedding date, place the canonical sequence of
 *  fittings into the calendar. Each anchored by the atelier's lead time. */
export function buildFittingPlan(args: {
  weddingDateISO?: string;
  leadTimeMonths: number;
}): { kind: string; label: string; scheduledFor: string; bring: string[] }[] {
  const wedding = args.weddingDateISO
    ? new Date(args.weddingDateISO)
    : new Date(Date.now() + 1000 * 60 * 60 * 24 * 365);

  const monthsBefore = (m: number) => {
    const d = new Date(wedding);
    d.setMonth(d.getMonth() - m);
    return d.toISOString().slice(0, 10);
  };
  const daysBefore = (d: number) => {
    const x = new Date(wedding);
    x.setDate(x.getDate() - d);
    return x.toISOString().slice(0, 10);
  };

  return [
    {
      kind: "consultation",
      label: "First consultation",
      scheduledFor: monthsBefore(Math.min(args.leadTimeMonths, 10)),
      bring: ["Your references", "An open mind", "Comfortable underclothes"],
    },
    {
      kind: "pattern",
      label: "Pattern fitting",
      scheduledFor: monthsBefore(6),
      bring: ["The undergarments you'll wear on the day"],
    },
    {
      kind: "muslin",
      label: "First muslin (toile)",
      scheduledFor: monthsBefore(4),
      bring: ["The shoes you'll wear on the day", "Hair ideas if useful"],
    },
    {
      kind: "fabric",
      label: "Fabric fitting",
      scheduledFor: monthsBefore(3),
      bring: ["Shoes", "Undergarments", "Any jewelry that touches the fabric"],
    },
    {
      kind: "fitting",
      label: "Second fitting",
      scheduledFor: daysBefore(42),
      bring: ["Shoes", "Undergarments"],
    },
    {
      kind: "fitting",
      label: "Final fitting",
      scheduledFor: daysBefore(21),
      bring: ["Shoes", "Undergarments", "Veil if applicable"],
    },
    {
      kind: "steam",
      label: "Steaming and final prep",
      scheduledFor: daysBefore(3),
      bring: ["Garment bag for transport"],
    },
  ];
}

// ----------------------------------------------------- construction notes

/** A short list of construction notes derived from the taxonomy.
 *  Surfaces on Page 4 of the tech pack. */
export function buildConstructionNotes(taxonomy: {
  silhouette?: string;
  back?: string;
  fabric?: string[];
  train?: string;
  embellishment?: string[];
}): string[] {
  const notes: string[] = [];
  if (taxonomy.silhouette?.toLowerCase().includes("ball")) {
    notes.push("Boned bodice with multiple petticoat layers under the skirt.");
  } else if (taxonomy.silhouette?.toLowerCase().includes("sheath") || taxonomy.silhouette?.toLowerCase().includes("column")) {
    notes.push("Bias-cut panels through the body for clean line without flare.");
  } else if (taxonomy.silhouette?.toLowerCase().includes("mermaid") || taxonomy.silhouette?.toLowerCase().includes("trumpet")) {
    notes.push("Internal corseted structure through the bodice; multiple bias-cut panels through hip; structured kick-flare from knee.");
  }
  if (taxonomy.back?.toLowerCase().includes("low")) {
    notes.push("Concealed bra cups built into the bodice; no separate undergarment required.");
  }
  if (taxonomy.back?.toLowerCase().includes("buttoned")) {
    notes.push("Hand-covered buttons along the back placket, all functional.");
  }
  if (taxonomy.fabric?.some((f) => f.toLowerCase().includes("organza"))) {
    notes.push("Multiple layers of organza required for body — single layer reads thin.");
  }
  if (taxonomy.train?.toLowerCase().includes("detachable")) {
    notes.push("French bustle for train, with hand-stitched eye-and-hook fastening at the waist.");
  } else if (taxonomy.train && !taxonomy.train.toLowerCase().includes("none")) {
    notes.push("Bustle points sewn in for the train at the dance.");
  }
  if (taxonomy.embellishment?.some((e) => e.toLowerCase().includes("beading"))) {
    notes.push("All beading hand-applied. Allow 80-120 hours of atelier time for selective; 250+ for allover.");
  }
  notes.push("Lined throughout in silk habotai. Hidden zipper closure with hand-applied closure tape.");
  return notes;
}
