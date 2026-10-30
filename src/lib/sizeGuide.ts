import type { FitMeasurements, ProductFit } from "@/brand/types";

export type SizeGuideColumn = { key: keyof FitMeasurements; label: string; hint: string };

/** Measurements shown per garment type, all taken with the piece laid flat. */
export const SIZE_GUIDE_COLUMNS: Record<ProductFit["type"], SizeGuideColumn[]> = {
  top: [
    { key: "chest", label: "Chest", hint: "Armpit to armpit, laid flat" },
    { key: "length", label: "Length", hint: "Highest shoulder point to hem" },
  ],
  dress: [
    { key: "chest", label: "Chest", hint: "Armpit to armpit, laid flat" },
    { key: "waist", label: "Waist", hint: "Narrowest point, laid flat" },
    { key: "length", label: "Length", hint: "Highest shoulder point to hem" },
  ],
  bottom: [
    { key: "waist", label: "Waist", hint: "Waistband edge to edge, laid flat" },
    { key: "hip", label: "Hip", hint: "Widest point below the waist, laid flat" },
    { key: "inseam", label: "Inseam", hint: "Crotch seam to hem" },
  ],
};

/** Columns that have at least one value in the chart. */
export function filledColumns(fit: ProductFit) {
  return SIZE_GUIDE_COLUMNS[fit.type].filter((column) => Object.values(fit.chart).some((row) => row[column.key] !== undefined));
}

export const formatCm = (value: number | undefined) => (value === undefined ? "—" : `${Number.isInteger(value) ? value : value.toFixed(1)}`);
