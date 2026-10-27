import type { ReactNode } from "react";
import { loadContent } from "@/brand/content";
import { loadProducts } from "@/brand/products";
import { Providers } from "@/components/providers/Providers";

export default async function StoreLayout({ children }: { children: ReactNode }) {
  const [products, content] = await Promise.all([loadProducts(), loadContent()]);
  return (
    <Providers products={products} content={content}>
      {children}
    </Providers>
  );
}
