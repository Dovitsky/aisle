// Couture vocabulary translation tables.
//
// Each entry maps a tag the UI exposes to a single sentence of couture
// prose. The prompt builder concatenates these into a coherent
// paragraph rather than a comma-separated list, which is what turns a
// "Pinterest result" image into a "couture house brief" image.
//
// All copy here is the Couturier voice: calm, specific, restrained.

export const SILHOUETTE_TRANSLATIONS: Record<string, string> = {
  "A-line":
    "a fitted bodice that flares gently from the waist into a soft A shape, classic and forgiving",
  "Ball gown":
    "a structured bodice over a full skirt that sweeps from the waist, the silhouette of a princess gown",
  "Sheath / column":
    "a slim column silhouette that follows the body's line from shoulder to floor without flaring",
  "Mermaid":
    "a fitted bodice and skirt that hugs through the hip and thigh, then dramatically flares from the knee in a sculptural sweep",
  "Trumpet":
    "a fitted bodice through the hip that begins to flare mid-thigh in a softer, less severe curve than a mermaid",
  "Fit-and-flare":
    "a fitted bodice through the natural waist that releases into a soft, swingy flare",
  "Empire":
    "a fitted bust raised to just under the chest with the skirt falling unbroken from there, romantic and unstructured",
  "Modified A-line":
    "a slimmer A-line — fitted through the hip, with a quieter flare beginning around the upper thigh",
  "Tea-length":
    "a hemline that falls between the knee and the ankle, vintage and confident",
  "Mini":
    "a hemline above the knee, modern, clean, often paired with a separate train or veil for ceremonial moments",
};

export const NECKLINE_TRANSLATIONS: Record<string, string> = {
  "Sweetheart":
    "a sweetheart neckline that dips gently into a soft heart shape across the bust",
  "V-neck (shallow)":
    "a shallow V at the neckline, an open and modern bridal classic",
  "V-neck (deep)":
    "a deep V neckline that travels well below the collarbone, confident and unadorned",
  "Square":
    "a clean square neckline with crisp, architectural shoulder lines",
  "Bateau / boat":
    "a wide bateau neckline that runs nearly shoulder to shoulder, regal and quiet",
  "Off-shoulder":
    "an off-shoulder neckline that sits below the shoulder bone, baring the collarbone and the upper arms",
  "One-shoulder":
    "a single-shoulder neckline that bares one side entirely — an asymmetry that anchors the dress",
  "Halter":
    "a halter neckline that wraps the throat or shoulders, bare on the upper arms and back",
  "High neck / mock turtleneck":
    "a high neckline that closes against the throat, often paired with delicate construction at the shoulders",
  "Plunging":
    "a plunging neckline that travels well past the bust line — drama held by careful construction",
  "Illusion":
    "an illusion neckline of sheer tulle traced with appliqué, the skin showing through without exposure",
  "Strapless":
    "a strapless neckline that bares the shoulders and clavicle, the bodice held by careful boning",
  "Cowl":
    "a soft cowl neckline that drapes in liquid folds across the bust",
};

export const SLEEVE_TRANSLATIONS: Record<string, string> = {
  "None / strapless":
    "no sleeves — the shoulders are bare",
  "Spaghetti strap":
    "the slightest spaghetti straps over the shoulders, almost invisible",
  "Cap sleeve":
    "small cap sleeves that just cover the top of the shoulder",
  "Short sleeve":
    "short sleeves that finish at the upper arm",
  "Three-quarter sleeve":
    "three-quarter sleeves that finish between the elbow and the wrist",
  "Long sleeve fitted":
    "long sleeves cut close to the arm, finishing precisely at the wrist",
  "Long sleeve loose / bishop":
    "long sleeves that gather softly at the wrist, full through the forearm",
  "Off-shoulder draped":
    "draped sleeves that fall off the shoulder, soft and unstructured",
  "Detached / removable":
    "detachable sleeves — the dress reads two ways, the sleeves come off for the reception",
  "Sheer illusion long sleeve":
    "long sleeves of sheer illusion tulle, often traced with appliqué or hand-beading",
};

export const BACK_TRANSLATIONS: Record<string, string> = {
  "Closed / classic":
    "a closed classic back, the line of the dress uninterrupted",
  "Open V":
    "an open V at the back, dropping below the shoulder blades",
  "Open scoop":
    "a soft scoop back that follows the shoulder line",
  "Keyhole":
    "a keyhole opening cut into the upper back, framed by fabric on either side",
  "Low cowl":
    "a low cowl back that drapes in liquid folds toward the waist",
  "Buttoned":
    "a row of small covered buttons traveling the length of the back",
  "Lace-up corset":
    "a laced corset back, the ribbon visible through carefully spaced loops",
  "Bow detail":
    "a single sculptural bow at the waist of the back",
  "Illusion back (sheer + appliqué)":
    "an illusion back of sheer tulle traced with hand-appliquéd motifs",
  "Halter-tie":
    "a halter that ties high at the back of the neck, the back of the dress otherwise bare",
};

export const TRAIN_TRANSLATIONS: Record<string, string> = {
  "None / floor":
    "no train — the dress finishes cleanly at the floor",
  "Sweep":
    "a short sweep train, just enough to graze the floor behind",
  "Court":
    "a court train of about three feet, formal but easy",
  "Chapel":
    "a chapel train of four to five feet, the most common ceremonial length",
  "Cathedral":
    "a cathedral train of six to eight feet, dramatic and ceremonial",
  "Royal":
    "a royal train of twelve feet or more — the length of a state occasion",
  "Detachable":
    "a detachable train that comes off cleanly for the reception",
  "Watteau":
    "a Watteau train falling from the shoulders rather than the waist, an old-couture choice",
};

