// Traces the devil crop of the logo to one path for the journey deck's card back (deck spec §5).
// Opaque pixels (alpha > 128) become the shape; potrace does the rest through trace-vector.mjs.
// One-off: the output is committed as src/images/devil-mark.svg.
// Usage: node scripts/trace-mark.mjs src/images/logo-devil.webp src/images/devil-mark.svg
import { realpathSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import { tracePath } from "./trace-vector.mjs";

export const MARK_FILL = "#3a3a3a";

export async function traceMark(input, output) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  // potrace wants black shapes on white.
  const px = Buffer.alloc(width * height * 3, 255);
  for (let i = 0; i < width * height; i++) {
    if (data[i * 4 + 3] > 128) px[i * 3] = px[i * 3 + 1] = px[i * 3 + 2] = 0;
  }
  const png = await sharp(px, { raw: { width, height, channels: 3 } })
    .png()
    .toBuffer();
  const d = await tracePath(png, { turdSize: 4, decimals: 1 });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><path fill="${MARK_FILL}" d="${d}"/></svg>\n`;
  writeFileSync(output, svg);
  return { width, height, d };
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) {
    console.error("usage: node scripts/trace-mark.mjs <input> <output.svg>");
    process.exit(1);
  }
  const { width, height, d } = await traceMark(input, output);
  console.log(`${output}: ${width}×${height}, ${d.length} path characters`);
}
