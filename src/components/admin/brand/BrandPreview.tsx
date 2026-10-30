"use client";

import { brandCssVariables, formatPrice } from "@/brand";
import type { BrandConfig, BrandContent, Product } from "@/brand/types";
import { productImage } from "@/lib/productImage";
import { DraftLogo, MaskImage } from "./assets";

const safePrice = (value: number, brand: BrandConfig) => {
  try {
    return formatPrice(value, brand);
  } catch {
    return String(value);
  }
};

/** A miniature store page painted with the draft's colors, fonts and logo. */
export function BrandPreview({ brand, content, product }: { brand: BrandConfig; content: BrandContent | null; product: Product | null }) {
  const mark = brand.logo.mark;
  return (
    <div
      style={brandCssVariables(brand)}
      className="overflow-hidden rounded-2xl border border-ink/10 bg-bg font-sans text-ink shadow-[0_30px_70px_-35px_rgba(23,22,20,0.55)]"
    >
      <div className="flex h-11 items-center justify-between gap-3 border-b border-ink/10 px-4">
        <span className="text-[16px]">
          <DraftLogo brand={brand} className="h-[13px]" />
        </span>
        <span className="flex min-w-0 gap-3 overflow-hidden">
          {brand.nav.slice(0, 3).map((link, i) => (
            <span key={i} className="eyebrow truncate !text-[9px]">
              {link.label || "…"}
            </span>
          ))}
        </span>
        <span className="eyebrow !text-[9px]">Cart (0)</span>
      </div>

      <div className="relative h-[220px] overflow-hidden">
        <p className="font-display absolute inset-x-0 top-[22%] whitespace-nowrap text-center text-[92px] leading-none text-surface">
          <DraftLogo fit brand={brand} className="w-[86%]" />
        </p>
        <div className="absolute inset-0 grid place-items-center pb-6">
          {product ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img {...productImage(product.colors[0].images.front, "thumb")} sizes="150px" alt="" className="h-[150px] w-auto object-contain drop-shadow-[0_18px_24px_rgba(0,0,0,0.18)]" />
          ) : mark ? (
            <MaskImage src={mark.image} aspectRatio={mark.aspectRatio} className="h-[110px]" />
          ) : null}
        </div>
        <div className="absolute inset-x-0 bottom-3 text-center">
          <p className="font-display text-[20px]">{product?.name ?? brand.name}</p>
          <p className="eyebrow mt-1 !text-[9px] text-muted">
            {product ? `${product.category} — ${safePrice(product.price, brand)}` : safePrice(120, brand)}
          </p>
        </div>
      </div>

      <div className="eyebrow flex h-7 items-center gap-4 overflow-hidden whitespace-nowrap bg-ink px-4 !text-[9px] text-on-ink">
        {(content?.ticker ?? ["Free shipping", "Small runs", "Made to last"]).slice(0, 4).map((item, i) => (
          <span key={i}>{item}</span>
        ))}
      </div>

      <div className="px-4 py-5">
        <p className="eyebrow !text-[9px] text-muted">(01) {content?.manifesto.label ?? "Manifesto"}</p>
        <p className="font-display mt-2 text-[24px]">{content?.tagline ?? "Your tagline"}</p>
        <p className="mt-2 line-clamp-3 text-[12px] leading-relaxed text-muted">{brand.description}</p>
        <span className="mt-3 inline-block border-b border-accent pb-0.5 text-[12px] text-accent">Accent link</span>
      </div>

      <div className="bg-ink px-4 pb-4 pt-5 text-on-ink">
        <div className="grid grid-cols-3 gap-3">
          {brand.footer.columns.slice(0, 3).map((column, i) => (
            <div key={i} className="min-w-0">
              <p className="eyebrow mb-1.5 truncate !text-[8px] text-on-ink/40">{column.title || "…"}</p>
              {column.links.slice(0, 3).map((link, j) => (
                <p key={j} className="eyebrow truncate !text-[8px]">
                  {link.label || "…"}
                </p>
              ))}
            </div>
          ))}
        </div>
        <div className="mt-5 flex items-end justify-between gap-3 border-t border-on-ink/15 pt-3 text-[30px]">
          <DraftLogo fit brand={brand} className="h-[22px] max-w-[70%]" />
          <span className="eyebrow !text-[8px] text-on-ink/50">© {brand.name}</span>
        </div>
      </div>
    </div>
  );
}
