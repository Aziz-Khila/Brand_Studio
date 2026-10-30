// Exports one brand as a standalone store project for the client: no admin, no image tooling,
// no other brands, only the fonts that brand uses.
//
//   node scripts/export-brand.mjs <brand-id> [out-dir] [--zip]
//
// Default output: "<parent of this project>/Brand Studio Exports/<brand-id>".
// Re-exporting into an existing folder replaces its files but keeps .git and node_modules,
// so a client repository can simply be refreshed.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const zip = args.includes("--zip");
const [id, outArg] = args.filter((arg) => !arg.startsWith("--"));

if (!id || !/^[a-z0-9-]+$/.test(id)) {
  console.error("Usage: node scripts/export-brand.mjs <brand-id> [out-dir] [--zip]");
  process.exit(1);
}
const brandDir = join(root, "src", "brands", id);
if (!existsSync(join(brandDir, "brand.json"))) {
  console.error(`No brand "${id}" (expected src/brands/${id}/brand.json).`);
  process.exit(1);
}
const brand = JSON.parse(await readFile(join(brandDir, "brand.json"), "utf8"));
const out = resolve(outArg ?? join(root, "..", "Brand Studio Exports", id));
if (out === root || out.startsWith(root + sep)) {
  console.error("Export outside the studio folder (Next.js would pick the copy up as part of the studio).");
  process.exit(1);
}

/** Studio-only paths, relative to the project root with forward slashes. */
const EXCLUDED = [
  "src/app/admin",
  "src/app/api/admin",
  "src/components/admin",
  "src/lib/admin",
  "src/lib/color.ts",
  "src/brands/studio.json",
];
const ROOT_FILES = ["tsconfig.json", "next.config.ts", "postcss.config.mjs", ".gitignore"];
const STUDIO_ONLY_DEPENDENCIES = ["@imgly/background-removal-node", "potrace", "sharp"];

const posix = (path) => path.split(sep).join("/");
function keep(source) {
  const path = posix(relative(root, source));
  if (EXCLUDED.some((excluded) => path === excluded || path.startsWith(`${excluded}/`))) return false;
  // Only this brand's data and assets.
  const brandData = path.match(/^src\/brands\/([^/]+)/);
  if (brandData && brandData[1] !== id) return false;
  const brandAssets = path.match(/^public\/brands\/([^/]+)/);
  if (brandAssets && brandAssets[1] !== id) return false;
  // Search-console verification files belong to the studio's own domain.
  if (/^public\/google[0-9a-f]+\.html$/.test(path)) return false;
  return true;
}

// 1. Fresh output folder (keeping a client repo's history and installed packages).
await mkdir(out, { recursive: true });
for (const entry of await readdir(out)) {
  if (entry === ".git" || entry === "node_modules") continue;
  await rm(join(out, entry), { recursive: true, force: true });
}

// 2. Copy the store.
await cp(join(root, "src"), join(out, "src"), { recursive: true, filter: keep });
await cp(join(root, "public"), join(out, "public"), { recursive: true, filter: keep });
for (const file of ROOT_FILES) if (existsSync(join(root, file))) await cp(join(root, file), join(out, file));

// 3. Remove folders left empty by the exclusions (e.g. src/app/api).
async function pruneEmpty(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) await pruneEmpty(join(dir, entry.name));
  }
  if ((await readdir(dir)).length === 0) await rm(dir, { recursive: true });
}
await pruneEmpty(join(out, "src"));

// 4. Rewrites.
// 4a. The brand is fixed: no studio switcher.
await writeFile(
  join(out, "src", "brand", "identity.ts"),
  `import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { BrandConfig } from "./types";

export const brandsDir = () => join(process.cwd(), "src", "brands");

/** This store's brand (its files live in src/brands/${id}). */
export const activeBrandId = () => ${JSON.stringify(id)};

export const brandFile = (brandId = activeBrandId()) => join(brandsDir(), brandId, "brand.json");

export async function loadBrand(brandId = activeBrandId()): Promise<BrandConfig> {
  return JSON.parse(await readFile(brandFile(brandId), "utf8")) as BrandConfig;
}
`,
);

// 4b. Only the brand's three fonts, preloaded.
const fontsSource = await readFile(join(root, "src", "brand", "fonts.ts"), "utf8");
const blocks = new Map();
for (const match of fontsSource.matchAll(/\/\/ font: ([\w-]+)\r?\nconst (\w+) = (\w+)\(\{[\s\S]*?\r?\n\}\);/g)) {
  blocks.set(match[1], { name: match[2], loader: match[3], code: match[0] });
}
const used = [...new Set([brand.typography.display, brand.typography.body, brand.typography.mono])];
const missing = used.filter((key) => !blocks.has(key));
if (missing.length) throw new Error(`Font${missing.length > 1 ? "s" : ""} not found in src/brand/fonts.ts: ${missing.join(", ")}`);
const chosen = used.map((key) => ({ key, ...blocks.get(key) }));
await writeFile(
  join(out, "src", "brand", "fonts.ts"),
  `import { ${[...new Set(chosen.map((font) => font.loader))].sort().join(", ")} } from "next/font/google";

/*
 * The fonts used by ${brand.name} (display, body, labels), see src/brands/${id}/brand.json.
 * next/font needs every font declared here at module scope; to switch fonts, declare the new one
 * the same way (https://nextjs.org/docs/app/getting-started/fonts) and use its key in brand.json.
 */

${chosen.map((font) => font.code.replace(/\r?\n\s*preload: false,/, "")).join("\n\n")}

export const fonts = {
${chosen.map((font) => `  ${JSON.stringify(font.key)}: ${font.name},`).join("\n")}
};

export const fontVariables = Object.values(fonts)
  .map((font) => font.variable)
  .join(" ");
`,
);

