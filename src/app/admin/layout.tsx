import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { brand } from "@/brand";
import { adminEnabled } from "@/lib/admin/catalog";
import { AdminShell } from "@/components/admin/AdminShell";

export const metadata: Metadata = {
  title: `${brand.name} — Studio`,
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  if (!adminEnabled()) notFound();
  return <AdminShell>{children}</AdminShell>;
}
