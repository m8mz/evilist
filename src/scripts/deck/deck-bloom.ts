// Selective bloom for the high tier (deck spec §8, "Bloom"; ADR 0004). The scene renders to the
// canvas exactly as the mid tier does (the browser's MSAA, the renderer's sRGB output). Then only
// BLOOM_LAYER renders again, through the camera's layer mask, into one small linear target that
// UnrealBloomPass blurs, and a full-screen quad adds that glow over the canvas. No material swapping
// and no second composer: the glow is low-frequency, so the pass runs at half the CSS resolution and
// costs about a tenth of a full-resolution composer. Its own lazy chunk, imported by deck-stage.ts on
// the high tier only, so the mid tier never pays for the postprocessing code.
import {
  AdditiveBlending,
  ShaderMaterial,
  Vector2,
  type Camera,
  type Scene,
  type WebGLRenderer,
} from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { FullScreenQuad } from "three/addons/postprocessing/Pass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { BLOOM_LAYER } from "./deck-effects";
import type { DeckParams } from "./deck-params";

export interface BloomHandle {
  /** Renders the scene to the canvas, then the glow pass over it. */
  render(): void;
  /** Resizes the glow target; `w` and `h` in CSS px, as the stage measures them. */
  setSize(w: number, h: number): void;
  /** The glow pass's render targets, in bytes, for `data-deck-vram`. */
  estimateBytes(): number;
  dispose(): void;
}

/** The glow target's scale against CSS px. The blur removes anything finer, so half is enough. */
export const BLOOM_SCALE = 0.5;

// Bytes per glow-target pixel: rt2's one RGBA half-float target with depth (8 + 4 = 12; rt1 is never
// bound, since neither pass swaps and copyPass only runs with masks), UnrealBloomPass's bright
// target at a quarter of the glow target's pixels (half-float, no depth: 8 × 1/4 = 2), and its five
// blur mip pairs (2 × 8 × (1/4 + 1/16 + …) ≈ 16/3).
const BYTES_PER_PIXEL = 12 + 2 + 16 / 3;

const OVERLAY_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// Adds the glow over the canvas. The canvas is premultiplied, so alpha follows the brightest
// encoded channel: the halo reads over the page where no card is drawn, and rgb ≤ alpha holds by
// construction. colorspace_fragment encodes to the renderer's output space (sRGB) exactly once.
const OVERLAY_FRAGMENT = /* glsl */ `
uniform sampler2D tBloom;
varying vec2 vUv;
void main() {
  gl_FragColor = vec4(texture2D(tBloom, vUv).rgb, 1.0);
  #include <colorspace_fragment>
  gl_FragColor.a = min(1.0, max(gl_FragColor.r, max(gl_FragColor.g, gl_FragColor.b)));
}
`;

export function mountBloom(
  renderer: WebGLRenderer,
  scene: Scene,
  camera: Camera,
  params: DeckParams,
  width: number,
  height: number,
): BloomHandle {
  // RenderPass draws into the composer's read buffer and UnrealBloomPass adds its blur there, and
  // neither swaps, so renderTarget2 holds the glow after every render (as in Three's selective
  // bloom example).
  const composer = new EffectComposer(renderer);
  composer.renderToScreen = false;
  const bloomPass = new UnrealBloomPass(
    new Vector2(width * BLOOM_SCALE, height * BLOOM_SCALE),
    params.bloom.strength,
    params.bloom.radius,
    params.bloom.threshold,
  );
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(bloomPass);
  composer.setPixelRatio(BLOOM_SCALE);
  composer.setSize(width, height);

  const overlay = new ShaderMaterial({
    uniforms: { tBloom: { value: composer.renderTarget2.texture } },
    vertexShader: OVERLAY_VERTEX,
    fragmentShader: OVERLAY_FRAGMENT,
    blending: AdditiveBlending,
    premultipliedAlpha: true,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const quad = new FullScreenQuad(overlay);
  let w = width;
  let h = height;

  return {
    render() {
      bloomPass.strength = params.bloom.strength;
      bloomPass.radius = params.bloom.radius;
      bloomPass.threshold = params.bloom.threshold;
      const mask = camera.layers.mask;
      camera.layers.set(BLOOM_LAYER);
      try {
        composer.render();
      } finally {
        camera.layers.mask = mask;
      }
      renderer.render(scene, camera);
      const autoClear = renderer.autoClear;
      renderer.autoClear = false; // the quad adds over the frame just drawn
      quad.render(renderer);
      renderer.autoClear = autoClear;
    },
    setSize(nw, nh) {
      w = nw;
      h = nh;
      composer.setSize(nw, nh); // applies BLOOM_SCALE and resizes the bloom pass with it
    },
    estimateBytes() {
      return Math.round(w * BLOOM_SCALE * h * BLOOM_SCALE * BYTES_PER_PIXEL);
    },
    dispose() {
      composer.dispose(); // its two targets and copy pass; the passes below are ours to dispose
      bloomPass.dispose();
      overlay.dispose();
      quad.dispose();
    },
  };
}
