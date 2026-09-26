// The energy's objects (deck spec §5 "glow mask", "seam"; §8 lights, glow, smoke, fog, shadow):
// built once per mount, driven every frame from the pure numbers in deck-energy.ts and the pool in
// deck-smoke.ts. Everything that glows sits on BLOOM_LAYER for deck-bloom.ts; the mid tier has no
// composer and instead renders those objects at 1.6× opacity.
import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  PointLight,
  Scene,
  ShaderMaterial,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  Texture,
  type IUniform,
} from "three";
import {
  breath,
  burstCount,
  coverFit,
  flare,
  fogFor,
  glowOpacity,
  glowSpriteScale,
  pointLightIntensity,
  proportion,
  seamOpacity,
  shadowFor,
  smokeRate,
  smokeSideSpeed,
  type EnergyKind,
} from "./deck-energy";
import { FOG_FRAGMENT, FOG_VERTEX, fogUniforms, type FogUniforms } from "./deck-fog";
import {
  COLORS,
  paintPuff,
  paintRadial,
  paintSeam,
  PUFF_SIZE,
  RADIAL_SIZE,
  WINDOW,
} from "./deck-paint";
import type { DeckParams } from "./deck-params";
import type { CardPhase } from "./deck-pose";
import { SmokePool, type SmokeEmitter } from "./deck-smoke";
import { mulberry32 } from "./deck-util";

export const BLOOM_LAYER = 1;
const PX = 1 / 100;
const MID_BOOST = 1.6;
const LIGHT_AHEAD = 1.6; // world units in front of the energetic card
const FOG_Z = -0.5;

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

function canvasTexture(
  size: number,
  paint: (ctx: CanvasRenderingContext2D) => void,
  srgb: boolean,
): Texture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable");
  paint(ctx);
  const texture = new CanvasTexture(canvas);
  if (srgb) texture.colorSpace = SRGBColorSpace;
  return texture;
}

export class DeckEffects {
  private readonly scene: Scene;
  private readonly params: DeckParams;
  private readonly boost: number;
  private readonly kinds: (EnergyKind | null)[];
  private readonly unit = new PlaneGeometry(1, 1);
  private readonly glowMats: MeshBasicMaterial[];
  private readonly glows: (Mesh | null)[];
  private readonly glowImages: (HTMLImageElement | null)[];
  private readonly seams: (Mesh | null)[];
  private readonly seamCanvases: (HTMLCanvasElement | null)[];
  private readonly light: PointLight;
  private readonly sprite: Sprite;
  private readonly spriteMat: SpriteMaterial;
  private readonly pool: SmokePool;
  private readonly puffs: Sprite[];
  private readonly puffTextures: Texture[];
  private readonly fog: Mesh;
  private readonly fogMat: ShaderMaterial;
  private readonly fogUniforms: FogUniforms;
  private readonly shadows: Sprite[];
  private readonly textures: Texture[] = [];
  private readonly burstDone: boolean[];
  private layout: EffectsLayout | null = null;
  private readonly emitter: SmokeEmitter = { x: 0, y: 0, z: 0, halfW: 1, halfH: 1, k: 1 };
  private prewarmed = false;

