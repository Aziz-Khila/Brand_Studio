import { execFile, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { activeBrandId } from "@/brand/identity";
import { adminEnabled, notFound } from "@/lib/admin/catalog";

const run = promisify(execFile);
const exportScript = join(process.cwd(), "scripts", "export-brand.mjs");
const exportDir = (id: string) => join(process.cwd(), "..", "Brand Studio Exports", id);

/** Where the active brand exports to, and whether it already has been. */
export async function GET() {
  if (!adminEnabled()) return notFound();
  const out = exportDir(activeBrandId());
  return Response.json({ out, exists: existsSync(out), zip: existsSync(`${out}.zip`) ? `${out}.zip` : null });
}

/**
 * Exports the active brand as a standalone store (scripts/export-brand.mjs).
 * `{ reveal: true }` instead opens the export folder in the file manager.
 */
export async function POST(request: Request) {
  if (!adminEnabled()) return notFound();
  const body = (await request.json().catch(() => ({}))) as { zip?: unknown; reveal?: unknown };
  const out = exportDir(activeBrandId());

  if (body.reveal === true) {
    if (!existsSync(out)) return Response.json({ error: "Export the brand first." }, { status: 404 });
    const opener = process.platform === "win32" ? "explorer.exe" : process.platform === "darwin" ? "open" : "xdg-open";
    spawn(opener, [out], { detached: true, stdio: "ignore" }).unref();
    return Response.json({ ok: true });
  }

  const args = [exportScript, activeBrandId(), out];
  if (body.zip === true) args.push("--zip");
  try {
    const { stdout } = await run(process.execPath, args, { cwd: process.cwd(), timeout: 5 * 60 * 1000, maxBuffer: 10 * 1024 * 1024 });
    const result = stdout.split(/\r?\n/).find((line) => line.startsWith("RESULT "));
    return Response.json(result ? JSON.parse(result.slice(7)) : { out });
  } catch (error) {
    const failure = error as { stderr?: string; message?: string };
    return Response.json({ error: (failure.stderr || failure.message || "Export failed.").trim() }, { status: 500 });
  }
}
