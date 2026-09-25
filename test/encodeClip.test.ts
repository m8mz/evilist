import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { CLIP_VARIANTS } from "../scripts/clip-variants.mjs";
import { encodeClip, ffmpegArgs } from "../scripts/encode-clip.mjs";

const encoders =
  spawnSync("ffmpeg", ["-hide_banner", "-encoders"], { encoding: "utf8" }).stdout ?? "";
const canEncode = encoders.includes("libsvtav1") && encoders.includes("libx264");

let dir: string | undefined;
afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
  dir = undefined;
});

const probe = (path: string) =>
  JSON.parse(
    spawnSync(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "stream=codec_type,codec_name,width,r_frame_rate",
        "-of",
        "json",
        path,
      ],
      { encoding: "utf8" },
    ).stdout,
  ).streams as Array<{
    codec_type: string;
    codec_name: string;
    width?: number;
    r_frame_rate?: string;
  }>;

describe("clip variants", () => {
  it("are the four encodes spec §7.5 names, with their size limits", () => {
    expect(CLIP_VARIANTS).toEqual([
      { width: 1280, ext: "webm", maxBytes: 700 * 1024 },
      { width: 1280, ext: "mp4", maxBytes: 1100 * 1024 },
      { width: 640, ext: "webm", maxBytes: 250 * 1024 },
      { width: 640, ext: "mp4", maxBytes: 400 * 1024 },
    ]);
  });
});

describe("ffmpegArgs", () => {
  it("drops the audio, scales to the width at 24 fps, and picks the codec by container", () => {
    const webm = ffmpegArgs("in.mp4", "out.webm", CLIP_VARIANTS[0], 34);
    expect(webm).toContain("-an");
    expect(webm.join(" ")).toContain("scale=1280:-2:flags=lanczos,fps=24");
    expect(webm.join(" ")).toContain("-c:v libsvtav1");
    expect(webm.join(" ")).toContain("-crf 34");
    expect(webm.at(-1)).toBe("out.webm");

    const mp4 = ffmpegArgs("in.mp4", "out.mp4", CLIP_VARIANTS[3], 24).join(" ");
    expect(mp4).toContain("scale=640:-2:flags=lanczos,fps=24");
    expect(mp4).toContain("-c:v libx264 -preset slow -profile:v high -level:v 4.0");
    expect(mp4).toContain("-movflags +faststart");
  });
});

describe("encodeClip", () => {
  it.skipIf(!canEncode)(
    "writes all four encodes: silent, 24 fps, at their widths and within their limits",
    () => {
      dir = mkdtempSync(join(tmpdir(), "clip-"));
      const source = join(dir, "source.mp4");
      // A 2 s 1080p test pattern with a tone, standing in for a generated clip.
      spawnSync("ffmpeg", [
        "-v",
        "error",
        "-f",
        "lavfi",
        "-i",
        "testsrc2=size=1920x1080:rate=30:duration=2",
        "-f",
        "lavfi",
        "-i",
        "sine=frequency=440:duration=2",
        "-shortest",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        source,
      ]);
      const results = encodeClip(source, "sysadmin", dir);
      expect(results.map((r) => r.output)).toEqual(
        CLIP_VARIANTS.map((v) => join(dir!, `sysadmin-${v.width}.${v.ext}`)),
      );
      for (const [i, result] of results.entries()) {
        const variant = CLIP_VARIANTS[i];
        expect(result.bytes, result.output).toBeLessThanOrEqual(variant.maxBytes);
        const streams = probe(result.output);
        expect(
          streams.map((s) => s.codec_type),
          result.output,
        ).toEqual(["video"]);
        expect(streams[0].codec_name).toBe(variant.ext === "webm" ? "av1" : "h264");
        expect(streams[0].width).toBe(variant.width);
        expect(streams[0].r_frame_rate).toBe("24/1");
      }
    },
    120_000,
  );
});
