"use client";

import type { FitMeasurements, ProductFit } from "@/brand/types";
import { SIZE_GUIDE_COLUMNS } from "@/lib/sizeGuide";
import { Section, Segmented, inputClass } from "./ui";

/** Admin “Size guide”: the garment's flat measurements per size, shown to shoppers in cm. */
export function SizeGuideEditor({
  fit,
  onChange,
  sizeLabels,
  defaultType,
}: {
  fit: ProductFit | null;
  onChange: (fit: ProductFit | null) => void;
  sizeLabels: string[];
  defaultType: ProductFit["type"];
}) {
  const description = "Garment measurements in cm for each size, shown in the quick view so shoppers can compare with clothes they own.";

  if (!fit) {
    return (
      <Section title="Size guide" description={description}>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" checked={false} onChange={() => onChange({ type: defaultType, chart: {} })} />
          Show a size guide for this product
        </label>
      </Section>
    );
  }

  const setMeasurement = (label: string, key: keyof FitMeasurements, raw: string) => {
    const value = raw === "" ? undefined : Number(raw);
    const row = { ...fit.chart[label], [key]: value };
    if (value === undefined || Number.isNaN(value)) delete row[key];
    onChange({ ...fit, chart: { ...fit.chart, [label]: row } });
  };

  const columns = SIZE_GUIDE_COLUMNS[fit.type];

  return (
    <Section
      title="Size guide"
      description={description}
      aside={
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked onChange={() => onChange(null)} />
          Shown on the store
        </label>
      }
    >
      <div className="space-y-5">
        <div>
          <span className="eyebrow text-muted">Garment type</span>
          <div className="mt-1.5">
            <Segmented
              value={fit.type}
              options={[
                { value: "top", label: "Top" },
                { value: "bottom", label: "Bottom" },
                { value: "dress", label: "Dress" },
              ]}
              onChange={(type) => onChange({ type, chart: fit.chart })}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[360px] border-separate border-spacing-y-1.5 text-sm">
            <thead>
              <tr className="text-left">
                <th className="eyebrow pr-3 font-normal text-muted">Size</th>
                {columns.map((column) => (
                  <th key={column.key} className="eyebrow pr-3 font-normal text-muted" title={column.hint}>
                    {column.label} <span className="normal-case tracking-normal">cm</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sizeLabels.map((label) => (
                <tr key={label}>
                  <td className="pr-3 font-semibold">{label}</td>
                  {columns.map((column) => (
                    <td key={column.key} className="pr-3">
                      <input
                        type="number"
                        inputMode="decimal"
                        min={1}
                        step="0.5"
                        value={fit.chart[label]?.[column.key] ?? ""}
                        onChange={(e) => setMeasurement(label, column.key, e.target.value)}
                        className={`${inputClass} max-w-[110px] tabular-nums`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="space-y-1 text-xs text-muted">
          {columns.map((column) => (
            <li key={column.key}>
              <span className="font-semibold text-ink">{column.label}:</span> {column.hint}.
            </li>
          ))}
          <li>Leave a cell empty if you don&apos;t have that measurement. A guide with no values isn&apos;t shown.</li>
        </ul>
      </div>
    </Section>
  );
}
