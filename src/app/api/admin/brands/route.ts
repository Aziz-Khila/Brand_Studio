import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { BrandConfig } from "@/brand/types";
import { saveContent } from "@/brand/content";
import { activeBrandId, brandsDir, loadBrand, saveBrand, studioFile } from "@/brand/identity";
import { adminEnabled, notFound } from "@/lib/admin/catalog";
import { starterBrand, starterContent } from "@/lib/admin/starter";

const bad = (error: string, status = 400) => Response.json({ error }, { status });
const isSlug = (value: unknown): value is string => typeof value === "string" && /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/.test(value);

export type BrandSummary = Pick<BrandConfig, "id" | "name" | "colors"> & { logo?: string };

async function listBrands(): Promise<BrandSummary[]> {
  const entries = await readdir(brandsDir(), { withFileTypes: true });
  const brands = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry): Promise<BrandSummary | null> => {
        try {
          const brand = JSON.parse(await readFile(join(brandsDir(), entry.name, "brand.json"), "utf8")) as BrandConfig;
          return { id: brand.id, name: brand.name, colors: brand.colors, logo: brand.logo.image };
        } catch {
          return null;
        }
      }),
  );
  return brands.filter((brand): brand is BrandSummary => brand !== null).sort((a, b) => a.name.localeCompare(b.name));
}

const setActive = (id: string) => writeFile(studioFile(), `${JSON.stringify({ active: id }, null, 2)}\n`, "utf8");

export async function GET() {
  if (!adminEnabled()) return notFound();
  return Response.json({ brands: await listBrands(), active: activeBrandId() });
}

/** Creates a brand (identity, placeholder copy, empty catalog) and switches the studio to it. */
export async function POST(request: Request) {
  if (!adminEnabled()) return notFound();
  const body = (await request.json().catch(() => null)) as { name?: unknown; id?: unknown; from?: unknown } | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 40) return bad("Give the brand a name (up to 40 characters).");
  if (!isSlug(body?.id)) return bad("The id can only use lowercase letters, numbers and dashes.");
  const id = body.id;
  if ((await listBrands()).some((brand) => brand.id === id)) return bad(`A brand with the id "${id}" already exists.`);
  if (process.env.NEXT_PUBLIC_BRAND) return bad("NEXT_PUBLIC_BRAND is set, so the studio can't switch brands. Remove it from your .env file.");

  const starter = starterBrand(id, name);
  let brand = starter;
  if (body?.from === "current") {
    // Same look as the brand being edited; artwork, copy and products start fresh.
    const current = await loadBrand();
    brand = { ...starter, locale: current.locale, currency: current.currency, freeShippingThreshold: current.freeShippingThreshold, colors: current.colors, typography: current.typography, nav: current.nav, footer: current.footer };
  }

  await mkdir(join(brandsDir(), id), { recursive: true });
  await mkdir(join(process.cwd(), "public", "brands", id, "products"), { recursive: true });
  await saveBrand(brand);
  await saveContent(starterContent(name), id);
  await writeFile(join(brandsDir(), id, "products.json"), "[]\n", "utf8");
  await setActive(id);
  return Response.json({ brand });
}

/** Switches the brand the studio (and the local store) shows. */
export async function PUT(request: Request) {
  if (!adminEnabled()) return notFound();
  const body = (await request.json().catch(() => null)) as { active?: unknown } | null;
  if (!isSlug(body?.active)) return bad("Unknown brand.");
  if (!(await listBrands()).some((brand) => brand.id === body.active)) return bad("Unknown brand.", 404);
  if (process.env.NEXT_PUBLIC_BRAND) return bad("NEXT_PUBLIC_BRAND is set, so the studio can't switch brands. Remove it from your .env file.");
  await setActive(body.active);
  return Response.json({ active: body.active });
}
