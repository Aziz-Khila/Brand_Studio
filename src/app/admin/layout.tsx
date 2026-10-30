import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { loadBrand } from "@/brand/identity";
import { adminEnabled } from "@/lib/admin/catalog";
import { AdminShell } from "@/components/admin/AdminShell";

export async function generateMetadata(): Promise<Metadata> {
  const brand = await loadBrand();
  return {
    title: `${brand.name} — Studio`,
    robots: { index: false, follow: false },
  };
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  if (!adminEnabled()) notFound();
  return <AdminShell>{children}</AdminShell>;
}
