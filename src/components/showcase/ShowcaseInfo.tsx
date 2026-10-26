"use client";

import { useRef } from "react";
import { motion } from "motion/react";
import { brand, formatPrice, type Product, type ProductColor } from "@/brand";
import { gsap, SplitText, useGSAP } from "@/lib/gsap";
import { ColorSwatches } from "@/components/commerce/ColorSwatches";

export type Side = "front" | "back";

type Props = {
  product: Product;
  color: ProductColor;
  onColorChange: (colorId: string) => void;
  side: Side;
  ready: boolean;
  onSideChange: (side: Side) => void;
  onAvailability: () => void;
};

export function ShowcaseInfo({ product, color, onColorChange, side, ready, onSideChange, onAvailability }: Props) {
  const nameRef = useRef<HTMLHeadingElement>(null);
  const metaRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!ready || !nameRef.current) return;
      const split = SplitText.create(nameRef.current, { type: "chars", mask: "chars" });
      gsap.from(split.chars, {
        yPercent: 115,
        duration: 0.9,
        ease: "expo.out",
        stagger: { each: 0.016, from: "center" },
      });
      gsap.from(metaRef.current, { opacity: 0, y: 10, duration: 0.7, ease: "power3.out", delay: 0.12 });
    },
    { dependencies: [product.id, ready], revertOnUpdate: true },
  );

  return (
    <div
      className={`pointer-events-none absolute inset-x-0 z-[110] flex flex-col items-center px-6 text-center transition-opacity duration-700 ${
        ready ? "opacity-100" : "opacity-0"
      }`}
      style={{ bottom: "calc(var(--ticker-h) + 26px)" }}
    >
      <h2
        key={product.id}
        ref={nameRef}
        className="font-display max-w-[16ch] text-[clamp(34px,4.4vw,68px)] md:max-w-none"
      >
        {product.name}
      </h2>

      <div key={`${product.id}-meta`} ref={metaRef} className="mt-3 flex items-center gap-3 text-muted">
        {product.badge && (
          <span className="eyebrow flex items-center gap-1.5 text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            {product.badge}
          </span>
        )}
        <span className="eyebrow">
          {product.category} — {color.name} — <span className="text-ink">{formatPrice(product.price)}</span>
        </span>
      </div>

      <div className="pointer-events-auto mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
        <ColorSwatches colors={product.colors} selectedId={color.id} onSelect={onColorChange} size={16} />
        <div role="radiogroup" aria-label="Garment side" className="flex rounded-full border border-ink/20 p-[3px]">
          {(["front", "back"] as const).map((value) => {
            const selected = side === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onSideChange(value)}
                className="relative isolate px-4 py-1.5"
              >
                {selected && (
                  <motion.span
                    layoutId="showcase-side-pill"
                    className="absolute inset-0 -z-10 rounded-full bg-ink"
                    transition={{ type: "spring", stiffness: 420, damping: 36 }}
                  />
                )}
                <span className={`eyebrow transition-colors duration-300 ${selected ? "text-on-ink" : "text-ink"}`}>
                  {value}
                </span>
              </button>
            );
          })}
        </div>
        <button type="button" onClick={onAvailability} className="eyebrow link-underline pb-0.5">
          See availability
        </button>
      </div>
    </div>
  );
}

/** Shown under the brand mark that opens the carousel. */
export function ShowcaseIntro({ ready, pieces, onExplore }: { ready: boolean; pieces: number; onExplore: () => void }) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const metaRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!ready || !titleRef.current) return;
      const split = SplitText.create(titleRef.current, { type: "chars", mask: "chars" });
      gsap.from(split.chars, { yPercent: 115, duration: 0.9, ease: "expo.out", stagger: { each: 0.014, from: "center" } });
      gsap.from(metaRef.current, { opacity: 0, y: 10, duration: 0.7, ease: "power3.out", delay: 0.12 });
    },
    { dependencies: [ready], revertOnUpdate: true },
  );

  return (
    <div
      className={`pointer-events-none absolute inset-x-0 z-[110] flex flex-col items-center px-6 text-center transition-opacity duration-700 ${
        ready ? "opacity-100" : "opacity-0"
      }`}
      style={{ bottom: "calc(var(--ticker-h) + 26px)" }}
    >
      <h2 ref={titleRef} className="font-display max-w-[18ch] text-[clamp(34px,4.4vw,68px)] md:max-w-none">
        {brand.tagline}
      </h2>

      <div ref={metaRef} className="mt-3 text-muted">
        <span className="eyebrow">
          {brand.season} — {pieces} pieces — {brand.location}
        </span>
      </div>

      <div className="pointer-events-auto mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
        <button
          type="button"
          onClick={onExplore}
          className="group relative isolate overflow-hidden rounded-full bg-ink px-5 py-2.5 text-on-ink"
        >
          <span className="absolute inset-0 -z-10 origin-left scale-x-0 bg-accent transition-transform duration-700 ease-expo group-hover:scale-x-100" />
          <span className="eyebrow">Explore the collection →</span>
        </button>
        <a href="#categories" className="eyebrow link-underline pb-0.5">
          Shop by category
        </a>
      </div>
    </div>
  );
}
