import { describe, expect, it } from "vitest";
import type { RankLabel } from "../src/data/career";
import { columnFor, deckLayout } from "../src/scripts/deck/deck-layout";
import {
  backOut,
  clamp01,
  deckPose,
  easeInOutCubic,
  energyFor,
  pullsFor,
  type PoseInput,
} from "../src/scripts/deck/deck-pose";

const LABELS: RankLabel[] = ["E", "D", "C", "B", "A", "S", "S+"];
/** Progress at fraction `local` of rank `i`'s stretch, for seven ranks. */
const at = (i: number, local: number) => (i + local) / 7;

describe("clamp01 and the eases", () => {
  it("clamps and turns NaN into 0", () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(1.4)).toBe(1);
    expect(clamp01(Number.NaN)).toBe(0);
    expect(clamp01(0.25)).toBe(0.25);
  });

  it("eases start at 0 and end at 1; the back-ease overshoots on the way in", () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 6);
    expect(backOut(0, 1.3)).toBeCloseTo(0, 6);
    expect(backOut(1, 1.3)).toBeCloseTo(1, 6);
    expect(backOut(0.8, 1.3)).toBeGreaterThan(1);
  });
});

describe("pullsFor", () => {
  it("presents the active rank alone outside the handoff window", () => {
    const r = pullsFor(at(3, 0.5), 7);
    expect(r.active).toBe(3);
    expect(r.within).toBeCloseTo(0.5, 6);
    expect(r.k).toBe(0);
    expect(r.pull).toEqual([0, 0, 0, 1, 0, 0, 0]);
  });

  it("hands off during the last 30% of a rank, cubic in-out", () => {
    const start = pullsFor(at(0, 0.7), 7);
    expect(start.k).toBeCloseTo(0, 6);
    const half = pullsFor(at(0, 0.85), 7);
    expect(half.k).toBeCloseTo(0.5, 6);
    expect(half.pull[0]).toBeCloseTo(0.5, 6);
    expect(half.pull[1]).toBeCloseTo(0.5, 6);
    const quarter = pullsFor(at(0, 0.775), 7);
    expect(quarter.pull[1]).toBeCloseTo(easeInOutCubic(0.25), 6);
    expect(quarter.pull[0]).toBeCloseTo(1 - easeInOutCubic(0.25), 6);
  });

  it("is continuous across the rank boundary", () => {
    const before = pullsFor(at(1, 0) - 1e-9, 7);
    const after = pullsFor(at(1, 0), 7);
    expect(before.pull[1]).toBeCloseTo(1, 4);
    expect(after.pull[1]).toBe(1);
    expect(before.pull[0]).toBeCloseTo(0, 4);
  });

  it("keeps E presented at the top and S+ presented at the end", () => {
    expect(pullsFor(0, 7).pull[0]).toBe(1);
    expect(pullsFor(-0.5, 7).pull[0]).toBe(1);
    expect(pullsFor(at(6, 0.9), 7).pull[6]).toBe(1);
    expect(pullsFor(1, 7).pull[6]).toBe(1);
    expect(pullsFor(1.3, 7).pull[6]).toBe(1);
    expect(pullsFor(Number.NaN, 7).pull[0]).toBe(1);
  });
});

describe("energyFor", () => {
  it("is zero through rank A", () => {
    for (const i of [0, 1, 2, 3, 4]) {
      expect(energyFor(pullsFor(at(i, 0.5), 7), LABELS)).toEqual({
        energy: 0,
        kind: null,
        index: null,
      });
    }
  });

  it("breathes at 0.3 while S is presented and grows through S+", () => {
    expect(energyFor(pullsFor(at(5, 0.5), 7), LABELS)).toEqual({
      energy: 0.3,
      kind: "S",
      index: 5,
    });
    const early = energyFor(pullsFor(at(6, 0), 7), LABELS);
    expect(early.kind).toBe("S+");
    expect(early.energy).toBeCloseTo(0.25, 6);
    const mid = energyFor(pullsFor(at(6, 0.35), 7), LABELS);
    expect(mid.energy).toBeCloseTo(0.25 + 0.75 * 0.5, 6);
    const late = energyFor(pullsFor(at(6, 0.9), 7), LABELS);
    expect(late.energy).toBeCloseTo(1, 6);
  });

  it("scales with the pull while S is arriving, and follows the larger pull in the S → S+ handoff", () => {
    const arriving = energyFor(pullsFor(at(4, 0.85), 7), LABELS); // S at pull 0.5
    expect(arriving.kind).toBe("S");
    expect(arriving.energy).toBeCloseTo(0.15 * 0.5, 6);
    const leavingS = energyFor(pullsFor(at(5, 0.775), 7), LABELS); // S 0.84, S+ 0.16
    expect(leavingS.kind).toBe("S");
    expect(leavingS.index).toBe(5);
    const arrivingSPlus = energyFor(pullsFor(at(5, 0.925), 7), LABELS); // S 0.16, S+ 0.84
    expect(arrivingSPlus.kind).toBe("S+");
    expect(arrivingSPlus.index).toBe(6);
    expect(arrivingSPlus.energy).toBeCloseTo(0.15 * easeInOutCubic(0.75), 6);
  });
});

