import { access, copyFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import type { FitMeasurements, Product, ProductColor, ProductFit, ProductSize } from "@/brand/types";
import {
  adminEnabled,
  imageDir,
  imageFileName,
  imageUrl,
  isToken,
  notFound,
  readCatalog,
  workDir,
  writeCatalog,
} from "@/lib/admin/catalog";

const bad = (error: string, status = 400) => Response.json({ error }, { status });
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SIDES = ["front", "back"] as const;

/** A color as sent by the admin: existing images to keep, or a processed upload (token) to save. */
type ColorInput = Omit<ProductColor, "images"> & { images?: ProductColor["images"]; token?: string };
type ProductInput = Omit<Product, "colors"> & { colors: ColorInput[] };

const text = (value: Record<string, unknown>, key: string) =>
  typeof value[key] === "string" ? (value[key] as string).trim() : "";

function readSizes(input: unknown): ProductSize[] {
  return Array.isArray(input)
    ? (input as ProductSize[])
        .filter((size) => size && typeof size.label === "string" && size.label.trim())
        .map((size) => ({ label: size.label.trim(), available: Boolean(size.available) }))
    : [];
}

function readColor(input: unknown, index: number): ColorInput | string {
  if (!input || typeof input !== "object") return `Color ${index + 1} is invalid.`;
  const value = input as Record<string, unknown>;
  const name = text(value, "name");
  const label = name || `Color ${index + 1}`;
  const id = text(value, "id");
  if (!name) return `${label}: give the color a name.`;
  if (!SLUG.test(id)) return `${label}: the id may only use lowercase letters, numbers and dashes.`;
  const swatch = text(value, "swatch");
  if (!/^#[0-9a-f]{6}$/i.test(swatch)) return `${label}: pick a swatch color.`;
  const sizes = readSizes(value.sizes);
  if (!sizes.length) return `${label}: add at least one size.`;

  const token = value.token;
  if (token !== undefined && token !== null) {
    if (!isToken(token)) return `${label}: invalid upload.`;
    return { id, name, swatch, sizes, token };
  }
  const images = value.images as Record<string, unknown> | undefined;
  const ownImage = (url: unknown) => typeof url === "string" && url.startsWith(imageUrl(""));
  if (!images || !ownImage(images.front) || !ownImage(images.back)) return `${label}: process its photos first.`;
  return { id, name, swatch, sizes, images: { front: images.front as string, back: images.back as string } };
}

const FIT_TYPES = ["top", "bottom", "dress"] as const;
const MEASUREMENTS = ["chest", "waist", "hip", "length", "inseam"] as const;

/** Size guide: a known type and plausible cm values for sizes of the run (empty guides are dropped). */
function readFit(input: unknown, sizeLabels: string[]): ProductFit | undefined | string {
  if (input === undefined || input === null) return undefined;
  if (typeof input !== "object") return "Invalid size guide.";
  const value = input as Record<string, unknown>;
  const type = FIT_TYPES.find((t) => t === value.type);
  if (!type) return "Pick a garment type for the size guide (top, bottom or dress).";

  const chart: ProductFit["chart"] = {};
  const rawChart = (value.chart && typeof value.chart === "object" ? value.chart : {}) as Record<string, unknown>;
  for (const label of sizeLabels) {
    const row = rawChart[label] as Record<string, unknown> | undefined;
    if (!row || typeof row !== "object") continue;
    const measurements: FitMeasurements = {};
    for (const key of MEASUREMENTS) {
      const cm = row[key];
      if (cm === undefined || cm === null || cm === "") continue;
      if (typeof cm !== "number" || !Number.isFinite(cm) || cm <= 0 || cm >= 300) {
        return `Size ${label}: ${key} must be a measurement in cm.`;
      }
      measurements[key] = Math.round(cm * 10) / 10;
    }
    if (Object.keys(measurements).length) chart[label] = measurements;
  }

  return Object.keys(chart).length ? { type, chart } : undefined;
}

function readProduct(input: unknown): ProductInput | string {
  if (!input || typeof input !== "object") return "Missing product.";
  const value = input as Record<string, unknown>;
  const id = text(value, "id");
  if (!SLUG.test(id)) return "The id may only use lowercase letters, numbers and dashes.";
  const name = text(value, "name");
  if (!name) return "Give the product a name.";
  const price = Number(value.price);
  if (!Number.isFinite(price) || price < 0) return "Enter a valid price.";
  const details = Array.isArray(value.details)
    ? (value.details as unknown[]).filter((d): d is string => typeof d === "string").map((d) => d.trim()).filter(Boolean)
    : [];

  if (!Array.isArray(value.colors) || !value.colors.length) return "Add at least one color.";
  const colors: ColorInput[] = [];
  for (const [index, raw] of (value.colors as unknown[]).entries()) {
    const color = readColor(raw, index);
    if (typeof color === "string") return color;
    if (colors.some((c) => c.id === color.id)) return `Two colors use the id "${color.id}".`;
    colors.push(color);
  }

  const footwear = value.kind === "footwear";
  const fit = footwear ? undefined : readFit(value.fit, colors[0].sizes.map((size) => size.label));
  if (typeof fit === "string") return fit;

  return {
    id,
    name,
    category: text(value, "category"),
    price,
    description: text(value, "description"),
    details,
    colors,
    ...(text(value, "badge") ? { badge: text(value, "badge") } : {}),
    ...(footwear ? { kind: "footwear" as const } : {}),
    ...(fit ? { fit } : {}),
  };
}

const filesOf = (product: Product) => product.colors.flatMap((color) => SIDES.map((side) => imageFileName(color.images[side])));

/** Deletes image files of `previous` that no product in the catalog uses anymore. */
async function removeOrphans(previous: Product[], catalog: Product[]) {
  const used = new Set(catalog.flatMap(filesOf));
  const candidates = new Set(previous.flatMap(filesOf));
  for (const file of candidates) if (file && !used.has(file)) await rm(join(imageDir(), file), { force: true });
}

export async function GET() {
  if (!adminEnabled()) return notFound();
  return Response.json({ products: await readCatalog() });
}

/** Creates or updates a product with all its colors. */
export async function POST(request: Request) {
  if (!adminEnabled()) return notFound();
  const body = (await request.json().catch(() => null)) as { product?: unknown; originalId?: unknown } | null;
  const input = readProduct(body?.product);
  if (typeof input === "string") return bad(input);

  const products = await readCatalog();
  const originalId = typeof body?.originalId === "string" ? body.originalId : null;
  const index = originalId ? products.findIndex((p) => p.id === originalId) : -1;
  if (originalId && index === -1) return bad("This product no longer exists.", 404);
  if (products.some((p, i) => p.id === input.id && i !== index)) return bad(`Another product already uses the id "${input.id}".`);

  const version = Date.now().toString(36);
  await mkdir(imageDir(), { recursive: true });
  const colors: ProductColor[] = [];
  for (const { token, images, ...color } of input.colors) {
    if (token) {
      const dir = join(workDir, token);
      const saved = { front: "", back: "" };
      try {
        for (const side of SIDES) {
          const file = `${input.id}-${color.id}-${side}.png`;
          await copyFile(join(dir, `garment-${side}.png`), join(imageDir(), file));
          saved[side] = `${imageUrl(file)}?v=${version}`;
        }
      } catch {
        return bad(`${color.name}: the processed photos expired. Process them again.`, 410);
      }
      await rm(dir, { recursive: true, force: true });
      colors.push({ ...color, images: saved });
    } else {
      try {
        for (const side of SIDES) await access(join(imageDir(), imageFileName(images![side])));
      } catch {
        return bad(`${color.name}: its images are missing. Process its photos again.`);
      }
      colors.push({ ...color, images: images! });
    }
  }

  const product: Product = { ...input, colors };
  const previous = index >= 0 ? [products[index]] : [];
  if (index >= 0) products[index] = product;
  else products.push(product);
  await writeCatalog(products);
  await removeOrphans(previous, products);
  return Response.json({ product, products });
}

/** Reorders the catalog: body { ids: string[] } in the new order. */
export async function PUT(request: Request) {
  if (!adminEnabled()) return notFound();
  const body = (await request.json().catch(() => null)) as { ids?: unknown } | null;
  const products = await readCatalog();
  const ids = Array.isArray(body?.ids) ? (body.ids as unknown[]) : [];
  if (ids.length !== products.length || !products.every((p) => ids.includes(p.id))) return bad("Invalid order.");
  const ordered = ids.map((id) => products.find((p) => p.id === id)!);
  await writeCatalog(ordered);
  return Response.json({ products: ordered });
}

export async function DELETE(request: Request) {
  if (!adminEnabled()) return notFound();
  const id = new URL(request.url).searchParams.get("id");
  const products = await readCatalog();
  const product = products.find((p) => p.id === id);
  if (!product) return bad("Product not found.", 404);
  const remaining = products.filter((p) => p !== product);
  await writeCatalog(remaining);
  await removeOrphans([product], remaining);
  return Response.json({ products: remaining });
}
