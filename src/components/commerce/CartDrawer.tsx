"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { getColor } from "@/brand";
import { useBrand, useFormatPrice } from "@/components/providers/BrandProvider";
import { useStore } from "@/components/providers/StoreProvider";
import { useEscape } from "@/hooks/useEscape";
import { productImage } from "@/lib/productImage";

const EASE = [0.76, 0, 0.24, 1] as const;

export function CartDrawer() {
  const { cartOpen, setCartOpen } = useStore();
  const close = () => setCartOpen(false);
  useEscape(close, cartOpen);

  return (
    <AnimatePresence>
      {cartOpen && (
        <>
          <motion.div
            key="cart-backdrop"
            className="fixed inset-0 z-[160] bg-ink/45 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            onClick={close}
          />
          <motion.aside
            key="cart-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Cart"
            className="fixed inset-y-0 right-0 z-[170] flex w-full flex-col bg-bg md:w-[460px]"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.85, ease: EASE }}
          >
            <CartContents onClose={close} />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function CartContents({ onClose }: { onClose: () => void }) {
  const { lines, setQuantity, removeLine, subtotal, itemCount, getProduct } = useStore();
  const [notice, setNotice] = useState(false);
  const formatPrice = useFormatPrice();
  const threshold = useBrand().freeShippingThreshold;
  const remaining = threshold ? Math.max(0, threshold - subtotal) : 0;

  return (
    <>
      <div className="flex items-start justify-between px-5 pb-6 pt-6 md:px-8">
        <h2 className="font-display text-[44px]">
          Cart <span className="text-muted">({itemCount})</span>
        </h2>
        <button type="button" autoFocus onClick={onClose} className="eyebrow link-underline mt-3 pb-0.5">
          Close ✕
        </button>
      </div>

      {threshold && lines.length > 0 && (
        <div className="px-5 pb-6 md:px-8">
          <p className="eyebrow mb-2.5">
            {remaining > 0 ? `${formatPrice(remaining)} away from free shipping` : "Free shipping unlocked"}
          </p>
          <div className="h-[2px] w-full bg-ink/10">
            <motion.div
              className="h-full bg-ink"
              initial={false}
              animate={{ width: `${Math.min(100, (subtotal / threshold) * 100)}%` }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        </div>
      )}

      <div data-lenis-prevent className="flex-1 overflow-y-auto border-t border-ink/15 px-5 md:px-8">
        {lines.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-5 py-16 text-center">
            <p className="font-display text-[34px]">Your cart is empty</p>
            <p className="max-w-[28ch] text-muted">Pick a piece from the collection and it will land right here.</p>
            <button type="button" onClick={onClose} className="eyebrow link-underline mt-2 pb-0.5">
              Back to the collection
            </button>
          </div>
        ) : (
          <ul>
            <AnimatePresence initial={false}>
              {lines.map((line) => {
                const product = getProduct(line.productId);
                if (!product) return null;
                const color = getColor(product, line.colorId);
                return (
                  <motion.li
                    key={`${line.productId}-${line.colorId}-${line.size}`}
                    layout
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 40, transition: { duration: 0.3 } }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="flex gap-4 border-b border-ink/15 py-5"
                  >
                    <div className="h-[118px] w-[96px] shrink-0 bg-surface p-2">
                      <img {...productImage(color.images.front, "thumb")} alt={`${product.name} in ${color.name}`} className="h-full w-full object-contain" />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-display text-[22px]">{product.name}</p>
                        <p className="tabular-nums">{formatPrice(product.price * line.quantity)}</p>
                      </div>
                      <p className="eyebrow mt-1.5 text-muted">
                        Size {line.size} — {color.name}
                      </p>
                      <div className="mt-auto flex items-center justify-between pt-3">
                        <div className="flex items-center border border-ink/20">
                          <button
                            type="button"
                            aria-label="Decrease quantity"
                            onClick={() => setQuantity(line, line.quantity - 1)}
                            className="h-8 w-8 transition-colors hover:bg-ink hover:text-on-ink"
                          >
                            −
                          </button>
                          <span className="eyebrow w-8 text-center tabular-nums">{line.quantity}</span>
                          <button
                            type="button"
                            aria-label="Increase quantity"
                            onClick={() => setQuantity(line, line.quantity + 1)}
                            className="h-8 w-8 transition-colors hover:bg-ink hover:text-on-ink"
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeLine(line)}
                          className="eyebrow link-underline pb-0.5 text-muted"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </div>

      {lines.length > 0 && (
        <div className="border-t border-ink/15 px-5 pb-6 pt-5 md:px-8">
          <div className="flex items-center justify-between">
            <span className="eyebrow">Subtotal</span>
            <span className="font-display text-[30px] tabular-nums">{formatPrice(subtotal)}</span>
          </div>
          <p className="eyebrow mt-1 text-muted">Taxes and shipping calculated at checkout</p>
          <button
            type="button"
            onClick={() => setNotice(true)}
            className="group relative mt-5 flex h-14 w-full items-center justify-center overflow-hidden bg-ink text-on-ink"
          >
            <span className="absolute inset-0 origin-left scale-x-0 bg-accent transition-transform duration-700 ease-expo group-hover:scale-x-100" />
            <span className="eyebrow relative">Checkout</span>
          </button>
          <AnimatePresence>
            {notice && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="eyebrow mt-3 text-center text-muted"
              >
                Checkout is not connected yet — payments arrive in the next phase.
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      )}
    </>
  );
}
