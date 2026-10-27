import { brand } from "@/brand";
import { AdminApp } from "@/components/admin/AdminApp";

export default function AdminProductsPage() {
  return <AdminApp locale={brand.locale} currency={brand.currency} />;
}
