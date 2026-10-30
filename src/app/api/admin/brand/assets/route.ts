import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { loadBrand, saveBrand } from "@/brand/identity";
import { adminEnabled, brandAssetDir, brandAssetUrl, logoScript, notFound, workDir } from "@/lib/admin/catalog";

const run = promisify(execFile);
const bad = (error: string, status = 400) => Response.json({ error }, { status });
const MAX_BYTES = 15 * 1024 * 1024;

/**
 * Normalizes any logo file to what scripts/prepare-logo.mjs expects: a dark mark on white.
 * Transparent PNG/SVG logos are traced from their opaque shape (whatever their color);
 * light-on-dark artwork is inverted.
 */
async function toInkOnWhite(input: Buffer): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  const source = () => sharp(input, { density: 300 }).resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true });

  const { data, info } = await source().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const pixels = info.width * info.height;
  let transparent = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] < 128) transparent++;

  if (transparent / pixels > 0.1) {
    const grey = Buffer.alloc(pixels);
    for (let p = 0; p < pixels; p++) grey[p] = 255 - data[p * 4 + 3];
    return sharp(grey, { raw: { width: info.width, height: info.height, channels: 1 } }).png().toBuffer();
  }

  // Opaque artwork: judge the background from the border.
  const flat = await source().flatten({ background: "#ffffff" }).greyscale().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = flat.info;
  let sum = 0;
  let count = 0;
  for (let x = 0; x < width; x++) {
    sum += flat.data[x] + flat.data[(height - 1) * width + x];
    count += 2;
  }
  for (let y = 0; y < height; y++) {
    sum += flat.data[y * width] + flat.data[y * width + width - 1];
    count += 2;
  }
  const image = sharp(flat.data, { raw: { width, height, channels: 1 } });
  return (sum / count < 128 ? image.negate() : image).png().toBuffer();
}

const aspectOf = (svg: string) => {
  const [, , w, h] = (svg.match(/viewBox="([^"]+)"/)?.[1] ?? "0 0 1 1").split(/\s+/).map(Number);
  return Math.round((w / h) * 10000) / 10000;
};

async function trace(source: string, out: string, flags: string[]) {
  try {
    await run(process.execPath, [logoScript, source, out, ...flags], { cwd: process.cwd(), timeout: 120_000 });
  } catch (error) {
    const failure = error as { stderr?: string };
    throw new Error(
      failure.stderr?.includes("No mark found")
        ? "No logo found in that image. Use a logo on a plain background or a transparent PNG/SVG."
        : "Couldn't trace this logo. Try a larger PNG or an SVG.",
    );
  }
  return readFile(out, "utf8");
}

/**
 * Uploads brand artwork and saves it right away (files can't wait in a draft):
 * - logo: traced to a recolorable SVG; optionally its first letter becomes the mark and favicon
 * - mark: a separate symbol, also used for the favicon
 * - og: the link-preview image, cropped to 1200×630
 */
export async function POST(request: Request) {
  if (!adminEnabled()) return notFound();
  const form = await request.formData();
  const kind = form.get("kind");
  const file = form.get("file");
  if (kind !== "logo" && kind !== "mark" && kind !== "og") return bad("Unknown upload.");
  if (!(file instanceof File) || !file.size) return bad("Choose a file to upload.");
  if (file.size > MAX_BYTES) return bad("That file is too large (max 15 MB).");

  const brand = await loadBrand();
  const version = Date.now().toString(36);
  const dir = join(workDir, `brand-${randomUUID()}`);
  const assets = brandAssetDir();
  await mkdir(dir, { recursive: true });
  await mkdir(assets, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    if (kind === "og") {
      const sharp = (await import("sharp")).default;
      await sharp(buffer).rotate().resize(1200, 630, { fit: "cover", position: "attention" }).jpeg({ quality: 84, mozjpeg: true }).toFile(join(assets, "og.jpg"));
      brand.seo = { ...brand.seo, ogImage: `${brandAssetUrl("og.jpg")}?v=${version}` };
    } else {
      const source = join(dir, "source.png");
      await writeFile(source, await toInkOnWhite(buffer));
      const icon = join(dir, "icon.svg");

      if (kind === "logo") {
        const logo = await trace(source, join(dir, "logo.svg"), []);
        await copyFile(join(dir, "logo.svg"), join(assets, "logo.svg"));
        brand.logo = { ...brand.logo, image: `${brandAssetUrl("logo.svg")}?v=${version}`, aspectRatio: aspectOf(logo) };

        if (form.get("markFromLogo") === "true") {
          const mark = await trace(source, join(dir, "mark.svg"), ["--first-glyph"]);
          await trace(source, icon, ["--first-glyph", "--square", "--fill", brand.colors.ink]);
          await copyFile(join(dir, "mark.svg"), join(assets, "mark.svg"));
          brand.logo.mark = { image: `${brandAssetUrl("mark.svg")}?v=${version}`, aspectRatio: aspectOf(mark) };
        } else if (!brand.logo.mark) {
          await trace(source, icon, ["--first-glyph", "--square", "--fill", brand.colors.ink]);
        }
      } else {
        const mark = await trace(source, join(dir, "mark.svg"), []);
        await trace(source, icon, ["--square", "--fill", brand.colors.ink]);
        await copyFile(join(dir, "mark.svg"), join(assets, "mark.svg"));
        brand.logo = { ...brand.logo, mark: { image: `${brandAssetUrl("mark.svg")}?v=${version}`, aspectRatio: aspectOf(mark) } };
      }

      const iconSvg = await readFile(icon, "utf8").catch(() => null);
      if (iconSvg) {
        await writeFile(join(assets, "icon.svg"), iconSvg);
        brand.favicon = `${brandAssetUrl("icon.svg")}?v=${version}`;
      }
    }
    await saveBrand(brand);
    return Response.json({ brand });
  } catch (error) {
    return bad((error as Error).message, 422);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
