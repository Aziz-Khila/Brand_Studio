import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { promisify } from "node:util";
import { adminEnabled, garmentScript, notFound, workDir } from "@/lib/admin/catalog";

const run = promisify(execFile);
const IMAGE_TYPES = [".jpg", ".jpeg", ".png", ".webp", ".avif", ".tif", ".tiff"];
const DAY = 24 * 60 * 60 * 1000;

async function pruneOldWork() {
  const entries = await readdir(workDir).catch(() => []);
  await Promise.all(
    entries.map(async (entry) => {
      const dir = join(workDir, entry);
      const info = await stat(dir).catch(() => null);
      if (info && Date.now() - info.mtimeMs > DAY) await rm(dir, { recursive: true, force: true });
    }),
  );
}

async function saveUpload(file: File, dir: string, side: string) {
  const ext = extname(file.name).toLowerCase();
  const path = join(dir, `source-${side}${IMAGE_TYPES.includes(ext) ? ext : ".png"}`);
  await writeFile(path, Buffer.from(await file.arrayBuffer()));
  return path;
}

/** Runs scripts/prepare-garment.mjs on an uploaded front/back pair and returns the cut-outs as previews. */
export async function POST(request: Request) {
  if (!adminEnabled()) return notFound();

  const form = await request.formData();
  const front = form.get("front");
  const back = form.get("back");
  if (!(front instanceof File) || !(back instanceof File)) {
    return Response.json({ error: "Upload both a front and a back photo." }, { status: 400 });
  }

  await pruneOldWork();
  const token = randomUUID();
  const dir = join(workDir, token);
  await mkdir(dir, { recursive: true });
  const frontPath = await saveUpload(front, dir, "front");
  const backPath = await saveUpload(back, dir, "back");

  const args = [garmentScript, frontPath, backPath, dir, "garment"];
  const ai = form.get("ai");
  if (ai === "force") args.push("--ai");
  if (ai === "off") args.push("--no-ai");
  if (form.get("hood") === "true") args.push("--hood");

  const tidy = (output: string) =>
    output
      .split(/\r?\n/)
      .map((line) => line.replaceAll(frontPath, "Front").replaceAll(backPath, "Back").trim())
      .filter((line) => line && !line.startsWith("wrote "));

  try {
    const { stdout, stderr } = await run(process.execPath, args, {
      cwd: process.cwd(),
      timeout: 5 * 60 * 1000,
      maxBuffer: 10 * 1024 * 1024,
    });
    const read = async (side: string) =>
      `data:image/png;base64,${(await readFile(join(dir, `garment-${side}.png`))).toString("base64")}`;
    return Response.json({
      token,
      front: await read("front"),
      back: await read("back"),
      log: tidy(`${stdout}\n${stderr}`),
    });
  } catch (error) {
    await rm(dir, { recursive: true, force: true });
    const failure = error as { stdout?: string; stderr?: string; message?: string };
    return Response.json(
      {
        error: "Processing failed.",
        log: tidy(`${failure.stdout ?? ""}\n${failure.stderr ?? failure.message ?? ""}`),
      },
      { status: 500 },
    );
  }
}
