/**
 * Fonts a brand can pick from (declared with next/font in ./fonts.ts, which must stay in sync).
 * Plain data so the admin can list them without loading next/font.
 */
export type FontRole = "display" | "body" | "mono";

export type FontInfo = {
  label: string;
  /** Roles the font is suggested for (any font can still be used anywhere). */
  roles: FontRole[];
  /** Weight range available, for the display weight slider. */
  weights: [number, number];
  /** Width axis range (font-stretch %), when the font has one. */
  width?: [number, number];
  /** Generic fallback family. */
  fallback: "sans-serif" | "serif" | "monospace";
};

export const fontCatalog = {
  archivo: { label: "Archivo", roles: ["display", "body"], weights: [100, 900], width: [62, 125], fallback: "sans-serif" },
  anton: { label: "Anton", roles: ["display"], weights: [400, 400], fallback: "sans-serif" },
  "bebas-neue": { label: "Bebas Neue", roles: ["display"], weights: [400, 400], fallback: "sans-serif" },
  syne: { label: "Syne", roles: ["display"], weights: [400, 800], fallback: "sans-serif" },
  unbounded: { label: "Unbounded", roles: ["display"], weights: [200, 900], fallback: "sans-serif" },
  oswald: { label: "Oswald", roles: ["display"], weights: [200, 700], fallback: "sans-serif" },
  "instrument-sans": { label: "Instrument Sans", roles: ["display", "body"], weights: [400, 700], width: [75, 100], fallback: "sans-serif" },
  "instrument-serif": { label: "Instrument Serif", roles: ["display"], weights: [400, 400], fallback: "serif" },
  "playfair-display": { label: "Playfair Display", roles: ["display"], weights: [400, 900], fallback: "serif" },
  fraunces: { label: "Fraunces", roles: ["display", "body"], weights: [100, 900], fallback: "serif" },
  "space-grotesk": { label: "Space Grotesk", roles: ["display", "body"], weights: [300, 700], fallback: "sans-serif" },
  "inter-tight": { label: "Inter Tight", roles: ["body"], weights: [100, 900], fallback: "sans-serif" },
  inter: { label: "Inter", roles: ["body"], weights: [100, 900], fallback: "sans-serif" },
  "dm-sans": { label: "DM Sans", roles: ["body"], weights: [100, 1000], fallback: "sans-serif" },
  manrope: { label: "Manrope", roles: ["body"], weights: [200, 800], fallback: "sans-serif" },
  "work-sans": { label: "Work Sans", roles: ["body"], weights: [100, 900], fallback: "sans-serif" },
  "jetbrains-mono": { label: "JetBrains Mono", roles: ["mono"], weights: [100, 800], fallback: "monospace" },
  "space-mono": { label: "Space Mono", roles: ["mono"], weights: [400, 700], fallback: "monospace" },
  "ibm-plex-mono": { label: "IBM Plex Mono", roles: ["mono"], weights: [400, 700], fallback: "monospace" },
  "dm-mono": { label: "DM Mono", roles: ["mono"], weights: [300, 500], fallback: "monospace" },
} as const satisfies Record<string, FontInfo>;

export type FontKey = keyof typeof fontCatalog;

export const isFontKey = (value: unknown): value is FontKey => typeof value === "string" && value in fontCatalog;

/** CSS value for a font, usable anywhere the font registry is loaded (store and admin). */
export const fontFamily = (key: FontKey) => `var(--f-${key}), ${fontCatalog[key].fallback}`;
