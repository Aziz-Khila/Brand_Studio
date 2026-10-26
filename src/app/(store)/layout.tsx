import type { ReactNode } from "react";
import { loadProducts } from "@/brand/products";
import { Providers } from "@/components/providers/Providers";

export default async function StoreLayout({ children }: { children: ReactNode }) {
  return <Providers products={await loadProducts()}>{children}</Providers>;
}
