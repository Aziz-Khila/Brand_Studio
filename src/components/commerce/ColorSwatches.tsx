"use client";

import type { ProductColor } from "@/brand";

/** Round color picker; renders nothing for single-color products unless `always` is set. */
export function ColorSwatches({
  colors,
  selectedId,
  onSelect,
  size = 18,
  always = false,
  className = "",
}: {
  colors: ProductColor[];
  selectedId: string;
  onSelect?: (colorId: string) => void;
  size?: number;
  always?: boolean;
  className?: string;
}) {
  if (colors.length < 2 && !always) return null;
  return (
    <div role="radiogroup" aria-label="Color" className={`flex items-center gap-2 ${className}`}>
      {colors.map((color) => {
        const selected = color.id === selectedId;
        return (
          <button
            key={color.id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={color.name}
            title={color.name}
            disabled={!onSelect}
            onClick={(event) => {
              event.stopPropagation();
              onSelect?.(color.id);
            }}
            className={`grid place-items-center rounded-full border transition-colors duration-300 disabled:cursor-default ${
              selected ? "border-ink" : "border-transparent enabled:hover:border-ink/35"
            }`}
            style={{ width: size + 8, height: size + 8 }}
          >
            <span
              className="block rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]"
              style={{ width: size, height: size, background: color.swatch }}
            />
          </button>
        );
      })}
    </div>
  );
}
