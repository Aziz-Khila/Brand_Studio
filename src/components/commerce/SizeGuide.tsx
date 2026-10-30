"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { ProductFit } from "@/brand";
import { filledColumns, formatCm } from "@/lib/sizeGuide";

/** Garment measurements in cm: the selected size inline, every size in an expandable table. */
export function SizeGuide({ fit, sizes, selected }: { fit: ProductFit; sizes: string[]; selected: string | null }) {
  const [open, setOpen] = useState(false);
  const columns = filledColumns(fit);
  if (!columns.length) return null;
  const rows = sizes.filter((label) => fit.chart[label]);
  const current = selected ? fit.chart[selected] : undefined;

  return (
    <div className="mt-3">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-muted">
          {current ? (
            <>
              <span className="font-medium text-ink">{selected}</span>
              {" — "}
              {columns
                .filter((column) => current[column.key] !== undefined)
                .map((column) => `${column.label} ${formatCm(current[column.key])} cm`)
                .join(" · ")}
            </>
          ) : (
            "Pick a size to see its measurements."
          )}
        </p>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="eyebrow link-underline shrink-0 pb-0.5"
        >
          Size guide {open ? "↑" : "↓"}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <table className="mt-4 w-full border-collapse text-sm tabular-nums">
              <thead>
                <tr className="border-b border-ink/15 text-left">
                  <th className="eyebrow py-2 pr-3 font-normal text-muted">Size</th>
                  {columns.map((column) => (
                    <th key={column.key} className="eyebrow py-2 pr-3 font-normal text-muted" title={column.hint}>
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((label) => (
                  <tr
                    key={label}
                    className={`border-b border-ink/10 transition-colors ${label === selected ? "bg-ink text-on-ink" : ""}`}
                  >
                    <td className="eyebrow py-2.5 pl-2 pr-3">{label}</td>
                    {columns.map((column) => (
                      <td key={column.key} className="py-2.5 pr-3">
                        {formatCm(fit.chart[label][column.key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs leading-relaxed text-muted">
              In cm, measured with the garment laid flat:{" "}
              {columns.map((column) => `${column.label.toLowerCase()} ${column.hint.charAt(0).toLowerCase()}${column.hint.slice(1)}`).join("; ")}.
              Compare with a piece you own that fits you well.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
