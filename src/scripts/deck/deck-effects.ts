// The energy's objects (deck spec §5 "glow mask", "seam"; §8 lights, glow, smoke, fog, shadow): built
// once per mount, driven every frame from deck-energy.ts's numbers and deck-smoke-sprites.ts's pool.
// Everything that glows sits on BLOOM_LAYER for deck-bloom.ts and renders at GLOW_GAIN on both tiers;
// the high tier's bloom adds only the blur of the brightest parts on top.
import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  PointLight,
  ShaderMaterial,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
} from "three";
import type { Group, Scene, Texture } from "three";
import {
  breath,
  coverFit,
  flare,
  fogFor,
  glowOpacity,
  glowSpriteScale,
  pointLightIntensity,
  proportion,
  seamOpacity,
  shadowFor,
  type EnergyKind,
} from "./deck-energy";
import { FOG_FRAGMENT, FOG_VERTEX, fogUniforms, type FogUniforms } from "./deck-fog";
import { COLORS, paintRadial, paintSeam, RADIAL_SIZE, WINDOW } from "./deck-paint";
import type { DeckParams } from "./deck-params";
import type { CardPhase } from "./deck-pose";
import { canvasTexture, SmokeSprites } from "./deck-smoke-sprites";

export const BLOOM_LAYER = 1;
const PX = 1 / 100;
// Opacity gain on the glow set. The spec gave it to the mid tier to stand in for the bloom, but the
// bloom's threshold leaves the violet glow alone, so the gain is the base look on both tiers.
const GLOW_GAIN = 1.6;
const LIGHT_AHEAD = 1.6; // world units in front of the energetic card
const FOG_Z = -0.5;
const FOG_MARGIN = 1.1; // the plane at FOG_Z would else crop at the view's edge; the falloff hides the margin
const SPRITE_CLEARANCE = 0.05; // world units the glow sprite keeps behind the presented card's corner at its largest tilt and float
const SHADOW_Z = 0.02; // world units above the floor plane, clear of z-fighting with it
const SEAM_GAP = 0.001; // world units behind the card's back face, clear of z-fighting with it
const SEAM_DENSITY = 2; // seam canvas px per CSS px, independent of dpr, for a crisp line at any zoom
const OCCLUDER_INSET = 0.0005; // just inside the front face: the glow plane at front + 0.002 stays ahead of it, everything behind the card falls behind it
const VISIBLE_MIN = 0.001; // below this opacity or fog strength, hide the object outright
const SHADOW_VISIBLE_MIN = 0.01; // a contact shadow fainter than this reads as a rendering artefact
const MIPMAP = 1.33; // every texture here mipmaps; deck-textures.ts uses the same 4/3 chain factor

export interface EffectsOptions {
  scene: Scene;
  params: DeckParams;
  tier: "mid" | "high";
  rng: () => number;
  kinds: (EnergyKind | null)[];
  eyeColors: string[];
}

export interface EffectCard {
  group: Group;
  phase: CardPhase;
  pull: number;
  zPx: number;
  sinceLandMs: number | null;
  sinceLeaveMs: number | null;
}

export interface EffectsFrame {
  time: number;
  frames: number;
  energy: number;
  energyIndex: number | null;
  kind: EnergyKind | null;
  cards: EffectCard[];
}

/** World units except cardWPx, which keeps the proportion k. */
export interface EffectsLayout {
  cardWPx: number;
  w: number;
  h: number;
  front: number;
  stageW: number;
  stageH: number;
  floorY: number;
}