const column = columnFor(1440);
const desktopLayout = deckLayout({
  stageW: 1440,
  stageH: 836,
  columnLeft: column.left,
  columnW: column.width,
  mode: "desktop",
});
const phoneLayout = deckLayout({
  stageW: 390,
  stageH: 780,
  columnLeft: 0,
  columnW: 390,
  mode: "phone",
});
const none = [null, null, null, null, null, null, null];
const input = (over: Partial<PoseInput>): PoseInput => ({
  p: 0,
  labels: LABELS,
  layout: desktopLayout,
  tilt: { x: 0, y: 0 },
  hover: [0, 0, 0, 0, 0, 0, 0],
  time: 0,
  landedAt: none,
  intro: null,
  ...over,
});

const finite = (value: unknown): void => {
  if (typeof value === "number") expect(Number.isFinite(value)).toBe(true);
  else if (Array.isArray(value)) value.forEach(finite);
  else if (value && typeof value === "object") Object.values(value).forEach(finite);
};

describe("deckPose on desktop", () => {
  it("racks every card but the presented one, backs to the viewer at 103°", () => {
    const s = deckPose(input({ p: at(3, 0.5) }));
    expect(s.active).toBe(3);
    for (const i of [0, 1, 2, 4, 5, 6]) {
      const c = s.cards[i]!;
      expect(c.phase).toBe("racked");
      expect(c.x).toBe(desktopLayout.slots[i]!.x);
      expect(c.y).toBe(desktopLayout.slots[i]!.y);
      expect(c.z).toBe(0);
      expect(c.rotY).toBe(103);
      expect(c.scale).toBe(1);
      expect(c.opacity).toBe(1);
    }
  });

  it("presents the active card flat, lifted 60 px toward the viewer, at the presented anchor", () => {
    const c = deckPose(input({ p: at(3, 0.5) })).cards[3]!;
    expect(c.landed).toBe(true);
    expect(c.phase).toBe("presented");
    expect(c.x).toBeCloseTo(desktopLayout.presented.x, 6);
    expect(c.y).toBeCloseTo(desktopLayout.presented.y, 6);
    expect(c.z).toBeCloseTo(60, 6);
    expect(c.rotY).toBeCloseTo(0, 6);
    expect(c.rotX).toBe(0);
    expect(c.scale).toBeCloseTo(1, 6);
  });

  it("moves the incoming card along the pull curve and swings it past flat", () => {
    const half = deckPose(input({ p: at(0, 0.85) })); // pull 0.5 each
    const inc = half.cards[1]!;
    const out = half.cards[0]!;
    expect(inc.phase).toBe("pulling");
    expect(out.phase).toBe("leaving");
    const slot = desktopLayout.slots[1]!;
    const pres = desktopLayout.presented;
    expect(inc.x).toBeCloseTo(slot.x + (pres.x - slot.x) * 0.5, 6);
    expect(inc.z).toBeCloseTo(60 * 1.6 * Math.sin(Math.PI * 0.5) + 60 * 0.5, 6);
    expect(inc.scale).toBeCloseTo(1.06, 6);
    expect(inc.rotY).toBeCloseTo(103 * (1 - backOut(0.5, 1.3)), 6);
    const late = deckPose(input({ p: at(0, 0.7 + 0.3 * 0.9) })).cards[1]!; // pull ≈ 0.996
    expect(late.landed).toBe(true);
    const swing = deckPose(input({ p: at(0, 0.7 + 0.3 * 0.78) })).cards[1]!; // k 0.78 → pull 0.95
    expect(swing.rotY).toBeLessThan(0);
  });

  it("adds the smoothed tilt only to the landed card", () => {
    const s = deckPose(input({ p: at(2, 0.5), tilt: { x: -3, y: 7 } }));
    expect(s.cards[2]!.rotX).toBeCloseTo(-3, 6);
    expect(s.cards[2]!.rotY).toBeCloseTo(7, 6);
    expect(s.cards[3]!.rotY).toBe(103);
    expect(s.cards[1]!.rotX).toBe(0);
  });

  it("lifts a hovered racked card 6 px toward the viewer and 3 px up", () => {
    const s = deckPose(input({ p: at(2, 0.5), hover: [0, 0, 0, 0, 1, 0, 0] }));
    expect(s.cards[4]!.z).toBeCloseTo(6, 6);
    expect(s.cards[4]!.y).toBeCloseTo(desktopLayout.slots[4]!.y - 3, 6);
    expect(s.cards[2]!.z).toBeCloseTo(60, 6); // the presented card ignores hover
  });

  it("floats the presented card once landed, fading the amplitude in over 1.5 s", () => {
    const rest = deckPose(
      input({ p: at(2, 0.5), time: 5000, landedAt: [null, null, 5000, ...none.slice(3)] }),
    );
    expect(rest.cards[2]!.y).toBeCloseTo(desktopLayout.presented.y, 6);
    const t = 5000 + 1050; // a quarter of the y period after landing, amplitude 0.7
    const s = deckPose(
      input({ p: at(2, 0.5), time: t, landedAt: [null, null, 5000, ...none.slice(3)] }),
    );
    const a = 1050 / 1500;
    expect(s.cards[2]!.y).toBeCloseTo(
      desktopLayout.presented.y + a * 4 * Math.sin((2 * Math.PI * t) / 4200),
      6,
    );
    expect(s.cards[2]!.rotZ).toBeCloseTo(a * 0.6 * Math.sin((2 * Math.PI * t) / 6100), 6);
    expect(s.cards[2]!.rotY).toBeCloseTo(a * 1.2 * Math.sin((2 * Math.PI * t) / 5300), 6);
    expect(s.cards[2]!.rotX).toBeCloseTo(a * 0.8 * Math.sin((2 * Math.PI * t) / 4700), 6);
    expect(s.cards[2]!.phase).toBe("presented");
  });

  it("reports landing for 700 ms after a card lands, then presented", () => {
    const landed = [null, null, 5000, ...none.slice(3)];
    expect(deckPose(input({ p: at(2, 0.5), time: 5300, landedAt: landed })).cards[2]!.phase).toBe(
      "landing",
    );
    expect(deckPose(input({ p: at(2, 0.5), time: 5800, landedAt: landed })).cards[2]!.phase).toBe(
      "presented",
    );
  });

  it("never emits NaN, whatever the progress", () => {
    for (const p of [-1, 0, 0.123, 0.5, 0.999, 1, 2, Number.NaN]) {
      finite(deckPose(input({ p, time: 123 })));
    }
  });

  it("carries the energy through", () => {
    const s = deckPose(input({ p: at(6, 0.35) }));
    expect(s.kind).toBe("S+");
    expect(s.energyIndex).toBe(6);
    expect(s.energy).toBeCloseTo(0.625, 6);
  });
});

