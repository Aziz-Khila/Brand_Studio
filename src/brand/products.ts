import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { brand } from "./index";
import type { Product } from "./types";

/**
 * Each brand's catalog lives in src/brands/<id>/products.json (edited by hand or from /admin).
 * It's read from disk on every render in development, so saved changes show up on the next
 * page load; production builds bake it in at build time.
 */
export const productsFile = (brandId = brand.id) => join(process.cwd(), "src", "brands", brandId, "products.json");

export async function loadProducts(brandId = brand.id): Promise<Product[]> {
  return JSON.parse(await readFile(productsFile(brandId), "utf8")) as Product[];
}
