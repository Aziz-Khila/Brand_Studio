import { readFileSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { BrandConfig } from "./types";

export const brandsDir = () => join(process.cwd(), "src", "brands");
export const studioFile = () => join(brandsDir(), "studio.json");

/**
 * The brand the site shows: NEXT_PUBLIC_BRAND when set, otherwise the one picked in the
 * studio's brand switcher (src/brands/studio.json, local only), otherwise the demo brand.
 */
export function activeBrandId(): string {
  if (process.env.NEXT_PUBLIC_BRAND) return process.env.NEXT_PUBLIC_BRAND;
  try {
    const { active } = JSON.parse(readFileSync(studioFile(), "utf8")) as { active?: string };
    if (active) return active;
  } catch {
    // No studio file: fall through to the default.
  }
  return "offcut";
}

/**
 * Each brand's identity lives in src/brands/<id>/brand.json (edited by hand or from /admin/brand).
 * Like products.json it's read on every render in development and baked in at build time.
 */
export const brandFile = (brandId = activeBrandId()) => join(brandsDir(), brandId, "brand.json");

export async function loadBrand(brandId = activeBrandId()): Promise<BrandConfig> {
  return JSON.parse(await readFile(brandFile(brandId), "utf8")) as BrandConfig;
}

export async function saveBrand(config: BrandConfig) {
  await writeFile(brandFile(config.id), `${JSON.stringify(config, null, 2)}\n`, "utf8");
}
