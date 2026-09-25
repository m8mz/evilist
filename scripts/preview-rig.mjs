// Draws the rig's part polygons (ember, 40% fill) and pivots (violet dots) over the base pose,
// for tuning src/data/avatar-rig.json by eye.
// Usage: node scripts/preview-rig.mjs [art/journey/base.webp] [out.png]
import { realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

const require = createRequire(import.meta.url);

// Point-in-polygon test using ray casting (even-odd rule)
function isInsidePolygon(point, polygon) {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    const isYinEdgeRange = yi > y !== yj > y;
    if (isYinEdgeRange) {
      const xEdge = ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (x < xEdge) {
        inside = !inside;
      }
    }
  }

  return inside;
}

export async function previewRig(basePath, rig, outPath) {
  const { width, height } = rig.canvas;

  // Create overlay buffer - start with transparent
  const overlay = Buffer.alloc(width * height * 4); // RGBA
  overlay.fill(0);

  // Draw polygons with 40% opacity ember fill
  const emberR = 0xda;
  const emberG = 0x5c;
  const emberB = 0x2c;
  const opacity = 0.4;

  for (const part of rig.parts) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (isInsidePolygon([x, y], part.polygon)) {
          const idx = (y * width + x) * 4;
          overlay[idx + 0] = emberR;
          overlay[idx + 1] = emberG;
          overlay[idx + 2] = emberB;
          overlay[idx + 3] = Math.round(opacity * 255);
        }
      }
    }
  }

  // Draw pivot circles with solid violet fill
  const violetR = 0x70;
  const violetG = 0x40;
  const violetB = 0xd2;
  const circleRadius = 9;

  for (const [cx, cy] of Object.values(rig.pivots)) {
    const radiusSq = circleRadius * circleRadius;
    for (
      let y = Math.max(0, Math.floor(cy - circleRadius));
      y < Math.min(height, Math.ceil(cy + circleRadius));
      y++
    ) {
      for (
        let x = Math.max(0, Math.floor(cx - circleRadius));
        x < Math.min(width, Math.ceil(cx + circleRadius));
        x++
      ) {
        if ((x - cx) ** 2 + (y - cy) ** 2 <= radiusSq) {
          const idx = (y * width + x) * 4;
          overlay[idx + 0] = violetR;
          overlay[idx + 1] = violetG;
          overlay[idx + 2] = violetB;
          overlay[idx + 3] = 255;
        }
      }
    }
  }

  // Load and resize base image
  const baseImage = await sharp(basePath)
    .resize(width, height, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const baseData = Buffer.from(baseImage.data);
  const baseChannels = baseImage.info.channels;

  // Manually blend overlay pixels onto base using alpha blending
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const overlayIdx = (y * width + x) * 4;
      const overlayAlpha = overlay[overlayIdx + 3] / 255;

      if (overlayAlpha > 0) {
        const baseIdx = (y * width + x) * baseChannels;

        // Blend RGB channels
        for (let c = 0; c < 3 && c < baseChannels; c++) {
          baseData[baseIdx + c] = Math.round(
            overlay[overlayIdx + c] * overlayAlpha + baseData[baseIdx + c] * (1 - overlayAlpha),
          );
        }
      }
    }
  }

  // Write result image
  await sharp(baseData, { raw: { width, height, channels: baseChannels } })
    .png()
    .toFile(outPath);
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  const [base = "art/journey/base.webp", out = "rig-preview.png"] = process.argv.slice(2);
  await previewRig(base, require("../src/data/avatar-rig.json"), out);
  console.log(`${out}: rig drawn over ${base}`);
}
