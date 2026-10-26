export type GarmentKind =
  | "hoodie"
  | "sweatshirt"
  | "tshirt"
  | "shirt"
  | "knitwear"
  | "jacket"
  | "coat"
  | "pants"
  | "shorts"
  | "skirt"
  | "dress";

type KindSpec = {
  label: string;
  /** Default category shown on the store. */
  category: string;
  /** Noun used inside the prompt. */
  noun: string;
  /** Parts that must stay fully visible (nothing cropped). */
  parts: string;
  pose: string;
  labelSpot: string;
};

const SLEEVES_APART =
  "Sleeves relaxed along the body, slightly apart from it so the background is visible between each sleeve and the body.";

export const GARMENT_KINDS: Record<GarmentKind, KindSpec> = {
  hoodie: {
    label: "Hoodie",
    category: "Hoodie",
    noun: "hoodie",
    parts: "the hood, shoulders, both sleeves, cuffs and hem",
    pose: `Hood up in a clean, symmetrical shape. ${SLEEVES_APART}`,
    labelSpot: "inside the hood or neckline",
  },
  sweatshirt: {
    label: "Sweatshirt",
    category: "Sweatshirt",
    noun: "sweatshirt",
    parts: "the neckline, shoulders, both sleeves, cuffs and hem",
    pose: SLEEVES_APART,
    labelSpot: "inside the neckline",
  },
  tshirt: {
    label: "T-shirt",
    category: "T-shirt",
    noun: "t-shirt",
    parts: "the neckline, shoulders, both sleeves and hem",
    pose: "Short sleeves extended naturally and symmetrically, sleeve openings fully visible.",
    labelSpot: "inside the neckline",
  },
  shirt: {
    label: "Shirt",
    category: "Shirt",
    noun: "shirt",
    parts: "the collar, shoulders, both sleeves, cuffs and hem",
    pose: `Buttoned, collar neat and symmetrical. ${SLEEVES_APART}`,
    labelSpot: "inside the collar",
  },
  knitwear: {
    label: "Knitwear",
    category: "Knitwear",
    noun: "knit sweater",
    parts: "the neckline, shoulders, both sleeves, cuffs and hem",
    pose: `Knit texture crisp and even. ${SLEEVES_APART}`,
    labelSpot: "inside the neckline",
  },
  jacket: {
    label: "Jacket",
    category: "Jacket",
    noun: "jacket",
    parts: "the collar, shoulders, both sleeves, cuffs and hem",
    pose: `Closed the way it is worn, collar neat and symmetrical. ${SLEEVES_APART}`,
    labelSpot: "inside the collar",
  },
  coat: {
    label: "Coat",
    category: "Coat",
    noun: "coat",
    parts: "the collar or lapels, shoulders, both sleeves, cuffs and the full hem",
    pose: `Closed the way it is worn, lapels neat and symmetrical. ${SLEEVES_APART}`,
    labelSpot: "inside the collar",
  },
  pants: {
    label: "Pants / jeans",
    category: "Pants",
    noun: "pants",
    parts: "the waistband, both legs and both hems",
    pose: "Legs straight and slightly apart so the background is visible between them, waistband level.",
    labelSpot: "on the waistband (inside label or back patch)",
  },
  shorts: {
    label: "Shorts",
    category: "Shorts",
    noun: "shorts",
    parts: "the waistband, both legs and both hems",
    pose: "Legs straight and slightly apart so the background is visible between them, waistband level.",
    labelSpot: "inside the waistband",
  },
  skirt: {
    label: "Skirt",
    category: "Skirt",
    noun: "skirt",
    parts: "the waistband and the full hem",
    pose: "Hanging straight and symmetrical, hem even.",
    labelSpot: "inside the waistband",
  },
  dress: {
    label: "Dress",
    category: "Dress",
    noun: "dress",
    parts: "the neckline, straps or sleeves, and the full hem",
    pose: "Hanging straight and symmetrical, hem even.",
    labelSpot: "inside the neckline",
  },
};

/** Guesses the garment kind from a store category, e.g. when editing an existing piece. */
export function kindFromCategory(category: string): GarmentKind {
  const value = category.toLowerCase();
  if (/hood/.test(value)) return "hoodie";
  if (/sweat|crew/.test(value)) return "sweatshirt";
  if (/t-?shirt|tee/.test(value)) return "tshirt";
  if (/shirt|blouse|overshirt/.test(value)) return "shirt";
  if (/knit|sweater|cardigan/.test(value)) return "knitwear";
  if (/coat|trench|parka/.test(value)) return "coat";
  if (/jacket|blazer|bomber|vest/.test(value)) return "jacket";
  if (/short/.test(value)) return "shorts";
  if (/skirt/.test(value)) return "skirt";
  if (/dress/.test(value)) return "dress";
  if (/pant|jean|denim|trouser|cargo/.test(value)) return "pants";
  return "jacket";
}

