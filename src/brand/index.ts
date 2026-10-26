import type { CSSProperties } from "react";
import type { BrandConfig, Product, ProductColor } from "./types";
import type { FontKey } from "./fonts";
import offcut from "@/brands/offcut";

const fontFamily = (key: FontKey) => `var(--f-${key})`;

const brands: Record<string, BrandConfig> = {
  offcut,
};

const activeId = process.env.NEXT_PUBLIC_BRAND ?? "offcut";

export const brand: BrandConfig = brands[activeId] ?? offcut;

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

export function formatPrice(value: number, config: BrandConfig = brand) {
  return new Intl.NumberFormat(config.locale, {
    style: "currency",
    currency: config.currency,
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

/** The requested color of a product, falling back to its first (default) color. */
export function getColor(product: Product, colorId?: string | null): ProductColor {
  return product.colors.find((color) => color.id === colorId) ?? product.colors[0];
}

export type { BrandConfig, Product, ProductColor, ProductSize } from "./types";
