// Imports a generated still into src/images: at most 2400 px wide, WebP quality 82, metadata
// stripped (sharp drops EXIF by default). astro:assets makes the 800/1200/1600 renditions.
// Usage: node scripts/import-still.mjs <downloaded file> src/images/<name>.webp
import { realpathSync } from "node:fs";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

export async function importStill(input, output, maxWidth = 2400) {
  await sharp(input)
    .resize({ width: maxWidth, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(output);
  return sharp(output).metadata();
}

// Run as a CLI? Compare real paths as file URLs, so symlinks and spaces in the path still match.
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) {
    console.error("usage: node scripts/import-still.mjs <input> <output.webp>");
    process.exit(1);
  }
  const meta = await importStill(input, output);
  console.log(`${output}: ${meta.width}×${meta.height} ${meta.format}`);
}
