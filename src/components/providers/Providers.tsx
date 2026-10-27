"use client";

import type { ReactNode } from "react";
import type { BrandContent, Product } from "@/brand";
import { ContentProvider } from "./ContentProvider";
import { StoreProvider } from "./StoreProvider";
import { SmoothScroll } from "./SmoothScroll";
import { CustomCursor } from "@/components/ui/CustomCursor";

export function Providers({
  products,
  content,
  children,
}: {
  products: Product[];
  content: BrandContent;
  children: ReactNode;
}) {
  return (
    <ContentProvider content={content}>
      <StoreProvider products={products}>
        <SmoothScroll>
          {children}
          <div className="grain" aria-hidden />
          <CustomCursor />
        </SmoothScroll>
      </StoreProvider>
    </ContentProvider>
  );
}
