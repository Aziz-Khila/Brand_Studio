import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "lenis/dist/lenis.css";
import "./globals.css";
import { brandCssVariables } from "@/brand";
import { loadContent } from "@/brand/content";
import { fontVariables } from "@/brand/fonts";
import { loadBrand } from "@/brand/identity";
import { BrandProvider } from "@/components/providers/BrandProvider";

/** Base for absolute share links: the brand's address, else the Vercel deployment, else the dev server. */
function siteUrl(configured?: string) {
  if (configured) return configured;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  return vercel ? `https://${vercel}` : `http://localhost:${process.env.PORT ?? 3000}`;
}

export async function generateMetadata(): Promise<Metadata> {
  const [brand, { tagline }] = await Promise.all([loadBrand(), loadContent()]);
  const title = brand.seo?.title || `${brand.name} — ${tagline}`;
  const description = brand.seo?.description || brand.description;
  const ogImage = brand.seo?.ogImage;
  return {
    metadataBase: new URL(siteUrl(brand.seo?.siteUrl)),
    title,
    description,
    icons: brand.favicon ? { icon: brand.favicon } : undefined,
    openGraph: {
      title,
      description,
      siteName: brand.name,
      type: "website",
      ...(ogImage ? { images: [{ url: ogImage, width: 1200, height: 630 }] } : {}),
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const brand = await loadBrand();
  return { themeColor: brand.colors.background };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const brand = await loadBrand();
  return (
    <html lang={brand.locale.split("-")[0] || "en"} className={fontVariables} style={brandCssVariables(brand)}>
      {/* Browser extensions (e.g. ColorZilla's cz-shortcut-listen) add attributes to <body> before React loads. */}
      <body suppressHydrationWarning>
        <BrandProvider brand={brand}>{children}</BrandProvider>
      </body>
    </html>
  );
}
