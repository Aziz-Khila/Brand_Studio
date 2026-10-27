import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "lenis/dist/lenis.css";
import "./globals.css";
import { brand, brandCssVariables } from "@/brand";
import { loadContent } from "@/brand/content";
import { fontVariables } from "@/brand/fonts";

export async function generateMetadata(): Promise<Metadata> {
  const { tagline } = await loadContent();
  return {
    title: `${brand.name} — ${tagline}`,
    description: brand.description,
    openGraph: {
      title: brand.name,
      description: brand.description,
      type: "website",
    },
  };
}

export const viewport: Viewport = {
  themeColor: brand.colors.background,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={fontVariables} style={brandCssVariables(brand)}>
      {/* Browser extensions (e.g. ColorZilla's cz-shortcut-listen) add attributes to <body> before React loads. */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
