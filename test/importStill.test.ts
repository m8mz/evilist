import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
import { importStill } from "../scripts/import-still.mjs";

let dir: string | undefined;
const tmp = () => (dir = mkdtempSync(join(tmpdir(), "still-")));
afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
  dir = undefined;
});

const png = (path: string, width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: "#111111" } })
    .png()
    .toFile(path);

describe("importStill", () => {
  it("shrinks a large render to 2400 px wide WebP, keeping its aspect ratio", async () => {
    const d = tmp();
    await png(join(d, "in.png"), 3000, 1286);
    const meta = await importStill(join(d, "in.png"), join(d, "out.webp"));
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(2400);
    expect(meta.height).toBe(1029);
  });

  it("never upscales a smaller render", async () => {
    const d = tmp();
    await png(join(d, "in.png"), 2048, 1152);
    const meta = await importStill(join(d, "in.png"), join(d, "out.webp"));
    expect(meta.width).toBe(2048);
  });

  it("runs as a CLI through a symlinked path with a space in it", async () => {
    const d = tmp();
    await png(join(d, "in.png"), 800, 400);
    const link = join(d, "import still.mjs");
    symlinkSync(resolve("scripts/import-still.mjs"), link);
    execFileSync(process.execPath, [link, join(d, "in.png"), join(d, "out.webp")]);
    expect(existsSync(join(d, "out.webp"))).toBe(true);
  });
});