export class DeckEffects {
  private readonly scene: Scene;
  private readonly params: DeckParams;
  private readonly boost: number;
  private readonly highTier: boolean;
  private readonly kinds: (EnergyKind | null)[];
  private readonly unit = new PlaneGeometry(1, 1);
  private readonly glowMats: MeshBasicMaterial[];
  private readonly glows: (Mesh | null)[];
  private readonly glowImages: (HTMLImageElement | null)[];
  private readonly seams: (Mesh<PlaneGeometry, MeshBasicMaterial> | null)[];
  private readonly seamCanvases: (HTMLCanvasElement | null)[];
  private readonly occluders: (Mesh<PlaneGeometry, MeshBasicMaterial> | null)[]; // high tier only: depth-only proxies so the bloom pass, which draws no cards, still occludes
  private readonly occluderMat = new MeshBasicMaterial({ colorWrite: false, side: DoubleSide }); // both faces: every racked card shows the camera its back, where a front-only proxy is culled and occludes nothing
  private readonly light: PointLight;
  private readonly sprite: Sprite;
  private readonly spriteMat: SpriteMaterial;
  private readonly smoke: SmokeSprites;
  private readonly fog: Mesh;
  private readonly fogMat: ShaderMaterial;
  private readonly fogUniforms: FogUniforms;
  private fogT0: number | null = null;
  private readonly shadows: Sprite[];
  private readonly textures: Texture[] = [];
  private layout: EffectsLayout | null = null;
  private spriteBehind = SPRITE_CLEARANCE; // world units the glow sprite sits behind the energetic card, set per layout

