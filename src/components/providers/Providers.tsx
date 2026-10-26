"use client";

import type { ReactNode } from "react";
import type { Product } from "@/brand";
import { StoreProvider } from "./StoreProvider";
import { SmoothScroll } from "./SmoothScroll";
import { CustomCursor } from "@/components/ui/CustomCursor";

export function Providers({ products, children }: { products: Product[]; children: ReactNode }) {
  return (
    <StoreProvider products={products}>
      <SmoothScroll>
        {children}
        <div className="grain" aria-hidden />
        <CustomCursor />
      </SmoothScroll>
    </StoreProvider>
  );
}
