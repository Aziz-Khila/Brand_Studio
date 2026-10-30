import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { BrandConfig, BrandColors, FooterColumn, NavLink } from "@/brand/types";
import { fontCatalog, isFontKey } from "@/brand/fontCatalog";
import { loadBrand, saveBrand } from "@/brand/identity";
import { adminEnabled, notFound } from "@/lib/admin/catalog";

const bad = (error: string) => Response.json({ error }, { status: 400 });

const text = (value: unknown, label: string, max: number, required = true): string => {
  const result = typeof value === "string" ? value.trim() : "";
  if (required && !result) throw new Error(`${label} can't be empty.`);
  if (result.length > max) throw new Error(`${label} is too long (max ${max} characters).`);
  return result;
};

const COLOR_KEYS: (keyof BrandColors)[] = ["background", "surface", "ink", "muted", "accent", "onInk"];
const isHex = (value: unknown): value is string => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
/** Section anchors (#manifesto), site paths (/about) or full addresses. */
const isHref = (href: string) => /^(#[\w-]*|\/[^\s]*|https?:\/\/[^\s.]+\.[^\s]+|mailto:\S+@\S+|tel:\+?[\d\s()-]+)$/i.test(href);

function links(value: unknown, label: string, max: number): NavLink[] {
  if (!Array.isArray(value)) throw new Error(`Invalid ${label}.`);
  if (value.length > max) throw new Error(`Keep ${label} to ${max} links or fewer.`);
  return value.map((raw, i) => {
    const link = (raw ?? {}) as Record<string, unknown>;
    const name = text(link.label, `${label}: link ${i + 1} name`, 30);
    const href = text(link.href, `${label}: ${name} address`, 300);
    if (!isHref(href)) throw new Error(`${label}: ${name} needs a section (#…), a page (/…) or a full https:// address.`);
    return { label: name, href };
  });
}

function validCurrency(code: string) {
  try {
    return Intl.supportedValuesOf("currency").includes(code);
  } catch {
    return /^[A-Z]{3}$/.test(code);
  }
}

/** Validates the parts present in `patch` and merges them over the saved brand. */
function merge(current: BrandConfig, patch: Record<string, unknown>): BrandConfig {
  const next: BrandConfig = structuredClone(current);

  if ("name" in patch) next.name = text(patch.name, "The brand name", 40);
  if ("description" in patch) next.description = text(patch.description, "The description", 300);
  if ("locale" in patch) {
    const locale = text(patch.locale, "The locale", 20);
    if (!Intl.NumberFormat.supportedLocalesOf(locale).length) throw new Error(`"${locale}" isn't a locale this browser knows.`);
    next.locale = locale;
  }
  if ("currency" in patch) {
    const currency = text(patch.currency, "The currency", 3).toUpperCase();
    if (!validCurrency(currency)) throw new Error(`"${currency}" isn't an ISO currency code.`);
    next.currency = currency;
  }
  if ("freeShippingThreshold" in patch) {
    const value = patch.freeShippingThreshold;
    if (value === null || value === "" || value === 0) delete next.freeShippingThreshold;
    else if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100000) {
      throw new Error("The free-shipping threshold must be an amount (or empty to hide it).");
    } else next.freeShippingThreshold = Math.round(value * 100) / 100;
  }

  if ("logo" in patch) {
    const logo = (patch.logo ?? {}) as Record<string, unknown>;
    if ("text" in logo) next.logo.text = text(logo.text, "The text logo", 40);
    // Images come from the upload route; here they can only be removed.
    if (logo.image === null) {
      delete next.logo.image;
      delete next.logo.aspectRatio;
    }
    if (logo.mark === null) delete next.logo.mark;
  }

  if ("colors" in patch) {
    const colors = (patch.colors ?? {}) as Record<string, unknown>;
    for (const key of COLOR_KEYS) {
      if (!(key in colors)) continue;
      if (!isHex(colors[key])) throw new Error(`The ${key} color must be a hex color like #1A1A1A.`);
      next.colors[key] = (colors[key] as string).toUpperCase();
    }
  }

  if ("typography" in patch) {
    const type = (patch.typography ?? {}) as Record<string, unknown>;
    for (const role of ["display", "body", "mono"] as const) {
      if (!(role in type)) continue;
      if (!isFontKey(type[role])) throw new Error(`Unknown ${role} font.`);
      next.typography[role] = type[role];
    }
    const info = fontCatalog[next.typography.display];
    if ("displayWeight" in type) {
      const weight = Number(type.displayWeight);
      if (!Number.isFinite(weight)) throw new Error("Invalid display weight.");
      next.typography.displayWeight = Math.round(Math.min(info.weights[1], Math.max(info.weights[0], weight)) / 50) * 50;
    }
    if ("displayStretch" in type) {
      const stretch = Number.parseFloat(String(type.displayStretch));
      const range: readonly [number, number] = "width" in info ? info.width : [100, 100];
      if (!Number.isFinite(stretch)) throw new Error("Invalid display width.");
      next.typography.displayStretch = `${Math.round(Math.min(range[1], Math.max(range[0], stretch)))}%`;
    }
    // A newly picked display font may not support the saved weight or width.
    const weight = next.typography.displayWeight ?? 700;
    next.typography.displayWeight = Math.min(info.weights[1], Math.max(info.weights[0], weight));
    if (!("width" in info)) next.typography.displayStretch = "100%";
  }

  if ("nav" in patch) next.nav = links(patch.nav, "The header menu", 6);
  if ("footer" in patch) {
    const columns = ((patch.footer ?? {}) as Record<string, unknown>).columns;
    if (!Array.isArray(columns)) throw new Error("Invalid footer columns.");
    if (columns.length > 3) throw new Error("Keep the footer to 3 columns or fewer.");
    next.footer = {
      columns: columns.map((raw, i): FooterColumn => {
        const column = (raw ?? {}) as Record<string, unknown>;
        const title = text(column.title, `Footer column ${i + 1} title`, 30);
        return { title, links: links(column.links, `“${title}”`, 10) };
      }),
    };
  }

  if ("seo" in patch) {
    const seo = (patch.seo ?? {}) as Record<string, unknown>;
    const nextSeo = { ...next.seo };
    if ("title" in seo) nextSeo.title = text(seo.title, "The page title", 70, false) || undefined;
    if ("description" in seo) nextSeo.description = text(seo.description, "The search description", 200, false) || undefined;
    if ("siteUrl" in seo) {
      const url = text(seo.siteUrl, "The website address", 200, false).replace(/\/+$/, "");
      if (url && !/^https?:\/\/[^\s/.]+\.[^\s]+$/i.test(url)) throw new Error("The website address must look like https://yourbrand.com.");
      nextSeo.siteUrl = url || undefined;
    }
    if (seo.ogImage === null) delete nextSeo.ogImage;
    next.seo = JSON.parse(JSON.stringify(nextSeo));
  }

  return next;
}

