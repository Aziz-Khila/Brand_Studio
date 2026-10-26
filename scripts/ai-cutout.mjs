// Removes the background of one image with a local segmentation model.
//
//   node scripts/ai-cutout.mjs <input> <output.png>
//
// Runs as its own process because @imgly/background-removal-node bundles a different
// sharp/libvips version than the one used by prepare-garment.mjs.
import { readFile, writeFile } from "node:fs/promises";
import { removeBackground } from "@imgly/background-removal-node";

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  console.error("Usage: node scripts/ai-cutout.mjs <input> <output.png>");
  process.exit(1);
}

const type = input.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
const result = await removeBackground(new Blob([await readFile(input)], { type }), {
  model: "medium",
  output: { format: "image/png" },
});
await writeFile(output, Buffer.from(await result.arrayBuffer()));
