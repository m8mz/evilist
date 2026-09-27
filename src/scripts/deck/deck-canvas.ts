// The stage's real canvas/texture factory (deck-textures.ts owns the `TextureFactory` contract
// this implements). Split out so deck-stage.ts stays under its line cap; thin glue over
// `document` and Three, so it isn't unit-tested on its own — deck-textures.ts's own tests cover
// the contract through a recorder factory instead.
import { CanvasTexture, LinearFilter, LinearMipmapLinearFilter, SRGBColorSpace } from "three";
import type { TextureFactory } from "./deck-textures";

export function glFactory(maxAniso: number): TextureFactory {
  return {
    canvas: (w, h) => Object.assign(document.createElement("canvas"), { width: w, height: h }),
    texture(canvas, kind) {
      const t = new CanvasTexture(canvas);
      t.colorSpace = SRGBColorSpace;
      if (kind === "text") {
        // Marcus's tear recording predates this drive build and didn't reproduce on it
        // (CLAUDE.md); the change stands on its own regardless: a print-in draws this canvas at
        // its on-screen size, never minified, so it needs no mipmaps, and skipping them removes
        // the print-in path's one GPU-canvas copy (deck spec §9, ADR 0004).
        t.generateMipmaps = false;
        t.minFilter = LinearFilter;
        t.magFilter = LinearFilter;
      } else {
        t.anisotropy = maxAniso;
        t.generateMipmaps = true;
        t.minFilter = LinearMipmapLinearFilter;
      }
      return t;
    },
  };
}
