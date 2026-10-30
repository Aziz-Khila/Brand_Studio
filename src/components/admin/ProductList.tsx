"use client";

import { useEffect, useRef } from "react";
import type { Product } from "@/brand/types";
import { productImage } from "@/lib/productImage";
import { Button } from "./ui";

export function ProductList({
  products,
  selectedId,
  formatPrice,
  onSelect,
  onNew,
  onMove,
}: {
  products: Product[];
  selectedId: string | null;
  formatPrice: (value: number) => string;
  onSelect: (product: Product) => void;
  onNew: () => void;
  onMove: (id: string, offset: -1 | 1) => void;
}) {
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    if (!selectedId) return;
    listRef.current
      ?.querySelector(`[data-product-id="${CSS.escape(selectedId)}"]`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedId]);

  return (
    <div className="flex flex-col lg:max-h-[calc(100dvh-9rem)]">
      <div className="mb-2 flex shrink-0 items-center justify-between">
        <p className="eyebrow text-muted">Products · {products.length}</p>
        <Button onClick={onNew} className="px-3 py-1.5 text-xs">
          + New
        </Button>
      </div>
      <ol
        ref={listRef}
        className="admin-list-scroll -mx-1 max-h-[55dvh] min-h-0 space-y-2 overflow-y-auto overscroll-contain px-1 py-3 lg:max-h-none lg:flex-1"
      >
        {products.map((product, index) => {
          const active = product.id === selectedId;
          return (
            <li
              key={product.id}
              data-product-id={product.id}
              className={`group flex items-center gap-3 rounded-xl border p-2 transition-colors ${
                active ? "border-ink/40 bg-white/70" : "border-transparent hover:border-ink/15 hover:bg-white/40"
              }`}
            >
              <button type="button" onClick={() => onSelect(product)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <span className="relative h-14 w-12 shrink-0 overflow-hidden rounded-lg bg-surface/60">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img {...productImage(product.colors[0].images.front, "thumb")} alt="" className="absolute inset-0 h-full w-full object-contain" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{product.name}</span>
                  <span className="block truncate text-xs text-muted">
                    {product.category} · {formatPrice(product.price)}
                  </span>
                  <span className="mt-1 flex gap-1">
                    {product.colors.map((color) => (
                      <span
                        key={color.id}
                        title={color.name}
                        className="h-2.5 w-2.5 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.15)]"
                        style={{ background: color.swatch }}
                      />
                    ))}
                  </span>
                </span>
              </button>
              <span className="flex flex-col opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  aria-label={`Move ${product.name} up`}
                  disabled={index === 0}
                  onClick={() => onMove(product.id, -1)}
                  className="px-1.5 text-xs text-muted hover:text-ink disabled:opacity-25"
                >
                  ▲
                </button>
                <button
                  type="button"
                  aria-label={`Move ${product.name} down`}
                  disabled={index === products.length - 1}
                  onClick={() => onMove(product.id, 1)}
                  className="px-1.5 text-xs text-muted hover:text-ink disabled:opacity-25"
                >
                  ▼
                </button>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
