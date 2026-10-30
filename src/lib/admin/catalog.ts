import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { activeBrandId } from "@/brand/identity";
import { loadProducts, productsFile } from "@/brand/products";
import type { Product } from "@/brand/types";

const root = process.cwd();

/** The admin writes to the project files, so it only runs on the local dev server. */
export const adminEnabled = () => process.env.NODE_ENV !== "production";

export const notFound = () => new Response("Not found", { status: 404 });

/** Public assets (logo, icons) of the active brand. */
export const brandAssetDir = () => join(root, "public", "brands", activeBrandId());
export const brandAssetUrl = (file: string) => `/brands/${activeBrandId()}/${file}`;

export const imageDir = () => join(brandAssetDir(), "products");
export const imageUrl = (file: string) => brandAssetUrl(`products/${file}`);
export const garmentScript = join(root, "scripts", "prepare-garment.mjs");
export const logoScript = join(root, "scripts", "prepare-logo.mjs");

/** Processed images wait here until the product is saved. */
export const workDir = join(tmpdir(), "brand-studio-admin");
export const isToken = (value: unknown): value is string =>
  typeof value === "string" && /^[0-9a-f-]{36}$/.test(value);

export const readCatalog = () => loadProducts();

export async function writeCatalog(products: Product[]) {
  await writeFile(productsFile(), `${JSON.stringify(products, null, 2)}\n`, "utf8");
}

/** File name of a product image inside imageDir, ignoring any ?v= cache buster. */
export const imageFileName = (url: string) => url.split("?")[0].split("/").pop() ?? "";
