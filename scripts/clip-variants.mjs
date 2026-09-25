// The four web encodes of every journey clip (spec §7.5) and their size limits. Shared by
// scripts/encode-clip.mjs (which encodes to fit) and scripts/check-bundle-size.mjs (which checks).
const KB = 1024;

export const CLIP_VARIANTS = [
  { width: 1280, ext: "webm", maxBytes: 700 * KB },
  { width: 1280, ext: "mp4", maxBytes: 1100 * KB }, // 1.1 MB
  { width: 640, ext: "webm", maxBytes: 250 * KB },
  { width: 640, ext: "mp4", maxBytes: 400 * KB },
];