export const FABRIC_TRANSLATIONS: Record<string, string> = {
  "Silk crepe":
    "silk crepe — a matte, sculptural, weighty silk that holds a clean line",
  "Silk satin / mikado":
    "silk satin or mikado — a heavier silk with a soft sheen, structured enough to hold pleats",
  "Silk charmeuse":
    "silk charmeuse — a soft, fluid silk with a high luster on the face, used for liquid drapes",
  "Silk organza":
    "silk organza — crisp, sheer, structured, used for volume that holds its shape",
  "Silk taffeta":
    "silk taffeta — crisp with a slight rustle, holds a sharp pleat",
  "Tulle":
    "tulle — light, airy, used for layered volume and ethereal effects",
  "French / Chantilly lace":
    "French Chantilly lace — fine floral motifs on a sheer net, the classical bridal lace",
  "Italian guipure lace":
    "Italian guipure lace — bolder, sculptural lace motifs without a net ground",
  "Mikado":
    "mikado silk — substantial, slightly stiff, holds architectural shapes",
  "Crepe de chine":
    "crepe de chine — soft and fluid, drapes against the body",
  "Chiffon":
    "chiffon — featherlight, gauzy, fluid",
  "Georgette":
    "georgette — slightly more textured than chiffon, with a soft crinkle",
  "Brocade":
    "brocade — a woven jacquard with raised patterns, formal and rich",
  "Velvet":
    "velvet — deep pile, lush, the choice for winter weddings",
  "Silk gazar":
    "silk gazar — crisp and architectural, holds dramatic shapes without weight",
};

export const EMBELLISHMENT_TRANSLATIONS: Record<string, string> = {
  "Bare / minimal":
    "no embellishment — the fabric and silhouette carry the dress",
  "Hand-beading (allover)":
    "allover hand-beading across the entire dress, dense and shimmering",
  "Hand-beading (selective)":
    "selective hand-beading, scattered through the bodice and lightening toward the hem",
  "Pearl detailing":
    "pearl detailing — small freshwater pearls hand-sewn through select panels",
  "Crystal detailing":
    "fine crystal detailing that catches candlelight without reading as costume",
  "Embroidered florals":
    "embroidered florals worked directly into the fabric",
  "Appliquéd lace":
    "lace motifs appliquéd onto the base fabric, building dimension",
  "3D floral appliqué":
    "three-dimensional floral appliqués sculpted from organza or silk and stitched to the bodice or hem",
  "Sequins (subtle)":
    "small matte sequins that read as shimmer rather than sparkle",
  "Sequins (bold)":
    "bold paillette sequins that catch every light",
  "Feather trim":
    "feather trim at the hem, sleeve, or shoulder — couture-house drama",
  "Bow accents":
    "structured bow accents at the back, waist, or shoulder",
};

export const COLOR_TRANSLATIONS: Record<string, string> = {
  "Pure white":
    "pure bridal white",
  "Ivory":
    "ivory — warm, off-white, the most flattering white on most skin tones",
  "Champagne":
    "champagne — a soft warm-toned cream",
  "Blush":
    "blush — the gentlest pink, almost a tone of skin",
  "Nude / skin tone":
    "a nude tone matched to skin, often the base for an illusion construction",
  "Soft pink":
    "soft pink, romantic and unexpected",
  "Powder blue":
    "powder blue — vintage, old-Hollywood",
  "Black":
    "black — modern, confident, occasion-dependent",
  "Custom":
    "a custom color provided by the bride",
};

// ---------------------------------------------------------------- Veil ---

export const VEIL_LENGTH_TRANSLATIONS: Record<string, string> = {
  "Birdcage (cheek)":
    "a birdcage veil grazing the cheek, vintage and confident",
  "Shoulder":
    "a veil that falls just to the shoulders",
  "Elbow":
    "an elbow-length veil",
  "Fingertip":
    "a fingertip-length veil — the classical proportion",
  "Waltz (knee)":
    "a waltz-length veil to the knee, ballroom proportions",
  "Chapel":
    "a chapel-length veil that grazes the floor, matched to a chapel train",
  "Cathedral":
    "a cathedral-length veil extending six feet beyond the train, ceremonial",
  "Royal":
    "a royal-length veil over twelve feet long, the length of state occasions",
};

export const VEIL_EDGE_TRANSLATIONS: Record<string, string> = {
  "Raw / cut":
    "a raw cut edge — clean, unfinished, the silk net allowed to read",
  "Pencil edge":
    "a fine pencil-edge finish",
  "Ribbon edge":
    "a silk ribbon edge in the dress color",
  "Lace trim":
    "a lace-trim edge in the matching lace of the dress",
  "Beaded trim":
    "a beaded trim along the edge",
  "Scalloped":
    "a scalloped edge, soft and old-couture",
  "Horsehair (corded)":
    "a corded horsehair edge for body and movement",
  "Frayed silk":
    "a frayed silk edge, undone on purpose",
};

export const VEIL_TIER_TRANSLATIONS: Record<string, string> = {
  "Single tier":
    "a single tier",
  "Two tier (with blusher)":
    "two tiers with a blusher that covers the face for the processional",
  "Three tier":
    "three tiers, falling at different lengths",
};

export const VEIL_FABRIC_TRANSLATIONS: Record<string, string> = {
  "Silk tulle (softest)":
    "silk tulle — the softest, most fluid net, used in couture",
  "English net":
    "English net — slightly heavier, structured",
  "French illusion":
    "French illusion tulle — fine and sheer",
  "Italian tulle":
    "Italian tulle — soft with a slight body",
  "Drop tulle (denser)":
    "drop tulle — denser, holds shape better, used for longer veils",
};
