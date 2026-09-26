// The smoke's sprites (deck spec §8, "Smoke"): deck-smoke.ts's seeded pool driving a fixed set of
// three-variant puff sprites, the emitter that follows the energetic card, and the freeze-only
// prewarm path. Split out of deck-effects.ts (task-6 review, ruling a): its own object pool, its own
// seeded simulation and two latches, sharing only params and the frame with the rest of the energy.
import { CanvasTexture, Color, Sprite, SpriteMaterial, SRGBColorSpace } from "three";
import type { Scene, Texture } from "three";
import { burstCount, smokeRate, smokeSideSpeed } from "./deck-energy";
import type { EffectCard, EffectsFrame } from "./deck-effects";
import { COLORS, paintPuff, PUFF_SIZE } from "./deck-paint";
import type { DeckParams } from "./deck-params";
import { SmokePool, type SmokeEmitter } from "./deck-smoke";
import { mulberry32 } from "./deck-util";

const MIPMAP = 1.33; // every texture here mipmaps; deck-textures.ts uses the same 4/3 chain factor
const PUFF_VISIBLE_MIN = 0.002; // a puff fainter than this reads as noise, not smoke

export function canvasTexture(
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

export class SmokeSprites {
  private readonly puffColors = [new Color(COLORS.violet), new Color(COLORS.puffLight)];
  private readonly puffTextures: Texture[];
  private readonly pool: SmokePool;
  private readonly puffs: Sprite[];
  // Indexed by card; grown lazily since this class isn't told the count — a read past the end is undefined, which is falsy, exactly "not yet burst".
  private readonly burstDone: boolean[] = [];
  private readonly emitter: SmokeEmitter = { x: 0, y: 0, z: 0, halfW: 1, halfH: 1, k: 1 };
  private prewarmed = false;
  private ready = false;
  private hadKind = false; // last frame's kind was non-null: its first null frame clears the pool

  constructor(
    private readonly scene: Scene,
    private readonly params: DeckParams,
    capacity: number,
    rng: () => number,
  ) {
    this.puffTextures = [0, 1, 2].map((variant) =>
      canvasTexture(PUFF_SIZE, (ctx) => paintPuff(ctx, PUFF_SIZE, mulberry32(100 + variant)), true),
    );
    this.pool = new SmokePool(capacity, rng);
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
  }

  setLayout(halfW: number, halfH: number, k: number): void {
    this.emitter.halfW = halfW;
    this.emitter.halfH = halfH;
    this.emitter.k = k;
    this.ready = true;
  }

  private pointEmitter(card: EffectCard): void {
    this.emitter.x = card.group.position.x;
    this.emitter.y = card.group.position.y;
    this.emitter.z = card.group.position.z;
  }

  /** Runs the smoke `frames` frames from the given state (the frozen deck's cloud). */
  prewarm(frame: EffectsFrame, frames: number): void {
    if (this.prewarmed) return;
    const kind = frame.kind;
    // Guards first, then latch: a deck frozen before its first setLayout, or on a rank with no energy yet, must not spend its one prewarm on the wrong (or the emitter's default 1×1) state.
    if (!this.ready || !kind || frame.energyIndex === null) return;
    const card = frame.cards[frame.energyIndex];
    if (!card) return;
    this.pointEmitter(card);
    const rate = smokeRate(kind, frame.energy, this.params);
    const side = smokeSideSpeed(kind, frame.energy, this.params);
    for (let i = 0; i < frames; i++) {
      this.pool.emit(this.emitter, rate, side, 1, this.params.smoke);
      this.pool.step(1);
    }
    this.prewarmed = true;
  }

  update(frame: EffectsFrame, energetic: EffectCard | null): void {
    const P = this.params;
    const { kind, energy, energyIndex } = frame;
    // The energy went silent: drop the cloud, or S re-energizing within the puffs' life would bring
    // an old S+ cloud back in mid-air. The puffs are already invisible (shown = 0 without a kind).
    if (!kind && this.hadKind) this.pool.clear();
    this.hadKind = kind !== null;

    for (let i = 0; i < frame.cards.length; i++) {
      const c = frame.cards[i];
      if (c && c.pull <= 0) this.burstDone[i] = false;
    }

    // Landing burst, once per landing, only inside the flare window: a stale landedAt (a freeze, or a re-mounted stage inheriting the previous one's) must not fire one with no flare to match.
    if (
      kind &&
      energetic &&
      energyIndex !== null &&
      energetic.sinceLandMs !== null &&
      energetic.sinceLandMs < P.light.flareMs &&
      !this.burstDone[energyIndex]
    ) {
      this.burstDone[energyIndex] = true;
      this.pointEmitter(energetic);
      this.pool.spawn(this.emitter, burstCount(kind, P), smokeSideSpeed(kind, energy, P), P.smoke);
    }

    if (kind && energetic && frame.frames > 0) {
      this.pointEmitter(energetic);
      this.pool.emit(
        this.emitter,
        smokeRate(kind, energy, P),
        smokeSideSpeed(kind, energy, P),
        frame.frames,
        P.smoke, // read at every spawn, so the panel's opacity slider acts live
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
      s.visible = o > PUFF_VISIBLE_MIN;
      m.opacity = o;
      m.rotation = p.rot;
      const tex = this.puffTextures[p.variant] ?? null;
      if (m.map !== tex) m.map = tex;
      m.color.copy(this.puffColors[p.tint]);
      const sc = SmokePool.scale(p);
      s.scale.set(sc, sc, 1);
      s.position.set(p.x, p.y, p.z);
    }
  }

  estimateBytes(): number {
    let bytes = 0;
    for (const t of this.puffTextures) {
      const img = t.image as { width?: number; height?: number } | undefined;
      bytes += (img?.width ?? 0) * (img?.height ?? 0) * 4 * MIPMAP;
    }
    return bytes;
  }

  dispose(): void {
    this.scene.remove(...this.puffs);
    for (const p of this.puffs) p.material.dispose();
    for (const t of this.puffTextures) t.dispose();
    this.puffTextures.length = 0; // so a post-dispose estimateBytes() reads zero, not the disposed sizes
  }
}