describe("deckPose on phones", () => {
  it("centres the presented card and parks the next one at the right edge, back to the viewer", () => {
    const s = deckPose(input({ p: at(2, 0.5), layout: phoneLayout }));
    expect(s.cards[2]!.x).toBe(phoneLayout.presented.x);
    expect(s.cards[3]!.x).toBe(phoneLayout.next!.x);
    expect(s.cards[3]!.rotY).toBe(-80);
    expect(s.cards[3]!.opacity).toBe(1);
    expect(s.cards[4]!.x).toBe(phoneLayout.next!.x);
    expect(s.cards[4]!.opacity).toBe(0);
  });

  it("sends played cards to the exit at 70°, half transparent", () => {
    const s = deckPose(input({ p: at(2, 0.5), layout: phoneLayout }));
    expect(s.cards[1]!.x).toBe(phoneLayout.exit!.x);
    expect(s.cards[1]!.rotY).toBe(70);
    expect(s.cards[1]!.opacity).toBe(0.5);
    expect(s.cards[0]!.x).toBe(phoneLayout.exit!.x);
  });

  it("pulls the incoming card in from the right and the leaving card out to the left", () => {
    const s = deckPose(input({ p: at(2, 0.85), layout: phoneLayout })); // pull 0.5 each
    const inc = s.cards[3]!;
    const out = s.cards[2]!;
    expect(inc.x).toBeCloseTo(
      phoneLayout.next!.x + (phoneLayout.presented.x - phoneLayout.next!.x) * 0.5,
      6,
    );
    expect(out.x).toBeCloseTo(
      phoneLayout.exit!.x + (phoneLayout.presented.x - phoneLayout.exit!.x) * 0.5,
      6,
    );
    expect(out.opacity).toBeCloseTo(0.75, 6);
    // While the handoff runs, the card after the incoming one is the visible "next".
    expect(s.cards[4]!.opacity).toBe(1);
    expect(s.cards[5]!.opacity).toBe(0);
  });

  it("is continuous across the boundary for the waiting stack", () => {
    const before = deckPose(input({ p: at(3, 0) - 1e-9, layout: phoneLayout }));
    const after = deckPose(input({ p: at(3, 0), layout: phoneLayout }));
    expect(before.cards[4]!.opacity).toBe(1);
    expect(after.cards[4]!.opacity).toBe(1);
    expect(before.cards[4]!.x).toBe(after.cards[4]!.x);
  });

  it("ignores hover on phones", () => {
    const s = deckPose(input({ p: at(2, 0.5), layout: phoneLayout, hover: [0, 0, 0, 1, 0, 0, 0] }));
    expect(s.cards[3]!.z).toBe(0);
  });
});
