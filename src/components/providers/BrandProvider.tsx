"use client";

import { createContext, useCallback, useContext, type ReactNode } from "react";
import { formatPrice } from "@/brand";
import type { BrandConfig } from "@/brand/types";

const BrandContext = createContext<BrandConfig | null>(null);

/** Makes the brand identity (brand.json, loaded on the server) available to client components. */
export function BrandProvider({ brand, children }: { brand: BrandConfig; children: ReactNode }) {
  return <BrandContext.Provider value={brand}>{children}</BrandContext.Provider>;
}

export function useBrand() {
  const brand = useContext(BrandContext);
  if (!brand) throw new Error("useBrand must be used inside <BrandProvider>");
  return brand;
}

/** Formats an amount in the brand's currency and locale. */
export function useFormatPrice() {
  const { locale, currency } = useBrand();
  return useCallback((value: number) => formatPrice(value, { locale, currency }), [locale, currency]);
}
