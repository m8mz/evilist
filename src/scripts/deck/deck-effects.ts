// The energy's objects (deck spec §5 "glow mask", "seam"; §8 glow, smoke, fog, aura): built once per
// mount, driven every frame from deck-energy.ts's numbers and deck-smoke-sprites.ts's pool.
// Everything that glows sits on BLOOM_LAYER for deck-bloom.ts and renders at params.glow.gain on
// both tiers; the high tier's bloom adds only the blur of the brightest parts on top.
import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  ShaderMaterial,
  SRGBColorSpace,
} from "three";
import type { Group, Scene, Texture } from "three";
import { LAYER, type DrawEntry } from "./deck-cards";
import {
  auraOpacity,
  coverFit,
  flare,
  fogFor,
  glowOpacity,
  proportion,
  seamOpacity,
  type EnergyKind,
} from "./deck-energy";
import { FOG_FRAGMENT, FOG_VERTEX, fogUniforms, type FogUniforms } from "./deck-fog";
import { COLORS, paintMaskFaded, paintSeam, WINDOW } from "./deck-paint";
import type { DeckParams } from "./deck-params";
import type { CardPhase } from "./deck-pose";
import { SmokeSprites } from "./deck-smoke-sprites";

export const BLOOM_LAYER = 1;
const PX = 1 / 100;
const FOG_Z = -0.5;
const FOG_MARGIN = 1.1; // the plane at FOG_Z would else crop at the view's edge; the falloff hides the margin
const SEAM_GAP = 0.001; // world units behind the card's back face, clear of z-fighting with it
const SEAM_DENSITY_MAX = 1.5; // seam canvas px per CSS px: the pixel ratio up to 1.5, which keeps the thin line crisp at about half the bytes of 2×
const SEAM_HYSTERESIS = 0.1; // deck-textures.ts's rule: repaint only past a 10 % width change (attach's 2 × 2 canvas always paints), so a window drag doesn't re-upload per resize callback
const OCCLUDER_INSET = 0.0005; // just inside the front face: the glow plane at front + 0.002 stays ahead of it, everything behind the card falls behind it
const VISIBLE_MIN = 0.001; // below this opacity or fog strength, hide the object outright
const MIPMAP = 1.33; // every texture here mipmaps; deck-textures.ts uses the same 4/3 chain factor
const FADE_MIN = 0.02; // the masks' fade spans at least this much of the height, whatever the panel says

export interface EffectsOptions {
  scene: Scene;
  params: DeckParams;
  tier: "mid" | "high";
  rng: () => number;
  kinds: (EnergyKind | null)[];
  eyeColors: string[];
  pixelRatio: number; // the renderer's
  anisotropy: number; // the card textures' own
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
}

export class DeckEffects {
  private readonly scene: Scene;
  private readonly params: DeckParams;
  private readonly highTier: boolean;
  private readonly seamDensity: number;
  private readonly anisotropy: number;
  private readonly kinds: (EnergyKind | null)[];
  private readonly unit = new PlaneGeometry(1, 1);
  private readonly glowMats: MeshBasicMaterial[];
  private readonly glows: (Mesh | null)[];
  private readonly glowImages: (HTMLImageElement | null)[];
  // The aura's own plane: violet, additive, only for the ranks that ever show one (as the seam
  // does), and even then lit only for the currently energetic card.
  private readonly auraMats: (MeshBasicMaterial | null)[];
  private readonly auras: (Mesh | null)[];
  private readonly auraImages: (HTMLImageElement | null)[];
  private readonly seams: (Mesh<PlaneGeometry, MeshBasicMaterial> | null)[];
  private readonly seamCanvases: (HTMLCanvasElement | null)[];
  private readonly occluders: (Mesh<PlaneGeometry, MeshBasicMaterial> | null)[]; // high tier only: depth-only proxies so the bloom pass, which draws no cards, still occludes
  private readonly occluderMat = new MeshBasicMaterial({ colorWrite: false, side: DoubleSide }); // both faces: every racked card shows the camera its back, where a front-only proxy is culled and occludes nothing
  private readonly smoke: SmokeSprites;
  private readonly fog: Mesh;
  private readonly fogMat: ShaderMaterial;
  private readonly fogUniforms: FogUniforms;
  private fogT0: number | null = null;
  private readonly textures: Texture[] = [];
  private layout: EffectsLayout | null = null;
  private baked: { fadeFrom: number; fadeTo: number }; // the aura fade the masks were painted with

