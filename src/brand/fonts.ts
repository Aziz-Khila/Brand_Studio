import {
  Archivo,
  Inter_Tight,
  JetBrains_Mono,
  Instrument_Serif,
  Space_Grotesk,
  Space_Mono,
} from "next/font/google";

/*
 * next/font must be called at module scope, so every font a brand can pick
 * is declared here. Fonts that are declared but not referenced by the active
 * brand are never downloaded by the browser.
 */

const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--f-archivo",
  display: "swap",
});

const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--f-inter-tight",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--f-jetbrains-mono",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--f-instrument-serif",
  display: "swap",
  preload: false,
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--f-space-grotesk",
  display: "swap",
  preload: false,
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--f-space-mono",
  display: "swap",
  preload: false,
});

export const fonts = {
  archivo,
  "inter-tight": interTight,
  "jetbrains-mono": jetbrainsMono,
  "instrument-serif": instrumentSerif,
  "space-grotesk": spaceGrotesk,
  "space-mono": spaceMono,
} as const;

export type FontKey = keyof typeof fonts;

export const fontVariables = Object.values(fonts)
  .map((font) => font.variable)
  .join(" ");
