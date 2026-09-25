// Draws the rig's part polygons (ember, 40% fill) and pivots (violet dots) over the base pose,
// for tuning src/data/avatar-rig.json by eye.
// Usage: node scripts/preview-rig.mjs [art/journey/base.webp] [out.png]
import { realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

const require = createRequire(import.meta.url);

export async function previewRig(basePath, rig, outPath) {
  const { width, height } = rig.canvas;
  const polygons = rig.parts
    .map(
      (p) =>
        `<polygon points="${p.polygon.map(([x, y]) => `${x},${y}`).join(" ")}" fill="#da5c2c" fill-opacity="0.4" stroke="#da5c2c" stroke-width="3"/>`,
    )
    .join("");
  const pivots = Object.values(rig.pivots)
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="#7040d2"/>`)
    .join("");
  const overlay = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${polygons}${pivots}</svg>`,
  );
  await sharp(basePath)
    .resize(width, height, { fit: "fill" })
    .composite([{ input: overlay }])
    .removeAlpha()
    .png()
    .toFile(outPath);
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  const [base = "art/journey/base.webp", out = "rig-preview.png"] = process.argv.slice(2);
  await previewRig(base, require("../src/data/avatar-rig.json"), out);
  console.log(`${out}: rig drawn over ${base}`);
}
