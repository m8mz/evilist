// The smoke pool (deck spec §8, "Smoke"): a fixed pool of puffs simulated in plain numbers, frame
// by frame, from a seeded RNG, so a frozen deck renders the same cloud twice. deck-effects.ts owns
// the sprites and copies this state onto them. Units: world units (100 CSS px) scaled by k, the
// card's proportion; time in frames of 16.7 ms.
export interface Puff {
  alive: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  rot: number;
  vrot: number;
  scale0: number;
  scale1: number;
  peak: number;
  life: number;
  age: number;
  variant: 0 | 1 | 2;
  tint: 0 | 1;
}

/** The energetic card's centre, half extents and proportion, in world units. */
export interface SmokeEmitter {
  x: number;
  y: number;
  z: number;
  halfW: number;
  halfH: number;
  k: number;
}

/** A new puff's peak opacity range; `params.smoke` fits it, read at every spawn so it tunes live. */
export interface SmokeOpacity {
  opacityMin: number;
  opacityMax: number;
}

export const SMOKE = {
  riseMin: 0.0035,
  riseMax: 0.007,
  driftMax: 0.0012,
  sidePush: 0.004,
  zMin: -0.3,
  zMax: 0.35,
  scale0Min: 0.35,
  scale0Max: 0.7,
  growMin: 0.4,
  growMax: 1.0,
  lifeMin: 140,
  lifeMax: 290,
  spinMax: 0.012,
};

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

const blank = (): Puff => ({
  alive: false,
  x: 0,
  y: 0,
  z: 0,
  vx: 0,
  vy: 0,
  rot: 0,
  vrot: 0,
  scale0: 0,
  scale1: 0,
  peak: 0,
  life: 1,
  age: 0,
  variant: 0,
  tint: 0,
});

export class SmokePool {
  readonly puffs: Puff[];
  private acc = 0;

  constructor(
    readonly capacity: number,
    private readonly rng: () => number,
  ) {
    this.puffs = Array.from({ length: capacity }, blank);
  }

  get alive(): number {
    let n = 0;
    for (const p of this.puffs) if (p.alive) n++;
    return n;
  }

  /** Spawns up to n puffs: half from the top edge, a quarter from each side edge. */
  spawn(e: SmokeEmitter, n: number, sideSpeed: number, opacity: SmokeOpacity): number {
    let spawned = 0;
    for (const p of this.puffs) {
      if (spawned >= n) break;
      if (p.alive) continue;
      const pick = this.rng();
      const u = this.rng();
      if (pick < 0.5) {
        p.x = e.x + (u * 2 - 1) * e.halfW;
        p.y = e.y + e.halfH;
        p.vx = (this.rng() * 2 - 1) * SMOKE.driftMax * e.k;
      } else {
        const dir = pick < 0.75 ? -1 : 1;
        p.x = e.x + dir * e.halfW;
        p.y = e.y + (u * 2 - 1) * e.halfH;
        p.vx = dir * SMOKE.sidePush * sideSpeed * e.k;
        this.rng(); // keep the draw count equal on every branch
      }
      p.z = e.z + lerp(SMOKE.zMin, SMOKE.zMax, this.rng());
      p.vy = lerp(SMOKE.riseMin, SMOKE.riseMax, this.rng()) * e.k;
      p.rot = this.rng() * Math.PI * 2;
      p.vrot = (this.rng() * 2 - 1) * SMOKE.spinMax;
      p.scale0 = lerp(SMOKE.scale0Min, SMOKE.scale0Max, this.rng()) * e.k;
      p.scale1 = p.scale0 + lerp(SMOKE.growMin, SMOKE.growMax, this.rng()) * e.k;
      p.peak = lerp(opacity.opacityMin, opacity.opacityMax, this.rng());
      p.life = Math.round(lerp(SMOKE.lifeMin, SMOKE.lifeMax, this.rng()));
      p.age = 0;
      p.variant = Math.min(2, Math.floor(this.rng() * 3)) as 0 | 1 | 2;
      p.tint = this.rng() < 0.25 ? 1 : 0;
      p.alive = true;
      spawned++;
    }
    return spawned;
  }

  /** Emits at `rate` puffs per frame over `frames`, carrying the fraction to the next call. */
  emit(
    e: SmokeEmitter,
    rate: number,
    sideSpeed: number,
    frames: number,
    opacity: SmokeOpacity,
  ): number {
    this.acc += rate * frames;
    // Repeated acc += rate drifts below exact integers (e.g. 0.35 × 100 lands at 0.9999999999999953).
    // The epsilon lets a fractional rate integrate to rate × frames as expected.
    const n = Math.floor(this.acc + 1e-9);
    this.acc -= n;
    return n > 0 ? this.spawn(e, n, sideSpeed, opacity) : 0;
  }

  step(frames: number): void {
    for (const p of this.puffs) {
      if (!p.alive) continue;
      p.age += frames;
      if (p.age >= p.life) {
        p.alive = false;
        continue;
      }
      p.x += p.vx * frames;
      p.y += p.vy * frames;
      p.rot += p.vrot * frames;
    }
  }

  clear(): void {
    for (const p of this.puffs) p.alive = false;
    this.acc = 0;
  }

  static t(p: Puff): number {
    return p.life > 0 ? Math.min(1, p.age / p.life) : 1;
  }

  /** sin(πt) up to the puff's peak, scaled by the stage's energy so a leaving card's cloud thins. */
  static opacity(p: Puff, energy: number): number {
    return Math.sin(Math.PI * SmokePool.t(p)) * p.peak * energy;
  }

  static scale(p: Puff): number {
    return lerp(p.scale0, p.scale1, SmokePool.t(p));
  }
}
