import type { CSSProperties } from "react";
import { fontFamily } from "./fontCatalog";
import type { BrandConfig, Product, ProductColor } from "./types";

/*
 * Pure helpers shared by the server and the browser. The brand itself is data
 * (src/brands/<id>/brand.json): load it with loadBrand() on the server, read it
 * with useBrand() in client components.
 */

export function brandCssVariables(config: BrandConfig): CSSProperties {
  const { colors, typography } = config;
  return {
    "--brand-bg": colors.background,
    "--brand-surface": colors.surface,
    "--brand-ink": colors.ink,
    "--brand-muted": colors.muted,
    "--brand-accent": colors.accent,
    "--brand-on-ink": colors.onInk,
    "--brand-font-display": fontFamily(typography.display),
    "--brand-font-body": fontFamily(typography.body),
    "--brand-font-mono": fontFamily(typography.mono),
    "--brand-display-stretch": typography.displayStretch ?? "100%",
    "--brand-display-weight": String(typography.displayWeight ?? 700),
  } as CSSProperties;
}

export function formatPrice(value: number, config: Pick<BrandConfig, "locale" | "currency">) {
  return new Intl.NumberFormat(config.locale, {
    style: "currency",
    currency: config.currency,
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

/** Names of the two views of a product (its front and back images). */
export function viewLabels(product: Product): Record<"front" | "back", string> {
  return product.kind === "footwear" ? { front: "Outside", back: "Inside" } : { front: "Front", back: "Back" };
}

/** The requested color of a product, falling back to its first (default) color. */
export function getColor(product: Product, colorId?: string | null): ProductColor {
  return product.colors.find((color) => color.id === colorId) ?? product.colors[0];
}

export type {
  BrandConfig,
  BrandContent,
  FitMeasurements,
  FooterColumn,
  NavLink,
  Product,
  ProductColor,
  ProductFit,
  ProductSize,
} from "./types";
