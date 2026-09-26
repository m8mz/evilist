// The stage's pointer-driven targets and their smoothing (deck spec §7: tilt, hover lift, camera
// parallax), plus the phone's external tilt. Pure arithmetic over numbers the stage hands in, so
// the phone and desktop rules are unit-tested and deck-stage.ts only wires them.
import type { DeckMode } from "./deck-layout";
import type { DeckParams } from "./deck-params";
import { smooth } from "./deck-util";

export interface InputTargetsArgs {
  /** The presented card's centre and size, CSS px inside the canvas. */
  presentedX: number;
  presentedY: number;
  cardW: number;
  cardH: number;
  stageW: number;
  stageH: number;
  /** The canvas's client rect origin, to bring client coordinates into the canvas. */
  rect: { left: number; top: number };
  mode: DeckMode;
  /** Whether this tier parallaxes the camera at all (high only). Phones never do, whatever this says. */
  parallax: boolean;
  /** The landed card's index, or −1. */
  presented: number;
  racked: (index: number) => boolean;
  hitAt: (clientX: number, clientY: number) => number | null;
}

const clamp1 = (v: number): number => Math.max(-1, Math.min(1, v));

export class StageInput {
  readonly tilt = { x: 0, y: 0 };
  readonly cam = { x: 0, y: 0 };
  readonly hover: number[];
  private pointerAt: { x: number; y: number } | null = null;
  private readonly external = { x: 0, y: 0 };
  private hasExternal = false;
  private readonly tiltTarget = { x: 0, y: 0 };
  private readonly camTarget = { x: 0, y: 0 };
  private readonly hoverTarget: number[];
  private readonly params: DeckParams;

  constructor(count: number, params: DeckParams) {
    this.params = params;
    this.hover = new Array<number>(count).fill(0);
    this.hoverTarget = new Array<number>(count).fill(0);
  }

  pointer(clientX: number | null, clientY: number | null): void {
    this.pointerAt = clientX === null || clientY === null ? null : { x: clientX, y: clientY };
  }

  /** The phone's orientation tilt target, degrees; `null` releases it to 0. Allocates nothing. */
  setTilt(x: number | null, y: number | null): void {
    this.hasExternal = x !== null && y !== null;
    this.external.x = x ?? 0;
    this.external.y = y ?? 0;
  }

  /** Recomputes the targets. Returns true when a racked card sits under a desktop pointer. */
  updateTargets(a: InputTargetsArgs): boolean {
    const P = this.params;
    this.hoverTarget.fill(0);
    if (a.mode === "phone") {
      // Spec §7: no pointer tilt, no hover and no camera parallax on phones. The tilt comes from
      // the device's orientation, when the visitor turned it on.
      this.tiltTarget.x = this.hasExternal ? this.external.x : 0;
      this.tiltTarget.y = this.hasExternal ? this.external.y : 0;
      this.camTarget.x = this.camTarget.y = 0;
      return false;
    }
    if (!this.pointerAt) {
      this.tiltTarget.x = this.tiltTarget.y = 0;
      this.camTarget.x = this.camTarget.y = 0;
      return false;
    }
    const px = this.pointerAt.x - a.rect.left;
    const py = this.pointerAt.y - a.rect.top;
    if (a.presented >= 0) {
      const nx = clamp1((px - a.presentedX) / (a.cardW / 2));
      const ny = clamp1((py - a.presentedY) / (a.cardH / 2));
      this.tiltTarget.x = P.tilt.maxX * ny;
      this.tiltTarget.y = P.tilt.maxY * nx;
    } else {
      this.tiltTarget.x = this.tiltTarget.y = 0;
    }
    if (a.parallax) {
      this.camTarget.x = ((px / a.stageW) * 2 - 1) * P.camera.parallax;
      this.camTarget.y = -((py / a.stageH) * 2 - 1) * P.camera.parallax;
    } else {
      this.camTarget.x = this.camTarget.y = 0;
    }
    const hit = a.hitAt(this.pointerAt.x, this.pointerAt.y);
    const racked = hit !== null && a.racked(hit);
    if (racked && hit !== null) this.hoverTarget[hit] = 1;
    return racked;
  }

  /** Advances the smoothed values by `dt` ms (spec §7's time constants). */
  step(dt: number): void {
    const P = this.params;
    this.tilt.x = smooth(this.tilt.x, this.tiltTarget.x, dt, P.tilt.tau);
    this.tilt.y = smooth(this.tilt.y, this.tiltTarget.y, dt, P.tilt.tau);
    this.cam.x = smooth(this.cam.x, this.camTarget.x, dt, P.camera.parallaxTau);
    this.cam.y = smooth(this.cam.y, this.camTarget.y, dt, P.camera.parallaxTau);
    for (let i = 0; i < this.hover.length; i++) {
      const cur = this.hover[i] ?? 0;
      const tgt = this.hoverTarget[i] ?? 0;
      this.hover[i] = smooth(cur, tgt, dt, tgt > cur ? P.hover.inMs : P.hover.outMs);
    }
  }

  reset(): void {
    this.pointerAt = null;
    this.hasExternal = false;
    this.tilt.x = this.tilt.y = 0;
    this.cam.x = this.cam.y = 0;
    this.tiltTarget.x = this.tiltTarget.y = 0;
    this.camTarget.x = this.camTarget.y = 0;
    this.hover.fill(0);
    this.hoverTarget.fill(0);
  }
}
