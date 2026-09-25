import { describe, expect, it } from "vitest";
import { PART_ORDER, RIG } from "../src/data/avatarRig";
import { sceneState } from "../src/scripts/avatar";
import { applyState, bindScene, type Attr } from "../src/scripts/scene";

/** A fake SVG: every id the builder emits, recording the attributes written to it. */
function fakeScene(missing: string[] = []) {
  const els = new Map<string, Attr & { attrs: Record<string, string>; writes: number }>();
  const add = (id: string) => {
    const attrs: Record<string, string> = {};
    const el = {
      attrs,
      writes: 0,
      setAttribute: (n: string, v: string) => void ((attrs[n] = v), el.writes++),
    };
    els.set(id, el);
  };
  add("energy");
  for (const part of PART_ORDER) {
    add(`part-${part}`);
    for (const rank of RIG.ranks) add(`outfit-${rank}-${part}`);
  }
  for (const rank of RIG.ranks) for (const s of ["", "-fill", "-outline"]) add(`props-${rank}${s}`);
  for (const id of missing) els.delete(id);
  return { els, byId: (id: string) => els.get(id) ?? null };
}

const poses = RIG.ranks.map((r) => RIG.poses[r]!);
const attrs = (scene: ReturnType<typeof fakeScene>, id: string) => scene.els.get(id)!.attrs;

describe("bindScene", () => {
  it("binds every part, outfit and prop set by id", () => {
    const refs = bindScene(fakeScene().byId)!;
    expect(Object.keys(refs.parts).sort()).toEqual([...PART_ORDER].sort());
    expect(refs.outfits).toHaveLength(RIG.ranks.length);
    expect(Object.keys(refs.outfits[0]!).sort()).toEqual([...PART_ORDER].sort());
    expect(refs.props).toHaveLength(RIG.ranks.length);
  });

  it("refuses a scene missing the energy or a rank's props, so nothing half-binds", () => {
    expect(bindScene(fakeScene(["energy"]).byId)).toBeNull();
    expect(bindScene(fakeScene(["props-sysadmin-outline"]).byId)).toBeNull();
  });

  it("tolerates a missing part group (the outfit lacks it) by skipping it", () => {
    const refs = bindScene(fakeScene(["outfit-t1-support-coat-left"]).byId)!;
    expect(refs.outfits[0]!["coat-left"]).toBeUndefined();
    expect(refs.outfits[1]!["coat-left"]).toBeDefined();
  });
});

describe("applyState", () => {
  it("writes a settled rank: its outfit and props visible, the rest hidden, the pose applied", () => {
    const scene = fakeScene();
    const refs = bindScene(scene.byId)!;
    applyState(refs, sceneState(4.5 / 7, poses)); // sysadmin, settled
    expect(attrs(scene, "outfit-sysadmin-head")).toEqual({
      visibility: "visible",
      opacity: "1.000",
    });
    expect(attrs(scene, "outfit-t1-support-head")).toEqual({
      visibility: "hidden",
      opacity: "0.000",
    });
    expect(attrs(scene, "props-sysadmin")).toEqual({ visibility: "visible" });
    expect(attrs(scene, "props-sysadmin-fill")).toEqual({ opacity: "1.000" });
    expect(attrs(scene, "props-sysadmin-outline")).toEqual({
      opacity: "0.000",
      "stroke-dashoffset": "0.000",
    });
    expect(attrs(scene, "props-t3-support")).toEqual({ visibility: "hidden" });
    const [sx, sy] = RIG.pivots["shoulder-right"];
    expect(attrs(scene, "part-arm-right").transform).toBe(
      `rotate(${RIG.poses.sysadmin!["shoulder-right"].toFixed(3)} ${sx} ${sy})`,
    );
    expect(attrs(scene, "part-legs").transform).toBeUndefined();
  });

  it("writes a blend: both ranks live with their opacities and the outline mid-draw", () => {
    const scene = fakeScene();
    const refs = bindScene(scene.byId)!;
    applyState(refs, sceneState(0.85 / 7, poses)); // t = 0.5 between E and D
    expect(attrs(scene, "outfit-t1-support-torso")).toEqual({
      visibility: "visible",
      opacity: "0.500",
    });
    expect(attrs(scene, "outfit-web-concierge-torso")).toEqual({
      visibility: "visible",
      opacity: "0.500",
    });
    expect(attrs(scene, "outfit-professional-services-torso")).toEqual({
      visibility: "hidden",
      opacity: "0.000",
    });
    expect(attrs(scene, "props-web-concierge-outline")).toEqual({
      opacity: "1.000",
      "stroke-dashoffset": "0.167",
    });
    expect(attrs(scene, "props-t1-support-fill")).toEqual({ opacity: "0.000" });
  });

  it("scales the energy about the hips in scene coordinates", () => {
    const scene = fakeScene();
    applyState(bindScene(scene.byId)!, sceneState(1, poses));
    const [hx, hy] = RIG.pivots.hips;
    const x = hx + RIG.canvas.width * 0.3;
    expect(attrs(scene, "energy")).toEqual({
      opacity: "1.000",
      transform: `translate(${x} ${hy}) scale(1.000) translate(${-x} ${-hy})`,
    });
  });

  it("writes only what changed: a second identical apply writes nothing, a rank change writes that rank", () => {
    const scene = fakeScene();
    const refs = bindScene(scene.byId)!;
    const total = () => [...scene.els.values()].reduce((n, el) => n + el.writes, 0);
    applyState(refs, sceneState(4.5 / 7, poses));
    const first = total();
    expect(first).toBeGreaterThan(50);
    applyState(refs, sceneState(4.5 / 7, poses));
    expect(total()).toBe(first);
    applyState(refs, sceneState(5.5 / 7, poses));
    expect(total()).toBeGreaterThan(first);
    expect(attrs(scene, "outfit-linux-engineer-head")).toEqual({
      visibility: "visible",
      opacity: "1.000",
    });
    expect(attrs(scene, "outfit-sysadmin-head")).toEqual({
      visibility: "hidden",
      opacity: "0.000",
    });
  });
});
