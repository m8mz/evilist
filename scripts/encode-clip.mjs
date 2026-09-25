// Encodes a generated journey clip for the web (spec §7.5): 24 fps, no audio track, AV1 WebM and
// H.264 MP4 at 1280 and 640 px wide. Each encode starts at a good quality and steps the CRF up
// until the file fits its limit in scripts/clip-variants.mjs.
// Usage: node scripts/encode-clip.mjs <source.mp4> <stage-id> [out-dir]   (default public/journey)
import { spawnSync } from "node:child_process";
import { mkdirSync, realpathSync, statSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { CLIP_VARIANTS } from "./clip-variants.mjs";

/** Where each codec's CRF search starts, how far it steps, and where it gives up. */
const CRF = {
  webm: { start: 34, step: 4, max: 58 },
  mp4: { start: 24, step: 2, max: 36 },
};

export function ffmpegArgs(input, output, variant, crf) {
  const common = [
    "-y",
    "-v",
    "error",
    "-i",
    input,
    "-an",
    "-vf",
    `scale=${variant.width}:-2:flags=lanczos,fps=24`,
    "-pix_fmt",
    "yuv420p",
  ];
  const codec =
    variant.ext === "webm"
      ? ["-c:v", "libsvtav1", "-preset", "6", "-crf", String(crf), "-g", "120"]
      : [
          "-c:v",
          "libx264",
          "-preset",
          "slow",
          "-profile:v",
          "high",
          "-level:v",
          "4.0",
          "-crf",
          String(crf),
          "-movflags",
          "+faststart",
        ];
  return [...common, ...codec, output];
}

export function encodeClip(input, stageId, outDir = "public/journey", ffmpeg = "ffmpeg") {
  mkdirSync(outDir, { recursive: true });
  return CLIP_VARIANTS.map((variant) => {
    const output = join(outDir, `${stageId}-${variant.width}.${variant.ext}`);
    const { start, step, max } = CRF[variant.ext];
    for (let crf = start; crf <= max; crf += step) {
      const res = spawnSync(ffmpeg, ffmpegArgs(input, output, variant, crf), { encoding: "utf8" });
      if (res.status !== 0) throw new Error(`ffmpeg failed on ${output}: ${res.stderr}`);
      const bytes = statSync(output).size;
      if (bytes <= variant.maxBytes) return { output, bytes, crf };
    }
    throw new Error(`${output} is still over ${variant.maxBytes} bytes at CRF ${max}`);
  });
}

// Run as a CLI? Compare real paths as file URLs, so symlinks and spaces in the path still match.
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  const [input, stageId, outDir] = process.argv.slice(2);
  if (!input || !stageId) {
    console.error("usage: node scripts/encode-clip.mjs <source.mp4> <stage-id> [out-dir]");
    process.exit(1);
  }
  for (const { output, bytes, crf } of encodeClip(input, stageId, outDir)) {
    console.log(`${output}: ${(bytes / 1024).toFixed(0)} KB (crf ${crf})`);
  }
}