  constructor(opts: EffectsOptions) {
    this.scene = opts.scene;
    this.params = opts.params;
    this.kinds = opts.kinds;
    this.boost = GLOW_GAIN;
    this.highTier = opts.tier === "high";
    const n = opts.kinds.length;
    const P = this.params;

    // Glow planes: one per card, blank until the mask arrives; tinted by the rank's eye colour.
    this.glowMats = opts.eyeColors.map(
      (eye) =>
        new MeshBasicMaterial({
          color: new Color(eye),
          transparent: true,
          opacity: 0,
          blending: AdditiveBlending,
          depthWrite: false,
        }),
    );
    this.glows = new Array<Mesh | null>(n).fill(null);
    this.glowImages = new Array<HTMLImageElement | null>(n).fill(null);
    this.seams = new Array<Mesh<PlaneGeometry, MeshBasicMaterial> | null>(n).fill(null);
    this.seamCanvases = new Array<HTMLCanvasElement | null>(n).fill(null);
    this.occluders = new Array<Mesh<PlaneGeometry, MeshBasicMaterial> | null>(n).fill(null);

    this.light = new PointLight(new Color(COLORS.violet), 0, 8, 2);
    this.scene.add(this.light);

    const glowTexture = canvasTexture(
      RADIAL_SIZE,
      (ctx) => paintRadial(ctx, RADIAL_SIZE, COLORS.violet, 0.8),
      true,
    );
    this.textures.push(glowTexture);
    // No `color` tint: the radial is already violet, and tinting it violet again gives a blue.
    this.spriteMat = new SpriteMaterial({
      map: glowTexture,
      transparent: true,
      opacity: 0,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    this.sprite = new Sprite(this.spriteMat);
    this.sprite.layers.enable(BLOOM_LAYER);
    this.sprite.visible = false;
    this.scene.add(this.sprite);

    const capacity = opts.tier === "mid" ? P.smoke.poolMid : P.smoke.pool;
    this.smoke = new SmokeSprites(opts.scene, P, capacity, opts.rng);

    // Fog: one full-stage plane behind everything.
    const violet = new Color(COLORS.violet);
    const uniforms = fogUniforms([violet.r, violet.g, violet.b]);
    this.fogMat = new ShaderMaterial({
      uniforms,
      vertexShader: FOG_VERTEX,
      fragmentShader: FOG_FRAGMENT,
      // premultipliedAlpha pairs AdditiveBlending with (ONE, ONE); the false default uses
      // (SRC_ALPHA, ONE) and squares the shader's own premultiplied alpha.
      premultipliedAlpha: true,
      // Not transparent: that list draws after (and over) the presented card. renderOrder -1 heads
      // the opaque list instead, so cards and the floor draw over the far-field fog, as spec'd.
      transparent: false,
      blending: AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    });
    this.fogUniforms = uniforms;
    this.fog = new Mesh(this.unit, this.fogMat);
    this.fog.position.z = FOG_Z;
    this.fog.renderOrder = -1;
    this.fog.visible = false;
    this.scene.add(this.fog);

    // Contact shadows: two sprites, for the presented card and a card pulling in.
    const shadowTexture = canvasTexture(
      RADIAL_SIZE,
      (ctx) => paintRadial(ctx, RADIAL_SIZE, COLORS.void, 1),
      true,
    );
    this.textures.push(shadowTexture);
    this.shadows = [0, 1].map(() => {
      const s = new Sprite(
        new SpriteMaterial({
          map: shadowTexture,
          transparent: true,
          opacity: 0,
          depthWrite: false,
        }),
      );
      s.visible = false;
      this.scene.add(s);
      return s;
    });
  }

  /** Adds the card's glow plane (blank until setGlow) and, on S and S+, its back seam. */
  attach(index: number, group: Group): void {
    if (this.glows[index]) return; // a second attach for one index would otherwise leak the first
    const mat = this.glowMats[index];
    if (!mat) return;
    const glow = new Mesh(this.unit, mat);
    glow.layers.enable(BLOOM_LAYER);
    glow.visible = false;
    group.add(glow);
    this.glows[index] = glow;
    if (this.kinds[index]) {
      const canvas = document.createElement("canvas");
      canvas.width = 2;
      canvas.height = 2;
      const texture = new CanvasTexture(canvas);
      texture.colorSpace = SRGBColorSpace;
      this.textures.push(texture);
      const seam = new Mesh(
        this.unit,
        new MeshBasicMaterial({
          map: texture,
          transparent: true,
          opacity: 0,
          blending: AdditiveBlending,
          depthWrite: false,
        }),
      );
      seam.rotation.y = Math.PI;
      seam.layers.enable(BLOOM_LAYER);
      group.add(seam);
      this.seams[index] = seam;
      this.seamCanvases[index] = canvas;
    }
    if (this.highTier) {
      const proxy = new Mesh(this.unit, this.occluderMat);
      proxy.layers.set(BLOOM_LAYER); // layer 1 only: invisible to the main render and the raycaster
      group.add(proxy);
      this.occluders[index] = proxy;
    }
    if (this.layout) this.placeCard(index);
  }

  setGlow(index: number, image: HTMLImageElement | null): void {
    this.glowImages[index] = image;
    const mat = this.glowMats[index];
    if (!mat) return;
    mat.alphaMap?.dispose();
    if (!image) {
      mat.alphaMap = null;
      mat.needsUpdate = true;
      return;
    }
    // Not pushed to `textures`: `glowMats` counts and disposes the mask once, on its own.
    const texture = new CanvasTexture(image);
    mat.alphaMap = texture;
    mat.needsUpdate = true;
    if (this.layout) this.placeCard(index);
  }

  setLayout(layout: EffectsLayout): void {
    this.layout = layout;
    const { tilt, float } = this.params; // a presented card turns by pointer tilt plus idle float (deck-pose's decorateLanded)
    const ry = ((tilt.maxY + float.rotY.amp) * Math.PI) / 180;
    const rx = ((tilt.maxX + float.rotX.amp) * Math.PI) / 180;
    this.spriteBehind = (layout.w * Math.sin(ry) + layout.h * Math.sin(rx)) / 2 + SPRITE_CLEARANCE;
    for (let i = 0; i < this.glows.length; i++) this.placeCard(i);
    this.fog.scale.set(layout.stageW * FOG_MARGIN, layout.stageH * FOG_MARGIN, 1);
    this.fogUniforms.uAspect.value = layout.stageW / layout.stageH;
    this.smoke.setLayout(layout.w / 2, layout.h / 2, proportion(layout.cardWPx));
  }

  /** The glow plane over the portrait window with paintBody's cover fit; the seam over the back. */
  private placeCard(index: number): void {
    const L = this.layout;
    if (!L) return;
    const glow = this.glows[index];
    const M = this.params.material;
    if (glow) {
      const winH = L.h * WINDOW;
      glow.scale.set(L.w, winH, 1);
      glow.position.set(0, L.h / 2 - winH / 2, L.front + M.layerZ.glow * PX);
      const image = this.glowImages[index];
      const mat = this.glowMats[index];
      if (image && mat?.alphaMap) {
        const iw = image.naturalWidth || image.width;
        const ih = image.naturalHeight || image.height;
        if (iw > 0 && ih > 0) {
          const fit = coverFit(L.w, winH, iw, ih);
          mat.alphaMap.repeat.set(fit.repeatX, fit.repeatY);
          mat.alphaMap.offset.set(fit.offsetX, fit.offsetY);
        }
      }
    }
    const occluder = this.occluders[index];
    if (occluder) {
      occluder.scale.set(L.w, L.h, 1);
      occluder.position.z = L.front - OCCLUDER_INSET;
    }
    const seam = this.seams[index];
    const canvas = this.seamCanvases[index];
    if (seam && canvas) {
      const w = Math.max(2, Math.round(L.cardWPx * SEAM_DENSITY));
      const h = Math.max(2, Math.round((L.h / L.w) * w));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (ctx) paintSeam(ctx, w, h);
        const mat = seam.material;
        mat.map?.dispose(); // dispose before the next upload forces a fresh GPU allocation at the new size
        if (mat.map) mat.map.needsUpdate = true;
      }
      seam.scale.set(L.w, L.h, 1);
      seam.position.z = -(L.front + SEAM_GAP);
    }
  }

  /** Runs the smoke `frames` frames from the given state (the frozen deck's cloud). */
  prewarm(frame: EffectsFrame, frames: number): void {
    this.smoke.prewarm(frame, frames);
  }

  /** Positions and shows shadow slot `n`, or hides it when there is no card at that rank of pull. */
  private placeShadow(n: number, card: EffectCard | null, cardWPx: number, floorY: number): void {
    const s = this.shadows[n];
    if (!s) return;
    if (!card) {
      s.visible = false;
      return;
    }
    const sh = shadowFor(card.pull, card.zPx, cardWPx, this.params);
    s.scale.set(sh.w, sh.h, 1);
    s.position.set(card.group.position.x, floorY, SHADOW_Z);
    s.material.opacity = sh.opacity;
    s.visible = sh.opacity > SHADOW_VISIBLE_MIN;
  }

  update(frame: EffectsFrame): void {
    const L = this.layout;
    if (!L) return;
    const P = this.params;
    const { kind, energy, energyIndex } = frame;
    const energetic = energyIndex === null ? null : (frame.cards[energyIndex] ?? null);
    const fl = flare(kind, energetic?.sinceLandMs ?? null, P);
    const br = breath(frame.time, P);

    // Glow planes and seams, every card.
    for (let i = 0; i < frame.cards.length; i++) {
      const c = frame.cards[i];
      const glow = this.glows[i];
      const mat = this.glowMats[i];
      if (c && glow && mat) {
        const o = glowOpacity(c.phase, c.sinceLandMs, c.sinceLeaveMs, P) * this.boost;
        mat.opacity = Math.min(1, o);
        glow.visible = o > VISIBLE_MIN && mat.alphaMap !== null;
      }
      const seam = this.seams[i];
      const k = this.kinds[i];
      if (c && seam && k) {
        const m = seam.material;
        m.opacity = Math.min(1, seamOpacity(k, frame.time, P) * this.boost);
      }
    }

    // The light and the glow sprite follow the energetic card.
    if (kind && energetic) {
      const pos = energetic.group.position;
      this.light.position.set(pos.x, pos.y, pos.z + LIGHT_AHEAD);
      this.light.intensity = pointLightIntensity(kind, energy, br, fl.light, P);
      this.sprite.position.set(pos.x, pos.y, pos.z - this.spriteBehind);
      const scale = glowSpriteScale(kind, energy, L.cardWPx, P) * fl.glow;
      this.sprite.scale.set(scale, scale, 1);
      this.spriteMat.opacity = Math.min(1, energy * this.boost);
      this.sprite.visible = energy > VISIBLE_MIN;
    } else {
      this.light.intensity = 0;
      this.sprite.visible = false;
    }

    this.smoke.update(frame, energetic);

    // Fog.
    const level = fogFor(kind, energy, fl.fog, P);
    const u = this.fogUniforms;
    if (kind && energetic && level.strength > VISIBLE_MIN) {
      const pos = energetic.group.position;
      // Mount-relative: the caller's clock is performance.now() live, or frozen at epoch ms under
      // deck-freeze, and both scales lose precision the raw uniform can't afford. Zero fixes both.
      this.fogT0 ??= frame.time;
      u.uTime.value = frame.time - this.fogT0;
      // Divide by the plane's own scaled extent (FOG_MARGIN wider than the stage), not the stage
      // itself, so the uv centre and the radius match what setLayout actually drew.
      u.uCentre.value[0] = pos.x / (L.stageW * FOG_MARGIN) + 0.5;
      u.uCentre.value[1] = pos.y / (L.stageH * FOG_MARGIN) + 0.5;
      u.uRadius.value = level.radius / (L.stageH * FOG_MARGIN);
      u.uStrength.value = level.strength;
      this.fog.visible = true;
    } else {
      u.uStrength.value = 0;
      this.fog.visible = false;
    }

    // Contact shadows under the two largest pulls.
    let first = -1;
    let second = -1;
    for (let i = 0; i < frame.cards.length; i++) {
      const pull = frame.cards[i]?.pull ?? 0;
      if (pull <= 0) continue;
      if (first < 0 || pull > (frame.cards[first]?.pull ?? 0)) {
        second = first;
        first = i;
      } else if (second < 0 || pull > (frame.cards[second]?.pull ?? 0)) second = i;
    }
    const cardFirst = first >= 0 ? (frame.cards[first] ?? null) : null;
    const cardSecond = second >= 0 ? (frame.cards[second] ?? null) : null;
    this.placeShadow(0, cardFirst, L.cardWPx, L.floorY);
    this.placeShadow(1, cardSecond, L.cardWPx, L.floorY);
  }

  estimateBytes(): number {
    let bytes = this.smoke.estimateBytes();
    for (const t of this.textures) {
      const img = t.image as { width?: number; height?: number } | undefined;
      bytes += (img?.width ?? 0) * (img?.height ?? 0) * 4 * MIPMAP;
    }
    for (const mat of this.glowMats) {
      const img = mat.alphaMap?.image as { width?: number; height?: number } | undefined;
      bytes += (img?.width ?? 0) * (img?.height ?? 0) * 4 * MIPMAP;
    }
    return bytes;
  }

  dispose(): void {
    this.smoke.dispose();
    this.scene.remove(this.light, this.sprite, this.fog, ...this.shadows);
    for (const g of this.glows) g?.removeFromParent();
    for (const s of this.seams) {
      if (!s) continue;
      s.removeFromParent();
      s.material.dispose();
    }
    for (const o of this.occluders) o?.removeFromParent(); // their geometry is `unit`, their material `occluderMat`
    this.occluderMat.dispose();
    for (const m of this.glowMats) {
      m.alphaMap?.dispose();
      m.alphaMap = null;
      m.dispose();
    }
    this.spriteMat.dispose();
    for (const s of this.shadows) s.material.dispose();
    this.fogMat.dispose();
    for (const t of this.textures) t.dispose();
    this.unit.dispose();
    this.light.dispose();
    // Drop every reference so nothing stays reachable and a post-dispose estimateBytes() reads zero.
    this.textures.length = 0;
    this.glows.fill(null);
    this.seams.fill(null);
    this.occluders.fill(null);
    this.glowImages.fill(null);
    this.seamCanvases.fill(null);
    this.layout = null;
  }
}
