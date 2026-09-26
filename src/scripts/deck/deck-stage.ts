// The journey deck's WebGL stage (deck spec §5–§9): seven laminated card meshes driven by the pure
// pose model each frame. Lazy import; fixed colour management, so every token survives the renderer.
import {
  AmbientLight,
  CanvasTexture,
  Color,
  DirectionalLight,
  EquirectangularReflectionMapping,
  Group,
  LinearMipmapLinearFilter,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  NoToneMapping,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Raycaster,
  Scene,
  SRGBColorSpace,
  Vector2,
  WebGLRenderer,
  type Material,
  type Texture,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { RankLabel } from "../../data/career";
import { ENV_H, ENV_W, paintEnvironment } from "./deck-env";
import { columnFor, deckLayout, type DeckLayout, type DeckMode } from "./deck-layout";
import { CARD_W, CHIP_H, CHIP_W, COLORS, PRINT_STEPS, type CardModel } from "./deck-paint";
import { DECK_PARAMS, type DeckParams } from "./deck-params";
import { deckPose, type CardPhase, type IntroState, type StagePose } from "./deck-pose";
import { DeckTextures } from "./deck-textures";
import { pixelRatioCap } from "./deck-tier";
import { mulberry32, pickRendition, smooth, type Freeze } from "./deck-util";

export interface StagePortrait {
  x1: string | null;
  x2: string | null;
  glow: string | null;
}

export interface StageState {
  state: "intro" | "scroll";
  rank: RankLabel;
  phase: CardPhase;
  energy: number;
  vram: number;
  slots: string | null;
}

export interface StageOptions {
  canvas: HTMLCanvasElement;
  stage: HTMLElement;
  column: HTMLElement;
  cards: CardModel[];
  labels: RankLabel[];
  portraits: StagePortrait[];
  markUrl: string | null;
  tier: "mid" | "high";
  params?: DeckParams;
  freeze: Freeze | null;
  onState(state: StageState): void;
  onContextLost(): void;
}

export interface StageHandle {
  ready: Promise<void>;
  setProgress(p: number): void;
  pointer(clientX: number | null, clientY: number | null): void;
  hit(clientX: number, clientY: number): number | null;
  startIntro(): void;
  setVisible(visible: boolean): void;
  dispose(): void;
}

const DEG = Math.PI / 180;
const PX = 1 / 100;
const DESKTOP_MIN_PX = 960; // 60rem

interface CardMeshes {
  group: Group;
  slab: Mesh;
  slabMat: MeshStandardMaterial;
  body: Mesh;
  bodyMat: MeshPhysicalMaterial;
  frame: Mesh;
  text: Mesh;
  chip: Mesh;
  back: Mesh;
  backMat: MeshPhysicalMaterial;
  layerMats: Material[];
}

function loadImage(url: string | null): Promise<HTMLImageElement | null> {
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

export async function mountStage(opts: StageOptions): Promise<StageHandle> {
  const params = opts.params ?? DECK_PARAMS;
  const { canvas, stage, column, cards, labels, freeze } = opts;
  const count = cards.length;
  const rng = mulberry32(freeze ? 7 : (Math.random() * 2 ** 31) | 0);
  void rng; // the smoke (Plan 3) draws from it
  const clock = () => (freeze ? freeze.time : performance.now());

  /* ---------- Renderer, scene, camera ---------- */
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    premultipliedAlpha: true,
    powerPreference: "high-performance",
  });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NoToneMapping;
  renderer.setClearColor(0x000000, 0);
  const dpr = Math.min(devicePixelRatio || 1, pixelRatioCap(opts.tier, params));
  renderer.setPixelRatio(dpr);
  const scene = new Scene();
  const camera = new PerspectiveCamera(params.camera.fov, 1, 0.1, 100);

  /* ---------- Environment and lights ---------- */
  const envCanvas = document.createElement("canvas");
  envCanvas.width = ENV_W;
  envCanvas.height = ENV_H;
  const envCtx = envCanvas.getContext("2d");
  if (!envCtx) throw new Error("2D canvas unavailable");
  paintEnvironment(envCtx, ENV_W, ENV_H);
  const envSource = new CanvasTexture(envCanvas);
  envSource.mapping = EquirectangularReflectionMapping;
  envSource.colorSpace = SRGBColorSpace;
  const pmrem = new PMREMGenerator(renderer);
  const envTarget = pmrem.fromEquirectangular(envSource);
  const envMap = envTarget.texture;
  pmrem.dispose();
  envSource.dispose();

  const ambient = new AmbientLight(0xffffff, params.light.ambient);
  const key = new DirectionalLight(0xffffff, params.light.key);
  key.position.set(-6, 8, 10);
  const rim = new DirectionalLight(0x9080ff, params.light.rim);
  rim.position.set(8, 3, -4);
  scene.add(ambient, key, rim);

  /* ---------- Textures ---------- */
  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const textures = new DeckTextures(
    cards,
    {
      canvas: (w, h) => Object.assign(document.createElement("canvas"), { width: w, height: h }),
      texture: (c) => {
        const t = new CanvasTexture(c);
        t.colorSpace = SRGBColorSpace;
        t.anisotropy = maxAniso;
        t.generateMipmaps = true;
        t.minFilter = LinearMipmapLinearFilter;
        return t;
      },
    },
    params,
  );

  /* ---------- Cards ---------- */
  const M = params.material;
  const laminated = (map: Texture, sheen: boolean): MeshPhysicalMaterial => {
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
  };
  const unlit = (map: Texture): MeshBasicMaterial =>
    new MeshBasicMaterial({ map, transparent: true, depthWrite: false });
  const unit = new PlaneGeometry(1, 1);

  /* ---------- Layout, part 1: measure before any texture is painted ---------- */
  let layout: DeckLayout | null = null;
  let stageW = 1;
  let stageH = 1;
  const toX = (px: number) => (px - stageW / 2) * PX;
  const toY = (py: number) => -(py - stageH / 2) * PX;

  function computeLayout(): void {
    stageW = Math.max(1, stage.clientWidth);
    stageH = Math.max(1, stage.clientHeight);
    const mode: DeckMode = stageW >= DESKTOP_MIN_PX ? "desktop" : "phone";
    const stageRect = stage.getBoundingClientRect();
    const columnRect = column.getBoundingClientRect();
    const fallback = columnFor(stageW, params.layout);
    const columnLeft = columnRect.width > 0 ? columnRect.left - stageRect.left : fallback.left;
    const columnW = columnRect.width > 0 ? columnRect.width : fallback.width;
    layout = deckLayout({ stageW, stageH, columnLeft, columnW, mode, count }, params.layout);
    renderer.setSize(stageW, stageH, false);
    camera.aspect = stageW / stageH;
    camera.position.z = (stageH * PX) / 2 / Math.tan((params.camera.fov / 2) * DEG);
    camera.updateProjectionMatrix();
    textures.setSize(layout.cardW, dpr);
  }
  computeLayout();

  const meshes: CardMeshes[] = cards.map((card, i) => {
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
    const bodyMat = laminated(textures.body(i), energetic);
    const body = new Mesh(unit, bodyMat);
    const frame = new Mesh(unit, unlit(textures.frame()));
    const text = new Mesh(unit, unlit(textures.blank())); // blank until a card is presented
    const chip = new Mesh(unit, unlit(textures.chip(i)));
    const backMat = laminated(textures.back(), false);
    const back = new Mesh(unit, backMat);
    back.rotation.y = Math.PI;
    group.add(slab, body, frame, text, chip, back);
    scene.add(group);
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
    };
  });
  const floor = new Mesh(unit, new MeshBasicMaterial({ color: COLORS.iron }));
  scene.add(floor);
  const slabs = meshes.map((m) => m.slab); // precomputed once; hitAt filters by group visibility

  /* ---------- Layout, part 2: size the meshes ---------- */
  function applyLayout(): void {
    if (!layout) return;
    const w = layout.cardW * PX;
    const h = layout.cardH * PX;
    const t = M.thickness * PX;
    const s = layout.cardW / CARD_W;
    for (const m of meshes) {
      m.slab.geometry.dispose();
      m.slab.geometry = new RoundedBoxGeometry(w, h, t, 2, M.cornerRadius * PX);
      const front = t / 2 + 0.001;
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
    floor.scale.set(stageW * PX, 0.01, 1);
    floor.position.set(0, toY(layout.floorY), -0.001);
  }
  applyLayout();
  let assetsSettled = !freeze; // freeze must not render (or resolve `ready`) before assets settle
  const resizer = new ResizeObserver(() => {
    computeLayout();
    applyLayout();
    if (assetsSettled) requestRender();
  });
  resizer.observe(stage);

  /* ---------- Portraits and the mark ---------- */
  const glows: (HTMLImageElement | null)[] = new Array(count).fill(null);
  const portraitLoads = opts.portraits.map((p, i) =>
    loadImage(pickRendition(dpr, p.x1, p.x2)).then((img) => {
      if (img) textures.setPortrait(i, img);
      return loadImage(p.glow).then((g) => (glows[i] = g)); // glow-mask planes (Plan 3)
    }),
  );
  const markLoad = loadImage(opts.markUrl).then((img) => textures.setMark(img));
  const assets = Promise.allSettled([...portraitLoads, markLoad]);

  /* ---------- Frame state ---------- */
  const N = count;
  let targetP = 0;
  let p = 0;
  // The first frame after a mount (or re-mount) must render the scroll target directly, never
  // smooth up from `p = 0`, or a deep-scrolled visitor sees the deck riffle through every rank
  // (and the rail's aria-live region announce each one) before it catches up.
  let firstFrameDone = false;
  let pointerAt: { x: number; y: number } | null = null;
  const tilt = { x: 0, y: 0 };
  const tiltTarget = { x: 0, y: 0 };
  const hover = new Array<number>(count).fill(0);
  const hoverTarget = new Array<number>(count).fill(0);
  const cam = { x: 0, y: 0 };
  const camTarget = { x: 0, y: 0 };
  const landedAt: (number | null)[] = new Array(count).fill(null);
  let intro: IntroState | null = null;
  let lastNow = performance.now();
  let raf = 0;
  let visible = true;
  let disposed = false;
  let lastState = "";
  let readyResolve: (() => void) | null = null;
  const ready = new Promise<void>((resolve) => (readyResolve = resolve));
  let readyDone = false;
  const raycaster = new Raycaster();
  const ndc = new Vector2();

  function hitAt(clientX: number, clientY: number): number | null {
    const r = canvas.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -(((clientY - r.top) / r.height) * 2 - 1));
    raycaster.setFromCamera(ndc, camera);
    const targets = slabs.filter((s) => s.parent?.visible);
    const hits = raycaster.intersectObjects(targets, false);
    const hit = hits[0];
    return hit ? (hit.object.userData.index as number) : null;
  }

  function updateTargets(pose: StagePose): void {
    if (!pointerAt || !layout) {
      tiltTarget.x = tiltTarget.y = 0;
      camTarget.x = camTarget.y = 0;
      hoverTarget.fill(0);
      canvas.classList.remove("is-pointer");
      return;
    }
    const r = canvas.getBoundingClientRect();
    const px = pointerAt.x - r.left;
    const py = pointerAt.y - r.top;
    const presented = pose.cards.findIndex((c) => c.landed);
    if (presented >= 0) {
      const nx = Math.max(-1, Math.min(1, (px - layout.presented.x) / (layout.cardW / 2)));
      const ny = Math.max(-1, Math.min(1, (py - layout.presented.y) / (layout.cardH / 2)));
      tiltTarget.x = params.tilt.maxX * ny;
      tiltTarget.y = params.tilt.maxY * nx;
    } else {
      tiltTarget.x = tiltTarget.y = 0;
    }
    if (opts.tier === "high") {
      camTarget.x = ((px / stageW) * 2 - 1) * params.camera.parallax;
      camTarget.y = -((py / stageH) * 2 - 1) * params.camera.parallax;
    }
    const hit = layout.mode === "desktop" ? hitAt(pointerAt.x, pointerAt.y) : null;
    const racked = hit !== null && (pose.cards[hit]?.pull ?? 1) <= 0;
    hoverTarget.fill(0);
    if (racked && hit !== null) hoverTarget[hit] = 1;
    canvas.classList.toggle("is-pointer", racked);
  }

  function applyText(i: number, phase: CardPhase, time: number): void {
    const mesh = meshes[i];
    if (!mesh) return;
    const mat = mesh.text.material as MeshBasicMaterial;
    const at = landedAt[i];
    if (at == null || phase === "leaving" || phase === "racked" || phase === "pulling") {
      textures.releaseText(i);
      if (mat.map !== textures.blank()) {
        mat.map = textures.blank();
        mat.needsUpdate = true;
      }
      return;
    }
    const elapsed = time - at;
    const lines = Math.min(PRINT_STEPS, Math.floor(elapsed / params.print.stepMs) + 1);
    const cursor = lines >= 6 && Math.floor(elapsed / (params.print.cursorMs / 2)) % 2 === 0;
    if (textures.paintText(i, lines, cursor)) {
      const slot = textures.text(i);
      if (mat.map !== slot) {
        mat.map = slot;
        mat.needsUpdate = true;
      }
    }
  }

  function emitState(pose: StagePose): void {
    const presentedCard = pose.cards.reduce((a, b) => (b.pull > a.pull ? b : a));
    const rank = labels[pose.active];
    if (!rank) return;
    const state: StageState = {
      state: intro ? "intro" : "scroll",
      rank,
      phase: presentedCard.phase,
      energy: Math.round(pose.energy * 20) / 20,
      vram: Math.round((textures.estimateBytes() / 1_048_576) * 10) / 10,
      slots:
        freeze && layout?.mode === "desktop"
          ? layout.slots.map((s) => `${Math.round(s.x)},${Math.round(s.y)}`).join(";")
          : null,
    };
    const key = JSON.stringify(state);
    if (key === lastState) return;
    lastState = key;
    opts.onState(state);
  }

  function frame(now: number): void {
    raf = 0;
    if (disposed || !layout) return;
    const dt = freeze ? 0 : Math.min(50, Math.max(0, now - lastNow));
    lastNow = now;
    const time = clock();

    if (intro) {
      intro.elapsed += dt * (targetP > 0.5 / N ? params.intro.fastForward : 1);
    }

    if (freeze) {
      p = targetP;
    } else {
      p = smooth(p, targetP, dt, params.scroll.tau);
      tilt.x = smooth(tilt.x, tiltTarget.x, dt, params.tilt.tau);
      tilt.y = smooth(tilt.y, tiltTarget.y, dt, params.tilt.tau);
      cam.x = smooth(cam.x, camTarget.x, dt, params.camera.parallaxTau);
      cam.y = smooth(cam.y, camTarget.y, dt, params.camera.parallaxTau);
      for (let i = 0; i < count; i++) {
        const cur = hover[i] ?? 0;
        const tgt = hoverTarget[i] ?? 0;
        hover[i] = smooth(cur, tgt, dt, tgt > cur ? params.hover.inMs : params.hover.outMs);
      }
    }

    const input = { p, labels, layout, tilt, hover, time, landedAt, intro };
    let pose = deckPose(input, params);
    if (intro && pose.intro === null) intro = null;
    // Freeze draws one frame: seed `landedAt` for any card landing now, then recompute once. A
    // late (or deep-scrolled) mount's first rendered frame does the same, so the presented card's
    // text is already printed instead of printing in — but only when no intro is running; the
    // intro's own deal-in must animate from scratch.
    if (freeze || (!firstFrameDone && !intro)) {
      let seeded = false;
      for (let i = 0; i < count; i++) {
        if (pose.cards[i]?.landed && landedAt[i] === null) {
          landedAt[i] = time - 10_000;
          seeded = true;
        }
      }
      if (seeded) pose = deckPose(input, params);
    }
    updateTargets(pose);

    for (let i = 0; i < count; i++) {
      const c = pose.cards[i];
      const m = meshes[i];
      if (!c || !m) continue;
      // Cleared only once racked again (`pull <= 0`), never the instant `landed` flips false.
      if (c.landed && landedAt[i] === null) landedAt[i] = freeze ? time - 10_000 : time;
      if (c.pull <= 0 && landedAt[i] !== null) landedAt[i] = null;
      applyText(i, c.phase, time);
      m.group.position.set(toX(c.x), toY(c.y), c.z * PX);
      m.group.rotation.set(c.rotX * DEG, c.rotY * DEG, c.rotZ * DEG);
      m.group.scale.setScalar(c.scale);
      const translucent = c.opacity < 0.999;
      for (const mat of m.layerMats) {
        if (mat.transparent !== translucent || mat.opacity !== c.opacity) {
          const fixed =
            mat === m.frame.material || mat === m.text.material || mat === m.chip.material;
          if (!fixed && mat.transparent !== translucent) {
            mat.transparent = translucent;
            mat.needsUpdate = true;
          }
          mat.opacity = c.opacity;
        }
      }
      m.group.visible = c.opacity > 0.001;
    }

    const floorScale = pose.intro ? pose.intro.floor : 1;
    floor.scale.x = stageW * PX * floorScale;
    floor.position.x = -stageW * PX * 0.5 + floor.scale.x / 2;
    camera.position.x = cam.x;
    camera.position.y = cam.y;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
    emitState(pose);
    firstFrameDone = true;
    if (!readyDone) {
      readyDone = true;
      readyResolve?.();
    }
    if (!freeze && visible && !disposed) raf = requestAnimationFrame(frame);
  }

  function requestRender(): void {
    if (disposed || raf) return;
    if (freeze) {
      raf = requestAnimationFrame(frame);
      return;
    }
    if (visible) {
      lastNow = performance.now();
      raf = requestAnimationFrame(frame);
    }
  }

  /* ---------- Context loss ---------- */
  let lostTimer: ReturnType<typeof setTimeout> | undefined;
  const onLost = (event: Event) => {
    event.preventDefault();
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    clearTimeout(lostTimer);
    lostTimer = setTimeout(() => {
      if (!disposed) opts.onContextLost();
    }, 2000);
  };
  const onRestored = () => {
    clearTimeout(lostTimer);
    requestRender();
  };
  canvas.addEventListener("webglcontextlost", onLost);
  canvas.addEventListener("webglcontextrestored", onRestored);

  /* ---------- Start ---------- */
  if (freeze) {
    await assets;
    assetsSettled = true;
  } else {
    void assets.then(() => requestRender());
  }
  requestRender();

  return {
    ready,
    setProgress(value) {
      targetP = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
      if (freeze || !firstFrameDone) p = targetP;
      requestRender();
    },
    pointer(clientX, clientY) {
      pointerAt = clientX === null || clientY === null ? null : { x: clientX, y: clientY };
      requestRender();
    },
    hit: hitAt,
    startIntro() {
      if (freeze || intro || targetP >= 0.5 / N) return;
      intro = { elapsed: 0 };
      requestRender();
    },
    setVisible(next) {
      visible = next;
      if (visible) requestRender();
      else if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    },
    dispose() {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      clearTimeout(lostTimer);
      resizer.disconnect();
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      for (const m of meshes) {
        m.slab.geometry.dispose();
        for (const mat of m.layerMats) mat.dispose();
      }
      unit.dispose();
      (floor.material as Material).dispose();
      textures.dispose();
      envTarget.dispose();
      renderer.dispose();
    },
  };
}
