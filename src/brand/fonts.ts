import {
  Anton,
  Archivo,
  Bebas_Neue,
  DM_Mono,
  DM_Sans,
  Fraunces,
  IBM_Plex_Mono,
  Instrument_Sans,
  Instrument_Serif,
  Inter,
  Inter_Tight,
  JetBrains_Mono,
  Manrope,
  Oswald,
  Playfair_Display,
  Space_Grotesk,
  Space_Mono,
  Syne,
  Unbounded,
  Work_Sans,
} from "next/font/google";
import type { FontKey } from "./fontCatalog";

/*
 * next/font must be called at module scope with literal options, so every font a brand can pick
 * (see ./fontCatalog.ts) is declared here. Fonts the active brand doesn't use are never downloaded.
 * Keep the "// font: <key>" markers: scripts/export-brand.mjs uses them to keep only a brand's fonts.
 */

// font: archivo
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--f-archivo",
  display: "swap",
  preload: false,
});

// font: anton
const anton = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--f-anton",
  display: "swap",
  preload: false,
});

// font: bebas-neue
const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--f-bebas-neue",
  display: "swap",
  preload: false,
});

// font: syne
const syne = Syne({
  subsets: ["latin"],
  variable: "--f-syne",
  display: "swap",
  preload: false,
});

// font: unbounded
const unbounded = Unbounded({
  subsets: ["latin"],
  variable: "--f-unbounded",
  display: "swap",
  preload: false,
});

// font: oswald
const oswald = Oswald({
  subsets: ["latin"],
  variable: "--f-oswald",
  display: "swap",
  preload: false,
});

// font: instrument-sans
const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--f-instrument-sans",
  display: "swap",
  preload: false,
});

// font: instrument-serif
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--f-instrument-serif",
  display: "swap",
  preload: false,
});

// font: playfair-display
const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--f-playfair-display",
  display: "swap",
  preload: false,
});

// font: fraunces
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--f-fraunces",
  display: "swap",
  preload: false,
});

// font: space-grotesk
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--f-space-grotesk",
  display: "swap",
  preload: false,
});

// font: inter-tight
const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--f-inter-tight",
  display: "swap",
  preload: false,
});

// font: inter
const inter = Inter({
  subsets: ["latin"],
  variable: "--f-inter",
  display: "swap",
  preload: false,
});

// font: dm-sans
const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--f-dm-sans",
  display: "swap",
  preload: false,
});

// font: manrope
const manrope = Manrope({
  subsets: ["latin"],
  variable: "--f-manrope",
  display: "swap",
  preload: false,
});

// font: work-sans
const workSans = Work_Sans({
  subsets: ["latin"],
  variable: "--f-work-sans",
  display: "swap",
  preload: false,
});

// font: jetbrains-mono
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--f-jetbrains-mono",
  display: "swap",
  preload: false,
});

// font: space-mono
const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--f-space-mono",
  display: "swap",
  preload: false,
});

// font: ibm-plex-mono
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--f-ibm-plex-mono",
  display: "swap",
  preload: false,
});

// font: dm-mono
const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--f-dm-mono",
  display: "swap",
  preload: false,
});

export const fonts: Record<FontKey, { variable: string }> = {
  archivo,
  anton,
  "bebas-neue": bebasNeue,
  syne,
  unbounded,
  oswald,
  "instrument-sans": instrumentSans,
  "instrument-serif": instrumentSerif,
  "playfair-display": playfairDisplay,
  fraunces,
  "space-grotesk": spaceGrotesk,
  "inter-tight": interTight,
  inter,
  "dm-sans": dmSans,
  manrope,
  "work-sans": workSans,
  "jetbrains-mono": jetbrainsMono,
  "space-mono": spaceMono,
  "ibm-plex-mono": ibmPlexMono,
  "dm-mono": dmMono,
};

export const fontVariables = Object.values(fonts)
  .map((font) => font.variable)
  .join(" ");
