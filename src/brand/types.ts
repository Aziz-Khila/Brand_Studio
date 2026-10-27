import type { FontKey } from "./fonts";

export type BrandColors = {
  /** Page background. */
  background: string;
  /** Secondary surfaces: panels, image wells, giant background type. */
  surface: string;
  /** Primary text, lines, ticker and footer background. */
  ink: string;
  /** Secondary text. */
  muted: string;
  /** Single accent used sparingly (hover states, highlights). */
  accent: string;
  /** Text color placed on top of `ink` surfaces. */
  onInk: string;
};

export type BrandTypography = {
  display: FontKey;
  body: FontKey;
  mono: FontKey;
  /** CSS font-stretch applied to display type, e.g. "75%" for a condensed cut. */
  displayStretch?: string;
  /** CSS font-weight applied to display type. */
  displayWeight?: number;
};

export type ProductSize = {
  label: string;
  available: boolean;
};

export type ProductColor = {
  /** Unique within its product, e.g. "forest-green". */
  id: string;
  /** Shown to shoppers, e.g. "Forest green". */
  name: string;
  /** Swatch color, e.g. "#304031". */
  swatch: string;
  /** Transparent cut-out images (PNG, WebP or SVG) in a 640×760 frame, see scripts/prepare-garment.mjs. */
  images: {
    front: string;
    back: string;
  };
  /** Size run with availability for this color. */
  sizes: ProductSize[];
};

export type Product = {
  id: string;
  name: string;
  category: string;
  /** Price in the brand currency's major unit. */
  price: number;
  description: string;
  details: string[];
  /** At least one; the first is shown by default. */
  colors: ProductColor[];
  /** Optional badge, e.g. "New" or "Last pieces". */
  badge?: string;
};

export type NavLink = {
  label: string;
  href: string;
};

export type BrandConfig = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  location: string;
  /** Current season / drop label shown in the header. */
  season: string;
  locale: string;
  currency: string;
  /** Order subtotal (major unit) that unlocks free shipping. Omit to hide the progress bar. */
  freeShippingThreshold?: number;
  logo: {
    /** Wordmark used when no image is provided. */
    text: string;
    /** Single-color SVG (see scripts/prepare-logo.mjs); it's recolored to fit each section. */
    image?: string;
    /** Width ÷ height of the image, so it can be sized from one side. */
    aspectRatio?: number;
    /** Standalone symbol (single-color SVG); when set, the carousel opens on it before the products. */
    mark?: { image: string; aspectRatio: number };
  };
  colors: BrandColors;
  typography: BrandTypography;
  ticker: string[];
  manifesto: {
    label: string;
    text: string;
  };
  nav: NavLink[];
  socials: NavLink[];
  footer: {
    newsletterTitle: string;
    newsletterText: string;
    columns: { title: string; links: NavLink[] }[];
  };
  /* Products live next to the config in products.json, see src/brand/products.ts. */
};
