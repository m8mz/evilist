import { beforeEach, describe, expect, it } from "vitest";
import { applyDrawPolicy, LAYER, type DrawEntry } from "../src/scripts/deck/deck-cards";
import { drawPolicy } from "../src/scripts/deck/deck-pose";

let writes = 0;

/** A plain stand-in for a mesh and its material whose setters count every write. */
function fakeEntry(layer: number, role: DrawEntry["role"]): DrawEntry {
  const state = { renderOrder: 0, transparent: role !== "solid", depthTest: true, opacity: 0.3 };
  return {
    layer,
    role,
    mesh: {
      get renderOrder() {
        return state.renderOrder;
      },
      set renderOrder(v: number) {
        writes++;
        state.renderOrder = v;
      },
    },
    mat: {
      get transparent() {
        return state.transparent;
      },
      set transparent(v: boolean) {
        writes++;
        state.transparent = v;
      },
      get depthTest() {
        return state.depthTest;
      },
      set depthTest(v: boolean) {
        writes++;
        state.depthTest = v;
      },
      get opacity() {
        return state.opacity;
      },
      set opacity(v: number) {
        writes++;
        state.opacity = v;
      },
      get needsUpdate() {
        return false;
      },
      set needsUpdate(_: boolean) {
        writes++;
      },
    },
  };
}

type Name = keyof typeof LAYER;
const ROLES: Record<Name, DrawEntry["role"]> = {
  slab: "solid",
  back: "solid",
  body: "solid",
  glow: "effect",
  aura: "effect",
  seam: "effect",
  frame: "face",
  text: "face",
  chip: "face",
};

/** A card's nine meshes, by name, and the draw list the stage would hand `applyDrawPolicy`. */
function fakeCard() {
  const names = Object.keys(LAYER) as Name[];
  const by = Object.fromEntries(names.map((n) => [n, fakeEntry(LAYER[n], ROLES[n])])) as Record<
    Name,
    DrawEntry
  >;
  return { by, draw: names.map((n) => by[n]) };
}

beforeEach(() => {
  writes = 0;
});

describe("applyDrawPolicy", () => {
  it("draws every mesh of an arriving card after every mesh of a leaving one and of the rack", () => {
    const racked = fakeCard();
    const leaving = fakeCard();
    const arriving = fakeCard();
    applyDrawPolicy(racked.draw, drawPolicy("racked"), 1);
    applyDrawPolicy(leaving.draw, drawPolicy("leaving"), 1);
    applyDrawPolicy(arriving.draw, drawPolicy("pulling"), 1);
    expect(leaving.by.chip.mesh.renderOrder).toBeLessThan(arriving.by.body.mesh.renderOrder);
    expect(leaving.by.frame.mesh.renderOrder).toBeLessThan(arriving.by.slab.mesh.renderOrder);
    expect(racked.by.seam.mesh.renderOrder).toBeLessThan(leaving.by.slab.mesh.renderOrder);
    const top = (c: ReturnType<typeof fakeCard>) =>
      Math.max(...c.draw.map((d) => d.mesh.renderOrder));
    const bottom = (c: ReturnType<typeof fakeCard>) =>
      Math.min(...c.draw.map((d) => d.mesh.renderOrder));
    expect(top(racked)).toBeLessThan(bottom(leaving));
    expect(top(leaving)).toBeLessThan(bottom(arriving));
  });

  it("keeps the body under its overlays inside one card, in the painted order", () => {
    const card = fakeCard();
    applyDrawPolicy(card.draw, drawPolicy("landing"), 1);
    const order = (Object.keys(LAYER) as Name[]).map((n) => card.by[n].mesh.renderOrder);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(new Set(order).size).toBe(order.length);
    expect(card.by.body.mesh.renderOrder).toBeLessThan(card.by.chip.mesh.renderOrder);
  });

  it("puts a moving card wholly in the transparent list with the depth test off", () => {
    const card = fakeCard();
    applyDrawPolicy(card.draw, drawPolicy("leaving"), 1);
    for (const d of card.draw) {
      expect(d.mat.transparent).toBe(true);
      expect(d.mat.depthTest).toBe(false);
    }
    expect(card.by.body.mat.opacity).toBe(1);
  });

  it("returns a settled card's body to opaque with the depth test on", () => {
    const card = fakeCard();
    applyDrawPolicy(card.draw, drawPolicy("landing"), 1);
    applyDrawPolicy(card.draw, drawPolicy("presented"), 1);
    for (const n of ["slab", "back", "body"] as const) {
      expect(card.by[n].mat.transparent).toBe(false);
    }
    for (const d of card.draw) expect(d.mat.depthTest).toBe(true);
    expect(card.by.chip.mat.transparent).toBe(true); // the overlays stay transparent
  });

  it("keeps a phone's translucent card at rest translucent, and leaves the effects' opacity alone", () => {
    const card = fakeCard();
    applyDrawPolicy(card.draw, drawPolicy("racked"), 0.5);
    for (const n of ["slab", "back", "body"] as const) {
      expect(card.by[n].mat.transparent).toBe(true);
      expect(card.by[n].mat.opacity).toBe(0.5);
    }
    expect(card.by.chip.mat.opacity).toBe(0.5);
    expect(card.by.glow.mat.opacity).toBe(0.3);
    expect(card.by.body.mat.depthTest).toBe(true);
    applyDrawPolicy(card.draw, drawPolicy("racked"), 1);
    expect(card.by.body.mat.transparent).toBe(false);
  });

  it("writes nothing when nothing changed", () => {
    const card = fakeCard();
    for (const [phase, opacity] of [
      ["leaving", 0.75],
      ["racked", 0.5],
      ["pulling", 1],
      ["presented", 1],
    ] as const) {
      applyDrawPolicy(card.draw, drawPolicy(phase), opacity);
      writes = 0;
      applyDrawPolicy(card.draw, drawPolicy(phase), opacity);
      expect(writes, phase).toBe(0);
    }
  });
});