export type PromptInput = {
  kind: GarmentKind;
  /** Plain-language color of the garment, e.g. "washed black". */
  colorName: string;
  /** Light garments go on mid gray instead of white so they can be separated from it. */
  light: boolean;
  removeLabels: boolean;
};

export type RecolorInput = {
  name: string;
  hex: string;
  prints: "keep" | "tonal" | "custom";
  printColor: string;
};

const background = (light: boolean) =>
  light
    ? "a perfectly flat, uniform solid mid-gray background (#808080)"
    : "a perfectly flat, uniform pure white background (#FFFFFF)";

const backgroundRules = (light: boolean) => [
  `- Place it on ${background(light)}.`,
  "- No checkerboard or transparency pattern, no gradient, no floor, no shadow, no reflection, no vignette.",
  "- Sharp, clean edges between the garment and the background, with no glow, halo or outline.",
  ...(light ? ["- Keep the garment's true light color; do not tint it toward the background."] : []),
];

const subject = ({ kind, colorName }: PromptInput) =>
  [colorName.trim(), GARMENT_KINDS[kind].noun].filter(Boolean).join(" ");

function garmentRules(input: PromptInput, view: "front" | "back") {
  const spec = GARMENT_KINDS[input.kind];
  return [
    `- Keep the garment exactly as it is: same design, shape, proportions, fabric texture, stitching, ${
      view === "front" ? "prints, logos" : "back prints"
    } and colors. Do not redesign, simplify or add anything.`,
    `- Show the full garment, nothing cropped: ${spec.parts} must be fully visible.`,
    `- Straight-on ${view} view, perfectly centered and symmetrical, laid flat or on an invisible mannequin (ghost mannequin). No person, no hanger, no swing tags, no props.`,
    `- ${spec.pose}`,
    ...(input.removeLabels
      ? [`- Remove any brand label or size tag ${spec.labelSpot}; keep everything printed or stitched on the outside.`]
      : []),
  ];
}

const QUALITY = [
  "Lighting and quality:",
  "- Soft, even studio lighting, true-to-life colors, high resolution, sharp fabric detail.",
  "- Portrait format (4:5), exported as PNG if possible.",
];

export function frontPrompt(input: PromptInput) {
  return [
    `Edit this photo into a clean e-commerce product image of the ${subject(input)}, front view.`,
    "",
    "Garment:",
    ...garmentRules(input, "front"),
    "- The garment fills about 80% of the image height, with even empty margins on all sides.",
    "",
    "Background:",
    ...backgroundRules(input.light),
    "",
    ...QUALITY,
  ].join("\n");
}

export function backPrompt(input: PromptInput) {
  return [
    `Edit the first photo into a clean e-commerce product image of the ${subject(input)}, back view, matching the second image (the finished front view) exactly.`,
    "",
    "Match the front image:",
    "- Same garment, same size in the frame, same position, same centering, same margins.",
    "- Same lighting, same colors, same background.",
    "- The outline (shoulders, sleeves, hem) should line up with the front view as closely as possible.",
    "",
    "Garment:",
    ...garmentRules(input, "back"),
    "",
    "Background:",
    ...backgroundRules(input.light),
    "",
    ...QUALITY,
  ].join("\n");
}

/** Relative luminance-ish lightness (0–255) of a #rrggbb color. */
export function hexLightness(hex: string) {
  const value = /^#?([0-9a-f]{6})$/i.exec(hex.trim())?.[1];
  if (!value) return 128;
  const n = parseInt(value, 16);
  return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
}

export const isLightColor = (hex: string) => hexLightness(hex) > 185;

export function recolorPrompt(input: PromptInput, target: RecolorInput) {
  const light = isLightColor(target.hex);
  const prints =
    target.prints === "keep"
      ? "Prints, logos and graphics: keep them exactly as they are, same colors."
      : target.prints === "tonal"
        ? "Prints, logos and graphics: make them tonal, a few shades darker than the new fabric color."
        : `Prints, logos and graphics: recolor them to ${target.printColor.trim() || "the matching color"}.`;
  return [
    `Recolor the ${GARMENT_KINDS[input.kind].noun} in this image to ${target.name.trim() || "the new color"} (hex ${target.hex.toUpperCase()}).`,
    "",
    "Change only the fabric color:",
    "- Keep everything else exactly identical: shape, size, position in the frame, folds, wrinkles, texture, stitching and lighting.",
    "- Keep the natural shading: darker in folds, lighter on raised areas, so it still looks like real fabric and not a flat fill.",
    `- ${prints}`,
    "- Ribbing, cuffs, hems, linings and trims get the same new color with their texture preserved; hardware (buttons, zips, rivets) keeps its original finish.",
    "",
    "Background:",
    `- Put the garment on ${background(light)}, even if the input is transparent or on another background.`,
    "- No checkerboard or transparency pattern, no gradient, no floor, no shadow, no reflection.",
    "- Sharp, clean edges between the garment and the background, with no glow, halo or outline.",
    "",
    "Output the same size and framing as the input, as PNG if possible.",
  ].join("\n");
}
