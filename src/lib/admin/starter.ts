import type { BrandConfig, BrandContent } from "@/brand/types";

/** Neutral identity for a brand started from scratch. */
export const starterBrand = (id: string, name: string): BrandConfig => ({
  id,
  name,
  description: `${name} makes considered pieces in small runs.`,
  locale: "en-GB",
  currency: "EUR",
  freeShippingThreshold: 150,
  logo: { text: name.toUpperCase() },
  colors: { background: "#F7F7F5", surface: "#E9E9E6", ink: "#111111", muted: "#6B6B6B", accent: "#2F4BFF", onInk: "#F7F7F5" },
  typography: { display: "space-grotesk", body: "inter", mono: "dm-mono", displayStretch: "100%", displayWeight: 700 },
  nav: [
    { label: "Collection", href: "#collection" },
    { label: "Manifesto", href: "#manifesto" },
    { label: "Categories", href: "#categories" },
  ],
  footer: {
    columns: [
      {
        title: "Shop",
        links: [
          { label: "Collection", href: "#collection" },
          { label: "Categories", href: "#categories" },
        ],
      },
      {
        title: "Help",
        links: [
          { label: "Shipping", href: "#" },
          { label: "Returns", href: "#" },
          { label: "Contact", href: "#" },
        ],
      },
    ],
  },
  seo: {},
});

/** Placeholder copy for a new brand, meant to be rewritten on the Texts page. */
export const starterContent = (name: string): BrandContent => ({
  tagline: "Made to be worn, again and again.",
  season: "Drop 01",
  location: "Your city",
  ticker: ["New collection out now", "Free shipping over 150", "Small runs, made to last"],
  manifesto: {
    label: "Manifesto",
    text: `${name} starts with the cloth. Every piece is cut in small runs, finished by hand and made to outlast the season it was released in.`,
  },
  newsletter: {
    title: "Join the list",
    text: "First access to every drop. No noise, just the pieces.",
  },
  socials: [],
});
