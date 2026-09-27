// The seven card meshes (deck spec §5): a rounded slab with the face's painted layers on the front
// and the back on the back, built and sized here so deck-stage.ts keeps to the loop.
import {
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  type Material,
  type PlaneGeometry,
  type Texture,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { DeckLayout } from "./deck-layout";
import { CARD_W, CHIP_H, CHIP_W, COLORS, type CardModel } from "./deck-paint";
import type { DeckParams } from "./deck-params";
import { MOVING_BAND, type DrawPolicy } from "./deck-pose";
import type { DeckTextures } from "./deck-textures";

const PX = 1 / 100;

/** A mesh's layer inside its card's render band (`drawPolicy`'s order + layer): the body under its
 * overlays, the overlays in their painted order. The glow, aura and seam are deck-effects.ts's. */
export const LAYER = Object.freeze({
  slab: 0,
  back: 1,
  body: 2,
  glow: 3,
  aura: 4,
  seam: 5,
  frame: 6,
  text: 7,
  chip: 8,
});

/** The material fields `applyDrawPolicy` owns, narrowed so a test can pass plain objects. */
export interface DrawMaterial {
  transparent: boolean;
  depthTest: boolean;
  opacity: number;
  needsUpdate: boolean;
}

/** One mesh a card owns. `solid` (slab, back, body) is opaque at rest and follows the card's
 * opacity; `face` (frame, text, chip) is always transparent and follows it too; `effect` (glow,
 * aura, seam) is always transparent, its opacity deck-effects.ts's own. */
export interface DrawEntry {
  mesh: { renderOrder: number };
  mat: DrawMaterial;
  layer: number;
  role: "solid" | "face" | "effect";
}

export interface CardMeshes {
  group: Group;
  slab: Mesh;
  slabMat: MeshStandardMaterial;
  body: Mesh;
  /** On `DeckTextures.placeholder()` until the stage paints the card's body into its emissive map. */
  bodyMat: MeshPhysicalMaterial;
  frame: Mesh;
  text: Mesh;
  chip: Mesh;
  back: Mesh;
  backMat: MeshPhysicalMaterial;
  layerMats: Material[];
  /** Every mesh the card owns, built once: its six here, then the effects' planes (the stage). */
  draw: DrawEntry[];
}

export function loadImage(url: string | null): Promise<HTMLImageElement | null> {
  if (!url) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () =>
      img.decode().then(
        () => resolve(img),
        () => resolve(img),
      );
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/** The laminated recipe (spec §8): exact painted colours through the emissive, clearcoat on top. */
export function laminated(
  map: Texture,
  envMap: Texture,
  sheen: boolean,
  params: DeckParams,
): MeshPhysicalMaterial {
  const M = params.material;
  const mat = new MeshPhysicalMaterial({
    color: 0x000000,
    emissive: 0xffffff,
    emissiveMap: map,
    metalness: M.metalness,
    roughness: M.roughness,
    clearcoat: M.clearcoat,
    clearcoatRoughness: M.clearcoatRoughness,
    envMap,
    envMapIntensity: M.envMapIntensity,
  });
  if (sheen) {
    mat.sheen = M.sheen;
    mat.sheenColor = new Color(COLORS.violet);
    mat.sheenRoughness = M.sheenRoughness;
  }
  return mat;
}

export const unlit = (map: Texture): MeshBasicMaterial =>
  new MeshBasicMaterial({ map, transparent: true, depthWrite: false });

export function buildCards(
  cards: CardModel[],
  textures: DeckTextures,
  envMap: Texture,
  unit: PlaneGeometry,
  params: DeckParams,
): CardMeshes[] {
  const M = params.material;
  return cards.map((card, i) => {
    const group = new Group();
    const slabMat = new MeshStandardMaterial({
      color: 0x1b1b1b,
      roughness: M.edgeRoughness,
      metalness: M.edgeMetalness,
      envMap,
      envMapIntensity: M.envMapIntensity,
    });
    const slab = new Mesh(new RoundedBoxGeometry(1, 1, 1, 2, 0.01), slabMat);
    slab.userData.index = i;
    const energetic = card.stage.rankLabel === "S" || card.stage.rankLabel === "S+";
    // The body starts on the shared placeholder; the stage swaps its painted texture into
    // `emissiveMap` (the one slot `laminated` fills from the map) the first frame it is wanted.
    const bodyMat = laminated(textures.placeholder(), envMap, energetic, params);
    const body = new Mesh(unit, bodyMat);
    const frame = new Mesh(unit, unlit(textures.frame()));
    const text = new Mesh(unit, unlit(textures.blank())); // blank until a card is presented
    const chip = new Mesh(unit, unlit(textures.chip(i)));
    const backMat = laminated(textures.back(), envMap, false, params);
    const back = new Mesh(unit, backMat);
    back.rotation.y = Math.PI;
    group.add(slab, body, frame, text, chip, back);
    const entry = (mesh: Mesh, layer: number, role: DrawEntry["role"]): DrawEntry => ({
      mesh,
      mat: mesh.material as Material,
      layer,
      role,
    });
    return {
      group,
      slab,
      slabMat,
      body,
      bodyMat,
      frame,
      text,
      chip,
      back,
      backMat,
      layerMats: [
        slabMat,
        bodyMat,
        frame.material as Material,
        text.material as Material,
        chip.material as Material,
        backMat,
      ],
      draw: [
        entry(slab, LAYER.slab, "solid"),
        entry(back, LAYER.back, "solid"),
        entry(body, LAYER.body, "solid"),
        entry(frame, LAYER.frame, "face"),
        entry(text, LAYER.text, "face"),
        entry(chip, LAYER.chip, "face"),
      ],
    };
  });
}

/** Sizes every card to the layout; returns the front face's z (world) for the effects' planes. */
export function layoutCards(meshes: CardMeshes[], layout: DeckLayout, params: DeckParams): number {
  const M = params.material;
  const w = layout.cardW * PX;
  const h = layout.cardH * PX;
  const t = M.thickness * PX;
  const s = layout.cardW / CARD_W;
  const front = t / 2 + 0.001;
  for (const m of meshes) {
    m.slab.geometry.dispose();
    m.slab.geometry = new RoundedBoxGeometry(w, h, t, 2, M.cornerRadius * PX);
    m.body.scale.set(w, h, 1);
    m.body.position.z = front;
    m.frame.scale.set(w, h, 1);
    m.frame.position.z = front + M.layerZ.frame * PX;
    m.text.scale.set(w, h, 1);
    m.text.position.z = front + M.layerZ.text * PX;
    m.chip.scale.set(CHIP_W * s * PX, CHIP_H * s * PX, 1);
    m.chip.position.set(
      -w / 2 + (12 + CHIP_W / 2) * s * PX,
      h / 2 - (12 + CHIP_H / 2) * s * PX,
      front + M.layerZ.chip * PX,
    );
    m.back.scale.set(w, h, 1);
    m.back.position.z = -front;
  }
  return front;
}

/**
 * Applies `drawPolicy`'s (deck-pose.ts) band and the card's `opacity` to every mesh it owns, the
 * one owner of these fields. Each mesh draws at `order + layer`. A moving band puts the solid
 * meshes in the transparent list too, so the whole card sorts by its band there; at rest they are
 * transparent only while translucent (the phone's played cards). `depthWrite` is untouched. Each
 * field is written only when it changed: `transparent` swaps the program, `depthTest` GL state.
 */
export function applyDrawPolicy(
  draw: readonly DrawEntry[],
  policy: DrawPolicy,
  opacity: number,
): void {
  const transparent = policy.order >= MOVING_BAND || opacity < 0.999;
  for (const d of draw) {
    const order = policy.order + d.layer;
    if (d.mesh.renderOrder !== order) d.mesh.renderOrder = order;
    const m = d.mat;
    if (m.depthTest !== policy.depthTest) m.depthTest = policy.depthTest;
    if (d.role === "effect") continue;
    if (m.opacity !== opacity) m.opacity = opacity;
    if (d.role === "solid" && m.transparent !== transparent) {
      m.transparent = transparent;
      m.needsUpdate = true;
    }
  }
}