  constructor(opts: EffectsOptions) {
    this.scene = opts.scene;
    this.params = opts.params;
    this.baked = { fadeFrom: opts.params.aura.fadeFrom, fadeTo: opts.params.aura.fadeTo };
    this.kinds = opts.kinds;
    this.highTier = opts.tier === "high";
    this.seamDensity = Math.min(opts.pixelRatio, SEAM_DENSITY_MAX);
    this.anisotropy = opts.anisotropy;
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

    // Aura planes: only the ranks with a kind (S, S+) ever get one, same gate as the seam below.
    this.auraMats = Array.from({ length: n }, (_, i) =>
      this.kinds[i]
        ? new MeshBasicMaterial({
            color: new Color(COLORS.violet),
            transparent: true,
            opacity: 0,
            depthWrite: false,
            blending: AdditiveBlending,
          })
        : null,
    );
    this.auras = new Array<Mesh | null>(n).fill(null);
    this.auraImages = new Array<HTMLImageElement | null>(n).fill(null);

    this.seams = new Array<Mesh<PlaneGeometry, MeshBasicMaterial> | null>(n).fill(null);
    this.seamCanvases = new Array<HTMLCanvasElement | null>(n).fill(null);
    this.occluders = new Array<Mesh<PlaneGeometry, MeshBasicMaterial> | null>(n).fill(null);

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
      // the opaque list instead, so the cards draw over the far-field fog, as spec'd.
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
  }

  /** Adds the card's glow and aura planes (blank until setGlow/setAura) and, on S and S+, its back
   * seam; returns them for the card's draw list, so they join its render band (deck-cards.ts). */
  attach(index: number, group: Group): DrawEntry[] {
    if (this.glows[index]) return []; // a second attach for one index would otherwise leak the first
    const mat = this.glowMats[index];
    if (!mat) return [];
    const glow = new Mesh(this.unit, mat);
    glow.layers.enable(BLOOM_LAYER);
    glow.visible = false;
    group.add(glow);
    this.glows[index] = glow;
    const draw: DrawEntry[] = [{ mesh: glow, mat, layer: LAYER.glow, role: "effect" }];
    const auraMat = this.auraMats[index];
    if (auraMat) {
      const aura = new Mesh(this.unit, auraMat);
      aura.layers.enable(BLOOM_LAYER);
      aura.visible = false;
      group.add(aura);
      this.auras[index] = aura;
      draw.push({ mesh: aura, mat: auraMat, layer: LAYER.aura, role: "effect" });
    }
    if (this.kinds[index]) {
      const canvas = document.createElement("canvas");
      canvas.width = 2;
      canvas.height = 2;
      const texture = new CanvasTexture(canvas);
      texture.colorSpace = SRGBColorSpace;
      texture.anisotropy = this.anisotropy; // the thin line stays sharp at the rack's 77° angle
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
      draw.push({ mesh: seam, mat: seam.material, layer: LAYER.seam, role: "effect" });
    }
    if (this.highTier) {
      const proxy = new Mesh(this.unit, this.occluderMat);
      proxy.layers.set(BLOOM_LAYER); // layer 1 only: invisible to the main render and the raycaster
      group.add(proxy);
      this.occluders[index] = proxy;
    }
    if (this.layout) this.placeCard(index);
    return draw;
  }

