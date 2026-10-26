import type { BrandConfig } from "@/brand/types";

const offcut: BrandConfig = {
  id: "offcut",
  name: "OFFCUT",
  tagline: "Cut from the same cloth.",
  description:
    "OFFCUT is an independent garment studio making heavyweight essentials in small, numbered runs.",
  location: "Paris",
  season: "Drop 01 — FW26",
  locale: "en-GB",
  currency: "EUR",
  freeShippingThreshold: 150,
  logo: {
    text: "OFFCUT",
    image: "/brands/offcut/logo.svg",
    aspectRatio: 1794 / 634,
    mark: { image: "/brands/offcut/mark.svg", aspectRatio: 360 / 634 },
  },
  colors: {
    background: "#ECE8E1",
    surface: "#DDD6CA",
    ink: "#171614",
    muted: "#6F6A62",
    accent: "#8A6A52",
    onInk: "#ECE8E1",
  },
  typography: {
    display: "archivo",
    body: "inter-tight",
    mono: "jetbrains-mono",
    displayStretch: "72%",
    displayWeight: 800,
  },
  ticker: [
    "Drop 01 out now",
    "Paris",
    "Cut from the same cloth",
    "Numbered runs",
    "Free shipping over €150",
    "Made to outlast the season",
  ],
  manifesto: {
    label: "Manifesto",
    text: "We start where the pattern ends. Every OFFCUT piece is cut in small numbered runs from heavyweight cloth, washed twice, and built to be worn until it tells your story better than ours.",
    stats: [
      { value: 250, label: "Pieces per run, max" },
      { value: 2, suffix: "×", label: "Washed before it ships" },
      { value: 0, label: "Restocks. Ever." },
    ],
  },
  nav: [
    { label: "Collection", href: "#collection" },
    { label: "Manifesto", href: "#manifesto" },
    { label: "Categories", href: "#categories" },
  ],
  socials: [
    { label: "Instagram", href: "https://instagram.com" },
    { label: "TikTok", href: "https://tiktok.com" },
    { label: "Pinterest", href: "https://pinterest.com" },
  ],
  footer: {
    newsletterTitle: "Join the list",
    newsletterText: "First access to every drop. No noise, just the pieces.",
    columns: [
      {
        title: "Shop",
        links: [
          { label: "Collection", href: "#collection" },
          { label: "Categories", href: "#categories" },
          { label: "Gift card", href: "#" },
        ],
      },
      {
        title: "Help",
        links: [
          { label: "Shipping", href: "#" },
          { label: "Returns", href: "#" },
          { label: "Size guide", href: "#" },
          { label: "Contact", href: "#" },
        ],
      },
    ],
  },
};

export default offcut;
