import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { activeBrandId, brandsDir } from "./identity";
import type { BrandContent } from "./types";

/**
 * Each brand's copy and links live in src/brands/<id>/content.json (edited by hand or from /admin).
 * Like products.json it's read on every render in development and baked in at build time.
 */
export const contentFile = (brandId = activeBrandId()) => join(brandsDir(), brandId, "content.json");

export async function loadContent(brandId = activeBrandId()): Promise<BrandContent> {
  return JSON.parse(await readFile(contentFile(brandId), "utf8")) as BrandContent;
}

export async function saveContent(content: BrandContent, brandId = activeBrandId()) {
  await writeFile(contentFile(brandId), `${JSON.stringify(content, null, 2)}\n`, "utf8");
}