/** The generated favicon is filled with the ink color; keep it in step when that color changes. */
async function recolorFavicon(brand: BrandConfig, previousInk: string) {
  if (!brand.favicon || brand.colors.ink === previousInk) return;
  const file = brand.favicon.split("?")[0];
  if (!file.startsWith(`/brands/${brand.id}/`) || !file.endsWith(".svg")) return;
  const path = join(process.cwd(), "public", ...file.split("/").filter(Boolean));
  const svg = await readFile(path, "utf8").catch(() => null);
  if (!svg) return;
  await writeFile(path, svg.replace(/fill="#[0-9a-f]{3,8}"/gi, `fill="${brand.colors.ink}"`), "utf8");
  brand.favicon = `${file}?v=${Date.now().toString(36)}`;
}

export async function GET() {
  if (!adminEnabled()) return notFound();
  return Response.json({ brand: await loadBrand() });
}

export async function PATCH(request: Request) {
  if (!adminEnabled()) return notFound();
  const patch = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!patch || typeof patch !== "object") return bad("Nothing to save.");
  try {
    const current = await loadBrand();
    const brand = merge(current, patch);
    await recolorFavicon(brand, current.colors.ink);
    await saveBrand(brand);
    return Response.json({ brand });
  } catch (error) {
    return bad((error as Error).message);
  }
}
