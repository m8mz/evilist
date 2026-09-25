// Imports a generated render into art/journey: fitted onto the canvas (letterboxed with white,
// never cropped; a smaller render is scaled up to the canvas), flattened, lossless WebP so the
// trace is exact.
// Usage: node scripts/import-art.mjs <render> art/journey/<name>.webp <width> <height>
//   base and outfits: 1000 1500   props and energy: 1500 1500
import { realpathSync } from "node:fs";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

export async function importArt(input, output, width, height) {
  await sharp(input)
    .flatten({ background: "#ffffff" })
    .resize(width, height, { fit: "contain", background: "#ffffff" })
    .webp({ lossless: true })
    .toFile(output);
  return sharp(output).metadata();
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  const [input, output, width, height] = process.argv.slice(2);
  if (!input || !output || !width || !height) {
    console.error("usage: node scripts/import-art.mjs <render> <out.webp> <width> <height>");
    process.exit(1);
  }
  const meta = await importArt(input, output, Number(width), Number(height));
  console.log(`${output}: ${meta.width}×${meta.height} ${meta.format}`);
}
