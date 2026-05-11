// The atelier taxonomy — eight dimensions for the dress, six for the veil.
// Each is the canonical UI list. Translation copy lives in `vocabulary.ts`.

export const SILHOUETTES = [
  "A-line",
  "Ball gown",
  "Sheath / column",
  "Mermaid",
  "Trumpet",
  "Fit-and-flare",
  "Empire",
  "Modified A-line",
  "Tea-length",
  "Mini",
] as const;

export const NECKLINES = [
  "Sweetheart",
  "V-neck (shallow)",
  "V-neck (deep)",
  "Square",
  "Bateau / boat",
  "Off-shoulder",
  "One-shoulder",
  "Halter",
  "High neck / mock turtleneck",
  "Plunging",
  "Illusion",
  "Strapless",
  "Cowl",
] as const;

export const SLEEVES = [
  "None / strapless",
  "Spaghetti strap",
  "Cap sleeve",
  "Short sleeve",
  "Three-quarter sleeve",
  "Long sleeve fitted",
  "Long sleeve loose / bishop",
  "Off-shoulder draped",
  "Detached / removable",
  "Sheer illusion long sleeve",
] as const;

export const BACKS = [
  "Closed / classic",
  "Open V",
  "Open scoop",
  "Keyhole",
  "Low cowl",
  "Buttoned",
  "Lace-up corset",
  "Bow detail",
  "Illusion back (sheer + appliqué)",
  "Halter-tie",
] as const;

export const FABRICS = [
  "Silk crepe",
  "Silk satin / mikado",
  "Silk charmeuse",
  "Silk organza",
  "Silk taffeta",
  "Tulle",
  "French / Chantilly lace",
  "Italian guipure lace",
  "Mikado",
  "Crepe de chine",
  "Chiffon",
  "Georgette",
  "Brocade",
  "Velvet",
  "Silk gazar",
] as const;

export const TRAINS = [
  "None / floor",
  "Sweep",
  "Court",
  "Chapel",
  "Cathedral",
  "Royal",
  "Detachable",
  "Watteau",
] as const;

export const EMBELLISHMENTS = [
  "Bare / minimal",
  "Hand-beading (allover)",
  "Hand-beading (selective)",
  "Pearl detailing",
  "Crystal detailing",
  "Embroidered florals",
  "Appliquéd lace",
  "3D floral appliqué",
  "Sequins (subtle)",
  "Sequins (bold)",
  "Feather trim",
  "Bow accents",
] as const;

export const COLORS = [
  "Pure white",
  "Ivory",
  "Champagne",
  "Blush",
  "Nude / skin tone",
  "Soft pink",
  "Powder blue",
  "Black",
] as const;

// ---- Veil --------------------------------------------------------------

export const VEIL_LENGTHS = [
  "Birdcage (cheek)",
  "Shoulder",
  "Elbow",
  "Fingertip",
  "Waltz (knee)",
  "Chapel",
  "Cathedral",
  "Royal",
] as const;

export const VEIL_EDGES = [
  "Raw / cut",
  "Pencil edge",
  "Ribbon edge",
  "Lace trim",
  "Beaded trim",
  "Scalloped",
  "Horsehair (corded)",
  "Frayed silk",
] as const;

export const VEIL_TIERS = [
  "Single tier",
  "Two tier (with blusher)",
  "Three tier",
] as const;

export const VEIL_FABRICS = [
  "Silk tulle (softest)",
  "English net",
  "French illusion",
  "Italian tulle",
  "Drop tulle (denser)",
] as const;

export const VEIL_EMBELLISHMENTS = [
  "Bare",
  "Scattered pearls",
  "Selective beading",
  "Embroidered florals",
  "Appliquéd lace motifs",
  "Crystal scattered",
] as const;

export const VEIL_COLORS = [
  "Pure white",
  "Diamond white",
  "Ivory",
  "Champagne",
  "Blush",
] as const;