  /** Paints `image` into `canvas` darkened to nothing between params.aura.fadeFrom and fadeTo of
   * the height, fadeTo held FADE_MIN past fadeFrom so the panel's ranges can never invert it. */
  private paintFaded(canvas: HTMLCanvasElement, image: HTMLImageElement): void {
    const ctx = canvas.getContext("2d");
    const { fadeFrom, fadeTo } = this.params.aura;
    const to = Math.max(fadeTo, fadeFrom + FADE_MIN);
    if (ctx) paintMaskFaded(ctx, image, canvas.width, canvas.height, fadeFrom, to);
  }

  /** A canvas the size of `image`, faded (paintFaded), as a texture — the glow and aura planes both
   * use this same treatment. */
  private fadedMaskTexture(image: HTMLImageElement): CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;
    this.paintFaded(canvas, image);
    return new CanvasTexture(canvas);
  }

  /** The panel moved aura.fadeFrom or fadeTo: repaint every loaded mask in place, once per change. */
  private rebakeFades(): void {
    const { fadeFrom, fadeTo } = this.params.aura;
    if (fadeFrom === this.baked.fadeFrom && fadeTo === this.baked.fadeTo) return;
    this.baked = { fadeFrom, fadeTo };
    const rebake = (mat: MeshBasicMaterial | null | undefined, image: HTMLImageElement | null) => {
      const canvas = mat?.alphaMap?.image;
      if (!image || !mat?.alphaMap || !(canvas instanceof HTMLCanvasElement)) return;
      this.paintFaded(canvas, image);
      mat.alphaMap.needsUpdate = true; // same size, same material program: a re-upload only
    };
    this.glowMats.forEach((m, i) => rebake(m, this.glowImages[i] ?? null));
    this.auraMats.forEach((m, i) => rebake(m, this.auraImages[i] ?? null));
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
    mat.alphaMap = this.fadedMaskTexture(image);
    mat.needsUpdate = true;
    if (this.layout) this.placeCard(index);
  }

  /** The aura plane's mask: the figure's silhouette (scripts/aura-mask.mjs), faded the same way. */
  setAura(index: number, image: HTMLImageElement | null): void {
    this.auraImages[index] = image;
    const mat = this.auraMats[index];
    if (!mat) return;
    mat.alphaMap?.dispose();
    if (!image) {
      mat.alphaMap = null;
      mat.needsUpdate = true;
      return;
    }
    mat.alphaMap = this.fadedMaskTexture(image);
    mat.needsUpdate = true;
    if (this.layout) this.placeCard(index);
  }

  setLayout(layout: EffectsLayout): void {
    this.layout = layout;
    for (let i = 0; i < this.glows.length; i++) this.placeCard(i);
    this.fog.scale.set(layout.stageW * FOG_MARGIN, layout.stageH * FOG_MARGIN, 1);
    this.fogUniforms.uAspect.value = layout.stageW / layout.stageH;
    this.smoke.setLayout(layout.w / 2, layout.h / 2, proportion(layout.cardWPx));
  }

  /** Cover-fits a mask's alphaMap into w × winH, mirroring paintBody's own fit (deck-energy's coverFit). */
  private fitMask(
    mat: MeshBasicMaterial | null | undefined,
    image: HTMLImageElement | null,
    w: number,
    winH: number,
  ): void {
    if (!image || !mat?.alphaMap) return;
    const iw = image.naturalWidth || image.width;
    const ih = image.naturalHeight || image.height;
    if (iw <= 0 || ih <= 0) return;
    const fit = coverFit(w, winH, iw, ih);
    mat.alphaMap.repeat.set(fit.repeatX, fit.repeatY);
    mat.alphaMap.offset.set(fit.offsetX, fit.offsetY);
  }

  /** The glow and aura planes over the portrait window with paintBody's cover fit; the seam over the back. */
  private placeCard(index: number): void {
    const L = this.layout;
    if (!L) return;
    const M = this.params.material;
    const winH = L.h * WINDOW;
    const glow = this.glows[index];
    if (glow) {
      glow.scale.set(L.w, winH, 1);
      glow.position.set(0, L.h / 2 - winH / 2, L.front + M.layerZ.glow * PX);
      this.fitMask(this.glowMats[index], this.glowImages[index], L.w, winH);
    }
    const aura = this.auras[index];
    if (aura) {
      aura.scale.set(L.w, winH, 1);
      aura.position.set(0, L.h / 2 - winH / 2, L.front + M.layerZ.glow * PX);
      this.fitMask(this.auraMats[index], this.auraImages[index], L.w, winH);
    }
    const occluder = this.occluders[index];
    if (occluder) {
      occluder.scale.set(L.w, L.h, 1);
      occluder.position.z = L.front - OCCLUDER_INSET;
    }
    const seam = this.seams[index];
    const canvas = this.seamCanvases[index];
    if (seam && canvas) {
      const w = Math.max(2, Math.round(L.cardWPx * this.seamDensity));
      const h = Math.max(2, Math.round((L.h / L.w) * w));
      if (canvas.width <= 2 || Math.abs(w - canvas.width) > canvas.width * SEAM_HYSTERESIS) {
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

  update(frame: EffectsFrame): void {
    const L = this.layout;
    if (!L) return;
    const P = this.params;
    this.rebakeFades();
    const { kind, energy, energyIndex } = frame;
    const energetic = energyIndex === null ? null : (frame.cards[energyIndex] ?? null);
    const fl = flare(kind, energetic?.sinceLandMs ?? null, P);

    // Glow planes, auras and seams, every card.
    for (let i = 0; i < frame.cards.length; i++) {
      const c = frame.cards[i];
      const glow = this.glows[i];
      const mat = this.glowMats[i];
      if (c && glow && mat) {
        const o = glowOpacity(c.phase, c.sinceLandMs, c.sinceLeaveMs, P) * P.glow.gain;
        mat.opacity = Math.min(1, o);
        glow.visible = o > VISIBLE_MIN && mat.alphaMap !== null;
      }
      // The aura only ever lights the single energetic card (deck-pose's energyFor picks at most
      // one); every other card's plane stays hidden, whatever its own rank.
      const aura = this.auras[i];
      const auraMat = this.auraMats[i];
      if (aura && auraMat) {
        const active = kind !== null && i === energyIndex;
        const o = active ? Math.min(1, auraOpacity(kind, energy, fl.glow, P) * P.glow.gain) : 0;
        auraMat.opacity = o;
        aura.visible = o > VISIBLE_MIN && auraMat.alphaMap !== null;
      }
      const seam = this.seams[i];
      const k = this.kinds[i];
      if (c && seam && k) {
        const m = seam.material;
        m.opacity = Math.min(1, seamOpacity(k, frame.time, P) * P.glow.gain);
      }
    }

    this.smoke.update(frame, energetic);

    // Fog.
    const level = fogFor(kind, energy, fl.fog, L.cardWPx, P);
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
    for (const mat of this.auraMats) {
      const img = mat?.alphaMap?.image as { width?: number; height?: number } | undefined;
      bytes += (img?.width ?? 0) * (img?.height ?? 0) * 4 * MIPMAP;
    }
    return bytes;
  }

  dispose(): void {
    this.smoke.dispose();
    this.scene.remove(this.fog);
    for (const g of this.glows) g?.removeFromParent();
    for (const a of this.auras) a?.removeFromParent();
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
    for (const m of this.auraMats) {
      if (!m) continue;
      m.alphaMap?.dispose();
      m.alphaMap = null;
      m.dispose();
    }
    this.fogMat.dispose();
    for (const t of this.textures) t.dispose();
    this.unit.dispose();
    // Drop every reference so nothing stays reachable and a post-dispose estimateBytes() reads zero.
    this.textures.length = 0;
    this.glows.fill(null);
    this.auras.fill(null);
    this.seams.fill(null);
    this.occluders.fill(null);
    this.glowImages.fill(null);
    this.auraImages.fill(null);
    this.seamCanvases.fill(null);
    this.layout = null;
  }
}
