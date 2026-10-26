"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, type Variants } from "motion/react";
import { brand, formatPrice, type Product } from "@/brand";
import { useStore } from "@/components/providers/StoreProvider";
import { useEscape } from "@/hooks/useEscape";
import { ColorSwatches } from "./ColorSwatches";

const EASE = [0.76, 0, 0.24, 1] as const;

const list: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.35 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
};

export function QuickView() {
  const { quickViewProduct, closeQuickView } = useStore();
  useEscape(closeQuickView, !!quickViewProduct);

  return (
    <AnimatePresence>
      {quickViewProduct && <QuickViewPanel key={quickViewProduct.id} product={quickViewProduct} />}
    </AnimatePresence>
  );
}

function QuickViewPanel({ product }: { product: Product }) {
  const { closeQuickView, addToCart, setCartOpen, colorOf, selectColor } = useStore();
  const color = colorOf(product);
  const [side, setSide] = useState<"front" | "back">("front");
  const [size, setSize] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) return;
    const timeout = window.setTimeout(() => {
      closeQuickView();
      setCartOpen(true);
    }, 900);
    return () => window.clearTimeout(timeout);
  }, [added, closeQuickView, setCartOpen]);

  const onAdd = () => {
    if (!size) {
      setAttempts((value) => value + 1);
      return;
    }
    addToCart({ productId: product.id, colorId: color.id, size });
    setAdded(true);
  };

  const changeColor = (colorId: string) => {
    selectColor(product.id, colorId);
    const next = product.colors.find((c) => c.id === colorId);
    if (size && !next?.sizes.some((s) => s.label === size && s.available)) setSize(null);
  };

  return (
    <>
      <motion.div
        className="fixed inset-0 z-[160] bg-ink/45 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.5, delay: 0.2 } }}
        transition={{ duration: 0.5 }}
        onClick={closeQuickView}
      />
      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-label={product.name}
        className="fixed inset-y-0 right-0 z-[170] flex w-full flex-col overflow-hidden bg-bg md:w-[min(94vw,1040px)] md:flex-row"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ duration: 0.9, ease: EASE }}
      >
        <div className="relative h-[44svh] shrink-0 bg-surface md:h-auto md:w-1/2">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.img
              key={`${color.id}-${side}`}
              src={color.images[side]}
              alt={`${product.name} in ${color.name}, ${side}`}
              className="absolute inset-[8%] h-[84%] w-[84%] object-contain"
              initial={{ opacity: 0, scale: 0.96, rotateY: side === "back" ? -25 : 25 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              style={{ transformPerspective: 1200 }}
            />
          </AnimatePresence>

          {product.badge && (
            <span className="eyebrow absolute left-5 top-5 flex items-center gap-1.5 text-accent md:left-8 md:top-8">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              {product.badge}
            </span>
          )}

          <div className="absolute bottom-5 left-5 flex gap-2 md:bottom-8 md:left-8">
            {(["front", "back"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setSide(value)}
                aria-pressed={side === value}
                className={`h-[76px] w-[64px] border bg-bg/60 p-1.5 transition-colors duration-300 ${
                  side === value ? "border-ink" : "border-transparent hover:border-ink/30"
                }`}
              >
                <img src={color.images[value]} alt={`Show ${value}`} className="h-full w-full object-contain" />
              </button>
            ))}
          </div>
        </div>

        <motion.div
          data-lenis-prevent
          className="flex flex-1 flex-col overflow-y-auto px-5 pb-8 pt-5 md:px-10 md:pb-10 md:pt-8"
          variants={list}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={item} className="flex items-center justify-between">
            <span className="eyebrow text-muted">
              {product.category} — {color.name}
            </span>
            <button type="button" autoFocus onClick={closeQuickView} className="eyebrow link-underline pb-0.5">
              Close ✕
            </button>
          </motion.div>

          <motion.h2 variants={item} className="font-display mt-8 text-[clamp(44px,5.2vw,84px)]">
            {product.name}
          </motion.h2>
          <motion.p variants={item} className="mt-4 text-[22px] tabular-nums">
            {formatPrice(product.price)}
          </motion.p>
          <motion.p variants={item} className="mt-5 max-w-[46ch] text-muted">
            {product.description}
          </motion.p>

          {product.colors.length > 1 && (
            <motion.div variants={item} className="mt-9">
              <p className="eyebrow mb-3">
                Color <span className="text-muted">— {color.name}</span>
              </p>
              <ColorSwatches colors={product.colors} selectedId={color.id} onSelect={changeColor} size={22} className="-ml-1" />
            </motion.div>
          )}

          <motion.div variants={item} className={product.colors.length > 1 ? "mt-7" : "mt-9"}>
            <div className="mb-3 flex items-center justify-between">
              <span className="eyebrow">Select size</span>
              <AnimatePresence>
                {attempts > 0 && !size && (
                  <motion.span
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="eyebrow text-accent"
                  >
                    Pick a size first
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <motion.div
              key={attempts}
              animate={attempts > 0 && !size ? { x: [0, -10, 10, -6, 6, 0] } : undefined}
              transition={{ duration: 0.45 }}
              className="grid grid-cols-6 gap-1.5"
            >
              {color.sizes.map((option) => {
                const selected = size === option.label;
                return (
                  <button
                    key={option.label}
                    type="button"
                    disabled={!option.available}
                    onClick={() => setSize(option.label)}
                    aria-pressed={selected}
                    className={`eyebrow h-12 border transition-colors duration-300 disabled:cursor-not-allowed disabled:text-ink/30 disabled:line-through ${
                      selected ? "border-ink bg-ink text-on-ink" : "border-ink/20 enabled:hover:border-ink"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </motion.div>
          </motion.div>

          <motion.div variants={item} className="mt-6">
            <button
              type="button"
              onClick={onAdd}
              disabled={added}
              className="group relative flex h-14 w-full items-center justify-between overflow-hidden bg-ink px-6 text-on-ink"
            >
              <span className="absolute inset-0 origin-left scale-x-0 bg-accent transition-transform duration-700 ease-expo group-hover:scale-x-100" />
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={added ? "added" : "add"}
                  initial={{ y: 16, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -16, opacity: 0 }}
                  transition={{ duration: 0.35 }}
                  className="eyebrow relative"
                >
                  {added ? "Added to cart ✓" : "Add to cart"}
                </motion.span>
              </AnimatePresence>
              <span className="eyebrow relative tabular-nums">{formatPrice(product.price)}</span>
            </button>
            {brand.freeShippingThreshold && (
              <p className="eyebrow mt-3 text-muted">
                Free shipping over {formatPrice(brand.freeShippingThreshold)} — 30 day returns
              </p>
            )}
          </motion.div>

          <motion.ul variants={item} className="mt-10 border-t border-ink/15">
            {product.details.map((detail) => (
              <li key={detail} className="flex items-center justify-between border-b border-ink/15 py-3.5 text-[15px]">
                {detail}
                <span className="h-1 w-1 rounded-full bg-ink/40" />
              </li>
            ))}
          </motion.ul>
        </motion.div>
      </motion.aside>
    </>
  );
}
