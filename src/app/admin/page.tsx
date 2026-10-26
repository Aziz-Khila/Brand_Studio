import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { brand } from "@/brand";
import { adminEnabled } from "@/lib/admin/catalog";
import { AdminApp } from "@/components/admin/AdminApp";

export const metadata: Metadata = {
  title: `${brand.name} — Studio`,
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  if (!adminEnabled()) notFound();
  return <AdminApp brandName={brand.name} locale={brand.locale} currency={brand.currency} />;
}
