// The journey deck's WebGL stage (deck spec §5–§9): seven laminated card meshes driven by the pure
// pose model each frame, plus the energy layer's effects (deck-effects.ts) and the high tier's bloom
// pass (deck-bloom.ts). Lazy import; fixed colour management, so every token survives the renderer.
import {
  AmbientLight,
  CanvasTexture,
  DirectionalLight,
  EquirectangularReflectionMapping,
  MeshBasicMaterial,
  NoToneMapping,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Raycaster,
  Scene,
  SRGBColorSpace,
  Vector2,
  WebGLRenderer,
} from "three";
import type { RankLabel } from "../../data/career";
import type { BloomHandle } from "./deck-bloom";
import { applyDrawPolicy, buildCards, layoutCards, loadImage, type CardMeshes } from "./deck-cards";
import { glFactory } from "./deck-canvas";
import { freezeDrive, initialDrive, pullsForDrive, stepDrive, type DriveState } from "./deck-drive";
import type { Pulls } from "./deck-drive";
import { BLOOM_LAYER, DeckEffects, type EffectCard, type EffectsFrame } from "./deck-effects";
import type { EnergyKind } from "./deck-energy";
import { ENV_H, ENV_W, paintEnvironment } from "./deck-env";
import { StageInput } from "./deck-input";
import { columnFor, deckLayout, type DeckLayout, type DeckMode } from "./deck-layout";
import { PRINT_STEPS, type CardModel } from "./deck-paint";
import { DECK_PARAMS, type DeckParams } from "./deck-params";
import { deckPose, drawPolicy, type CardPhase, type IntroState, type StagePose } from "./deck-pose";
import { DeckTextures } from "./deck-textures";
import { pixelRatioCap } from "./deck-tier";
import { mulberry32, pickRendition, type Freeze } from "./deck-util";

export interface StagePortrait {
  x1: string | null;
  x2: string | null;
  glow: string | null;
  aura: string | null;
}

export interface StageState {
  state: "intro" | "scroll";
  rank: RankLabel;
  phase: CardPhase;
  energy: number;
  vram: number;
  slots: string | null;
  bloom: boolean;
  cornerAlpha: number | null;
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
  /** A rail click, canvas click or swipe: a transition straight to `rank`, queued if one is already
   * running (it never restarts a running transition — the jump waits for it to settle). */
  jumpTo(rank: number): void;
  pointer(clientX: number | null, clientY: number | null): void;
  /** The phone's orientation tilt target in degrees; null releases it (spec §7). */
  tilt(x: number | null, y: number | null): void;
  hit(clientX: number, clientY: number): number | null;
  startIntro(): void;
  setVisible(visible: boolean): void;
  dispose(): void;
}

const DEG = Math.PI / 180;
const PX = 1 / 100;
const DESKTOP_MIN_PX = 960; // 60rem at the default root size: the fallback when matchMedia is missing
const DESKTOP_QUERY = "(min-width: 60rem)"; // the same breakpoint Journey.astro's styles use