  constructor(opts: EffectsOptions) {
    this.scene = opts.scene;
    this.params = opts.params;
    this.kinds = opts.kinds;
    this.boost = opts.tier === "mid" ? MID_BOOST : 1;
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
    this.seams = new Array<Mesh | null>(n).fill(null);
    this.seamCanvases = new Array<HTMLCanvasElement | null>(n).fill(null);
    this.burstDone = new Array<boolean>(n).fill(false);

    this.light = new PointLight(new Color(COLORS.violet), 0, 8, 2);
    this.scene.add(this.light);

    const glowTexture = canvasTexture(
      RADIAL_SIZE,
      (ctx) => paintRadial(ctx, RADIAL_SIZE, COLORS.violet, 0.8),
      true,
    );
    this.textures.push(glowTexture);
    this.spriteMat = new SpriteMaterial({
      map: glowTexture,
      color: new Color(COLORS.violet),
      transparent: true,
      opacity: 0,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    this.sprite = new Sprite(this.spriteMat);
    this.sprite.layers.enable(BLOOM_LAYER);
    this.sprite.visible = false;
    this.scene.add(this.sprite);

    // Smoke: three puff textures, a pool of sprites sized by the tier.
    this.puffTextures = [0, 1, 2].map((variant) =>
      canvasTexture(PUFF_SIZE, (ctx) => paintPuff(ctx, PUFF_SIZE, mulberry32(100 + variant)), true),
    );
    this.textures.push(...this.puffTextures);
    const capacity = opts.tier === "mid" ? P.smoke.poolMid : P.smoke.pool;
    this.pool = new SmokePool(capacity, opts.rng, P.smoke.opacityMin, P.smoke.opacityMax);
    this.puffs = this.pool.puffs.map(() => {
      const mat = new SpriteMaterial({
        map: this.puffTextures[0] ?? null,
        color: new Color(COLORS.violet),
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const s = new Sprite(mat);
      s.visible = false;
      this.scene.add(s);
      return s;
    });

    // Fog: one full-stage plane behind everything.
    const violet = new Color(COLORS.violet);
    this.fogMat = new ShaderMaterial({
      uniforms: fogUniforms([violet.r, violet.g, violet.b]) as unknown as Record<string, IUniform>,
      vertexShader: FOG_VERTEX,
      fragmentShader: FOG_FRAGMENT,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    });
    this.fogUniforms = this.fogMat.uniforms as unknown as FogUniforms;
    this.fog = new Mesh(this.unit, this.fogMat);
    this.fog.position.z = FOG_Z;
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
    const texture = new CanvasTexture(image);
    this.textures.push(texture);
    mat.alphaMap = texture;
    mat.needsUpdate = true;
    if (this.layout) this.placeCard(index);
  }

  setLayout(layout: EffectsLayout): void {
    this.layout = layout;
    for (let i = 0; i < this.glows.length; i++) this.placeCard(i);
    this.fog.scale.set(layout.stageW, layout.stageH, 1);
    this.fogUniforms.uAspect.value = layout.stageW / layout.stageH;
    this.emitter.halfW = layout.w / 2;
    this.emitter.halfH = layout.h / 2;
    this.emitter.k = proportion(layout.cardWPx);
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
        const fit = coverFit(
          L.w,
          winH,
          image.naturalWidth || image.width,
          image.naturalHeight || image.height,
        );
        mat.alphaMap.repeat.set(fit.repeatX, fit.repeatY);
        mat.alphaMap.offset.set(fit.offsetX, fit.offsetY);
      }
    }
    const seam = this.seams[index];
    const canvas = this.seamCanvases[index];
    if (seam && canvas) {
      const w = Math.max(2, Math.round(L.cardWPx * 2));
      const h = Math.max(2, Math.round((L.h / L.w) * w));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (ctx) paintSeam(ctx, w, h);
        const mat = seam.material as MeshBasicMaterial;
        if (mat.map) mat.map.needsUpdate = true;
      }
      seam.scale.set(L.w, L.h, 1);
      seam.position.z = -(L.front + 0.001);
    }
  }

  /** Runs the smoke `frames` frames from the given state (the frozen deck's cloud). */
  prewarm(frame: EffectsFrame, frames: number): void {
    if (this.prewarmed) return;
    this.prewarmed = true;
    const kind = frame.kind;
    if (!kind || frame.energyIndex === null) return;
    const card = frame.cards[frame.energyIndex];
    if (!card) return;
    this.pointEmitter(card);
    const rate = smokeRate(kind, frame.energy, this.params);
    const side = smokeSideSpeed(kind, frame.energy, this.params);
    for (let i = 0; i < frames; i++) {
      this.pool.emit(this.emitter, rate, side, 1);
      this.pool.step(1);
    }
  }

  private pointEmitter(card: EffectCard): void {
    this.emitter.x = card.group.position.x;
    this.emitter.y = card.group.position.y;
    this.emitter.z = card.group.position.z;
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
    s.position.set(card.group.position.x, floorY, 0.02);
    s.material.opacity = sh.opacity;
    s.visible = sh.opacity > 0.01;
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
        glow.visible = o > 0.001 && mat.alphaMap !== null;
      }
      const seam = this.seams[i];
      const k = this.kinds[i];
      if (c && seam && k) {
        const m = seam.material as MeshBasicMaterial;
        m.opacity = Math.min(1, seamOpacity(k, frame.time, P) * this.boost);
      }
      if (c && c.pull <= 0) this.burstDone[i] = false;
    }

