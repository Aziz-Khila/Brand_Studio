import type { BrandConfig } from "@/brand/types";

const offcut: BrandConfig = {
  id: "offcut",
  name: "OFFCUT",
  description:
    "OFFCUT is an independent garment studio making heavyweight essentials in small, numbered runs.",
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