export async function mountStage(opts: StageOptions): Promise<StageHandle> {
  const params = opts.params ?? DECK_PARAMS;
  const { canvas, stage, column, cards, labels, freeze } = opts;
  const count = cards.length;
  const rng = mulberry32(freeze ? 7 : (Math.random() * 2 ** 31) | 0);
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
  const desktopQuery = typeof matchMedia === "function" ? matchMedia(DESKTOP_QUERY) : null;
  const portraitQuery =
    typeof matchMedia === "function" ? matchMedia("(orientation: portrait)") : null;

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
  // Every light also sits on BLOOM_LAYER: a bloom pass that saw no lights changed the light hash
  // twice a frame, and Three re-resolved all 21 lit programs each time. The glow materials are
  // unlit, so the bloom itself is unchanged.
  for (const light of [ambient, key, rim]) light.layers.enable(BLOOM_LAYER);
  scene.add(ambient, key, rim);

  /* ---------- Textures ---------- */
  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const textures = new DeckTextures(cards, glFactory(maxAniso), params);

  /* ---------- Cards ---------- */
  const unit = new PlaneGeometry(1, 1);

  /* ---------- Layout, part 1: measure before any texture is painted ---------- */
  let layout: DeckLayout | null = null;
  let stageW = 1;
  let stageH = 1;
  // The stage size the layout was computed for: the layout's px convert with it, so in the 150 ms
  // between a resize and its relayout the cards stay with the fog.
  let layoutW = 1;
  let layoutH = 1;
  const toX = (px: number) => (px - layoutW / 2) * PX;
  const toY = (py: number) => -(py - layoutH / 2) * PX;

  // Split from computeLayout(): the ResizeObserver below runs this synchronously on every callback
  // (cheap), then debounces the layout and textures (spec §6). On phones the stage is 100dvh, so a
  // URL-bar collapse resizes it constantly; without the split the canvas squashed non-uniformly.
  function measureStage(): void {
    stageW = Math.max(1, stage.clientWidth);
    stageH = Math.max(1, stage.clientHeight);
    renderer.setSize(stageW, stageH, false);
    camera.aspect = stageW / stageH;
    camera.position.z = (stageH * PX) / 2 / Math.tan((params.camera.fov / 2) * DEG);
    camera.updateProjectionMatrix();
  }

  function computeLayout(): void {
    measureStage();
    const mode: DeckMode = desktopQuery
      ? desktopQuery.matches
        ? "desktop"
        : "phone"
      : stageW >= DESKTOP_MIN_PX
        ? "desktop"
        : "phone";
    const stageRect = stage.getBoundingClientRect();
    const columnRect = column.getBoundingClientRect();
    const fallback = columnFor(stageW, params.layout);
    const columnLeft = columnRect.width > 0 ? columnRect.left - stageRect.left : fallback.left;
    const columnW = columnRect.width > 0 ? columnRect.width : fallback.width;
    layout = deckLayout({ stageW, stageH, columnLeft, columnW, mode, count }, params.layout);
    layoutW = stageW;
    layoutH = stageH;
    textures.setSize(layout.cardW, dpr);
  }
  computeLayout();

  const meshes: CardMeshes[] = buildCards(cards, textures, envMap, unit, params);
  const kinds: (EnergyKind | null)[] = cards.map((c) =>
    c.stage.rankLabel === "S" || c.stage.rankLabel === "S+" ? c.stage.rankLabel : null,
  );
  const effects = new DeckEffects({
    scene,
    params,
    tier: opts.tier,
    rng,
    kinds,
    eyeColors: cards.map((c) => c.art.eyeColor),
    pixelRatio: renderer.getPixelRatio(),
    anisotropy: maxAniso,
  });
  meshes.forEach((m, i) => m.draw.push(...effects.attach(i, m.group))); // the planes join its band
  for (const m of meshes) scene.add(m.group);
  const slabs = meshes.map((m) => m.slab); // precomputed once; hitAt filters by group visibility

  let front = 0;
  let bloom: BloomHandle | null = null;
  let disposed = false;
  /* ---------- Layout, part 2: size the meshes ---------- */
  function applyLayout(): void {
    if (!layout) return;
    front = layoutCards(meshes, layout, params);
    effects.setLayout({
      cardWPx: layout.cardW,
      w: layout.cardW * PX,
      h: layout.cardH * PX,
      front,
      stageW: stageW * PX,
      stageH: stageH * PX,
    });
    bloom?.setSize(stageW, stageH);
  }
  applyLayout();
  let assetsSettled = !freeze; // freeze must not render (or resolve `ready`) before assets settle
  // Spec §6: relayout debounced 150 ms, and on orientation change. A rotating phone fires several
  // resize callbacks in a row; one trailing relayout repaints the textures once.
  let relayoutTimer: ReturnType<typeof setTimeout> | undefined;
  const scheduleRelayout = (): void => {
    clearTimeout(relayoutTimer);
    relayoutTimer = setTimeout(() => {
      relayoutTimer = undefined;
      if (disposed) return;
      computeLayout();
      applyLayout();
      if (assetsSettled) requestRender();
    }, params.layout.relayoutDebounceMs);
  };
  const resizer = new ResizeObserver(() => {
    // Sizes at once (scheduleRelayout debounces the layout and textures). A resize clears the
    // drawing buffer after this frame's rAF has drawn: draw now, or a blank canvas is composited.
    measureStage();
    if (assetsSettled && !disposed && (freeze || visible)) {
      if (raf) cancelAnimationFrame(raf);
      frame(performance.now());
    }
    scheduleRelayout();
  });
  resizer.observe(stage);
  const onOrientation = (): void => scheduleRelayout();
  portraitQuery?.addEventListener("change", onOrientation);
  desktopQuery?.addEventListener("change", onOrientation);

  /* ---------- Portraits and the mark ---------- */
  const portraitLoads = opts.portraits.map((p, i) =>
    loadImage(pickRendition(dpr, p.x1, p.x2)).then((img) => {
      if (img) textures.setPortrait(i, img);
      return Promise.all([
        loadImage(p.glow).then((g) => effects.setGlow(i, g)), // the eye-tinted glow mask
        loadImage(p.aura).then((a) => effects.setAura(i, a)), // the silhouette's violet rim
      ]);
    }),
  );
  const markLoad = loadImage(opts.markUrl).then((img) => textures.setMark(img));
  const assets = Promise.allSettled([...portraitLoads, markLoad]);
  const bloomLoad =
    opts.tier === "high"
      ? import("./deck-bloom")
          .then(({ mountBloom }) => {
            if (disposed) return;
            bloom = mountBloom(renderer, scene, camera, params, stageW, stageH);
          })
          .catch(() => undefined)
      : Promise.resolve();

  /* ---------- Frame state ---------- */
  const N = count;
  let targetP = 0;
  // A mount (or re-mount) must settle on the scroll target directly, never queue a transition from
  // rank 0, or a deep-scrolled visitor watches the deck riffle through every rank first.
  let drive: DriveState = initialDrive(targetP, N, params);
  let pendingJump: number | null = null;
  // The last frame's own pulls, so a transition that starts here can seed `fromWithin` from what
  // was actually drawn instead of this frame's `p` (spec §7 amendment: a jump can land between
  // Motion's scroll callback delivering the new `p` and this frame consuming it).
  let lastPulls: Pulls | null = null;
  let firstFrameDone = false;
  const input = new StageInput(count, params);
  const landedAt: (number | null)[] = new Array(count).fill(null);
  const leaveAt: (number | null)[] = new Array(count).fill(null);
  const effectCards: EffectCard[] = meshes.map((m) => ({
    group: m.group,
    phase: "racked",
    pull: 0,
    zPx: 0,
    sinceLandMs: null,
    sinceLeaveMs: null,
  }));
  const effectsFrame: EffectsFrame = {
    time: 0,
    frames: 0,
    energy: 0,
    energyIndex: null,
    kind: null,
    cards: effectCards,
  };
  let intro: IntroState | null = null;
  let lastNow = performance.now();
  let raf = 0;
  let visible = true;
  let lastState = "";
  let cornerAlpha: number | null = null;
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
    if (!layout) return;
    const r = canvas.getBoundingClientRect();
    const racked = input.updateTargets({
      presentedX: layout.presented.x + (stageW - layoutW) / 2, // the layout's px in canvas px
      presentedY: layout.presented.y + (stageH - layoutH) / 2,
      cardW: layout.cardW,
      cardH: layout.cardH,
      stageW,
      stageH,
      rect: { left: r.left, top: r.top },
      mode: layout.mode,
      parallax: opts.tier === "high",
      presented: pose.cards.findIndex((c) => c.landed),
      racked: (i) => (pose.cards[i]?.pull ?? 1) <= 0,
      hitAt,
    });
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
    const textureBytes = textures.estimateBytes();
    const effectBytes = effects.estimateBytes();
    const bloomBytes = bloom?.estimateBytes() ?? 0;
    const bytes = textureBytes + effectBytes + bloomBytes;
    const state: StageState = {
      state: intro ? "intro" : "scroll",
      rank,
      phase: presentedCard.phase,
      energy: Math.round(pose.energy * 20) / 20,
      vram: Math.round((bytes / 1_048_576) * 10) / 10,
      slots:
        freeze && layout?.mode === "desktop"
          ? layout.slots.map((s) => `${Math.round(s.x)},${Math.round(s.y)}`).join(";")
          : null,
      bloom: bloom !== null,
      cornerAlpha,
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
      drive = freezeDrive(targetP, N, freeze, params);
    } else {
      drive = stepDrive(drive, targetP, pendingJump, time, N, params, lastPulls?.within);
      pendingJump = null;
      input.step(dt);
    }
    const pulls = pullsForDrive(drive, targetP, time, N, params);
    lastPulls = pulls;

    const poseInput = {
      pulls,
      labels,
      layout,
      tilt: input.tilt,
      hover: input.hover,
      time,
      landedAt,
      intro,
    };
    let pose = deckPose(poseInput, params);
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
      if (seeded) pose = deckPose(poseInput, params);
    }
    updateTargets(pose);

    for (let i = 0; i < count; i++) {
      const c = pose.cards[i];
      const m = meshes[i];
      if (!c || !m) continue;
      // Cleared only once racked again (`pull <= 0`), never the instant `landed` flips false.
      if (c.landed && landedAt[i] === null) landedAt[i] = freeze ? time - 10_000 : time;
      if (c.pull <= 0 && landedAt[i] !== null) landedAt[i] = null;
      // A landed card pulled back out (a reverse scroll) reports "pulling"; its leave clock starts
      // too, so its glow fades over GLOW_LEAVE_MS both ways instead of snapping off. A card that
      // never landed (one coming back through "leaving" on a reverse scroll) gets no clock, so its
      // glow stays off until it lands instead of flashing to full and fading.
      if ((c.phase === "leaving" || c.phase === "pulling") && landedAt[i] !== null) {
        if (leaveAt[i] === null) leaveAt[i] = freeze ? time - 10_000 : time;
      } else leaveAt[i] = null;
      const at = landedAt[i];
      const leftAt = leaveAt[i];
      const ec = effectCards[i];
      if (ec) {
        ec.phase = c.phase;
        ec.pull = c.pull;
        ec.zPx = c.z;
        ec.sinceLandMs = at === null ? null : time - at;
        ec.sinceLeaveMs = leftAt === null ? null : time - leftAt;
      }
      applyText(i, c.phase, time);
      applyDrawPolicy(m.draw, drawPolicy(c.phase), c.opacity); // band, depth test, opacity
      m.group.position.set(toX(c.x), toY(c.y), c.z * PX);
      m.group.rotation.set(c.rotX * DEG, c.rotY * DEG, c.rotZ * DEG);
      m.group.scale.setScalar(c.scale);
      m.group.visible = c.opacity > 0.001;
    }

    camera.position.x = input.cam.x;
    camera.position.y = input.cam.y;
    camera.lookAt(0, 0, 0);

    effectsFrame.time = time;
    effectsFrame.frames = dt / (1000 / 60);
    effectsFrame.energy = pose.energy;
    effectsFrame.energyIndex = pose.energyIndex;
    effectsFrame.kind = pose.kind;
    if (freeze) effects.prewarm(effectsFrame, params.smoke.prewarmFrames);
    effects.update(effectsFrame);
    if (bloom) bloom.render();
    else renderer.render(scene, camera);
    if (freeze) {
      const gl = renderer.getContext();
      const px = new Uint8Array(4);
      gl.readPixels(4, 4, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); // (4, 4) from the bottom-left: the stage's corner, no card there
      cornerAlpha = px[3] ?? null;
    }
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
    input.reset();
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
    await Promise.all([assets, bloomLoad]);
    assetsSettled = true;
  } else {
    void assets.then(() => requestRender());
    void bloomLoad.then(() => requestRender());
  }
  requestRender();

  return {
    ready,
    setProgress(value) {
      targetP = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
      // Nothing on screen yet to transition from: settle on the real target instead of queuing one.
      if (freeze || !firstFrameDone) drive = initialDrive(targetP, N, params);
      requestRender();
    },
    jumpTo(rank) {
      pendingJump = rank;
      requestRender();
    },
    pointer(clientX, clientY) {
      input.pointer(clientX, clientY);
      requestRender();
    },
    tilt(x, y) {
      input.setTilt(x, y);
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
      input.reset();
      clearTimeout(lostTimer);
      clearTimeout(relayoutTimer);
      portraitQuery?.removeEventListener("change", onOrientation);
      desktopQuery?.removeEventListener("change", onOrientation);
      resizer.disconnect();
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      for (const m of meshes) {
        m.slab.geometry.dispose();
        for (const mat of m.layerMats) mat.dispose();
      }
      unit.dispose();
      textures.dispose();
      envTarget.dispose();
      effects.dispose();
      bloom?.dispose();
      bloom = null;
      renderer.dispose();
    },
  };
}