// 4c. package.json without the studio tooling.
const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
pkg.name = id;
pkg.version = "1.0.0";
delete pkg.scripts["export-brand"];
for (const dependency of STUDIO_ONLY_DEPENDENCIES) {
  delete pkg.dependencies?.[dependency];
  delete pkg.devDependencies?.[dependency];
}
await writeFile(join(out, "package.json"), `${JSON.stringify(pkg, null, 2)}\n`);

// 4d. .gitignore without studio entries.
const gitignore = await readFile(join(out, ".gitignore"), "utf8").catch(() => "");
await writeFile(
  join(out, ".gitignore"),
  gitignore
    .split(/\r?\n/)
    .filter((line) => !/studio/i.test(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n"),
);

// 4e. A README for the client.
await writeFile(
  join(out, "README.md"),
  `# ${brand.name}

The online store of ${brand.name}, built with [Next.js](https://nextjs.org).

## Run it locally

Requires [Node.js](https://nodejs.org) 20 or newer.

\`\`\`bash
npm install
npm run dev
\`\`\`

Then open http://localhost:3000.

## Put it online

The simplest host is [Vercel](https://vercel.com): push this folder to a GitHub repository, choose
"Add New Project" on Vercel, import the repository and keep the default settings.
Any host that runs Next.js works too (\`npm run build\` then \`npm start\`).

## Where things live

| What | File |
| --- | --- |
| Name, colors, fonts, menu, footer, search & sharing | \`src/brands/${id}/brand.json\` |
| Texts (tagline, manifesto, ticker, newsletter) and social links | \`src/brands/${id}/content.json\` |
| Products (names, prices, colors, sizes, size guides) | \`src/brands/${id}/products.json\` |
| Logo, icons and product photos | \`public/brands/${id}/\` |

Edit a file, save, and the site updates (reload the page while \`npm run dev\` is running).
Product photos are transparent PNGs in a 640×760 frame.
`,
);

// 5. Sanity checks: nothing studio-only left, and every local import resolves.
const files = [];
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walk(path);
    else files.push(path);
  }
}
await walk(join(out, "src"));
const problems = [];
const resolves = (base) =>
  ["", ".ts", ".tsx", ".js", ".mjs", ".json", "/index.ts", "/index.tsx"].some((ext) => existsSync(base + ext));
for (const file of files.filter((path) => /\.(tsx?|mjs)$/.test(path))) {
  const code = await readFile(file, "utf8");
  const where = posix(relative(out, file));
  const withoutComments = code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  if (/["'`][^"'`]*\/admin\b|adminEnabled|lib\/admin|components\/admin/.test(withoutComments)) problems.push(`${where} still uses the admin`);
  for (const [, spec] of code.matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g)) {
    const target = spec.startsWith("@/") ? join(out, "src", spec.slice(2)) : spec.startsWith(".") ? resolve(dirname(file), spec) : null;
    if (target && !resolves(target)) problems.push(`${where} imports missing "${spec}"`);
  }
}
if (problems.length) {
  console.error(`Export check failed:\n- ${problems.join("\n- ")}`);
  process.exit(2);
}

// 6. Optional zip next to the folder (without node_modules or .git).
let zipPath = null;
if (zip) {
  zipPath = `${out}.zip`;
  await rm(zipPath, { force: true });
  const name = basename(out);
  if (process.platform === "win32") {
    execFileSync("tar.exe", ["-a", "-c", "-f", zipPath, "--exclude", `${name}/node_modules`, "--exclude", `${name}/.git`, "--exclude", `${name}/.next`, "-C", dirname(out), name]);
  } else {
    execFileSync("zip", ["-rq", zipPath, name, "-x", `${name}/node_modules/*`, `${name}/.git/*`, `${name}/.next/*`], { cwd: dirname(out) });
  }
}

const size = (await Promise.all(files.map((file) => stat(file)))).reduce((sum, info) => sum + info.size, 0);
console.log(`Exported ${brand.name} to ${out} (${files.length} source files, ${(size / 1024).toFixed(0)} KB of source)`);
if (zipPath) console.log(`Zipped to ${zipPath}`);
console.log(`RESULT ${JSON.stringify({ out, zip: zipPath, files: files.length, fonts: used })}`);
