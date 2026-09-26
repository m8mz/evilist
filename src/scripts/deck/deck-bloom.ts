// Selective bloom for the high tier (deck spec §8, "Bloom"; ADR 0004): the scene renders once with
// everything off BLOOM_LAYER darkened, that pass blooms at half resolution, and a second composer
// adds the result over the normal render. Its own lazy chunk, imported by deck-stage.ts only on the
// high tier, so the mid tier never pays for the postprocessing code.
import {
  HalfFloatType,
  Mesh,
  MeshBasicMaterial,
  ShaderMaterial,
  Sprite,
  SpriteMaterial,
  Vector2,
  WebGLRenderTarget,
  type Camera,
  type Material,
  type Object3D,
  type Scene,
  type WebGLRenderer,
} from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { BLOOM_LAYER } from "./deck-effects";
import type { DeckParams } from "./deck-params";

export interface BloomHandle {
  render(): void;
  setSize(w: number, h: number): void;
  dispose(): void;
}

const MIX_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// Adds the bloom over the base; alpha keeps the page visible where nothing is drawn and lets the
// glow read over the section's void where the cards are not.
const MIX_FRAGMENT = /* glsl */ `
uniform sampler2D baseTexture;
uniform sampler2D bloomTexture;
varying vec2 vUv;
void main() {
  vec4 base = texture2D(baseTexture, vUv);
  vec4 bloom = texture2D(bloomTexture, vUv);
  float glow = max(bloom.r, max(bloom.g, bloom.b));
  gl_FragColor = vec4(base.rgb + bloom.rgb, max(base.a, min(1.0, glow)));
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
  const size = renderer.getDrawingBufferSize(new Vector2());
  const target = new WebGLRenderTarget(size.x, size.y, { type: HalfFloatType });
  const bloomComposer = new EffectComposer(renderer, target);
  bloomComposer.renderToScreen = false;
  const bloomPass = new UnrealBloomPass(
    new Vector2(width / 2, height / 2),
    params.bloom.strength,
    params.bloom.radius,
    params.bloom.threshold,
  );
  bloomComposer.addPass(new RenderPass(scene, camera));
  bloomComposer.addPass(bloomPass);

  const mixMaterial = new ShaderMaterial({
    uniforms: {
      baseTexture: { value: null },
      bloomTexture: { value: bloomComposer.renderTarget2.texture },
    },
    vertexShader: MIX_VERTEX,
    fragmentShader: MIX_FRAGMENT,
    transparent: true,
    depthWrite: false,
  });
  const mixPass = new ShaderPass(mixMaterial, "baseTexture");
  const finalComposer = new EffectComposer(renderer);
  finalComposer.addPass(new RenderPass(scene, camera));
  finalComposer.addPass(mixPass);
  finalComposer.addPass(new OutputPass());

  const dark = new MeshBasicMaterial({ color: 0x000000 });
  const darkSprite = new SpriteMaterial({ color: 0x000000 });
  const saved = new Map<Mesh | Sprite, Material>();
  const darken = (obj: Object3D): void => {
    if (obj.layers.isEnabled(BLOOM_LAYER)) return;
    if (obj instanceof Sprite) {
      saved.set(obj, obj.material);
      obj.material = darkSprite;
    } else if (obj instanceof Mesh) {
      saved.set(obj, obj.material as Material);
      obj.material = dark;
    }
  };
  const restore = (): void => {
    for (const [obj, mat] of saved) obj.material = mat;
    saved.clear();
  };

  return {
    render() {
      bloomPass.strength = params.bloom.strength;
      bloomPass.radius = params.bloom.radius;
      bloomPass.threshold = params.bloom.threshold;
      scene.traverse(darken);
      bloomComposer.render();
      restore();
      finalComposer.render();
    },
    setSize(w, h) {
      bloomComposer.setSize(w, h);
      finalComposer.setSize(w, h);
      bloomPass.resolution.set(w / 2, h / 2);
    },
    dispose() {
      bloomComposer.dispose();
      finalComposer.dispose();
      bloomPass.dispose();
      mixMaterial.dispose();
      dark.dispose();
      darkSprite.dispose();
      target.dispose();
    },
  };
}
