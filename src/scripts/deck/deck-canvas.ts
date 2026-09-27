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
        // A print-in repaints this canvas every ~90ms; regenerating mipmaps on every upload raced
        // the WebGL read of whichever card was presented and tore its portrait for a frame (task
        // 5's report). The slot is only ever drawn at its on-screen size, so it never needs one.
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