    // The light and the glow sprite follow the energetic card.
    if (kind && energetic) {
      const pos = energetic.group.position;
      this.light.position.set(pos.x, pos.y, pos.z + LIGHT_AHEAD);
      this.light.intensity = pointLightIntensity(kind, energy, br, fl.light, P);
      this.sprite.position.set(pos.x, pos.y, pos.z - 0.05);
      const scale = glowSpriteScale(kind, energy, L.cardWPx, P) * fl.glow;
      this.sprite.scale.set(scale, scale, 1);
      this.spriteMat.opacity = Math.min(1, energy * this.boost);
      this.sprite.visible = energy > 0.001;
      // Landing burst, once per landing.
      if (energyIndex !== null && energetic.sinceLandMs !== null && !this.burstDone[energyIndex]) {
        this.burstDone[energyIndex] = true;
        this.pointEmitter(energetic);
        this.pool.spawn(this.emitter, burstCount(kind, P), smokeSideSpeed(kind, energy, P));
      }
    } else {
      this.light.intensity = 0;
      this.sprite.visible = false;
    }

    // Smoke.
    if (kind && energetic && frame.frames > 0) {
      this.pointEmitter(energetic);
      this.pool.emit(
        this.emitter,
        smokeRate(kind, energy, P),
        smokeSideSpeed(kind, energy, P),
        frame.frames,
      );
    }
    if (frame.frames > 0) this.pool.step(frame.frames);
    const shown = kind ? energy : 0;
    for (let i = 0; i < this.puffs.length; i++) {
      const p = this.pool.puffs[i];
      const s = this.puffs[i];
      if (!p || !s) continue;
      if (!p.alive) {
        s.visible = false;
        continue;
      }
      const m = s.material;
      const o = SmokePool.opacity(p, shown);
      s.visible = o > 0.002;
      m.opacity = o;
      m.rotation = p.rot;
      const tex = this.puffTextures[p.variant] ?? null;
      if (m.map !== tex) m.map = tex;
      m.color.set(p.tint === 1 ? COLORS.puffLight : COLORS.violet);
      const sc = SmokePool.scale(p);
      s.scale.set(sc, sc, 1);
      s.position.set(p.x, p.y, p.z);
    }

    // Fog.
    const level = fogFor(kind, energy, fl.fog, P);
    const u = this.fogUniforms;
    if (kind && energetic && level.strength > 0.001) {
      const pos = energetic.group.position;
      u.uTime.value = frame.time;
      u.uCentre.value = [pos.x / L.stageW + 0.5, pos.y / L.stageH + 0.5];
      u.uRadius.value = level.radius / L.stageH;
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
    let bytes = 0;
    for (const t of this.textures) {
      const img = t.image as { width?: number; height?: number } | undefined;
      bytes += (img?.width ?? 0) * (img?.height ?? 0) * 4;
    }
    for (const mat of this.glowMats) {
      const img = mat.alphaMap?.image as { width?: number; height?: number } | undefined;
      bytes += (img?.width ?? 0) * (img?.height ?? 0) * 4;
    }
    return bytes;
  }

  dispose(): void {
    this.scene.remove(this.light, this.sprite, this.fog, ...this.puffs, ...this.shadows);
    for (const g of this.glows) g?.removeFromParent();
    for (const s of this.seams) {
      if (!s) continue;
      s.removeFromParent();
      (s.material as MeshBasicMaterial).dispose();
    }
    for (const m of this.glowMats) {
      m.alphaMap?.dispose();
      m.dispose();
    }
    this.spriteMat.dispose();
    for (const p of this.puffs) p.material.dispose();
    for (const s of this.shadows) s.material.dispose();
    this.fogMat.dispose();
    for (const t of this.textures) t.dispose();
    this.unit.dispose();
    this.light.dispose();
  }
}
